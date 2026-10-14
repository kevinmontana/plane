/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import AnalyticsWrapper from "../analytics-wrapper";
import CreatedVsResolved from "../work-items/created-vs-resolved";
import TotalInsights from "../total-insights";
import ActiveProjects from "./active-projects";
import ReportsCycleProgress from "./cycle-progress";
import { ReportsAssigneeChart, ReportsPriorityChart, ReportsStateGroupChart } from "./dimension-chart";
import ProjectInsights from "./project-insights";

function Overview() {
  return (
    <AnalyticsWrapper i18nTitle="workspace_analytics.reports">
      <div className="flex flex-col gap-14">
        <TotalInsights analyticsType="overview" />
        <div className="grid grid-cols-1 gap-14 md:grid-cols-5">
          <ReportsStateGroupChart />
          <ReportsPriorityChart />
        </div>
        <ReportsAssigneeChart />
        <ReportsCycleProgress />
        <CreatedVsResolved />
        <div className="grid grid-cols-1 gap-14 md:grid-cols-5">
          <ProjectInsights />
          <ActiveProjects />
        </div>
      </div>
    </AnalyticsWrapper>
  );
}

export { Overview };
