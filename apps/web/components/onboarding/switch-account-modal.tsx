/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";

import { useTheme } from "next-themes";
// ui
import { ConfirmDialog } from "@plane/blocks/dialog";
import { useTranslation } from "@plane/i18n";
import { setToast } from "@plane/blocks/toast";
// hooks
import { useUser } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function SwitchAccountModal(props: Props) {
  const { isOpen, onClose } = props;
  // states
  const [switchingAccount, setSwitchingAccount] = useState(false);
  // router
  const router = useAppRouter();
  // store hooks
  const { data: userData, signOut } = useUser();
  const { t } = useTranslation();

  const { setTheme } = useTheme();

  const handleClose = () => {
    setSwitchingAccount(false);
    onClose();
  };

  const handleSwitchAccount = async () => {
    setSwitchingAccount(true);

    try {
      await signOut();
      setTheme("system");
      router.push("/");
      handleClose();
    } catch {
      setToast({
        type: "error",
        title: t("common.error.label"),
        message: t("onboarding_flow.switch_account.sign_out_failed"),
      });
    } finally {
      setSwitchingAccount(false);
    }
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      handleClose={handleClose}
      handleSubmit={handleSwitchAccount}
      isSubmitting={switchingAccount}
      variant="primary"
      title={t("onboarding_flow.switch_account.title")}
      content={
        userData?.email ? (
          <>
            {t("onboarding_flow.switch_account.content_before")}{" "}
            <span className="text-accent-primary">{userData.email}</span>{" "}
            {t("onboarding_flow.switch_account.content_after")}
          </>
        ) : null
      }
      primaryButtonText={{
        loading: t("onboarding_flow.switch_account.switching"),
        default: t("onboarding_flow.switch_account.title"),
      }}
    />
  );
}
