import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

export default function AdminCreateDevicePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Thêm thiết bị</h1>
        <Link href={ROUTES.ADMIN_DEVICES}>
          <Button variant="outline">Quay lại</Button>
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        {/* TODO: device create form */}
        <p className="text-gray-700">Form thêm thiết bị sẽ hiển thị ở đây.</p>
      </div>
    </div>
  );
}
