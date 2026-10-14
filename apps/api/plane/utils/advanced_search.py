# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""Operator work-item search (not Plane Pro PQL).

Grammar (tokens separated by whitespace, combinable with implicit AND):

    assignee:me | assignee:<display_name_or_email>
    status:<state_name_or_group>
    priority:urgent|high|medium|low|none
    label:<name>
    project:<name_or_identifier>
    cycle:<name>
    type:issue|epic
    -operator:value          negation
    "quoted value"           phrase / value with spaces
    bare words               title or description contains

Values are always bound as ORM lookup parameters — never interpolated into SQL.
"""

from __future__ import annotations

import shlex
from dataclasses import dataclass
from typing import Iterable

from django.db.models import Q

OPERATORS = frozenset({"assignee", "status", "priority", "label", "project", "cycle", "type"})
STATE_GROUPS = frozenset({"backlog", "unstarted", "started", "completed", "cancelled"})
PRIORITIES = frozenset({"urgent", "high", "medium", "low", "none"})
OPERATOR_SEARCH_PARAMS = ("search_query", "q")


@dataclass(frozen=True)
class SearchToken:
    field: str | None
    value: str
    negated: bool = False


def _split_query(query: str) -> list[str]:
    lexer = shlex.shlex(query, posix=True)
    lexer.whitespace_split = True
    lexer.commenters = ""
    try:
        return list(lexer)
    except ValueError:
        return query.split()


def parse_operator_query(query: str) -> list[SearchToken]:
    """Parse an operator query into tokens. Pure string processing — no ORM."""
    if not query or not query.strip():
        return []

    tokens: list[SearchToken] = []
    for raw in _split_query(query.strip()):
        if raw == "":
            continue

        negated = False
        body = raw
        if body.startswith("-") and ":" in body[1:]:
            field_candidate, _, _ = body[1:].partition(":")
            if field_candidate.lower() in OPERATORS:
                negated = True
                body = body[1:]

        if ":" in body:
            field, _, value = body.partition(":")
            field_key = field.lower()
            if field_key in OPERATORS and value != "":
                tokens.append(SearchToken(field=field_key, value=value, negated=negated))
                continue

        tokens.append(SearchToken(field=None, value=raw, negated=False))
    return tokens


def _assignee_q(value: str, user) -> Q:
    if value.lower() == "me":
        user_id = getattr(user, "id", None)
        if not user_id:
            return Q(pk__in=[])
        return Q(
            issue_assignee__assignee_id=user_id,
            issue_assignee__deleted_at__isnull=True,
        )
    return (
        Q(
            issue_assignee__assignee__display_name__icontains=value,
            issue_assignee__deleted_at__isnull=True,
        )
        | Q(
            issue_assignee__assignee__email__icontains=value,
            issue_assignee__deleted_at__isnull=True,
        )
        | Q(
            issue_assignee__assignee__first_name__icontains=value,
            issue_assignee__deleted_at__isnull=True,
        )
        | Q(
            issue_assignee__assignee__last_name__icontains=value,
            issue_assignee__deleted_at__isnull=True,
        )
    )


def _status_q(value: str) -> Q:
    clause = Q(state__name__iexact=value)
    if value.lower() in STATE_GROUPS:
        clause |= Q(state__group__iexact=value)
    return clause


def _priority_q(value: str) -> Q:
    if value.lower() not in PRIORITIES:
        return Q(pk__in=[])
    return Q(priority__iexact=value)


def _label_q(value: str) -> Q:
    return Q(labels__name__iexact=value, label_issue__deleted_at__isnull=True)


def _project_q(value: str) -> Q:
    return Q(project__name__icontains=value) | Q(project__identifier__iexact=value)


def _cycle_q(value: str) -> Q:
    return Q(issue_cycle__cycle__name__icontains=value, issue_cycle__deleted_at__isnull=True)


def _type_q(value: str) -> Q:
    normalized = value.lower()
    if normalized == "epic":
        return Q(type__is_epic=True)
    if normalized == "issue":
        return Q(type__is_epic=False) | Q(type__isnull=True)
    return Q(type__name__iexact=value)


def _bare_word_q(value: str) -> Q:
    clause = Q(name__icontains=value) | Q(description_stripped__icontains=value) | Q(project__identifier__icontains=value)
    if value.isdigit() and len(value) <= 20:
        clause |= Q(sequence_id=int(value))
    return clause


def _token_to_q(token: SearchToken, user) -> Q:
    if token.field == "assignee":
        return _assignee_q(token.value, user)
    if token.field == "status":
        return _status_q(token.value)
    if token.field == "priority":
        return _priority_q(token.value)
    if token.field == "label":
        return _label_q(token.value)
    if token.field == "project":
        return _project_q(token.value)
    if token.field == "cycle":
        return _cycle_q(token.value)
    if token.field == "type":
        return _type_q(token.value)
    return _bare_word_q(token.value)


def build_issue_search_q(tokens: Iterable[SearchToken], user=None) -> Q:
    """Combine parsed tokens into a Django Q (implicit AND, optional negation)."""
    combined = Q()
    for token in tokens:
        piece = _token_to_q(token, user)
        combined &= ~piece if token.negated else piece
    return combined


def get_operator_search_query(request) -> str:
    params = getattr(request, "query_params", None) or getattr(request, "GET", {})
    for name in OPERATOR_SEARCH_PARAMS:
        value = params.get(name)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def apply_operator_search(queryset, query: str | None, user=None):
    """Filter an Issue queryset with the operator language. No-op on empty query."""
    if not query or not str(query).strip():
        return queryset
    tokens = parse_operator_query(str(query))
    if not tokens:
        return queryset
    return queryset.filter(build_issue_search_q(tokens, user=user)).distinct()


def apply_operator_search_from_request(queryset, request, extra_query: str | None = None):
    query = extra_query if extra_query is not None else get_operator_search_query(request)
    return apply_operator_search(queryset, query, user=getattr(request, "user", None))
