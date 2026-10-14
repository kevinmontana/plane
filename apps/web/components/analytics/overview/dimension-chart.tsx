/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { useTheme } from "next-themes";
import useSWR from "swr";
import { STATE_GROUPS, CHART_COLOR_PALETTES } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { BarChart } from "@plane/blocks/charts/bar-chart";
import { PieChart } from "@plane/blocks/charts/pie-chart";
import { EmptyStateCompact } from "@plane/blocks/empty-state";
import type { TBarItem, TChart, TChartDatum, TStateGroups } from "@plane/types";
import { ChartXAxisProperty, ChartYAxisMetric } from "@plane/types";
import { parseChartData } from "@/components/chart/utils";
import { useAnalytics } from "@/hooks/store/use-analytics";
import { AnalyticsService } from "@/services/analytics.service";
import AnalyticsSectionWrapper from "../analytics-section-wrapper";
import { AnalyticsBusyState, ChartLoader } from "../loaders";
import { generateBarColor } from "../work-items/utils";
import {
  isUnassignedKey,
  orderChartData,
  REPORTS_PRIORITY_ORDER,
  REPORTS_STATE_GROUP_ORDER,
  REPORTS_TOP_ASSIGNEES,
  takeTopByCount,
} from "./reports.utils";

const analyticsService = new AnalyticsService();

type TReportsChartKind = "bar" | "pie";

type Props = {
  title: string;
  emptyTitle: string;
  emptyDescription?: string;
  xAxis: ChartXAxisProperty;
  chart?: TReportsChartKind;
  className?: string;
  topN?: number;
  order?: readonly string[];
};

const STATE_GROUP_I18N: Record<string, string> = {
  backlog: "workspace_projects.state.backlog",
  unstarted: "workspace_projects.state.unstarted",
  started: "workspace_projects.state.started",
  completed: "workspace_projects.state.completed",
  cancelled: "workspace_projects.state.cancelled",
};

const PRIORITY_I18N: Record<string, string> = {
  urgent: "urgent",
  high: "high",
  medium: "medium",
  low: "low",
  none: "none",
};

function localizeDatumName(
  xAxis: ChartXAxisProperty,
  datum: TChartDatum,
  t: (key: string, params?: Record<string, unknown>) => string
): string {
  const key = String(datum.key ?? "").toLowerCase();
  if (xAxis === ChartXAxisProperty.STATE_GROUPS) {
    const stateKey = STATE_GROUP_I18N[key];
    return stateKey ? t(stateKey) : datum.name;
  }
  if (xAxis === ChartXAxisProperty.PRIORITY) {
    return t(PRIORITY_I18N[key] ?? "none");
  }
  if (xAxis === ChartXAxisProperty.ASSIGNEES && isUnassignedKey(datum.key, datum.name)) {
    return t("unassigned");
  }
  return datum.name;
}

function getSliceColor(xAxis: ChartXAxisProperty, key: string, fallback: string): string {
  if (xAxis === ChartXAxisProperty.STATE_GROUPS) {
    const group = STATE_GROUPS[key.toLowerCase() as TStateGroups];
    if (group) return group.color;
  }
  if (xAxis === ChartXAxisProperty.PRIORITY) {
    return generateBarColor(
      key.toLowerCase(),
      {
        x_axis: xAxis,
        y_axis: ChartYAxisMetric.WORK_ITEM_COUNT,
      },
      [fallback]
    );
  }
  return fallback;
}

const ReportsDimensionChart = observer(function ReportsDimensionChart(props: Props) {
  const { title, emptyTitle, emptyDescription, xAxis, chart = "bar", className, topN, order } = props;
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const params = useParams();
  const workspaceSlug = params.workspaceSlug.toString();
  const { selectedDuration, selectedProjects, selectedCycle, selectedModule, isPeekView } = useAnalytics();

  const { data: chartResponse, isLoading } = useSWR(
    `reports-dimension-${xAxis}-${workspaceSlug}-${selectedDuration}-${selectedProjects}-${selectedCycle}-${selectedModule}-${isPeekView}`,
    () =>
      analyticsService.getAdvanceAnalyticsCharts<TChart>(
        workspaceSlug,
        "custom-work-items",
        {
          ...(selectedProjects?.length > 0 && { project_ids: selectedProjects.join(",") }),
          ...(selectedCycle ? { cycle_id: selectedCycle } : {}),
          ...(selectedModule ? { module_id: selectedModule } : {}),
          x_axis: xAxis,
          y_axis: ChartYAxisMetric.WORK_ITEM_COUNT,
        },
        isPeekView
      )
  );

  const parsedData = useMemo(() => {
    const parsed = parseChartData(chartResponse, xAxis, undefined, undefined);
    let rows = parsed.data.filter((datum) => Number(datum.count) > 0);
    if (order) rows = orderChartData(rows, order);
    if (typeof topN === "number") rows = takeTopByCount(rows, topN);
    return rows.map((datum) => Object.assign({}, datum, { name: localizeDatumName(xAxis, datum, t) }));
  }, [chartResponse, order, t, topN, xAxis]);

  const palette = useMemo(
    () => CHART_COLOR_PALETTES[0]?.[resolvedTheme === "dark" ? "dark" : "light"] ?? ["#6172E8"],
    [resolvedTheme]
  );

  const bars: TBarItem<string>[] = useMemo(
    () => [
      {
        key: "count",
        label: t("common.work_items"),
        stackId: "bar-one",
        fill: (payload: TChartDatum) => {
          const key = String(payload.key);
          const hashed = Math.abs(key.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0));
          const fallback = palette[hashed % palette.length] ?? "#6172E8";
          return getSliceColor(xAxis, key, fallback);
        },
        textClassName: "",
        showPercentage: false,
        showTopBorderRadius: () => true,
        showBottomBorderRadius: () => true,
      },
    ],
    [palette, t, xAxis]
  );

  const pieCells = useMemo(
    () =>
      parsedData.map((datum, index) => ({
        key: String(datum.key),
        fill: getSliceColor(xAxis, String(datum.key), palette[index % palette.length] ?? "#6172E8"),
      })),
    [parsedData, palette, xAxis]
  );

  return (
    <AnalyticsSectionWrapper title={title} className={className}>
      {isLoading ? (
        <AnalyticsBusyState label={t("common.loading")}>
          <ChartLoader />
        </AnalyticsBusyState>
      ) : parsedData.length > 0 ? (
        chart === "pie" ? (
          <div className="grid h-[320px] w-full grid-cols-1 gap-6 md:grid-cols-2">
            <PieChart
              className="size-full"
              dataKey="count"
              data={parsedData}
              cells={pieCells}
              showTooltip
              tooltipLabel={t("common.work_items")}
              paddingAngle={5}
              cornerRadius={4}
              innerRadius="50%"
              showLabel={false}
              margin={{ top: 0, right: -10, bottom: 12, left: -10 }}
            />
            <div className="flex items-center">
              <div className="w-full space-y-4">
                {parsedData.map((datum, index) => (
                  <div key={String(datum.key)} className="flex items-center justify-between gap-2 text-13">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-2.5 w-2.5 rounded-xs"
                        style={{
                          backgroundColor: pieCells[index]?.fill,
                        }}
                      />
                      <div className="whitespace-nowrap text-secondary">{datum.name}</div>
                    </div>
                    <div className="text-primary">{datum.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <BarChart
            className="h-[320px] w-full"
            data={parsedData}
            bars={bars}
            margin={{ bottom: 30 }}
            xAxis={{
              key: "name",
              label: title,
              dy: 30,
            }}
            yAxis={{
              key: "count",
              label: t("common.no_of", { entity: t("common.work_items") }),
              offset: -60,
              dx: -26,
            }}
          />
        )
      ) : (
        <EmptyStateCompact
          assetKey="unknown"
          assetClassName="size-20"
          rootClassName="border border-subtle px-5 py-10 md:px-20 md:py-16"
          title={emptyTitle}
          description={emptyDescription}
        />
      )}
    </AnalyticsSectionWrapper>
  );
});

export function ReportsStateGroupChart() {
  const { t } = useTranslation();
  return (
    <ReportsDimensionChart
      title={t("workspace_analytics.by_state_group")}
      emptyTitle={t("workspace_analytics.empty_state.customized_insights.title")}
      emptyDescription={t("workspace_analytics.empty_state.customized_insights.description")}
      xAxis={ChartXAxisProperty.STATE_GROUPS}
      chart="pie"
      order={REPORTS_STATE_GROUP_ORDER}
      className="md:col-span-3"
    />
  );
}

export function ReportsPriorityChart() {
  const { t } = useTranslation();
  return (
    <ReportsDimensionChart
      title={t("workspace_analytics.by_priority")}
      emptyTitle={t("workspace_empty_state.your_work_by_priority.title")}
      emptyDescription={t("workspace_analytics.empty_state.customized_insights.description")}
      xAxis={ChartXAxisProperty.PRIORITY}
      order={REPORTS_PRIORITY_ORDER}
      className="md:col-span-2"
    />
  );
}

export function ReportsAssigneeChart() {
  const { t } = useTranslation();
  return (
    <ReportsDimensionChart
      title={t("workspace_analytics.by_assignee")}
      emptyTitle={t("workspace_empty_state.your_work_by_state.title")}
      emptyDescription={t("workspace_analytics.empty_state.customized_insights.description")}
      xAxis={ChartXAxisProperty.ASSIGNEES}
      topN={REPORTS_TOP_ASSIGNEES}
    />
  );
}
