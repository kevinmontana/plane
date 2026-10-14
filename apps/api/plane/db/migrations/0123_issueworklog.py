# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import django.core.validators
import django.db.models.deletion
import django.utils.timezone
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("db", "0122_alter_draftissue_assignees_alter_issue_assignees_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="IssueWorkLog",
            fields=[
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Created At"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="Last Modified At"),
                ),
                (
                    "deleted_at",
                    models.DateTimeField(blank=True, null=True, verbose_name="Deleted At"),
                ),
                (
                    "id",
                    models.UUIDField(
                        db_index=True,
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                        unique=True,
                    ),
                ),
                (
                    "duration_minutes",
                    models.PositiveIntegerField(validators=[django.core.validators.MinValueValidator(1)]),
                ),
                ("description", models.TextField(blank=True, default="")),
                (
                    "logged_at",
                    models.DateTimeField(default=django.utils.timezone.now),
                ),
                (
                    "actor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="issue_worklogs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_created_by",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Created By",
                    ),
                ),
                (
                    "issue",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="worklogs",
                        to="db.issue",
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="project_%(class)s",
                        to="db.project",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_updated_by",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Last Modified By",
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="workspace_%(class)s",
                        to="db.workspace",
                    ),
                ),
            ],
            options={
                "verbose_name": "Issue Work Log",
                "verbose_name_plural": "Issue Work Logs",
                "db_table": "issue_worklogs",
                "ordering": ("-logged_at", "-created_at"),
            },
        ),
        migrations.AddIndex(
            model_name="issueworklog",
            index=models.Index(fields=["issue", "-logged_at"], name="issue_workl_issue_i_logged_idx"),
        ),
        migrations.AddIndex(
            model_name="issueworklog",
            index=models.Index(fields=["project", "-logged_at"], name="issue_workl_project_logged_idx"),
        ),
        migrations.AddIndex(
            model_name="issueworklog",
            index=models.Index(
                fields=["workspace", "actor", "-logged_at"],
                name="issue_workl_workspa_actor_idx",
            ),
        ),
    ]
