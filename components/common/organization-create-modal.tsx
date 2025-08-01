"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useErrorStore } from "@/lib/error-store";
import { useSuccessStore } from "@/lib/success-store";
import { useT } from "@/lib/i18n";
import supabase from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

interface OrganizationCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User;
}

export function OrganizationCreateModal({
  isOpen,
  onClose,
  onSuccess,
  user,
}: OrganizationCreateModalProps) {
  const [organizationName, setOrganizationName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { showError } = useErrorStore();
  const { showSuccess } = useSuccessStore();
  const t = useT();

  const handleSubmit = async () => {
    if (!organizationName.trim()) {
      showError(
        t("orgCreate.input_error_title"),
        t("orgCreate.input_name_required")
      );
      return;
    }

    setIsLoading(true);

    try {
      // 조직 생성 (owner_id 포함)
      const { data: organization, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: organizationName.trim(),
          owner_id: user.id, // 생성자를 조직 소유자로 설정
        })
        .select()
        .single();

      if (orgError) {
        throw orgError;
      }

      showSuccess(
        t("orgCreate.success_title"),
        t("orgCreate.success_message").replace("{org}", organizationName)
      );

      setOrganizationName("");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Organization creation error:", error);
      showError(t("orgCreate.failure_title"), t("orgCreate.failure_message"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setOrganizationName("");
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("orgCreate.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("orgCreate.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <label
            htmlFor="organization-name"
            className="text-sm font-medium mb-2 block"
          >
            {t("orgCreate.name_label")}
          </label>
          <Input
            id="organization-name"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder={t("orgCreate.name_placeholder")}
            disabled={isLoading}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isLoading}>
            {t("buttons.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={isLoading || !organizationName.trim()}
          >
            {isLoading ? t("orgCreate.creating") : t("orgCreate.create")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
