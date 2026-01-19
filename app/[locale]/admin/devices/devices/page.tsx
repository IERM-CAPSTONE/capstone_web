import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

export default function AdminDevicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Thiết bị (Admin)</h1>
          <p className="text-sm text-gray-600">Quản lý thiết bị giám sát/phòng thi</p>
        </div>
        <Link href={ROUTES.ADMIN_DEVICES_CREATE}>
          <Button>Thêm thiết bị</Button>
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        {/* TODO: devices table */}
        <p className="text-gray-700">Danh sách thiết bị sẽ hiển thị ở đây.</p>
      </div>
    </div>
  );
}
