# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from rest_framework import status
from rest_framework.response import Response

from plane.api.serializers import WorkspaceLiteSerializer
from plane.api.views.base import BaseAPIView
from plane.db.models import APIToken, Workspace


class WorkspaceListAPIEndpoint(BaseAPIView):
    """Workspaces visible to the API token owner."""

    def get(self, request):
        queryset = (
            Workspace.objects.filter(
                workspace_member__member=request.user,
                workspace_member__is_active=True,
            )
            .order_by("name")
            .distinct()
        )

        token_value = request.auth if isinstance(request.auth, str) else None
        if token_value:
            api_token = APIToken.objects.filter(token=token_value).only("workspace_id").first()
            if api_token and api_token.workspace_id:
                queryset = queryset.filter(id=api_token.workspace_id)

        serializer = WorkspaceLiteSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
