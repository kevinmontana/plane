/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { IUserLite } from "../users";

export type TIssueWorkLog = {
  id: string;
  issue: string;
  project: string;
  workspace: string;
  actor: string;
  actor_detail: IUserLite | null;
  duration_minutes: number;
  description: string;
  logged_at: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  total_duration_minutes?: number;
};

export type TIssueWorkLogListResponse = {
  worklogs: TIssueWorkLog[];
  total_duration_minutes: number;
};

export type TIssueWorkLogCreatePayload = {
  duration_minutes: number;
  description?: string;
  logged_at?: string;
};

export type TWorkLogReportUserRow = {
  actor_id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  total_duration_minutes: number;
};

export type TWorkLogReportIssueRow = {
  issue_id: string;
  name: string;
  identifier: string;
  project_id: string;
  total_duration_minutes: number;
};

export type TWorkLogReport = {
  period_days: number;
  total_duration_minutes: number;
  by_user: TWorkLogReportUserRow[];
  by_issue: TWorkLogReportIssueRow[];
};
