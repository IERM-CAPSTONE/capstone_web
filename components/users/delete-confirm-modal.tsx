"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, AlertTriangle } from "lucide-react";
import { User } from "@/lib/api/users";
import { useTranslations } from "next-intl";

interface DeleteConfirmModalProps {
  user: User;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DeleteConfirmModal({
  user,
  onConfirm,
  onCancel,
  isLoading,
}: DeleteConfirmModalProps) {
  const t = useTranslations("Accounts.deleteModal");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isLoading}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              {t("message")}
            </p>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="font-medium">{user.fullName || "N/A"}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("roleLabel")}: {user.role || t("noRole")}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onCancel} disabled={isLoading}>
                {t("cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading ? t("deleting") : t("delete")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

