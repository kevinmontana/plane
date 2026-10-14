# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import pytest
from django.core.exceptions import ValidationError

from plane.db.models import Issue, IssueWorkLog, Project, State, Workspace


@pytest.fixture
def workspace(create_user):
    return Workspace.objects.create(name="Worklog Workspace", slug="worklog-workspace", owner=create_user)


@pytest.fixture
def project(workspace, create_user):
    return Project.objects.create(
        name="Worklog Project",
        identifier="WL",
        workspace=workspace,
        created_by=create_user,
        is_time_tracking_enabled=True,
    )


@pytest.fixture
def state(project):
    return State.objects.create(name="Todo", project=project, group="backlog", default=True, color="#60646C")


@pytest.fixture
def issue(workspace, project, state, create_user):
    return Issue.objects.create(
        name="Worklog issue",
        workspace=workspace,
        project=project,
        state=state,
        created_by=create_user,
    )


@pytest.mark.unit
class TestIssueWorkLogModel:
    @pytest.mark.django_db
    def test_create_worklog(self, workspace, project, issue, create_user):
        worklog = IssueWorkLog.objects.create(
            workspace=workspace,
            project=project,
            issue=issue,
            actor=create_user,
            duration_minutes=90,
            description="Pairing session",
        )

        assert worklog.duration_minutes == 90
        assert worklog.description == "Pairing session"
        assert worklog.actor_id == create_user.id
        assert worklog.logged_at is not None
        assert IssueWorkLog.objects.filter(issue=issue).count() == 1

    @pytest.mark.django_db
    def test_duration_must_be_positive(self, workspace, project, issue, create_user):
        worklog = IssueWorkLog(
            workspace=workspace,
            project=project,
            issue=issue,
            actor=create_user,
            duration_minutes=0,
        )
        with pytest.raises(ValidationError):
            worklog.full_clean()

    @pytest.mark.django_db
    def test_soft_delete_hides_worklog(self, workspace, project, issue, create_user):
        worklog = IssueWorkLog.objects.create(
            workspace=workspace,
            project=project,
            issue=issue,
            actor=create_user,
            duration_minutes=15,
        )
        worklog.delete()
        assert not IssueWorkLog.objects.filter(pk=worklog.pk).exists()
        assert IssueWorkLog.all_objects.filter(pk=worklog.pk, deleted_at__isnull=False).exists()
