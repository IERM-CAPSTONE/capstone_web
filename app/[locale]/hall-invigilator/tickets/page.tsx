"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentLocale } from "@/hooks/use-check-auth";
import { ROUTES } from "@/lib/constants/routes";

export default function HallInvigilatorTicketsPage() {
  const router = useRouter();

  useEffect(() => {
    const locale = getCurrentLocale();
    router.replace(`/${locale}${ROUTES.HALL_INVIGILATOR_APPLICATIONS}`);
  }, [router]);

  return null;
}
