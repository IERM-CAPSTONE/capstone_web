import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

export default function AdminAccountsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tài khoản (Admin)</h1>
          <p className="text-sm text-gray-600">Quản lý người dùng và quyền</p>
        </div>
        <Link href={ROUTES.ADMIN_ACCOUNTS_CREATE}>
          <Button>Tạo tài khoản</Button>
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        {/* TODO: accounts table */}
        <p className="text-gray-700">Danh sách tài khoản sẽ hiển thị ở đây.</p>
      </div>
    </div>
  );
}
