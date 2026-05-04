import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  devicesApi,
  ListAdminApplicationsParams,
  ListAdminDevicesParams,
} from "@/lib/api/devices";

export function useAdminDevices(params?: ListAdminDevicesParams) {
  return useQuery({
    queryKey: ["admin-devices", params],
    queryFn: () => devicesApi.listDevices(params),
  });
}

export function useAdminDeviceApplications(
  params?: ListAdminApplicationsParams,
  queryOptions?: Record<string, any>
) {
  return useQuery({
    queryKey: ["admin-device-applications", params],
    queryFn: () => devicesApi.listApplications(params),
    ...queryOptions,
  });
}

export function useUpdateAdminDeviceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      devicesApi.updateDeviceStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-devices"] });
    },
  });
}

export function useUpdateAdminDeviceApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      rejectedReason,
    }: {
      id: string;
      status: "APPROVED" | "REJECTED";
      rejectedReason?: string;
    }) => devicesApi.updateApplicationStatus(id, { status, rejectedReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-device-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-devices"] });
    },
  });
}
