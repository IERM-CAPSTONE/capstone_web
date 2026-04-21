import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

export default function AdminEditDevicePage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Chỉnh sửa thiết bị</h1>
        <Link href={ROUTES.ADMIN_DEVICES_DETAIL(id)}>
          <Button variant="outline">Quay lại</Button>
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        {/* TODO: device edit form */}
        <p className="text-gray-700">Form chỉnh sửa thiết bị #{id} sẽ hiển thị ở đây.</p>
      </div>
    </div>
  );
}
