/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import useSWR from "swr";
import { useTranslation } from "@plane/i18n";
import { IssueWorkLogService } from "@/services/issue";
import { formatDurationMinutes } from "./helper";

const worklogService = new IssueWorkLogService();

type Props = {
  workspaceSlug: string;
  projectId: string;
};

export const ProjectWorklogReport = observer(function ProjectWorklogReport(props: Props) {
  const { workspaceSlug, projectId } = props;
  const { t } = useTranslation();
  const { data, isLoading } = useSWR(
    workspaceSlug && projectId ? ["PROJECT_WORKLOG_REPORT", workspaceSlug, projectId] : null,
    () => worklogService.getProjectReport(workspaceSlug, projectId, { days: 30 })
  );

  if (isLoading && !data) {
    return <p className="mt-6 text-13 text-tertiary">{t("loading")}</p>;
  }

  if (!data) return null;

  return (
    <div className="mt-8 space-y-6">
      <div>
        <h3 className="text-14 font-medium">{t("project_settings.features.time_tracking.report_title")}</h3>
        <p className="mt-1 text-13 text-tertiary">
          {t("project_settings.features.time_tracking.report_period")} ·{" "}
          {t("project_settings.features.time_tracking.total")}: {formatDurationMinutes(data.total_duration_minutes)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-md border border-subtle">
          <div className="border-b border-subtle px-3 py-2 text-13 font-medium">
            {t("project_settings.features.time_tracking.by_user")}
          </div>
          {data.by_user.length === 0 ? (
            <p className="px-3 py-2 text-13 text-tertiary">{t("project_settings.features.time_tracking.no_entries")}</p>
          ) : (
            data.by_user.map((row) => (
              <div
                key={row.actor_id}
                className="flex items-center justify-between gap-3 border-t border-subtle px-3 py-2 text-13"
              >
                <span className="truncate">{row.display_name}</span>
                <span className="text-tertiary">{formatDurationMinutes(row.total_duration_minutes)}</span>
              </div>
            ))
          )}
        </div>
        <div className="overflow-hidden rounded-md border border-subtle">
          <div className="border-b border-subtle px-3 py-2 text-13 font-medium">
            {t("project_settings.features.time_tracking.by_issue")}
          </div>
          {data.by_issue.length === 0 ? (
            <p className="px-3 py-2 text-13 text-tertiary">{t("project_settings.features.time_tracking.no_entries")}</p>
          ) : (
            data.by_issue.map((row) => (
              <div
                key={row.issue_id}
                className="flex items-center justify-between gap-3 border-t border-subtle px-3 py-2 text-13"
              >
                <span className="truncate">
                  {row.identifier} {row.name}
                </span>
                <span className="text-tertiary">{formatDurationMinutes(row.total_duration_minutes)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
});
