/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { LinearProgress } from "@makeplane/propel/components/linear-progress";
import { useTranslation } from "@plane/i18n";
import { EmptyStateCompact } from "@plane/blocks/empty-state";
import { Loader } from "@plane/blocks/skeleton";
import type { ICycle } from "@plane/types";
import { useAnalytics } from "@/hooks/store/use-analytics";
import { useProject } from "@/hooks/store/use-project";
import { CycleService } from "@/services/cycle.service";
import AnalyticsSectionWrapper from "../analytics-section-wrapper";
import { AnalyticsBusyState } from "../loaders";
import { cycleCompletionPercent, isActiveCycle } from "./reports.utils";

const cycleService = new CycleService();
const MAX_ACTIVE_CYCLES = 6;

const ReportsCycleProgress = observer(function ReportsCycleProgress() {
  const { t } = useTranslation();
  const params = useParams();
  const workspaceSlug = params.workspaceSlug.toString();
  const { selectedProjects } = useAnalytics();
  const { getProjectById } = useProject();

  const { data: cycles, isLoading } = useSWR(workspaceSlug ? `reports-active-cycles-${workspaceSlug}` : null, () =>
    cycleService.getWorkspaceCycles(workspaceSlug)
  );

  const activeCycles = useMemo(() => {
    const selected = new Set(selectedProjects ?? []);
    return (cycles ?? [])
      .filter((cycle) => isActiveCycle(cycle))
      .filter((cycle) => (selected.size === 0 ? true : selected.has(cycle.project_id)))
      .slice(0, MAX_ACTIVE_CYCLES);
  }, [cycles, selectedProjects]);

  return (
    <AnalyticsSectionWrapper title={t("workspace_analytics.cycle_progress_title")}>
      {isLoading ? (
        <AnalyticsBusyState label={t("common.loading")}>
          <div className="flex flex-col gap-4">
            {["cycle-loader-a", "cycle-loader-b", "cycle-loader-c"].map((loaderKey) => (
              <Loader key={loaderKey} className="h-16 w-full">
                <Loader.Item height="100%" width="100%" />
              </Loader>
            ))}
          </div>
        </AnalyticsBusyState>
      ) : activeCycles.length > 0 ? (
        <div className="flex flex-col gap-4">
          {activeCycles.map((cycle) => (
            <CycleProgressRow key={cycle.id} cycle={cycle} projectName={getProjectById(cycle.project_id)?.name} />
          ))}
        </div>
      ) : (
        <EmptyStateCompact
          assetKey="unknown"
          assetClassName="size-20"
          rootClassName="border border-subtle px-5 py-10 md:px-20 md:py-16"
          title={t("workspace_analytics.no_active_cycle")}
          description={t("workspace_analytics.no_active_cycle_description")}
        />
      )}
    </AnalyticsSectionWrapper>
  );
});

function CycleProgressRow({ cycle, projectName }: { cycle: ICycle; projectName?: string }) {
  const { t } = useTranslation();
  const total = cycle.total_issues ?? 0;
  const completed = cycle.completed_issues ?? 0;
  const percent = cycleCompletionPercent(completed, total);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-subtle bg-surface-1 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-14 font-medium text-primary">{cycle.name}</p>
          {projectName && <p className="truncate text-13 text-tertiary">{projectName}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-13 text-secondary">
            {t("workspace_analytics.completed_of_total", { completed, total })}
          </span>
          <span className="rounded-sm bg-layer-2 px-1.5 py-0.5 text-11 font-medium text-primary">{percent}%</span>
        </div>
      </div>
      <LinearProgress
        value={percent}
        size="md"
        variant="brand"
        showValue={false}
        aria-label={t("workspace_analytics.cycle_progress_title")}
      />
    </div>
  );
}

export default ReportsCycleProgress;
