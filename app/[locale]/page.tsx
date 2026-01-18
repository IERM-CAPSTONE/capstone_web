"use client";

import { useTranslations } from "next-intl";
import { useCheckAuth } from "@/hooks/use-check-auth";
import { PageLoadingSkeleton } from "@/components/ui/page-loading";

export default function Home() {
  const commonT = useTranslations("Common");

  // Nếu đã đăng nhập -> redirect về dashboard
  // Nếu chưa đăng nhập -> redirect về login
  const { isLoading } = useCheckAuth({
    redirectIfAuthenticated: true,
    redirectIfNotAuthenticated: true
  });

  if (isLoading) {
    return <PageLoadingSkeleton />;
  }

  return <PageLoadingSkeleton />;
}
