import { redirect } from "next/navigation";

export default async function ExamOfficerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/exam-officer/monitor`);
}
