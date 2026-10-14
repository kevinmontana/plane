# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response

from plane.app.permissions import ROLE, allow_permission
from plane.app.serializers import IssueWorkLogSerializer
from plane.app.views.base import BaseAPIView, BaseViewSet
from plane.db.models import Issue, IssueWorkLog, Project


def _time_tracking_disabled_response():
    return Response(
        {"error": "Time tracking is not enabled for this project."},
        status=status.HTTP_400_BAD_REQUEST,
    )


def _project_has_time_tracking(project_id):
    return Project.objects.filter(pk=project_id, is_time_tracking_enabled=True).exists()


def _parse_report_days(request):
    try:
        days = int(request.query_params.get("days", 30))
    except (TypeError, ValueError):
        days = 30
    return min(max(days, 1), 365)


def build_worklog_report(queryset, days):
    total = queryset.aggregate(total=Sum("duration_minutes"))["total"] or 0
    by_user = [
        {
            "actor_id": row["actor_id"],
            "display_name": row["actor__display_name"],
            "first_name": row["actor__first_name"],
            "last_name": row["actor__last_name"],
            "total_duration_minutes": row["total_duration_minutes"] or 0,
        }
        for row in queryset.values(
            "actor_id",
            "actor__display_name",
            "actor__first_name",
            "actor__last_name",
        )
        .annotate(total_duration_minutes=Sum("duration_minutes"))
        .order_by("-total_duration_minutes")
    ]
    by_issue = [
        {
            "issue_id": row["issue_id"],
            "name": row["issue__name"],
            "identifier": f"{row['issue__project__identifier']}-{row['issue__sequence_id']}",
            "project_id": row["issue__project_id"],
            "total_duration_minutes": row["total_duration_minutes"] or 0,
        }
        for row in queryset.values(
            "issue_id",
            "issue__name",
            "issue__sequence_id",
            "issue__project_id",
            "issue__project__identifier",
        )
        .annotate(total_duration_minutes=Sum("duration_minutes"))
        .order_by("-total_duration_minutes")
    ]
    return {
        "period_days": days,
        "total_duration_minutes": total,
        "by_user": by_user,
        "by_issue": by_issue,
    }


def _filter_report_queryset(queryset, request):
    days = _parse_report_days(request)
    since = timezone.now() - timedelta(days=days)
    queryset = queryset.filter(logged_at__gte=since)
    cycle_id = request.query_params.get("cycle_id")
    if cycle_id:
        queryset = queryset.filter(issue__issue_cycle__cycle_id=cycle_id)
    return queryset, days


class IssueWorkLogViewSet(BaseViewSet):
    serializer_class = IssueWorkLogSerializer
    model = IssueWorkLog

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(workspace__slug=self.kwargs.get("slug"))
            .filter(project_id=self.kwargs.get("project_id"))
            .filter(issue_id=self.kwargs.get("issue_id"))
            .filter(
                project__project_projectmember__member=self.request.user,
                project__project_projectmember__is_active=True,
                project__archived_at__isnull=True,
            )
            .select_related("actor", "issue", "project", "workspace")
            .order_by("-logged_at", "-created_at")
            .distinct()
        )

    def _issue_total_minutes(self, issue_id):
        return IssueWorkLog.objects.filter(issue_id=issue_id).aggregate(total=Sum("duration_minutes"))["total"] or 0

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def list(self, request, slug, project_id, issue_id):
        if not _project_has_time_tracking(project_id):
            return _time_tracking_disabled_response()
        worklogs = self.get_queryset()
        serializer = IssueWorkLogSerializer(worklogs, many=True)
        return Response(
            {
                "worklogs": serializer.data,
                "total_duration_minutes": self._issue_total_minutes(issue_id),
            },
            status=status.HTTP_200_OK,
        )

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def create(self, request, slug, project_id, issue_id):
        if not _project_has_time_tracking(project_id):
            return _time_tracking_disabled_response()
        if not Issue.objects.filter(pk=issue_id, project_id=project_id, workspace__slug=slug).exists():
            return Response({"error": "Work item not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = IssueWorkLogSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(project_id=project_id, issue_id=issue_id, actor=request.user)
            return Response(
                {
                    **serializer.data,
                    "total_duration_minutes": self._issue_total_minutes(issue_id),
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission(allowed_roles=[ROLE.ADMIN], creator=True, model=IssueWorkLog)
    def partial_update(self, request, slug, project_id, issue_id, pk):
        if not _project_has_time_tracking(project_id):
            return _time_tracking_disabled_response()
        worklog = IssueWorkLog.objects.get(
            workspace__slug=slug, project_id=project_id, issue_id=issue_id, pk=pk
        )
        serializer = IssueWorkLogSerializer(worklog, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    **serializer.data,
                    "total_duration_minutes": self._issue_total_minutes(issue_id),
                },
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission(allowed_roles=[ROLE.ADMIN], creator=True, model=IssueWorkLog)
    def destroy(self, request, slug, project_id, issue_id, pk):
        if not _project_has_time_tracking(project_id):
            return _time_tracking_disabled_response()
        worklog = IssueWorkLog.objects.get(
            workspace__slug=slug, project_id=project_id, issue_id=issue_id, pk=pk
        )
        worklog.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectWorkLogReportEndpoint(BaseAPIView):
    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def get(self, request, slug, project_id):
        if not _project_has_time_tracking(project_id):
            return _time_tracking_disabled_response()
        queryset = IssueWorkLog.objects.filter(
            workspace__slug=slug,
            project_id=project_id,
            project__project_projectmember__member=request.user,
            project__project_projectmember__is_active=True,
            project__archived_at__isnull=True,
        ).distinct()
        queryset, days = _filter_report_queryset(queryset, request)
        return Response(build_worklog_report(queryset, days), status=status.HTTP_200_OK)


class WorkspaceWorkLogReportEndpoint(BaseAPIView):
    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def get(self, request, slug):
        queryset = IssueWorkLog.objects.filter(
            workspace__slug=slug,
            project__is_time_tracking_enabled=True,
            project__project_projectmember__member=request.user,
            project__project_projectmember__is_active=True,
            project__archived_at__isnull=True,
        ).distinct()
        queryset, days = _filter_report_queryset(queryset, request)
        return Response(build_worklog_report(queryset, days), status=status.HTTP_200_OK)
