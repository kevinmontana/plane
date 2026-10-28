# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db import migrations
from django.utils import timezone

VTV_DEFAULT_STATES = [
    {
        "name": "New",
        "color": "#6B7280",
        "sequence": 10000,
        "group": "unstarted",
        "default": True,
        "is_triage": False,
    },
    {
        "name": "Backlog",
        "color": "#60646C",
        "sequence": 20000,
        "group": "backlog",
        "default": False,
        "is_triage": False,
    },
    {
        "name": "Plan",
        "color": "#3B82F6",
        "sequence": 30000,
        "group": "unstarted",
        "default": False,
        "is_triage": False,
    },
    {
        "name": "Build",
        "color": "#F59E0B",
        "sequence": 40000,
        "group": "started",
        "default": False,
        "is_triage": False,
    },
    {
        "name": "Test",
        "color": "#8B5CF6",
        "sequence": 50000,
        "group": "started",
        "default": False,
        "is_triage": False,
    },
    {
        "name": "Verify",
        "color": "#0EA5E9",
        "sequence": 60000,
        "group": "started",
        "default": False,
        "is_triage": False,
    },
    {
        "name": "Done",
        "color": "#46A758",
        "sequence": 70000,
        "group": "completed",
        "default": False,
        "is_triage": False,
    },
    {
        "name": "Cancelled",
        "color": "#9AA4BC",
        "sequence": 80000,
        "group": "cancelled",
        "default": False,
        "is_triage": False,
    },
    {
        "name": "Triage",
        "color": "#4E5355",
        "sequence": 90000,
        "group": "triage",
        "default": False,
        "is_triage": True,
    },
]

LEGACY_RENAMES = {
    "Todo": "New",
    "In Progress": "Build",
}


def apply_vtv_default_states(apps, _schema_editor):
    Project = apps.get_model("db", "Project")
    State = apps.get_model("db", "State")
    Issue = apps.get_model("db", "Issue")

    now = timezone.now()
    target_names = {spec["name"] for spec in VTV_DEFAULT_STATES}

    for project in Project.objects.all():
        states = {
            state.name: state
            for state in State.objects.filter(project_id=project.id, deleted_at__isnull=True)
        }

        for old_name, new_name in LEGACY_RENAMES.items():
            if old_name in states and new_name not in states:
                state = states.pop(old_name)
                state.name = new_name
                state.save(update_fields=["name"])
                states[new_name] = state

        State.objects.filter(project_id=project.id, deleted_at__isnull=True).update(default=False)

        for spec in VTV_DEFAULT_STATES:
            state = states.get(spec["name"])
            if state is None:
                State.objects.create(
                    name=spec["name"],
                    color=spec["color"],
                    sequence=spec["sequence"],
                    group=spec["group"],
                    default=spec["default"],
                    is_triage=spec["is_triage"],
                    project_id=project.id,
                    workspace_id=project.workspace_id,
                )
                continue
            state.color = spec["color"]
            state.sequence = spec["sequence"]
            state.group = spec["group"]
            state.default = spec["default"]
            state.is_triage = spec["is_triage"]
            state.save(update_fields=["color", "sequence", "group", "default", "is_triage"])

        leftovers = State.objects.filter(
            project_id=project.id,
            deleted_at__isnull=True,
        ).exclude(name__in=target_names)
        for leftover in leftovers:
            if Issue.objects.filter(state_id=leftover.id, deleted_at__isnull=True).exists():
                leftover.default = False
                leftover.save(update_fields=["default"])
                continue
            leftover.deleted_at = now
            leftover.save(update_fields=["deleted_at"])


def noop(_apps, _schema_editor):
    return None


class Migration(migrations.Migration):
    dependencies = [
        ("db", "0124_profile_default_language_es"),
    ]

    operations = [
        migrations.RunPython(apply_vtv_default_states, noop),
    ]
