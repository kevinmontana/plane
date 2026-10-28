# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""VTV super-admin endpoints for God Mode.

A super admin is an instance admin (``InstanceAdmin``). Public sign-up is
disabled on this instance, so accounts are created here by a super admin, who
can also see every user and every project and join any project to open its
board.
"""

# Python imports
import secrets
import string
import uuid

# Django imports
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models import Count, Exists, OuterRef, Q, Subquery
from django.db.models.functions import Coalesce
from django.utils import timezone

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Module imports
from plane.app.views.base import BaseAPIView
from plane.authentication.utils.host import base_host
from plane.authentication.views.app.password_management import generate_password_token
from plane.bgtasks.forgot_password_task import forgot_password
from plane.db.models import (
    Issue,
    Profile,
    Project,
    ProjectMember,
    ProjectUserProperty,
    Session,
    User,
    Workspace,
    WorkspaceMember,
)
from plane.license.api.permissions import InstanceAdminPermission
from plane.license.models import Instance, InstanceAdmin

WORKSPACE_ROLES = {20, 15, 5}
MAX_USERS = 1000
MAX_PROJECTS = 1000


def _temporary_password(length=16):
    """A random password with letters, digits and a symbol, readable when dictated."""
    alphabet = string.ascii_letters + string.digits
    while True:
        body = "".join(secrets.choice(alphabet) for _ in range(length - 1))
        if any(c.islower() for c in body) and any(c.isupper() for c in body) and any(c.isdigit() for c in body):
            return body[: length // 2] + "#" + body[length // 2 :]


def _invalidate_instance_caches():
    # GET /api/instances/ and GET /api/instances/admins/ are cached without a user key.
    cache.delete("/api/instances/")
    cache.delete("/api/instances/admins/")


def _send_set_password_email(request, user):
    uidb64, token = generate_password_token(user=user)
    forgot_password.delay(user.first_name, user.email, uidb64, token, base_host(request=request, is_app=True))


def _end_sessions(user):
    Session.objects.filter(user_id=str(user.id)).delete()


def _serialize_user(user, workspaces_by_user, admin_ids):
    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "is_active": user.is_active,
        "is_super_admin": user.id in admin_ids,
        "is_onboarded": bool(getattr(user, "is_onboarded_flag", False)),
        "date_joined": user.date_joined,
        "last_login": user.last_login,
        "last_active": user.last_active,
        "workspaces": workspaces_by_user.get(user.id, []),
    }


def _admin_ids(instance):
    return set(InstanceAdmin.objects.filter(instance=instance).values_list("user_id", flat=True))


def _users_payload(users, instance):
    users = list(users)
    workspaces_by_user = {}
    memberships = (
        WorkspaceMember.objects.filter(member_id__in=[u.id for u in users], is_active=True)
        .select_related("workspace")
        .order_by("workspace__name")
    )
    for m in memberships:
        workspaces_by_user.setdefault(m.member_id, []).append(
            {"id": str(m.workspace_id), "slug": m.workspace.slug, "name": m.workspace.name, "role": m.role}
        )
    admin_ids = _admin_ids(instance)
    return [_serialize_user(u, workspaces_by_user, admin_ids) for u in users]


def _users_queryset():
    return User.objects.filter(is_bot=False).annotate(
        is_onboarded_flag=Coalesce(
            Subquery(Profile.objects.filter(user_id=OuterRef("id")).values("is_onboarded")[:1]), False
        )
    )


class InstanceUsersEndpoint(BaseAPIView):
    """List every user of the instance and create new accounts."""

    permission_classes = [InstanceAdminPermission]

    def get(self, request):
        instance = Instance.objects.first()
        users = _users_queryset().order_by("first_name", "email")
        search = (request.query_params.get("search") or "").strip()
        if search:
            users = users.filter(
                Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(display_name__icontains=search)
            )
        return Response(_users_payload(users[:MAX_USERS], instance), status=status.HTTP_200_OK)

    def post(self, request):
        instance = Instance.objects.first()
        email = (request.data.get("email") or "").strip().lower()
        first_name = (request.data.get("first_name") or "").strip()
        last_name = (request.data.get("last_name") or "").strip()
        workspace_id = request.data.get("workspace_id") or None
        send_email = bool(request.data.get("send_email", True))
        try:
            workspace_role = int(request.data.get("workspace_role", 15))
        except (TypeError, ValueError):
            workspace_role = -1

        try:
            validate_email(email)
        except ValidationError:
            return Response({"error": "Escribe un correo electrónico válido."}, status=status.HTTP_400_BAD_REQUEST)
        if not first_name:
            return Response({"error": "El nombre es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)
        if len(first_name) > 255 or len(last_name) > 255:
            return Response({"error": "El nombre es demasiado largo."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=email).exists():
            return Response({"error": "Ya existe un usuario con ese correo."}, status=status.HTTP_409_CONFLICT)

        workspace = None
        if workspace_id:
            if workspace_role not in WORKSPACE_ROLES:
                return Response({"error": "El rol no es válido."}, status=status.HTTP_400_BAD_REQUEST)
            workspace = Workspace.objects.filter(pk=workspace_id).first()
            if workspace is None:
                return Response({"error": "El espacio de trabajo no existe."}, status=status.HTTP_400_BAD_REQUEST)

        temp_password = _temporary_password()
        with transaction.atomic():
            user = User(
                email=email,
                username=uuid.uuid4().hex,
                first_name=first_name,
                last_name=last_name,
                display_name=User.get_display_name(email),
                is_password_autoset=False,
                is_email_verified=True,
                is_active=True,
            )
            user.set_password(temp_password)
            user.save()

            onboarded = workspace is not None
            Profile.objects.create(
                user=user,
                is_onboarded=onboarded,
                last_workspace_id=workspace.id if workspace else None,
                onboarding_step={
                    "profile_complete": True,
                    "workspace_create": onboarded,
                    "workspace_invite": onboarded,
                    "workspace_join": onboarded,
                },
            )
            if workspace:
                WorkspaceMember.objects.create(workspace=workspace, member=user, role=workspace_role)

        if send_email:
            _send_set_password_email(request, user)

        payload = _users_payload(_users_queryset().filter(pk=user.pk), instance)[0]
        return Response({"user": payload, "temp_password": temp_password}, status=status.HTTP_201_CREATED)


class InstanceUserDetailEndpoint(BaseAPIView):
    """Activate or deactivate a user."""

    permission_classes = [InstanceAdminPermission]

    def patch(self, request, pk):
        instance = Instance.objects.first()
        user = User.objects.filter(pk=pk, is_bot=False).first()
        if user is None:
            return Response({"error": "El usuario no existe."}, status=status.HTTP_404_NOT_FOUND)
        if "is_active" not in request.data:
            return Response({"error": "Nada que actualizar."}, status=status.HTTP_400_BAD_REQUEST)

        is_active = bool(request.data.get("is_active"))
        if not is_active:
            if user.id == request.user.id:
                return Response({"error": "No puedes desactivar tu propia cuenta."}, status=status.HTTP_400_BAD_REQUEST)
            if InstanceAdmin.objects.filter(instance=instance, user=user).exists():
                return Response(
                    {"error": "Quita primero el rol de súper administrador."}, status=status.HTTP_400_BAD_REQUEST
                )
            user.is_active = False
            # The login adapter only refuses an inactive user once last_logout_time is set.
            user.last_logout_time = timezone.now()
            user.save(update_fields=["is_active", "last_logout_time"])
            _end_sessions(user)
        else:
            user.is_active = True
            user.save(update_fields=["is_active"])

        payload = _users_payload(_users_queryset().filter(pk=user.pk), instance)[0]
        return Response(payload, status=status.HTTP_200_OK)


class InstanceUserResetPasswordEndpoint(BaseAPIView):
    """Give a user a new temporary password, optionally emailing a set-password link."""

    permission_classes = [InstanceAdminPermission]

    def post(self, request, pk):
        user = User.objects.filter(pk=pk, is_bot=False).first()
        if user is None:
            return Response({"error": "El usuario no existe."}, status=status.HTTP_404_NOT_FOUND)
        temp_password = _temporary_password()
        user.set_password(temp_password)
        user.is_password_autoset = False
        user.save(update_fields=["password", "is_password_autoset"])
        if user.id != request.user.id:
            _end_sessions(user)
        if bool(request.data.get("send_email", False)):
            _send_set_password_email(request, user)
        return Response({"temp_password": temp_password}, status=status.HTTP_200_OK)


class InstanceUserSuperAdminEndpoint(BaseAPIView):
    """Grant (POST) or revoke (DELETE) the super-admin role."""

    permission_classes = [InstanceAdminPermission]

    def post(self, request, pk):
        instance = Instance.objects.first()
        user = User.objects.filter(pk=pk, is_bot=False).first()
        if user is None:
            return Response({"error": "El usuario no existe."}, status=status.HTTP_404_NOT_FOUND)
        if not user.is_active:
            return Response({"error": "Activa primero la cuenta."}, status=status.HTTP_400_BAD_REQUEST)
        InstanceAdmin.objects.get_or_create(instance=instance, user=user, defaults={"role": 20, "is_verified": True})
        _invalidate_instance_caches()
        payload = _users_payload(_users_queryset().filter(pk=user.pk), instance)[0]
        return Response(payload, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        instance = Instance.objects.first()
        user = User.objects.filter(pk=pk, is_bot=False).first()
        if user is None:
            return Response({"error": "El usuario no existe."}, status=status.HTTP_404_NOT_FOUND)
        if user.id == request.user.id:
            return Response(
                {"error": "No puedes quitarte el rol a ti mismo. Pídeselo a otro súper administrador."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if InstanceAdmin.objects.filter(instance=instance).exclude(user=user).count() == 0:
            return Response(
                {"error": "Debe quedar al menos un súper administrador."}, status=status.HTTP_400_BAD_REQUEST
            )
        InstanceAdmin.objects.filter(instance=instance, user=user).delete()
        _invalidate_instance_caches()
        payload = _users_payload(_users_queryset().filter(pk=user.pk), instance)[0]
        return Response(payload, status=status.HTTP_200_OK)


class InstanceProjectsEndpoint(BaseAPIView):
    """List every project of every workspace."""

    permission_classes = [InstanceAdminPermission]

    def get(self, request):
        members_count = (
            ProjectMember.objects.filter(project_id=OuterRef("id"), is_active=True, member__is_bot=False)
            .order_by()
            .values("project_id")
            .annotate(c=Count("id"))
            .values("c")
        )
        work_items_count = (
            Issue.issue_objects.filter(project_id=OuterRef("id"))
            .order_by()
            .values("project_id")
            .annotate(c=Count("id"))
            .values("c")
        )
        projects = (
            Project.objects.select_related("workspace")
            .annotate(
                members_count=Coalesce(Subquery(members_count), 0),
                work_items_count=Coalesce(Subquery(work_items_count), 0),
                is_member=Exists(
                    ProjectMember.objects.filter(project_id=OuterRef("id"), member=request.user, is_active=True)
                ),
            )
            .order_by("workspace__name", "name")
        )
        search = (request.query_params.get("search") or "").strip()
        if search:
            projects = projects.filter(
                Q(name__icontains=search) | Q(identifier__icontains=search) | Q(workspace__name__icontains=search)
            )
        data = [
            {
                "id": str(p.id),
                "name": p.name,
                "identifier": p.identifier,
                "network": p.network,
                "logo_props": p.logo_props,
                "archived_at": p.archived_at,
                "created_at": p.created_at,
                "members_count": p.members_count,
                "work_items_count": p.work_items_count,
                "is_member": p.is_member,
                "workspace": {"id": str(p.workspace_id), "slug": p.workspace.slug, "name": p.workspace.name},
            }
            for p in projects[:MAX_PROJECTS]
        ]
        return Response(data, status=status.HTTP_200_OK)


class InstanceProjectJoinEndpoint(BaseAPIView):
    """Make the requesting super admin a member of the project (and its workspace) so its board opens."""

    permission_classes = [InstanceAdminPermission]

    def post(self, request, pk):
        project = Project.objects.select_related("workspace").filter(pk=pk).first()
        if project is None:
            return Response({"error": "El proyecto no existe."}, status=status.HTTP_404_NOT_FOUND)
        user = request.user

        with transaction.atomic():
            ws_member = WorkspaceMember.objects.filter(workspace_id=project.workspace_id, member=user).first()
            if ws_member is None:
                WorkspaceMember.objects.create(workspace_id=project.workspace_id, member=user, role=20)
            else:
                changed = []
                if not ws_member.is_active:
                    ws_member.is_active = True
                    changed.append("is_active")
                if ws_member.role < 15:
                    # Guests cannot hold the project admin role.
                    ws_member.role = 15
                    changed.append("role")
                if changed:
                    ws_member.save(update_fields=changed)

            project_member = ProjectMember.objects.filter(project=project, member=user).first()
            if project_member is None:
                if ProjectUserProperty.objects.filter(project=project, user=user).exists():
                    # ProjectMember.save() would create a duplicate ProjectUserProperty.
                    ProjectMember.objects.bulk_create(
                        [ProjectMember(project=project, workspace_id=project.workspace_id, member=user, role=20)]
                    )
                else:
                    ProjectMember.objects.create(
                        project=project, workspace_id=project.workspace_id, member=user, role=20
                    )
            elif not project_member.is_active or project_member.role != 20:
                project_member.is_active = True
                project_member.role = 20
                project_member.save(update_fields=["is_active", "role"])

        return Response(
            {"workspace_slug": project.workspace.slug, "project_id": str(project.id)}, status=status.HTTP_200_OK
        )


class InstanceWorkspaceOptionsEndpoint(BaseAPIView):
    """Every workspace as {id, slug, name}, for pickers (the paginated list caps at 10 per page)."""

    permission_classes = [InstanceAdminPermission]

    def get(self, request):
        data = [
            {"id": str(w["id"]), "slug": w["slug"], "name": w["name"]}
            for w in Workspace.objects.order_by("name").values("id", "slug", "name")
        ]
        return Response(data, status=status.HTTP_200_OK)
