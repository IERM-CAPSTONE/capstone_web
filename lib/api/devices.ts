import apiClient from "./client";

export interface Device {
  id: string;
  name: string;
  serial: string;
  ownerId: string;
  ownerName?: string | null;
  metadata: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DeviceApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface DeviceApplication {
  id: string;
  deviceId: string;
  deviceName: string | null;
  deviceSerial: string | null;
  manufacturer?: string | null;
  model?: string | null;
  os?: string | null;
  osVersion?: string | null;
  appVersion?: string | null;
  deviceMetadata?: Record<string, unknown> | null;
  registeredBy: string;
  registeredByName?: string | null;
  status: DeviceApplicationStatus;
  approvedBy: string | null;
  approvedByName?: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface WrappedResponse<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListAdminDevicesParams {
  page?: number;
  limit?: number;
  ownerId?: string;
  isActive?: boolean;
}

export interface ListAdminApplicationsParams {
  page?: number;
  limit?: number;
  deviceId?: string;
  registeredBy?: string;
  status?: DeviceApplicationStatus;
}

function unwrapListResponse<T>(raw: unknown): PaginatedResponse<T> {
  if (!raw || typeof raw !== "object") {
    return raw as PaginatedResponse<T>;
  }

  const record = raw as Record<string, unknown>;

  // Direct paginated shape: { data, total, page, limit, totalPages }
  if ("data" in record && "total" in record) {
    return raw as PaginatedResponse<T>;
  }

  // Wrapped by TransformInterceptor: { success, statusCode, data: [...], meta: {...} }
  if ("data" in record && "meta" in record) {
    const wrapped = raw as WrappedResponse<T[]>;
    const list = Array.isArray(wrapped.data) ? wrapped.data : [];

    return {
      data: list,
      total: wrapped.meta?.total ?? list.length,
      page: wrapped.meta?.page ?? 1,
      limit: wrapped.meta?.limit ?? list.length,
      totalPages: wrapped.meta?.totalPages ?? 1,
    };
  }

  // Wrapped legacy/nested shape: { success, data: { data, total, page, ... } }
  if ("data" in record && typeof record.data === "object" && record.data !== null) {
    const nested = record.data as Record<string, unknown>;
    if ("data" in nested && "total" in nested) {
      return nested as unknown as PaginatedResponse<T>;
    }

    if (Array.isArray(record.data)) {
      const list = record.data as T[];
      return {
        data: list,
        total: list.length,
        page: 1,
        limit: list.length,
        totalPages: 1,
      };
    }
  }

  return {
    data: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  };
}

function unwrapItemResponse<T>(raw: unknown): T {
  if (!raw || typeof raw !== "object") {
    return raw as T;
  }

  const record = raw as Record<string, unknown>;

  if ("data" in record) {
    const data = record.data;
    if (data && typeof data === "object" && "data" in (data as Record<string, unknown>)) {
      return (data as Record<string, unknown>).data as T;
    }

    return data as T;
  }

  return raw as T;
}

export const devicesApi = {
  listDevices: async (params?: ListAdminDevicesParams): Promise<PaginatedResponse<Device>> => {
    const response = await apiClient.get("/admin/devices", {
      params,
    });

    return unwrapListResponse<Device>(response.data);
  },

  updateDeviceStatus: async (id: string, isActive: boolean): Promise<Device> => {
    const response = await apiClient.patch(`/admin/devices/${id}/status`, { isActive });
    return unwrapItemResponse<Device>(response.data);
  },

  listApplications: async (
    params?: ListAdminApplicationsParams
  ): Promise<PaginatedResponse<DeviceApplication>> => {
    const response = await apiClient.get("/admin/device-applications", {
      params,
    });

    return unwrapListResponse<DeviceApplication>(response.data);
  },

  updateApplicationStatus: async (
    id: string,
    payload: { status: "APPROVED" | "REJECTED"; rejectedReason?: string }
  ): Promise<DeviceApplication> => {
    const response = await apiClient.patch(`/admin/device-applications/${id}`, payload);
    return unwrapItemResponse<DeviceApplication>(response.data);
  },
};
