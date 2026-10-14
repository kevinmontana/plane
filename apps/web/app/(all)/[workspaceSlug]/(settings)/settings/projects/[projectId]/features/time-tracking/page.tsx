/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useTranslation } from "@plane/i18n";
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";
import { PageHead } from "@/components/core/page-title";
import { ProjectWorklogReport } from "@/components/issues/worklogs";
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
import { SettingsHeading } from "@/components/settings/heading";
import { ProjectSettingsFeatureControlItem } from "@/components/settings/project/content/feature-control-item";
import { useProject } from "@/hooks/store/use-project";
import { useUserPermissions } from "@/hooks/store/user";
import type { Route } from "./+types/page";
import { FeaturesTimeTrackingProjectSettingsHeader } from "./header";

function FeaturesTimeTrackingSettingsPage({ params }: Route.ComponentProps) {
  const { workspaceSlug, projectId } = params;
  const { workspaceUserInfo, allowPermissions } = useUserPermissions();
  const { currentProjectDetails } = useProject();
  const { t } = useTranslation();
  const pageTitle = currentProjectDetails?.name
    ? `${currentProjectDetails?.name} settings - ${t("project_settings.features.time_tracking.short_title")}`
    : undefined;
  const canPerformProjectAdminActions = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.PROJECT);
  const canViewTimeTracking = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT
  );

  if (workspaceUserInfo && !canViewTimeTracking) {
    return <NotAuthorizedView section="settings" isProjectView className="h-auto" />;
  }

  return (
    <SettingsContentWrapper header={<FeaturesTimeTrackingProjectSettingsHeader />}>
      <PageHead title={pageTitle} />
      <section className="w-full">
        <SettingsHeading
          title={t("project_settings.features.time_tracking.title")}
          description={t("project_settings.features.time_tracking.description")}
        />
        <div className="mt-7">
          <ProjectSettingsFeatureControlItem
            title={t("project_settings.features.time_tracking.toggle_title")}
            description={t("project_settings.features.time_tracking.toggle_description")}
            featureProperty="is_time_tracking_enabled"
            projectId={projectId}
            value={!!currentProjectDetails?.is_time_tracking_enabled}
            workspaceSlug={workspaceSlug}
            disabled={!canPerformProjectAdminActions}
          />
        </div>
        {currentProjectDetails?.is_time_tracking_enabled ? (
          <ProjectWorklogReport workspaceSlug={workspaceSlug} projectId={projectId} />
        ) : null}
      </section>
    </SettingsContentWrapper>
  );
}

export default observer(FeaturesTimeTrackingSettingsPage);
