# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from plane.utils.advanced_search import apply_operator_search


def search_issues(query, queryset, user=None):
    """Search work items with operator query support (falls back to title/description)."""
    return apply_operator_search(queryset, query, user=user)
