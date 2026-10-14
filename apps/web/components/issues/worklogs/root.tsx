/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import useSWR from "swr";
import { Button } from "@makeplane/propel/components/button";
import { Field } from "@makeplane/propel/components/field";
import { Icon } from "@makeplane/propel/components/icon";
import { IconButton } from "@makeplane/propel/components/icon-button";
import { Input, InputGroup } from "@makeplane/propel/components/input";
import { DeleteOutline, TimeTrackingOutline } from "@makeplane/propel/icons";
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { setToast } from "@plane/blocks/toast";
import type { TIssueWorkLog } from "@plane/types";
import { useProject } from "@/hooks/store/use-project";
import { useUser, useUserPermissions } from "@/hooks/store/user";
import { IssueWorkLogService } from "@/services/issue";
import { formatDurationMinutes, parseDurationToMinutes } from "./helper";

const worklogService = new IssueWorkLogService();

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled?: boolean;
};

export const IssueWorklogsRoot = observer(function IssueWorklogsRoot(props: Props) {
  const { workspaceSlug, projectId, issueId, disabled = false } = props;
  const { t } = useTranslation();
  const { getProjectById } = useProject();
  const { data: currentUser } = useUser();
  const { allowPermissions } = useUserPermissions();
  const project = getProjectById(projectId);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEnabled = Boolean(project?.is_time_tracking_enabled);
  const swrKey =
    isEnabled && workspaceSlug && projectId && issueId ? ["ISSUE_WORKLOGS", workspaceSlug, projectId, issueId] : null;
  const { data, isLoading, mutate } = useSWR(swrKey, () =>
    worklogService.listWorklogs(workspaceSlug, projectId, issueId)
  );

  if (!isEnabled) return null;

  const isAdmin = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.PROJECT, workspaceSlug, projectId);
  const worklogs = data?.worklogs ?? [];
  const totalMinutes = data?.total_duration_minutes ?? 0;

  const canDelete = (worklog: TIssueWorkLog) => {
    if (disabled) return false;
    if (isAdmin) return true;
    return currentUser?.id === worklog.actor || currentUser?.id === worklog.created_by;
  };

  const handleCreate = async () => {
    const durationMinutes = parseDurationToMinutes(hours, minutes);
    if (durationMinutes === null) {
      setToast({
        type: "error",
        title: t("error"),
        message: t("project_settings.features.time_tracking.invalid_duration"),
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await worklogService.createWorklog(workspaceSlug, projectId, issueId, {
        duration_minutes: durationMinutes,
        description: description.trim(),
      });
      setHours("");
      setMinutes("");
      setDescription("");
      await mutate();
      setToast({
        type: "success",
        title: t("success"),
        message: t("project_settings.features.time_tracking.add"),
      });
    } catch {
      setToast({
        type: "error",
        title: t("error"),
        message: t("project_settings.features.time_tracking.save_error"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (worklogId: string) => {
    try {
      await worklogService.deleteWorklog(workspaceSlug, projectId, issueId, worklogId);
      await mutate();
    } catch {
      setToast({
        type: "error",
        title: t("error"),
        message: t("project_settings.features.time_tracking.save_error"),
      });
    }
  };

  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-14 font-medium">
          <TimeTrackingOutline className="h-4 w-4 text-tertiary" />
          {t("project_settings.features.time_tracking.section_title")}
        </div>
        <span className="text-13 text-tertiary">
          {t("project_settings.features.time_tracking.total")}: {formatDurationMinutes(totalMinutes)}
        </span>
      </div>

      {!disabled && (
        <form
          className="flex flex-col gap-2 rounded-md border border-subtle bg-surface-2 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate();
          }}
        >
          <p className="text-caption-sm-regular text-tertiary">
            {t("project_settings.features.time_tracking.decimal_hint")}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Field name="worklog-hours">
              <InputGroup size="md">
                <Input
                  size="md"
                  type="number"
                  min={0}
                  step="0.25"
                  value={hours}
                  onChange={(event) => setHours(event.target.value)}
                  placeholder={t("project_settings.features.time_tracking.hours")}
                  aria-label={t("project_settings.features.time_tracking.hours")}
                />
              </InputGroup>
            </Field>
            <Field name="worklog-minutes">
              <InputGroup size="md">
                <Input
                  size="md"
                  type="number"
                  min={0}
                  step={1}
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                  placeholder={t("project_settings.features.time_tracking.minutes")}
                  aria-label={t("project_settings.features.time_tracking.minutes")}
                />
              </InputGroup>
            </Field>
            <div className="col-span-2">
              <Field name="worklog-note">
                <InputGroup size="md">
                  <Input
                    size="md"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={t("project_settings.features.time_tracking.note_placeholder")}
                    aria-label={t("project_settings.features.time_tracking.note_placeholder")}
                  />
                </InputGroup>
              </Field>
            </div>
          </div>
          <div>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              label={t("project_settings.features.time_tracking.add")}
            />
          </div>
        </form>
      )}

      <div className="flex flex-col divide-y divide-subtle overflow-hidden rounded-md border border-subtle">
        {isLoading && worklogs.length === 0 ? (
          <div className="px-3 py-2 text-13 text-tertiary">{t("loading")}</div>
        ) : worklogs.length === 0 ? (
          <div className="px-3 py-2 text-13 text-tertiary">{t("project_settings.features.time_tracking.empty")}</div>
        ) : (
          worklogs.map((worklog) => (
            <div key={worklog.id} className="flex items-start justify-between gap-3 px-3 py-2">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2 text-13">
                  <span className="font-medium">{worklog.actor_detail?.display_name ?? ""}</span>
                  <span className="text-tertiary">{formatDurationMinutes(worklog.duration_minutes)}</span>
                  <span className="text-tertiary">
                    {new Date(worklog.logged_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                {worklog.description ? <p className="truncate text-13 text-secondary">{worklog.description}</p> : null}
              </div>
              {canDelete(worklog) ? (
                <IconButton
                  variant="ghost"
                  size="sm"
                  aria-label={t("project_settings.features.time_tracking.delete")}
                  icon={<Icon icon={DeleteOutline} />}
                  onClick={() => void handleDelete(worklog.id)}
                />
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
});
