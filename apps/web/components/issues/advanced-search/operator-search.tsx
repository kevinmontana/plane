/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { CloseOutline, SearchOutline } from "@makeplane/propel/icons";
import { useTranslation } from "@plane/i18n";
import { EIssuesStoreType } from "@plane/types";
import { cn } from "@plane/utils";
import { useIssuesStore, useIssueStoreType } from "@/hooks/use-issue-layout-store";
import useDebounce from "@/hooks/use-debounce";

type TOperatorSearchFilter = {
  operatorSearchQuery: string;
};

type TOperatorSearchIssues = {
  fetchIssuesWithExistingPagination: (...args: string[]) => Promise<unknown> | undefined;
};

const refetchWithOperatorSearch = (
  issuesFilter: TOperatorSearchFilter,
  issues: TOperatorSearchIssues,
  storeType: EIssuesStoreType,
  route: Record<string, string | undefined>,
  query: string
) => {
  issuesFilter.operatorSearchQuery = query;
  const slug = route.workspaceSlug;
  if (!slug) return;

  switch (storeType) {
    case EIssuesStoreType.GLOBAL:
      if (route.globalViewId) void issues.fetchIssuesWithExistingPagination(slug, route.globalViewId, "mutation");
      return;
    case EIssuesStoreType.PROFILE:
      if (route.userId) void issues.fetchIssuesWithExistingPagination(slug, route.userId, "mutation");
      return;
    case EIssuesStoreType.CYCLE:
      if (route.projectId && route.cycleId) {
        void issues.fetchIssuesWithExistingPagination(slug, route.projectId, "mutation", route.cycleId);
      }
      return;
    case EIssuesStoreType.MODULE:
      if (route.projectId && route.moduleId) {
        void issues.fetchIssuesWithExistingPagination(slug, route.projectId, "mutation", route.moduleId);
      }
      return;
    case EIssuesStoreType.PROJECT_VIEW:
    case EIssuesStoreType.TEAM_VIEW:
      if (route.projectId && route.viewId) {
        void issues.fetchIssuesWithExistingPagination(slug, route.projectId, route.viewId, "mutation");
      }
      return;
    default:
      if (route.projectId) void issues.fetchIssuesWithExistingPagination(slug, route.projectId, "mutation");
  }
};

type TWorkItemOperatorSearchProps = {
  className?: string;
};

export const WorkItemOperatorSearch = observer(function WorkItemOperatorSearch(props: TWorkItemOperatorSearchProps) {
  const { className } = props;
  const { t } = useTranslation();
  const storeType = useIssueStoreType();
  const { issues, issuesFilter } = useIssuesStore();
  const { workspaceSlug, projectId, cycleId, moduleId, globalViewId, viewId, userId } = useParams();

  const [value, setValue] = useState(issuesFilter.operatorSearchQuery ?? "");
  const debouncedValue = useDebounce(value, 400);

  const route = {
    workspaceSlug: workspaceSlug?.toString(),
    projectId: projectId?.toString(),
    cycleId: cycleId?.toString(),
    moduleId: moduleId?.toString(),
    globalViewId: globalViewId?.toString(),
    viewId: viewId?.toString(),
    userId: userId?.toString(),
  };

  useEffect(() => {
    if (debouncedValue === (issuesFilter.operatorSearchQuery ?? "")) return;
    refetchWithOperatorSearch(issuesFilter, issues as TOperatorSearchIssues, storeType, route, debouncedValue);
    // Intentionally keyed on the debounced query so route identity does not retrigger a fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue]);

  const handleClear = () => {
    setValue("");
    refetchWithOperatorSearch(issuesFilter, issues as TOperatorSearchIssues, storeType, route, "");
  };

  return (
    <div className={cn("hidden max-w-80 min-w-52 flex-col md:flex", className)}>
      <div className="flex items-center gap-1.5 rounded-md border border-subtle bg-surface-1 px-2 py-1">
        <SearchOutline className="size-3.5 shrink-0 text-placeholder" />
        <input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              refetchWithOperatorSearch(issuesFilter, issues as TOperatorSearchIssues, storeType, route, value);
            }
          }}
          placeholder={t("advanced_search.placeholder")}
          aria-label={t("advanced_search.placeholder")}
          title={t("advanced_search.hint")}
          className="w-full min-w-0 border-none bg-transparent text-13 text-primary placeholder:text-placeholder focus:outline-none"
        />
        {value ? (
          <button type="button" className="grid place-items-center text-placeholder" onClick={handleClear}>
            <CloseOutline className="size-3" />
          </button>
        ) : null}
      </div>
      <p className="truncate pt-0.5 text-11 text-tertiary" title={t("advanced_search.hint")}>
        {t("advanced_search.hint_short")}
      </p>
    </div>
  );
});
