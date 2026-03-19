"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, ChevronDown, ChevronUp, Lock, RotateCcw, ShieldCheck, X, XCircle } from "lucide-react";
import { Device, DeviceApplication } from "@/lib/api/devices";
import {
  useAdminDeviceApplications,
  useAdminDevices,
  useUpdateAdminDeviceApplicationStatus,
  useUpdateAdminDeviceStatus,
} from "@/hooks/use-devices";

const PAGE_SIZE = 10;

export default function AdminDevicesPage() {
  const t = useTranslations("Devices");
  const dl = useTranslations("Devices.deviceList");
  const ap = useTranslations("Devices.applications");

  const [tab, setTab] = useState<"devices" | "applications">("devices");

  const [devicePage, setDevicePage] = useState(1);
  const [deviceOwnerId, setDeviceOwnerId] = useState("");
  const [deviceStatus, setDeviceStatus] = useState<"" | "true" | "false">("");
  const [isDeviceAdvancedFiltersOpen, setIsDeviceAdvancedFiltersOpen] = useState(false);
  const [deviceQuickSearch, setDeviceQuickSearch] = useState("");
  const [deviceManufacturerFilter, setDeviceManufacturerFilter] = useState("");
  const [deviceModelFilter, setDeviceModelFilter] = useState("");
  const [deviceOsFilter, setDeviceOsFilter] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const [appPage, setAppPage] = useState(1);
  const [appStatusFilter, setAppStatusFilter] = useState<"PENDING" | "PROCESSED" | "ALL">("PENDING");
  const [processedStatusFilter, setProcessedStatusFilter] = useState<"ALL" | "APPROVED" | "REJECTED">("ALL");
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [manufacturerFilter, setManufacturerFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [osFilter, setOsFilter] = useState("");
  const [osVersionFilter, setOsVersionFilter] = useState("");
  const [appQuickSearch, setAppQuickSearch] = useState("");
  const [registeredByFilter, setRegisteredByFilter] = useState("");
  const [approvedByFilter, setApprovedByFilter] = useState("");

  const [deviceConfirm, setDeviceConfirm] = useState<{
    id: string;
    name: string;
    nextActive: boolean;
  } | null>(null);

  const [appConfirm, setAppConfirm] = useState<{
    id: string;
    nextStatus: "APPROVED" | "REJECTED";
  } | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<DeviceApplication | null>(null);
  const [rejectedReason, setRejectedReason] = useState("");

  const devicesQuery = useAdminDevices({
    page: devicePage,
    limit: PAGE_SIZE,
    ownerId: deviceOwnerId || undefined,
    isActive:
      deviceStatus === "" ? undefined : deviceStatus === "true",
  });

  const applicationsQuery = useAdminDeviceApplications({
    page: appPage,
    limit: PAGE_SIZE,
    status:
      appStatusFilter === "PENDING"
        ? "PENDING"
        : appStatusFilter === "PROCESSED"
          ? processedStatusFilter === "ALL"
            ? undefined
            : processedStatusFilter
          : undefined,
  });

  const pendingApplicationsQuery = useAdminDeviceApplications({
    page: 1,
    limit: 1,
    status: "PENDING",
  });

  const updateDeviceStatus = useUpdateAdminDeviceStatus();
  const updateApplicationStatus = useUpdateAdminDeviceApplicationStatus();
  const pendingApplicationsCount = pendingApplicationsQuery.data?.total ?? 0;

  const deviceFilterOptions = useMemo(() => {
    const list = devicesQuery.data?.data ?? [];

    const uniq = (values: Array<string | null | undefined>) =>
      Array.from(new Set(values.map((v) => (v ?? "").trim()).filter((v) => v.length > 0))).sort((a, b) => a.localeCompare(b));

    return {
      manufacturers: uniq(list.map((item) => (item.metadata as Record<string, unknown> | null)?.manufacturer as string | undefined)),
      models: uniq(list.map((item) => (item.metadata as Record<string, unknown> | null)?.model as string | undefined)),
      oss: uniq(list.map((item) => (item.metadata as Record<string, unknown> | null)?.os as string | undefined)),
    };
  }, [devicesQuery.data]);

  const devices = useMemo(() => {
    const list = devicesQuery.data?.data ?? [];

    const quickKeyword = deviceQuickSearch.trim().toLowerCase();
    const manufacturerKeyword = deviceManufacturerFilter.trim().toLowerCase();
    const modelKeyword = deviceModelFilter.trim().toLowerCase();
    const osKeyword = deviceOsFilter.trim().toLowerCase();

    return list.filter((item: Device) => {
      const metadata = (item.metadata as Record<string, unknown> | null) ?? {};
      const manufacturerText = `${metadata.manufacturer ?? ""}`.toLowerCase();
      const modelText = `${metadata.model ?? ""}`.toLowerCase();
      const osText = `${metadata.os ?? ""}`.toLowerCase();
      const quickText = `${item.name ?? ""} ${item.serial ?? ""} ${item.ownerId ?? ""} ${manufacturerText} ${modelText} ${osText}`.toLowerCase();

      if (manufacturerKeyword && !manufacturerText.includes(manufacturerKeyword)) return false;
      if (modelKeyword && !modelText.includes(modelKeyword)) return false;
      if (osKeyword && !osText.includes(osKeyword)) return false;
      if (quickKeyword && !quickText.includes(quickKeyword)) return false;

      return true;
    });
  }, [devicesQuery.data, deviceQuickSearch, deviceManufacturerFilter, deviceModelFilter, deviceOsFilter]);

  const resetDeviceFilters = () => {
    setDeviceQuickSearch("");
    setDeviceManufacturerFilter("");
    setDeviceModelFilter("");
    setDeviceOsFilter("");
    setIsDeviceAdvancedFiltersOpen(false);
    setDeviceOwnerId("");
    setDeviceStatus("");
    setDevicePage(1);
  };

  const activeDeviceAdvancedFilterCount = [deviceManufacturerFilter, deviceModelFilter, deviceOsFilter].filter((v) => v.trim().length > 0).length;
  const applications = useMemo(() => {
    let list = applicationsQuery.data?.data ?? [];

    if (appStatusFilter === "PENDING") {
      list = list.filter((item) => item.status === "PENDING");
    } else if (appStatusFilter === "PROCESSED") {
      if (processedStatusFilter === "APPROVED") {
        list = list.filter((item) => item.status === "APPROVED");
      } else if (processedStatusFilter === "REJECTED") {
        list = list.filter((item) => item.status === "REJECTED");
      } else {
        list = list.filter((item) => item.status !== "PENDING");
      }
    }

    const manufacturerKeyword = manufacturerFilter.trim().toLowerCase();
    const modelKeyword = modelFilter.trim().toLowerCase();
    const osKeyword = osFilter.trim().toLowerCase();
    const osVersionKeyword = osVersionFilter.trim().toLowerCase();
    const quickKeyword = appQuickSearch.trim().toLowerCase();
    const registeredByKeyword = registeredByFilter.trim().toLowerCase();
    const approvedByKeyword = approvedByFilter.trim().toLowerCase();

    return list.filter((item: DeviceApplication) => {
      const manufacturerText = `${item.manufacturer ?? ""}`.toLowerCase();
      const modelText = `${item.model ?? ""}`.toLowerCase();
      const osText = `${item.os ?? ""}`.toLowerCase();
      const osVersionText = `${item.osVersion ?? ""}`.toLowerCase();
      const appVersionText = `${item.appVersion ?? ""}`.toLowerCase();
      const deviceText = `${item.deviceName ?? ""} ${item.deviceSerial ?? ""} ${item.deviceId ?? ""}`.toLowerCase();
      const registeredByText = `${item.registeredByName ?? ""} ${item.registeredBy ?? ""}`.toLowerCase();
      const approvedByText = `${item.approvedByName ?? ""} ${item.approvedBy ?? ""}`.toLowerCase();

      if (manufacturerKeyword && !manufacturerText.includes(manufacturerKeyword)) return false;
      if (modelKeyword && !modelText.includes(modelKeyword)) return false;
      if (osKeyword && !osText.includes(osKeyword)) return false;
      if (osVersionKeyword && !osVersionText.includes(osVersionKeyword)) return false;
      if (registeredByKeyword && !registeredByText.includes(registeredByKeyword)) return false;
      if (approvedByKeyword && !approvedByText.includes(approvedByKeyword)) return false;

      if (quickKeyword) {
        const combined = `${deviceText} ${manufacturerText} ${modelText} ${osText} ${osVersionText} ${appVersionText} ${registeredByText} ${approvedByText}`;
        if (!combined.includes(quickKeyword)) return false;
      }

      return true;
    });
  }, [
    applicationsQuery.data,
    appStatusFilter,
    processedStatusFilter,
    manufacturerFilter,
    modelFilter,
    osFilter,
    osVersionFilter,
    appQuickSearch,
    registeredByFilter,
    approvedByFilter,
  ]);

  const filterOptions = useMemo(() => {
    const list = applicationsQuery.data?.data ?? [];

    const uniq = (values: Array<string | null | undefined>) =>
      Array.from(
        new Set(values.map((v) => (v ?? "").trim()).filter((v) => v.length > 0))
      ).sort((a, b) => a.localeCompare(b));

    return {
      manufacturers: uniq(list.map((item) => item.manufacturer)),
      models: uniq(list.map((item) => item.model)),
      oss: uniq(list.map((item) => item.os)),
      osVersions: uniq(list.map((item) => item.osVersion)),
      registeredBys: uniq(list.map((item) => item.registeredByName ?? item.registeredBy)),
      approvedBys: uniq(list.map((item) => item.approvedByName ?? item.approvedBy)),
    };
  }, [applicationsQuery.data]);

  const resetApplicationFilters = () => {
    setManufacturerFilter("");
    setModelFilter("");
    setOsFilter("");
    setOsVersionFilter("");
    setAppQuickSearch("");
    setRegisteredByFilter("");
    setApprovedByFilter("");
    setAppStatusFilter("PENDING");
    setProcessedStatusFilter("ALL");
    setIsAdvancedFiltersOpen(false);
    setAppPage(1);
  };

  const activeAdvancedFilterCount = [
    manufacturerFilter,
    modelFilter,
    osFilter,
    osVersionFilter,
    registeredByFilter,
    approvedByFilter,
  ].filter((v) => v.trim().length > 0).length;

  const FilterField = ({
    label,
    value,
    onChange,
    options,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder: string;
  }) => (
    <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5">
      <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</label>
      <div className="flex gap-1.5">
        <select
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setAppPage(1);
          }}
          className="h-8 w-28 rounded border border-gray-300 bg-gray-50 px-2 text-xs"
        >
          <option value="">{ap("pick")}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <Input
          className="h-8 text-xs"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setAppPage(1);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={!value}
          onClick={() => {
            onChange("");
            setAppPage(1);
          }}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem("admin-device-app-filters-v1");
    if (!raw) return;

    try {
      const saved = JSON.parse(raw) as Partial<{
        appStatusFilter: "PENDING" | "PROCESSED" | "ALL";
        processedStatusFilter: "ALL" | "APPROVED" | "REJECTED";
        isAdvancedFiltersOpen: boolean;
        manufacturerFilter: string;
        modelFilter: string;
        osFilter: string;
        osVersionFilter: string;
        appQuickSearch: string;
        registeredByFilter: string;
        approvedByFilter: string;
      }>;

      if (saved.appStatusFilter) setAppStatusFilter(saved.appStatusFilter);
      if (saved.processedStatusFilter) setProcessedStatusFilter(saved.processedStatusFilter);
      if (typeof saved.isAdvancedFiltersOpen === "boolean") setIsAdvancedFiltersOpen(saved.isAdvancedFiltersOpen);
      if (typeof saved.manufacturerFilter === "string") setManufacturerFilter(saved.manufacturerFilter);
      if (typeof saved.modelFilter === "string") setModelFilter(saved.modelFilter);
      if (typeof saved.osFilter === "string") setOsFilter(saved.osFilter);
      if (typeof saved.osVersionFilter === "string") setOsVersionFilter(saved.osVersionFilter);
      if (typeof saved.appQuickSearch === "string") setAppQuickSearch(saved.appQuickSearch);
      if (typeof saved.registeredByFilter === "string") setRegisteredByFilter(saved.registeredByFilter);
      if (typeof saved.approvedByFilter === "string") setApprovedByFilter(saved.approvedByFilter);
    } catch {
      // ignore broken local storage
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      "admin-device-app-filters-v1",
      JSON.stringify({
        appStatusFilter,
        processedStatusFilter,
        isAdvancedFiltersOpen,
        manufacturerFilter,
        modelFilter,
        osFilter,
        osVersionFilter,
        appQuickSearch,
        registeredByFilter,
        approvedByFilter,
      })
    );
  }, [
    appStatusFilter,
    processedStatusFilter,
    isAdvancedFiltersOpen,
    manufacturerFilter,
    modelFilter,
    osFilter,
    osVersionFilter,
    appQuickSearch,
    registeredByFilter,
    approvedByFilter,
  ]);

  const deviceTotalPages = devicesQuery.data?.totalPages ?? 1;
  const appTotalPages = applicationsQuery.data?.totalPages ?? 1;

  const handleConfirmDeviceAction = async () => {
    if (!deviceConfirm) return;
    try {
      await updateDeviceStatus.mutateAsync({
        id: deviceConfirm.id,
        isActive: deviceConfirm.nextActive,
      });
      toast.success(deviceConfirm.nextActive ? dl("unlockSuccess") : dl("lockSuccess"));
      setDeviceConfirm(null);
    } catch {
      toast.error(dl("updateError"));
    }
  };

  const handleConfirmApplicationAction = async () => {
    if (!appConfirm) return;

    try {
      await updateApplicationStatus.mutateAsync({
        id: appConfirm.id,
        status: appConfirm.nextStatus,
      });
      toast.success(ap("approveSuccess"));
      setAppConfirm(null);
    } catch {
      toast.error(ap("updateError"));
    }
  };

  const handleRejectApplication = async () => {
    if (!rejectTargetId) return;
    if (!rejectedReason.trim()) {
      toast.warning(ap("rejectReasonRequired"));
      return;
    }

    try {
      await updateApplicationStatus.mutateAsync({
        id: rejectTargetId,
        status: "REJECTED",
        rejectedReason: rejectedReason.trim(),
      });
      toast.success(ap("rejectSuccess"));
      setRejectTargetId(null);
      setRejectedReason("");
    } catch {
      toast.error(ap("updateError"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center text-sm text-gray-500">
        <span className="hover:text-gray-700 cursor-pointer">Dashboard</span>
        <span className="mx-2">›</span>
        <span className="font-medium text-gray-900">{t("breadcrumb")}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t("title")}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={tab === "devices" ? "primary" : "outline"}
          onClick={() => setTab("devices")}
          className={tab === "devices" ? "bg-[#F37021] hover:bg-[#d95d15] text-white" : ""}
        >
          {t("tabs.devices")}
        </Button>
        <Button
          variant={tab === "applications" ? "primary" : "outline"}
          onClick={() => {
            setTab("applications");
            setAppStatusFilter("PENDING");
            setProcessedStatusFilter("ALL");
            setIsAdvancedFiltersOpen(false);
            setAppPage(1);
          }}
          className={tab === "applications" ? "bg-[#F37021] hover:bg-[#d95d15] text-white" : ""}
        >
          {t("tabs.applications")}
          {pendingApplicationsCount > 0 && (
            <span className={tab === "applications" ? "ml-2 inline-flex items-center justify-center rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#F37021]" : "ml-2 inline-flex items-center justify-center rounded-full bg-[#F37021] px-2 py-0.5 text-[10px] font-bold text-white"}>
              {pendingApplicationsCount}
            </span>
          )}
        </Button>
      </div>

      {tab === "devices" ? (
        <>
          <Card className="border border-gray-200 shadow-sm rounded-lg p-5">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-7 space-y-2">
                <div className="rounded-md border border-gray-200 bg-white px-3 py-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{dl("filterLabel")}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => setIsDeviceAdvancedFiltersOpen((v) => !v)}
                      >
                        {isDeviceAdvancedFiltersOpen ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
                        {isDeviceAdvancedFiltersOpen ? dl("hideAdvanced") : dl("showAdvanced")}
                        {activeDeviceAdvancedFilterCount > 0 && (
                          <span className="ml-2 inline-flex items-center justify-center rounded-full bg-[#F37021] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {activeDeviceAdvancedFilterCount}
                          </span>
                        )}
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-8" onClick={resetDeviceFilters}>
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">{dl("quickSearch")}</label>
                    <div className="flex gap-1.5">
                      <Input
                        className="h-8 text-xs"
                        placeholder={dl("quickSearchPlaceholder")}
                        value={deviceQuickSearch}
                        onChange={(e) => {
                          setDeviceQuickSearch(e.target.value);
                          setDevicePage(1);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={!deviceQuickSearch}
                        onClick={() => {
                          setDeviceQuickSearch("");
                          setDevicePage(1);
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {isDeviceAdvancedFiltersOpen && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-md border border-gray-200 bg-gray-50 p-2.5">
                      <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5">
                        <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">{dl("manufacturer")}</label>
                        <div className="flex gap-1.5">
                          <select value={deviceManufacturerFilter} onChange={(e) => { setDeviceManufacturerFilter(e.target.value); setDevicePage(1); }} className="h-8 w-28 rounded border border-gray-300 bg-gray-50 px-2 text-xs">
                            <option value="">{dl("pick")}</option>
                            {deviceFilterOptions.manufacturers.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                          <Input className="h-8 text-xs" value={deviceManufacturerFilter} placeholder={dl("manufacturer").toLowerCase()} onChange={(e) => { setDeviceManufacturerFilter(e.target.value); setDevicePage(1); }} />
                          <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" disabled={!deviceManufacturerFilter} onClick={() => { setDeviceManufacturerFilter(""); setDevicePage(1); }}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5">
                        <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">{dl("model")}</label>
                        <div className="flex gap-1.5">
                          <select value={deviceModelFilter} onChange={(e) => { setDeviceModelFilter(e.target.value); setDevicePage(1); }} className="h-8 w-28 rounded border border-gray-300 bg-gray-50 px-2 text-xs">
                            <option value="">{dl("pick")}</option>
                            {deviceFilterOptions.models.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                          <Input className="h-8 text-xs" value={deviceModelFilter} placeholder={dl("model").toLowerCase()} onChange={(e) => { setDeviceModelFilter(e.target.value); setDevicePage(1); }} />
                          <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" disabled={!deviceModelFilter} onClick={() => { setDeviceModelFilter(""); setDevicePage(1); }}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5">
                        <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">{dl("os")}</label>
                        <div className="flex gap-1.5">
                          <select value={deviceOsFilter} onChange={(e) => { setDeviceOsFilter(e.target.value); setDevicePage(1); }} className="h-8 w-28 rounded border border-gray-300 bg-gray-50 px-2 text-xs">
                            <option value="">{dl("pick")}</option>
                            {deviceFilterOptions.oss.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                          <Input className="h-8 text-xs" value={deviceOsFilter} placeholder={dl("os").toLowerCase()} onChange={(e) => { setDeviceOsFilter(e.target.value); setDevicePage(1); }} />
                          <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" disabled={!deviceOsFilter} onClick={() => { setDeviceOsFilter(""); setDevicePage(1); }}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5">
                        <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">{dl("ownerId")}</label>
                        <div className="flex gap-1.5">
                          <Input className="h-8 text-xs" value={deviceOwnerId} placeholder={dl("ownerIdPlaceholder")} onChange={(e) => { setDeviceOwnerId(e.target.value); setDevicePage(1); }} />
                          <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" disabled={!deviceOwnerId} onClick={() => { setDeviceOwnerId(""); setDevicePage(1); }}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-12 md:col-span-5">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">{dl("statusLabel")}</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={deviceStatus === "" ? "primary" : "outline"}
                    className={deviceStatus === "" ? "bg-[#F37021] hover:bg-[#d95d15] text-white" : ""}
                    onClick={() => {
                      setDeviceStatus("");
                      setDevicePage(1);
                    }}
                  >
                    {dl("statusAll")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={deviceStatus === "true" ? "primary" : "outline"}
                    className={deviceStatus === "true" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                    onClick={() => {
                      setDeviceStatus("true");
                      setDevicePage(1);
                    }}
                  >
                    {dl("statusActive")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={deviceStatus === "false" ? "primary" : "outline"}
                    className={deviceStatus === "false" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                    onClick={() => {
                      setDeviceStatus("false");
                      setDevicePage(1);
                    }}
                  >
                    {dl("statusInactive")}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border border-gray-200 shadow-sm rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dl("tableDeviceName")}</TableHead>
                  <TableHead>{dl("tableSerial")}</TableHead>
                  <TableHead>{dl("tableOwner")}</TableHead>
                  <TableHead>{dl("tableOwnerId")}</TableHead>
                  <TableHead>{dl("tableStatus")}</TableHead>
                  <TableHead>{dl("tableCreatedAt")}</TableHead>
                  <TableHead className="text-right">{dl("tableActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devicesQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">{dl("loading")}</TableCell>
                  </TableRow>
                ) : devices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">{dl("noData")}</TableCell>
                  </TableRow>
                ) : (
                  devices.map((item: Device) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <button type="button" className="text-left hover:underline" onClick={() => setSelectedDevice(item)}>
                          {item.name}
                        </button>
                      </TableCell>
                      <TableCell>{item.serial}</TableCell>
                      <TableCell>{item.ownerName ?? "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{item.ownerId}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {item.isActive ? dl("statusActive") : dl("statusLocked")}
                        </span>
                      </TableCell>
                      <TableCell>{format(new Date(item.createdAt), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={item.isActive ? "danger" : "outline"}
                          className={item.isActive ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                          onClick={() => setDeviceConfirm({ id: item.id, name: item.name, nextActive: !item.isActive })}
                        >
                          {item.isActive ? <Lock className="w-4 h-4 mr-1" /> : <ShieldCheck className="w-4 h-4 mr-1" />}
                          {item.isActive ? dl("lock") : dl("unlock")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-white">
              <span className="text-sm text-gray-500">{dl("page")} {devicePage} / {deviceTotalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={devicePage <= 1} onClick={() => setDevicePage((p) => Math.max(1, p - 1))}>Previous</Button>
                <Button variant="outline" size="sm" disabled={devicePage >= deviceTotalPages} onClick={() => setDevicePage((p) => Math.min(deviceTotalPages, p + 1))}>Next</Button>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <>
          <Card className="border border-gray-200 shadow-sm rounded-lg p-5">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-7 space-y-2">
                <div className="rounded-md border border-gray-200 bg-white px-3 py-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{ap("filterLabel")}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => setIsAdvancedFiltersOpen((v) => !v)}
                      >
                        {isAdvancedFiltersOpen ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
                        {isAdvancedFiltersOpen ? ap("hideAdvanced") : ap("showAdvanced")}
                        {activeAdvancedFilterCount > 0 && (
                          <span className="ml-2 inline-flex items-center justify-center rounded-full bg-[#F37021] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {activeAdvancedFilterCount}
                          </span>
                        )}
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-8" onClick={resetApplicationFilters}>
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">{ap("quickSearch")}</label>
                    <div className="flex gap-1.5">
                      <Input
                        className="h-8 text-xs"
                        value={appQuickSearch}
                        placeholder={ap("quickSearchPlaceholder")}
                        onChange={(e) => {
                          setAppQuickSearch(e.target.value);
                          setAppPage(1);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={!appQuickSearch}
                        onClick={() => {
                          setAppQuickSearch("");
                          setAppPage(1);
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {isAdvancedFiltersOpen && (
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <FilterField label={ap("manufacturer")} value={manufacturerFilter} onChange={setManufacturerFilter} options={filterOptions.manufacturers} placeholder={ap("manufacturer").toLowerCase()} />
                        <FilterField label={ap("model")} value={modelFilter} onChange={setModelFilter} options={filterOptions.models} placeholder={ap("model").toLowerCase()} />
                        <FilterField label={ap("os")} value={osFilter} onChange={setOsFilter} options={filterOptions.oss} placeholder={ap("os").toLowerCase()} />
                        <FilterField label={ap("osVersion")} value={osVersionFilter} onChange={setOsVersionFilter} options={filterOptions.osVersions} placeholder={ap("osVersion").toLowerCase()} />
                        <FilterField label={ap("registeredBy")} value={registeredByFilter} onChange={setRegisteredByFilter} options={filterOptions.registeredBys} placeholder={ap("registeredBy").toLowerCase()} />
                        <FilterField label={ap("approvedBy")} value={approvedByFilter} onChange={setApprovedByFilter} options={filterOptions.approvedBys} placeholder={ap("approvedBy").toLowerCase()} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="col-span-12 md:col-span-5">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">{ap("statusLabel")}</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={appStatusFilter === "PENDING" ? "primary" : "outline"}
                    className={appStatusFilter === "PENDING" ? "bg-[#F37021] hover:bg-[#d95d15] text-white" : ""}
                    onClick={() => {
                      setAppStatusFilter("PENDING");
                      setProcessedStatusFilter("ALL");
                      setAppPage(1);
                    }}
                  >
                    {ap("statusPending")}
                  </Button>
                  <Button
                    type="button"
                    variant={appStatusFilter === "PROCESSED" ? "primary" : "outline"}
                    className={appStatusFilter === "PROCESSED" ? "bg-[#F37021] hover:bg-[#d95d15] text-white" : ""}
                    onClick={() => {
                      setAppStatusFilter("PROCESSED");
                      setProcessedStatusFilter("ALL");
                      setAppPage(1);
                    }}
                  >
                    {ap("statusProcessed")}
                  </Button>
                  <Button
                    type="button"
                    variant={appStatusFilter === "ALL" ? "primary" : "outline"}
                    className={appStatusFilter === "ALL" ? "bg-[#F37021] hover:bg-[#d95d15] text-white" : ""}
                    onClick={() => {
                      setAppStatusFilter("ALL");
                      setProcessedStatusFilter("ALL");
                      setAppPage(1);
                    }}
                  >
                    {ap("statusAll")}
                  </Button>
                </div>

                {appStatusFilter === "PROCESSED" && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={processedStatusFilter === "ALL" ? "primary" : "outline"}
                      className={processedStatusFilter === "ALL" ? "bg-[#F37021] hover:bg-[#d95d15] text-white" : ""}
                      onClick={() => {
                        setProcessedStatusFilter("ALL");
                        setAppPage(1);
                      }}
                    >
                      {ap("processedAll")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={processedStatusFilter === "APPROVED" ? "primary" : "outline"}
                      className={processedStatusFilter === "APPROVED" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                      onClick={() => {
                        setProcessedStatusFilter("APPROVED");
                        setAppPage(1);
                      }}
                    >
                      {ap("processedApproved")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={processedStatusFilter === "REJECTED" ? "primary" : "outline"}
                      className={processedStatusFilter === "REJECTED" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                      onClick={() => {
                        setProcessedStatusFilter("REJECTED");
                        setAppPage(1);
                      }}
                    >
                      {ap("processedRejected")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="border border-gray-200 shadow-sm rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ap("tableDevice")}</TableHead>
                  <TableHead>{ap("tableSerial")}</TableHead>
                  <TableHead>{ap("tableRegisteredBy")}</TableHead>
                  <TableHead>{ap("tableApprovedBy")}</TableHead>
                  <TableHead>{ap("tableStatus")}</TableHead>
                  <TableHead>{ap("tableCreatedAt")}</TableHead>
                  <TableHead>{ap("tableUpdatedAt")}</TableHead>
                  <TableHead>{ap("tableRejectedReason")}</TableHead>
                  <TableHead className="text-right">{ap("tableActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applicationsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">{ap("loading")}</TableCell>
                  </TableRow>
                ) : applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">{ap("noData")}</TableCell>
                  </TableRow>
                ) : (
                  applications.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          className="text-left hover:underline"
                          onClick={() => setSelectedApplication(item)}
                        >
                          <div>{item.deviceName ?? "-"}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{item.deviceId}</div>
                        </button>
                      </TableCell>
                      <TableCell>{item.deviceSerial ?? "-"}</TableCell>
                      <TableCell>
                        <div>{item.registeredByName ?? "-"}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{item.registeredBy}</div>
                      </TableCell>
                      <TableCell>
                        {item.approvedByName ? (
                          <>
                            <div>{item.approvedByName}</div>
                            <div className="text-[11px] text-gray-400 font-mono">{item.approvedBy}</div>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.status === "PENDING" ? "bg-yellow-100 text-yellow-800" : item.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {item.status === "PENDING" ? ap("statusPending") : item.status === "APPROVED" ? ap("processedApproved") : ap("processedRejected")}
                        </span>
                      </TableCell>
                      <TableCell>{format(new Date(item.createdAt), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell>{format(new Date(item.updatedAt), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell className="max-w-[220px]">
                        <span className="text-xs text-gray-600">{item.rejectedReason ?? "-"}</span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {item.status === "PENDING" ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setAppConfirm({ id: item.id, nextStatus: "APPROVED" })}>
                              <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" /> {ap("approve")}
                            </Button>
                            <Button size="sm" variant="danger" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { setRejectTargetId(item.id); setRejectedReason(""); }}>
                              <XCircle className="w-4 h-4 mr-1" /> {ap("reject")}
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-500">{ap("alreadyProcessed")}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-white">
              <span className="text-sm text-gray-500">{ap("page")} {appPage} / {appTotalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={appPage <= 1} onClick={() => setAppPage((p) => Math.max(1, p - 1))}>Previous</Button>
                <Button variant="outline" size="sm" disabled={appPage >= appTotalPages} onClick={() => setAppPage((p) => Math.min(appTotalPages, p + 1))}>Next</Button>
              </div>
            </div>
          </Card>
        </>
      )}

      <Dialog open={!!selectedDevice} onOpenChange={(open) => !open && setSelectedDevice(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dl("detailTitle")}</DialogTitle>
          </DialogHeader>

          {selectedDevice && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><span className="font-semibold">{dl("detailDeviceName")}:</span> {selectedDevice.name}</div>
                <div><span className="font-semibold">{dl("detailSerial")}:</span> {selectedDevice.serial}</div>
                <div><span className="font-semibold">{dl("detailOwner")}:</span> {selectedDevice.ownerName ?? "-"}</div>
                <div><span className="font-semibold">{dl("detailOwnerId")}:</span> <span className="font-mono text-xs">{selectedDevice.ownerId}</span></div>
                <div><span className="font-semibold">{dl("detailStatus")}:</span> {selectedDevice.isActive ? dl("statusActive") : dl("statusLocked")}</div>
                <div><span className="font-semibold">{dl("detailCreatedAt")}:</span> {format(new Date(selectedDevice.createdAt), "dd/MM/yyyy HH:mm")}</div>
                <div><span className="font-semibold">{dl("detailUpdatedAt")}:</span> {format(new Date(selectedDevice.updatedAt), "dd/MM/yyyy HH:mm")}</div>
              </div>

              <div>
                <p className="font-semibold mb-2">{dl("detailMetadata")}</p>
                {selectedDevice.metadata && Object.keys(selectedDevice.metadata).length > 0 ? (
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-1">
                    {Object.entries(selectedDevice.metadata).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="font-medium min-w-36">{key}:</span>
                        <span className="break-all">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">{dl("noMetadata")}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedApplication} onOpenChange={(open) => !open && setSelectedApplication(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{ap("detailTitle")}</DialogTitle>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><span className="font-semibold">{ap("detailDeviceName")}:</span> {selectedApplication.deviceName ?? "-"}</div>
                <div><span className="font-semibold">{ap("detailSerial")}:</span> {selectedApplication.deviceSerial ?? "-"}</div>
                <div><span className="font-semibold">{ap("detailDeviceId")}:</span> <span className="font-mono text-xs">{selectedApplication.deviceId}</span></div>
                <div><span className="font-semibold">{ap("detailManufacturer")}:</span> {selectedApplication.manufacturer ?? "-"}</div>
                <div><span className="font-semibold">{ap("detailModel")}:</span> {selectedApplication.model ?? "-"}</div>
                <div><span className="font-semibold">{ap("detailOs")}:</span> {selectedApplication.os ?? "-"}</div>
                <div><span className="font-semibold">{ap("detailOsVersion")}:</span> {selectedApplication.osVersion ?? "-"}</div>
                <div><span className="font-semibold">{ap("detailAppVersion")}:</span> {selectedApplication.appVersion ?? "-"}</div>
                <div><span className="font-semibold">{ap("detailRegisteredBy")}:</span> {selectedApplication.registeredByName ?? selectedApplication.registeredBy ?? "-"}</div>
                <div><span className="font-semibold">{ap("detailApprovedBy")}:</span> {selectedApplication.approvedByName ?? selectedApplication.approvedBy ?? "-"}</div>
                <div><span className="font-semibold">{ap("detailStatus")}:</span> {selectedApplication.status}</div>
                <div><span className="font-semibold">{ap("detailRejectedReason")}:</span> {selectedApplication.rejectedReason ?? "-"}</div>
              </div>

              <div>
                <p className="font-semibold mb-2">{ap("detailMetadata")}</p>
                {selectedApplication.deviceMetadata && Object.keys(selectedApplication.deviceMetadata).length > 0 ? (
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-1">
                    {Object.entries(selectedApplication.deviceMetadata).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="font-medium min-w-36">{key}:</span>
                        <span className="break-all">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">{ap("noMetadata")}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!deviceConfirm}
        onClose={() => setDeviceConfirm(null)}
        onConfirm={handleConfirmDeviceAction}
        title={deviceConfirm?.nextActive ? dl("confirmUnlockTitle") : dl("confirmLockTitle")}
        description={deviceConfirm ? (deviceConfirm.nextActive ? dl("confirmUnlockDesc", { name: deviceConfirm.name }) : dl("confirmLockDesc", { name: deviceConfirm.name })) : ""}
        confirmLabel={deviceConfirm?.nextActive ? dl("confirmUnlockLabel") : dl("confirmLockLabel")}
        variant={deviceConfirm?.nextActive ? "primary" : "danger"}
        isLoading={updateDeviceStatus.isPending}
      />

      <ConfirmDialog
        isOpen={!!appConfirm}
        onClose={() => {
          setAppConfirm(null);
        }}
        onConfirm={handleConfirmApplicationAction}
        title={ap("confirmApproveTitle")}
        description={ap("confirmApproveDesc")}
        confirmLabel={ap("confirmApproveLabel")}
        variant="primary"
        isLoading={updateApplicationStatus.isPending}
      />

      <Dialog open={!!rejectTargetId} onOpenChange={(open) => !open && setRejectTargetId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{ap("rejectDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{ap("rejectDialogDesc")}</p>
            <textarea
              value={rejectedReason}
              onChange={(e) => setRejectedReason(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-red-200 bg-white p-2 text-sm"
              placeholder={ap("rejectReasonPlaceholder")}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setRejectTargetId(null); setRejectedReason(""); }}>
                {ap("cancel")}
              </Button>
              <Button type="button" variant="danger" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleRejectApplication} disabled={updateApplicationStatus.isPending}>
                {ap("rejectConfirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
