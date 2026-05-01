"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProctorApplicationManagementTable } from "@/components/proctor-applications/proctor-application-management-table";
import {
  useProctorApplications,
  useUpdateProctorApplicationStatus,
} from "@/hooks/use-proctor-applications";
import { ProctorApplicationStatus } from "@/lib/api/proctor-applications";
import { useTranslations } from "next-intl";

export default function ProctorApplicationsManagementPage() {
  const t = useTranslations("ProctorApplications");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: "" as ProctorApplicationStatus | "",
    teacherId: "",
    preferredDateStart: "",
    preferredDateEnd: "",
  });

  const { data, isLoading } = useProctorApplications({
    page: currentPage,
    limit: 10,
    status: filters.status || undefined,
    teacherId: filters.teacherId || undefined,
    preferredDateStart: filters.preferredDateStart || undefined,
    preferredDateEnd: filters.preferredDateEnd || undefined,
  });

  const updateStatus = useUpdateProctorApplicationStatus();

  const handleApprove = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, data: { status: "APPROVED" } });
    } catch (error) {
      console.error("Error approving application:", error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, data: { status: "REJECTED" } });
    } catch (error) {
      console.error("Error rejecting application:", error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      teacherId: "",
      preferredDateStart: "",
      preferredDateEnd: "",
    });
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t("management")}
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">{t("filters.title")}</CardTitle>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                {t("filters.reset")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t("status")}</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">{t("filters.allStatuses")}</option>
                <option value="PENDING">{t("statuses.pending")}</option>
                <option value="APPROVED">{t("statuses.approved")}</option>
                <option value="REJECTED">{t("statuses.rejected")}</option>
                <option value="CANCELED">{t("statuses.canceled")}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t("filters.teacherId")}</label>
              <Input
                value={filters.teacherId}
                onChange={(e) => handleFilterChange("teacherId", e.target.value)}
                placeholder={t("table.teacherCodePlaceholder")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t("filters.startDate")}</label>
              <Input
                type="date"
                value={filters.preferredDateStart}
                onChange={(e) => handleFilterChange("preferredDateStart", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t("filters.endDate")}</label>
              <Input
                type="date"
                value={filters.preferredDateEnd}
                onChange={(e) => handleFilterChange("preferredDateEnd", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {data?.data.filter((a) => a.status === "PENDING").length || 0}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("statistics.pending")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {data?.data.filter((a) => a.status === "APPROVED").length || 0}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("statistics.approved")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {data?.data.filter((a) => a.status === "REJECTED").length || 0}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("statistics.rejected")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{data?.total || 0}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("statistics.total")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Applications Table */}
      <Card>
        <CardContent className="p-0">
          <ProctorApplicationManagementTable
            applications={data?.data || []}
            onApprove={handleApprove}
            onReject={handleReject}
            isLoading={isLoading}
            currentPage={currentPage}
            pageSize={10}
            total={data?.total || 0}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
