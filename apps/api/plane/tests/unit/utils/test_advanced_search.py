# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import pytest
from django.db.models import Q

from plane.utils.advanced_search import (
    SearchToken,
    apply_operator_search,
    build_issue_search_q,
    get_operator_search_query,
    parse_operator_query,
)


@pytest.mark.unit
class TestParseOperatorQuery:
    def test_empty_and_whitespace(self):
        assert parse_operator_query("") == []
        assert parse_operator_query("   ") == []

    def test_bare_words_are_and_tokens(self):
        tokens = parse_operator_query("login bug")
        assert tokens == [
            SearchToken(field=None, value="login", negated=False),
            SearchToken(field=None, value="bug", negated=False),
        ]

    def test_quoted_phrase_is_one_bare_token(self):
        tokens = parse_operator_query('"login bug"')
        assert tokens == [SearchToken(field=None, value="login bug", negated=False)]

    def test_operators_are_case_insensitive(self):
        tokens = parse_operator_query("Assignee:Me STATUS:Started Priority:HIGH")
        assert [t.field for t in tokens] == ["assignee", "status", "priority"]
        assert [t.value for t in tokens] == ["Me", "Started", "HIGH"]

    def test_known_operators(self):
        tokens = parse_operator_query(
            "assignee:alex@vtv.cl status:started priority:urgent label:bug project:VTV cycle:Sprint type:issue"
        )
        assert [(t.field, t.value, t.negated) for t in tokens] == [
            ("assignee", "alex@vtv.cl", False),
            ("status", "started", False),
            ("priority", "urgent", False),
            ("label", "bug", False),
            ("project", "VTV", False),
            ("cycle", "Sprint", False),
            ("type", "issue", False),
        ]

    def test_quoted_operator_value(self):
        tokens = parse_operator_query('label:"hot fix" assignee:"Alex Montana"')
        assert tokens == [
            SearchToken(field="label", value="hot fix", negated=False),
            SearchToken(field="assignee", value="Alex Montana", negated=False),
        ]

    def test_negation_only_for_known_operators(self):
        tokens = parse_operator_query("-assignee:me login -unknown:foo")
        assert tokens == [
            SearchToken(field="assignee", value="me", negated=True),
            SearchToken(field=None, value="login", negated=False),
            SearchToken(field=None, value="-unknown:foo", negated=False),
        ]

    def test_unknown_operator_is_bare_text(self):
        tokens = parse_operator_query("foo:bar")
        assert tokens == [SearchToken(field=None, value="foo:bar", negated=False)]

    def test_empty_operator_value_is_bare_text(self):
        tokens = parse_operator_query("assignee:")
        assert tokens == [SearchToken(field=None, value="assignee:", negated=False)]

    def test_injection_payload_is_a_value_not_a_lookup(self):
        tokens = parse_operator_query("assignee:created_by__password")
        assert tokens == [SearchToken(field="assignee", value="created_by__password", negated=False)]


class _FakeUser:
    def __init__(self, user_id):
        self.id = user_id


class _FakeParams(dict):
    def get(self, key, default=None):
        return dict.get(self, key, default)


class _FakeRequest:
    def __init__(self, params, user=None):
        self.query_params = params
        self.GET = params
        self.user = user


@pytest.mark.unit
class TestBuildIssueSearchQ:
    def test_assignee_me_uses_user_id(self):
        q = build_issue_search_q(parse_operator_query("assignee:me"), user=_FakeUser("user-1"))
        assert q == Q(issue_assignee__assignee_id="user-1", issue_assignee__deleted_at__isnull=True)

    def test_assignee_me_without_user_matches_nothing(self):
        q = build_issue_search_q(parse_operator_query("assignee:me"), user=None)
        assert q == Q(pk__in=[])

    def test_negated_assignee_me(self):
        q = build_issue_search_q(parse_operator_query("-assignee:me"), user=_FakeUser("user-1"))
        assert q == ~Q(issue_assignee__assignee_id="user-1", issue_assignee__deleted_at__isnull=True)

    def test_priority_allowlist(self):
        valid = build_issue_search_q(parse_operator_query("priority:URGENT"))
        invalid = build_issue_search_q(parse_operator_query("priority:critical"))
        assert valid == Q(priority__iexact="URGENT")
        assert invalid == Q(pk__in=[])

    def test_status_group_or_name(self):
        q = build_issue_search_q(parse_operator_query("status:started"))
        assert q == (Q(state__name__iexact="started") | Q(state__group__iexact="started"))

    def test_status_custom_name(self):
        q = build_issue_search_q(parse_operator_query('status:"En curso"'))
        assert q == Q(state__name__iexact="En curso")

    def test_type_issue_and_epic(self):
        issue_q = build_issue_search_q(parse_operator_query("type:issue"))
        epic_q = build_issue_search_q(parse_operator_query("type:epic"))
        assert issue_q == (Q(type__is_epic=False) | Q(type__isnull=True))
        assert epic_q == Q(type__is_epic=True)

    def test_and_combination(self):
        q = build_issue_search_q(parse_operator_query("assignee:me status:started login"), user=_FakeUser("user-1"))
        expected = (
            Q(issue_assignee__assignee_id="user-1", issue_assignee__deleted_at__isnull=True)
            & (Q(state__name__iexact="started") | Q(state__group__iexact="started"))
            & (Q(name__icontains="login") | Q(description_stripped__icontains="login") | Q(project__identifier__icontains="login"))
        )
        assert q == expected

    def test_lookup_injection_stays_in_value_position(self):
        q = build_issue_search_q(parse_operator_query("label:name__iexact"))
        assert q == Q(labels__name__iexact="name__iexact", label_issue__deleted_at__isnull=True)
        flattened = str(q)
        assert "label_issue__deleted_at" in flattened
        assert "labels__name__iexact" in flattened

    def test_numeric_bare_word_includes_sequence_id(self):
        q = build_issue_search_q(parse_operator_query("42"))
        assert "sequence_id" in str(q)


@pytest.mark.unit
class TestApplyAndRequestHelpers:
    def test_get_operator_search_query_prefers_search_query(self):
        request = _FakeRequest({"search_query": "assignee:me", "q": "ignored"})
        assert get_operator_search_query(request) == "assignee:me"

    def test_get_operator_search_query_falls_back_to_q(self):
        request = _FakeRequest({"q": "status:started"})
        assert get_operator_search_query(request) == "status:started"

    def test_get_operator_search_query_empty(self):
        assert get_operator_search_query(_FakeRequest({})) == ""

    def test_apply_operator_search_noop_on_empty(self):
        sentinel = object()
        assert apply_operator_search(sentinel, "") is sentinel
        assert apply_operator_search(sentinel, None) is sentinel
