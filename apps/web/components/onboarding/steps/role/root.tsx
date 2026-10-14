/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { Controller, useForm } from "react-hook-form";
import { PenTool } from "lucide-react";
import {
  CubeOutline,
  MonitorOutline,
  RefreshOutline,
  RocketOutline,
  TickOutline,
  ViewsOutline,
} from "@makeplane/propel/icons";
// plane imports
import { Button } from "@makeplane/propel/components/button";
import { useTranslation } from "@plane/i18n";
import { setToast } from "@plane/blocks/toast";
import type { TUserProfile } from "@plane/types";
import { EOnboardingSteps } from "@plane/types";
// hooks
import { useUserProfile } from "@/hooks/store/user";
// local components
import { CommonOnboardingHeader } from "../common";
import type { TProfileSetupFormValues } from "../profile/root";

type Props = {
  handleStepChange: (step: EOnboardingSteps, skipInvites?: boolean) => void;
};

const ROLES = [
  { id: "product-manager", labelKey: "onboarding_flow.role.product_manager", icon: CubeOutline },
  { id: "engineering-manager", labelKey: "onboarding_flow.role.engineering_manager", icon: ViewsOutline },
  { id: "designer", labelKey: "onboarding_flow.role.designer", icon: PenTool },
  { id: "developer", labelKey: "onboarding_flow.role.developer", icon: MonitorOutline },
  { id: "founder-executive", labelKey: "onboarding_flow.role.founder_executive", icon: RocketOutline },
  { id: "operations-manager", labelKey: "onboarding_flow.role.operations_manager", icon: RefreshOutline },
  { id: "others", labelKey: "onboarding_flow.role.others", icon: CubeOutline },
];

const defaultValues = {
  role: "",
};

export const RoleSetupStep = observer(function RoleSetupStep({ handleStepChange }: Props) {
  // store hooks
  const { data: profile, updateUserProfile } = useUserProfile();
  const { t } = useTranslation();
  // form info
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isValid },
  } = useForm<TProfileSetupFormValues>({
    defaultValues: {
      ...defaultValues,
      role: profile?.role,
    },
    mode: "onChange",
  });

  // handle submit
  const handleSubmitUserPersonalization = async (formData: TProfileSetupFormValues) => {
    const profileUpdatePayload: Partial<TUserProfile> = {
      role: formData.role,
    };
    try {
      await updateUserProfile(profileUpdatePayload);
      setToast({
        type: "success",
        title: t("common.success"),
        message: t("onboarding_flow.role.completed"),
      });
    } catch {
      setToast({
        type: "error",
        title: t("common.error.label"),
        message: t("onboarding_flow.role.failed"),
      });
    }
  };

  const onSubmit = async (formData: TProfileSetupFormValues) => {
    if (!profile) return;
    await handleSubmitUserPersonalization(formData);
    handleStepChange(EOnboardingSteps.ROLE_SETUP);
  };

  const handleSkip = () => {
    handleStepChange(EOnboardingSteps.ROLE_SETUP);
  };

  const isButtonDisabled = isSubmitting || !isValid;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-10">
      {/* Header */}
      <CommonOnboardingHeader
        title={t("onboarding_flow.role.title")}
        description={t("onboarding_flow.role.description")}
      />
      {/* Role Selection */}
      <div className="flex flex-col gap-3">
        <p className="text-body-sm-semibold text-placeholder">{t("onboarding_flow.role.select_one")}</p>
        <Controller
          control={control}
          name="role"
          rules={{
            required: t("common.errors.required"),
          }}
          render={({ field: { value, onChange } }) => (
            <div className="flex flex-col gap-3">
              {ROLES.map((role) => {
                const Icon = role.icon;
                const isSelected = value === role.id;

                return (
                  <button
                    key={role.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onChange(role.id);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 transition-all duration-200 ${
                      isSelected
                        ? "border-accent-strong bg-accent-subtle text-accent-primary"
                        : "border-subtle text-tertiary hover:border-strong"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="size-3.5" />
                      <span className="text-body-sm-semibold">{t(role.labelKey)}</span>
                    </div>
                    {isSelected && (
                      <>
                        <button
                          className={`border-blue-500 flex size-4 items-center justify-center rounded-sm border-2 bg-accent-primary`}
                        >
                          <TickOutline className="h-3 w-3 text-on-color" />
                        </button>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.role && <span className="text-13 text-danger-primary">{errors.role.message}</span>}
      </div>
      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          variant="primary"
          type="submit"
          stretch="full"
          size="lg"
          disabled={isButtonDisabled}
          label={t("common.continue")}
        />
        <Button
          variant="ghost"
          onClick={handleSkip}
          stretch="full"
          size="lg"
          render={<button type="button" className="text-tertiary" />}
          label={t("onboarding_flow.skip")}
        />
      </div>
    </form>
  );
});
