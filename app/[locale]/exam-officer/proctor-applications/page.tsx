"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Clock3,
  Filter,
  Search,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  XCircle,
} from "lucide-react";
import { ProctorApplicationManagementTable } from "@/components/proctor-applications/proctor-application-management-table";
import { useProctorApplications } from "@/hooks/use-proctor-applications";
import { ProctorApplicationStatus } from "@/lib/api/proctor-applications";
import { useTranslations } from "next-intl";

function toLocalDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(dateText: string, days: number) {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toLocalDateInputValue(date);
}

export default function ProctorApplicationsManagementPage() {
  const locale = useLocale();
  const isVi = locale === "vi";
  const today = toLocalDateInputValue(new Date());

  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: "" as ProctorApplicationStatus | "",
    teacherId: "",
    preferredDateStart: today,
    preferredDateEnd: today,
  });

  const { data, isLoading } = useProctorApplications({
    page: currentPage,
    limit: 10,
    status: filters.status || undefined,
    teacherId: filters.teacherId || undefined,
    preferredDateStart: filters.preferredDateStart || undefined,
    preferredDateEnd: filters.preferredDateEnd || undefined,
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      teacherId: "",
      preferredDateStart: today,
      preferredDateEnd: today,
    });
    setCurrentPage(1);
  };

  const selectedDay = filters.preferredDateStart || today;

  const moveSelectedDay = (days: number) => {
    const nextDay = shiftDate(selectedDay, days);
    setFilters((prev) => ({
      ...prev,
      preferredDateStart: nextDay,
      preferredDateEnd: nextDay,
    }));
    setCurrentPage(1);
  };

  const resetToToday = () => {
    setFilters((prev) => ({
      ...prev,
      preferredDateStart: today,
      preferredDateEnd: today,
    }));
    setCurrentPage(1);
  };

  const hasActiveFilters =
    filters.status !== "" ||
    filters.teacherId !== "" ||
    filters.preferredDateStart !== today ||
    filters.preferredDateEnd !== today;

  const applications = data?.data || [];
  const visibleApplications = applications.filter((a) => a.status !== "CANCELED");
  const pendingCount = applications.filter((a) => a.status === "PENDING").length;
  const approvedCount = applications.filter((a) => a.status === "APPROVED").length;
  const rejectedCount = applications.filter((a) => a.status === "REJECTED").length;
  const totalCount = visibleApplications.length;

  const text = {
    badge: isVi ? "Theo dõi khảo thí" : "Exam Officer Review",
    title: isVi ? "Đơn đổi lịch giám thị" : "Invigilator Swap Requests",
    description: isVi
      ? "Theo dõi các yêu cầu đổi lịch giữa các giám thị sau khi lịch thi đã được công bố."
      : "Monitor swap requests between assigned invigilators after the exam schedule has been published.",
    workload: isVi ? "Khối lượng hiện tại" : "Current workload",
    openRequests: isVi ? "yêu cầu đang mở" : "open requests",
    filterTitle: isVi ? "Bộ lọc yêu cầu" : "Filter Requests",
    filterDescription: isVi
      ? "Lọc yêu cầu đổi lịch theo trạng thái, mã giám thị và ngày tạo đơn."
      : "Narrow down swap requests by status, invigilator, and request creation date.",
    dayViewTitle: isVi ? "Xem theo ngày" : "Daily View",
    dayViewDescription: isVi
      ? "Mặc định hiển thị các đơn được tạo trong ngày đang chọn để khảo thí dễ theo dõi."
      : "Default the list to requests created on the selected day for easier review.",
    previousDay: isVi ? "Ngày trước" : "Previous day",
    today: isVi ? "Hôm nay" : "Today",
    nextDay: isVi ? "Ngày sau" : "Next day",
    clearFilters: isVi ? "Xóa bộ lọc" : "Clear Filters",
    status: isVi ? "Trạng thái" : "Status",
    allStatuses: isVi ? "Tất cả trạng thái" : "All Statuses",
    pending: isVi ? "Chờ phản hồi" : "Pending",
    approved: isVi ? "Đã chấp nhận" : "Accepted",
    rejected: isVi ? "Đã từ chối" : "Declined",
    teacherId: isVi ? "Mã giám thị" : "Invigilator ID",
    searchTeacher: isVi ? "Tìm theo mã giám thị..." : "Search by invigilator code...",
    dateFrom: isVi ? "Từ ngày tạo" : "Created Date From",
    dateTo: isVi ? "Đến ngày tạo" : "Created Date To",
    selectedDate: isVi ? "Ngày đang xem" : "Viewing Date",
    total: isVi ? "Tổng" : "Total",
  };

  return (
    <div className="mx-auto max-w-8xl px-6 py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-orange-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            {text.badge}
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900">
            {text.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{text.description}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            {text.workload}
          </p>
          <div className="mt-2 flex items-end gap-3">
            <span className="text-3xl font-black text-slate-900">{pendingCount}</span>
            <span className="pb-1 text-sm font-semibold text-slate-500">
              {text.openRequests}
            </span>
          </div>
        </div>
      </div>

      <Card className="mb-6 overflow-hidden rounded-[1.75rem] border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80 pb-5">
          <div className="mb-5 rounded-3xl border border-orange-100 bg-orange-50/60 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
                  {text.dayViewTitle}
                </p>
                <p className="mt-1 text-sm text-slate-600">{text.dayViewDescription}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => moveSelectedDay(-1)}
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  {text.previousDay}
                </Button>
                <div className="rounded-2xl border border-orange-200 bg-white px-4 py-2 text-sm font-bold text-slate-800">
                  <span className="mr-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    {text.selectedDate}
                  </span>
                  {selectedDay}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={resetToToday}
                >
                  {text.today}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => moveSelectedDay(1)}
                >
                  {text.nextDay}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Filter className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-slate-900">{text.filterTitle}</CardTitle>
                <p className="text-sm text-slate-500">{text.filterDescription}</p>
              </div>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" className="rounded-xl" onClick={clearFilters}>
                {text.clearFilters}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                {text.status}
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              >
                <option value="">{text.allStatuses}</option>
                <option value="PENDING">{text.pending}</option>
                <option value="APPROVED">{text.approved}</option>
                <option value="REJECTED">{text.rejected}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                {text.teacherId}
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={filters.teacherId}
                  onChange={(e) => handleFilterChange("teacherId", e.target.value)}
                  placeholder={text.searchTeacher}
                  className="h-12 rounded-2xl border-slate-200 pl-11 text-sm font-semibold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                {text.dateFrom}
              </label>
              <Input
                type="date"
                value={filters.preferredDateStart}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters((prev) => ({
                    ...prev,
                    preferredDateStart: value,
                    preferredDateEnd: prev.preferredDateEnd && prev.preferredDateEnd < value ? value : prev.preferredDateEnd,
                  }));
                  setCurrentPage(1);
                }}
                className="h-12 rounded-2xl border-slate-200 text-sm font-semibold"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                {text.dateTo}
              </label>
              <Input
                type="date"
                value={filters.preferredDateEnd}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters((prev) => ({
                    ...prev,
                    preferredDateEnd: value,
                    preferredDateStart: prev.preferredDateStart && prev.preferredDateStart > value ? value : prev.preferredDateStart,
                  }));
                  setCurrentPage(1);
                }}
                className="h-12 rounded-2xl border-slate-200 text-sm font-semibold"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[1.5rem] border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900">{pendingCount}</div>
              <p className="text-sm font-semibold text-slate-500">{text.pending}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-3xl font-black text-emerald-600">{approvedCount}</div>
              <p className="text-sm font-semibold text-slate-500">{text.approved}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-3xl font-black text-rose-600">{rejectedCount}</div>
              <p className="text-sm font-semibold text-slate-500">{text.rejected}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900">{totalCount}</div>
              <p className="text-sm font-semibold text-slate-500">{text.total}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[1.75rem] border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <ProctorApplicationManagementTable
            applications={visibleApplications}
            isLoading={isLoading}
            currentPage={currentPage}
            pageSize={10}
            total={totalCount}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
