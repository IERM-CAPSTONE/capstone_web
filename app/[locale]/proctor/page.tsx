import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export default async function ProctorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}${ROUTES.PROCTOR_EXAM_SCHEDULES}`);
}
