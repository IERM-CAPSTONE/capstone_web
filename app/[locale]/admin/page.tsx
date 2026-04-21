import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export default function DashboardPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  // Thay thế hoàn toàn trang Dashboard bằng lệnh chuyển hướng ngay lập tức sang trang Quản lý tài khoản
  redirect(`/${locale}${ROUTES.ADMIN_ACCOUNTS}`);
}
