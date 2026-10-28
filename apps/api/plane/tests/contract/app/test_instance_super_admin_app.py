# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""Contract tests for the VTV super-admin endpoints exposed to God Mode.

Super admins are instance admins (``InstanceAdmin``). They manage every user and
project of the instance: list users, create accounts (public sign-up is
disabled), deactivate, reset passwords, grant/revoke super admin, list every
project and join any project to open its board.
"""

import uuid
from unittest.mock import patch

import pytest
from django.test import Client
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

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
    WorkspaceMemberInvite,
)
from plane.license.models import Instance, InstanceAdmin, InstanceConfiguration


@pytest.fixture
def instance(db):
    return Instance.objects.create(
        instance_name="VTV",
        instance_id=str(uuid.uuid4()),
        current_version="1.4.2",
        domain="http://localhost:8000",
        last_checked_at=timezone.now(),
        is_setup_done=True,
    )


@pytest.fixture
def super_admin(db, instance):
    user = User.objects.create(email="admin@vtv.test", first_name="Admin", username=uuid.uuid4().hex)
    user.set_password("Admin#2026-seguro")
    user.save()
    Profile.objects.create(user=user)
    InstanceAdmin.objects.create(instance=instance, user=user, role=20)
    return user


@pytest.fixture
def regular_user(db):
    user = User.objects.create(email="persona@vtv.test", first_name="Persona", username=uuid.uuid4().hex)
    user.set_password("Persona#2026-seguro")
    user.save()
    Profile.objects.create(user=user)
    return user


@pytest.fixture
def admin_client(super_admin):
    client = APIClient()
    client.force_authenticate(user=super_admin)
    return client


@pytest.fixture
def other_workspace(db, regular_user):
    ws = Workspace.objects.create(name="Prensa", owner=regular_user, slug="prensa")
    WorkspaceMember.objects.create(workspace=ws, member=regular_user, role=20)
    return ws


@pytest.fixture
def secret_project(db, other_workspace, regular_user):
    project = Project.objects.create(
        name="Noticiero", identifier="NOT", workspace=other_workspace, network=0, created_by=regular_user
    )
    ProjectMember.objects.create(project=project, member=regular_user, workspace=other_workspace, role=20)
    Issue.objects.create(name="Pauta del lunes", project=project, workspace=other_workspace)
    return project


@pytest.mark.contract
class TestSuperAdminPermissions:
    @pytest.mark.django_db
    def test_regular_user_cannot_list_users(self, instance, regular_user):
        client = APIClient()
        client.force_authenticate(user=regular_user)
        assert client.get(reverse("instance-users")).status_code == status.HTTP_403_FORBIDDEN
        assert client.get(reverse("instance-projects")).status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.django_db
    def test_anonymous_cannot_list_users(self, instance):
        assert APIClient().get(reverse("instance-users")).status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )


@pytest.mark.contract
class TestSuperAdminUsers:
    @pytest.mark.django_db
    def test_list_users_includes_flags_and_workspaces(self, admin_client, super_admin, regular_user, other_workspace):
        response = admin_client.get(reverse("instance-users"))
        assert response.status_code == status.HTTP_200_OK
        by_email = {u["email"]: u for u in response.data}
        assert by_email["admin@vtv.test"]["is_super_admin"] is True
        assert by_email["persona@vtv.test"]["is_super_admin"] is False
        assert by_email["persona@vtv.test"]["workspaces"] == [
            {"id": str(other_workspace.id), "slug": "prensa", "name": "Prensa", "role": 20}
        ]

    @pytest.mark.django_db
    def test_list_users_search(self, admin_client, super_admin, regular_user):
        response = admin_client.get(reverse("instance-users"), {"search": "persona"})
        assert [u["email"] for u in response.data] == ["persona@vtv.test"]

    @pytest.mark.django_db
    @patch("plane.license.api.views.super_admin.forgot_password.delay")
    def test_create_user_in_workspace(self, mock_email, admin_client, other_workspace):
        response = admin_client.post(
            reverse("instance-users"),
            {
                "email": "  Nueva@VTV.test ",
                "first_name": "Nueva",
                "last_name": "Persona",
                "workspace_id": str(other_workspace.id),
                "workspace_role": 15,
                "send_email": True,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED, response.data
        temp_password = response.data["temp_password"]
        assert len(temp_password) >= 12

        user = User.objects.get(email="nueva@vtv.test")
        assert user.check_password(temp_password)
        assert user.is_password_autoset is False
        assert user.first_name == "Nueva" and user.last_name == "Persona"
        member = WorkspaceMember.objects.get(workspace=other_workspace, member=user)
        assert member.role == 15
        profile = Profile.objects.get(user=user)
        assert profile.is_onboarded is True
        assert profile.last_workspace_id == other_workspace.id
        mock_email.assert_called_once()

    @pytest.mark.django_db
    @patch("plane.license.api.views.super_admin.forgot_password.delay")
    def test_create_user_without_workspace_keeps_onboarding(self, mock_email, admin_client):
        response = admin_client.post(
            reverse("instance-users"),
            {"email": "sola@vtv.test", "first_name": "Sola", "send_email": False},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED, response.data
        profile = Profile.objects.get(user__email="sola@vtv.test")
        assert profile.is_onboarded is False
        assert profile.onboarding_step["profile_complete"] is True
        mock_email.assert_not_called()

    @pytest.mark.django_db
    def test_create_user_rejects_duplicates_and_bad_email(self, admin_client, regular_user):
        url = reverse("instance-users")
        dup = admin_client.post(url, {"email": "PERSONA@vtv.test", "first_name": "X"}, format="json")
        assert dup.status_code == status.HTTP_409_CONFLICT
        bad = admin_client.post(url, {"email": "no-es-correo", "first_name": "X"}, format="json")
        assert bad.status_code == status.HTTP_400_BAD_REQUEST
        no_name = admin_client.post(url, {"email": "ok@vtv.test", "first_name": " "}, format="json")
        assert no_name.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_deactivate_and_reactivate_user(self, admin_client, regular_user):
        Session.objects.create(
            session_key="s" * 32, session_data="x", expire_date=timezone.now(), user_id=str(regular_user.id)
        )
        url = reverse("instance-user-detail", kwargs={"pk": regular_user.id})

        response = admin_client.patch(url, {"is_active": False}, format="json")
        assert response.status_code == status.HTTP_200_OK
        regular_user.refresh_from_db()
        assert regular_user.is_active is False
        assert regular_user.last_logout_time is not None
        assert not Session.objects.filter(user_id=str(regular_user.id)).exists()

        response = admin_client.patch(url, {"is_active": True}, format="json")
        assert response.status_code == status.HTTP_200_OK
        regular_user.refresh_from_db()
        assert regular_user.is_active is True

    @pytest.mark.django_db
    def test_cannot_deactivate_self_or_a_super_admin(self, admin_client, super_admin, instance, regular_user):
        own = admin_client.patch(
            reverse("instance-user-detail", kwargs={"pk": super_admin.id}), {"is_active": False}, format="json"
        )
        assert own.status_code == status.HTTP_400_BAD_REQUEST
        InstanceAdmin.objects.create(instance=instance, user=regular_user, role=20)
        other = admin_client.patch(
            reverse("instance-user-detail", kwargs={"pk": regular_user.id}), {"is_active": False}, format="json"
        )
        assert other.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_reset_password_returns_working_password(self, admin_client, regular_user):
        response = admin_client.post(
            reverse("instance-user-reset-password", kwargs={"pk": regular_user.id}),
            {"send_email": False},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        regular_user.refresh_from_db()
        assert regular_user.check_password(response.data["temp_password"])
        assert not regular_user.check_password("Persona#2026-seguro")


@pytest.mark.contract
class TestSuperAdminRole:
    @pytest.mark.django_db
    def test_grant_and_revoke_super_admin(self, admin_client, instance, regular_user):
        url = reverse("instance-user-super-admin", kwargs={"pk": regular_user.id})
        assert admin_client.post(url).status_code == status.HTTP_200_OK
        assert InstanceAdmin.objects.filter(instance=instance, user=regular_user).exists()
        # Granting twice is idempotent
        assert admin_client.post(url).status_code == status.HTTP_200_OK
        assert InstanceAdmin.objects.filter(instance=instance, user=regular_user).count() == 1

        assert admin_client.delete(url).status_code == status.HTTP_200_OK
        assert not InstanceAdmin.objects.filter(instance=instance, user=regular_user).exists()

    @pytest.mark.django_db
    def test_cannot_revoke_self(self, admin_client, super_admin):
        url = reverse("instance-user-super-admin", kwargs={"pk": super_admin.id})
        assert admin_client.delete(url).status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_cannot_grant_to_inactive_user(self, admin_client, regular_user):
        regular_user.is_active = False
        regular_user.save()
        url = reverse("instance-user-super-admin", kwargs={"pk": regular_user.id})
        assert admin_client.post(url).status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.contract
class TestSuperAdminWorkspaceOptions:
    @pytest.mark.django_db
    def test_lists_every_workspace_without_pagination(self, admin_client, regular_user):
        for i in range(12):
            Workspace.objects.create(name=f"Area {i:02d}", owner=regular_user, slug=f"area-{i:02d}")
        response = admin_client.get(reverse("instance-workspace-options"))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 12
        assert response.data[0] == {"id": response.data[0]["id"], "slug": "area-00", "name": "Area 00"}


@pytest.mark.contract
class TestSuperAdminProjects:
    @pytest.mark.django_db
    def test_list_projects_across_workspaces(self, admin_client, secret_project):
        response = admin_client.get(reverse("instance-projects"))
        assert response.status_code == status.HTTP_200_OK
        [project] = [p for p in response.data if p["id"] == str(secret_project.id)]
        assert project["workspace"] == {"id": str(secret_project.workspace_id), "slug": "prensa", "name": "Prensa"}
        assert project["members_count"] == 1
        assert project["work_items_count"] == 1
        assert project["is_member"] is False
        assert project["network"] == 0

    @pytest.mark.django_db
    def test_join_project_grants_admin_access_and_is_idempotent(self, admin_client, super_admin, secret_project):
        url = reverse("instance-project-join", kwargs={"pk": secret_project.id})
        response = admin_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data == {"workspace_slug": "prensa", "project_id": str(secret_project.id)}

        ws_member = WorkspaceMember.objects.get(workspace=secret_project.workspace, member=super_admin)
        assert ws_member.is_active and ws_member.role == 20
        project_member = ProjectMember.objects.get(project=secret_project, member=super_admin)
        assert project_member.is_active and project_member.role == 20
        assert ProjectUserProperty.objects.filter(project=secret_project, user=super_admin).count() == 1

        assert admin_client.post(url).status_code == status.HTTP_200_OK
        assert ProjectMember.objects.filter(project=secret_project, member=super_admin).count() == 1
        listed = admin_client.get(reverse("instance-projects")).data
        assert [p["is_member"] for p in listed if p["id"] == str(secret_project.id)] == [True]

    @pytest.mark.django_db
    def test_join_reactivates_previous_membership(self, admin_client, super_admin, secret_project):
        WorkspaceMember.objects.create(workspace=secret_project.workspace, member=super_admin, role=5, is_active=False)
        response = admin_client.post(reverse("instance-project-join", kwargs={"pk": secret_project.id}))
        assert response.status_code == status.HTTP_200_OK
        ws_member = WorkspaceMember.objects.get(workspace=secret_project.workspace, member=super_admin)
        assert ws_member.is_active is True
        assert ws_member.role == 15


@pytest.mark.contract
class TestSignupOnlyBySuperAdmins:
    @pytest.mark.django_db
    def test_invite_does_not_bypass_disabled_signup(self, instance, other_workspace, regular_user):
        InstanceConfiguration.objects.update_or_create(
            key="ENABLE_SIGNUP", defaults={"value": "0", "category": "AUTHENTICATION"}
        )
        WorkspaceMemberInvite.objects.create(
            workspace=other_workspace,
            email="invitada@vtv.test",
            role=15,
            token=uuid.uuid4().hex,
            created_by=regular_user,
        )
        client = Client(HTTP_USER_AGENT="Mozilla/5.0")
        response = client.post(
            reverse("sign-up"), {"email": "invitada@vtv.test", "password": "Invitada#2026-seguro"}, follow=False
        )
        assert response.status_code == 302
        assert "SIGNUP_DISABLED" in response.url
        assert not User.objects.filter(email="invitada@vtv.test").exists()
