import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

export default function AdminDeviceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Chi tiết thiết bị</h1>
        <Link href={ROUTES.ADMIN_DEVICES_EDIT(id)} className="text-primary">
          Chỉnh sửa
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        {/* TODO: device detail view */}
        <p className="text-gray-700">Thông tin thiết bị #{id} sẽ hiển thị ở đây.</p>
      </div>
    </div>
  );
}
