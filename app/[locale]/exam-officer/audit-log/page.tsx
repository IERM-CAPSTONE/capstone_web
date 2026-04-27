"use client";

import { FormEvent, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Fingerprint,
  Loader2,
  Search,
  ShieldAlert,
  Ticket,
  UserRoundSearch,
  XCircle,
} from "lucide-react";
import { auditLogApi, AttendanceSnapshotItem, FaceEnrollmentItem } from "@/lib/api/audit-log";
import type { TicketFull } from "@/lib/api/tickets";
import { cn } from "@/lib/utils/cn";

type AuditResult = {
  tickets: Partial<TicketFull>[];
  attendanceSnapshots: AttendanceSnapshotItem[];
  faceEnrollments: FaceEnrollmentItem[];
};

const SNAPSHOT_STATUS_STYLES: Record<AttendanceSnapshotItem["status"], string> = {
  MATCHED: "bg-emerald-100 text-emerald-700",
  NOT_MATCHED: "bg-slate-200 text-slate-700",
  WRONG_ROOM: "bg-amber-100 text-amber-700",
  FAILED: "bg-rose-100 text-rose-700",
};

function SnapshotStatusIcon({ status }: { status: AttendanceSnapshotItem["status"] }) {
  if (status === "MATCHED") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "WRONG_ROOM") return <ShieldAlert className="h-4 w-4" />;
  if (status === "FAILED") return <AlertCircle className="h-4 w-4" />;
  return <XCircle className="h-4 w-4" />;
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        {icon}
      </div>
      <p className="mt-4 max-w-sm text-sm font-medium text-slate-500">{text}</p>
    </div>
  );
}

export default function ExamOfficerAuditLogPage() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<AuditResult>({
    tickets: [],
    attendanceSnapshots: [],
    faceEnrollments: [],
  });

  const summary = useMemo(
    () => ({
      ticketCount: result?.tickets?.length ?? 0,
      snapshotCount: result?.attendanceSnapshots?.length ?? 0,
      matchedCount: result?.attendanceSnapshots?.filter((item) => item.status === "MATCHED").length ?? 0,
      enrollmentCount: result?.faceEnrollments?.length ?? 0,
    }),
    [result],
  );

  async function handleSearch(event: FormEvent) {
    event.preventDefault();

    const trimmed = keyword.trim();
    if (!trimmed) {
      toast.error("Nhập MSSV hoặc email để tra cứu.");
      return;
    }

    setLoading(true);
    try {
      const data = await auditLogApi.search(trimmed);
      setResult(data);
      setSearched(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Không thể tải audit log.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-[#f8fafc]">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#F37021]">Exam Officer</p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Audit log</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500">
                  Tra cứu ticket và ảnh điểm danh theo MSSV hoặc email để hậu kiểm nhanh trong các tình huống cần đối soát.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="Tickets" value={summary.ticketCount} icon={<Ticket className="h-4 w-4" />} />
                <StatCard label="Snapshots" value={summary.snapshotCount} icon={<Camera className="h-4 w-4" />} />
                <StatCard label="Enrollments" value={summary.enrollmentCount} icon={<Fingerprint className="h-4 w-4" />} />
                <StatCard label="Matched" value={summary.matchedCount} icon={<CheckCircle2 className="h-4 w-4" />} />
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            <form onSubmit={handleSearch} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Nhập MSSV hoặc email"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-[#F37021] focus:ring-4 focus:ring-orange-100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#F37021] px-5 text-sm font-bold text-white transition hover:bg-[#dd641c] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundSearch className="h-4 w-4" />}
                  Tìm kiếm
                </button>
              </div>
            </form>
          </div>

          <div className="grid gap-6 px-6 pb-6 lg:grid-cols-3">
            <section className="rounded-[24px] border border-slate-200 bg-white">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-[#F37021]">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Tickets liên quan</h2>
                  <p className="text-xs text-slate-500">Các ticket gắn theo MSSV hoặc do người dùng này tạo.</p>
                </div>
              </div>
              <div className="max-h-[720px] space-y-3 overflow-y-auto p-5">
                {!searched && <EmptyState icon={<Ticket className="h-5 w-5" />} text="Hãy thực hiện tìm kiếm để xem ticket." />}
                {searched && result.tickets.length === 0 && <EmptyState icon={<Ticket className="h-5 w-5" />} text="Không tìm thấy ticket liên quan." />}
                {result.tickets.map((ticket) => (
                  <article key={ticket.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-slate-900">{ticket.issueName || "Untitled ticket"}</h3>
                        <p className="mt-1 text-xs text-slate-500">{ticket.issueType || "Unknown type"}</p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                        {ticket.status || "UNKNOWN"}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-slate-600">
                      {ticket.studentCode && <p><span className="font-semibold text-slate-800">MSSV:</span> {ticket.studentCode}</p>}
                      {ticket.sessionId && <p><span className="font-semibold text-slate-800">Session:</span> {ticket.sessionId}</p>}
                      {ticket.description && <p className="line-clamp-3"><span className="font-semibold text-slate-800">Mô tả:</span> {ticket.description}</p>}
                      <p><span className="font-semibold text-slate-800">Tạo lúc:</span> {ticket.createdAt ? format(new Date(ticket.createdAt), "dd/MM/yyyy HH:mm") : "N/A"}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Ảnh đăng ký</h2>
                  <p className="text-xs text-slate-500">Ảnh khuôn mặt gốc được dùng làm dữ liệu mẫu.</p>
                </div>
              </div>
              <div className="max-h-[720px] overflow-y-auto p-5">
                {!searched && <EmptyState icon={<Fingerprint className="h-5 w-5" />} text="Hãy thực hiện tìm kiếm để xem ảnh đăng ký." />}
                {searched && result.faceEnrollments.length === 0 && <EmptyState icon={<Fingerprint className="h-5 w-5" />} text="Không tìm thấy ảnh đăng ký." />}
                <div className="space-y-4">
                  {result.faceEnrollments.map((enrollment) => {
                    const images = enrollment.capturedImageUrls
                      ? Object.entries(enrollment.capturedImageUrls as Record<string, string>)
                      : [];

                    return (
                      <div key={enrollment.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Bản ghi {format(new Date(enrollment.createdAt), "dd/MM/yyyy")}
                          </span>
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold ring-1",
                            enrollment.status === "APPROVED" ? "bg-emerald-50 text-emerald-600 ring-emerald-200" : "bg-amber-50 text-amber-600 ring-amber-200"
                          )}>
                            {enrollment.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {images.length > 0 ? (
                            images.map(([pose, url]) => (
                              <div key={pose} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-white">
                                <img src={url} alt={pose} className="h-full w-full object-cover" />
                                <div className="absolute inset-x-0 bottom-0 bg-black/40 py-0.5 text-center text-[8px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                                  {pose}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-5 flex h-20 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                              <Camera className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        {enrollment.supervisorName && (
                          <p className="mt-3 text-[10px] text-slate-500">
                            <span className="font-semibold text-slate-700">Giám thị:</span> {enrollment.supervisorName}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Ảnh điểm danh</h2>
                  <p className="text-xs text-slate-500">Snapshot phục vụ hậu kiểm nhận diện khuôn mặt.</p>
                </div>
              </div>
              <div className="max-h-[720px] overflow-y-auto p-5">
                {!searched && <EmptyState icon={<Camera className="h-5 w-5" />} text="Hãy thực hiện tìm kiếm để xem ảnh điểm danh." />}
                {searched && result.attendanceSnapshots.length === 0 && <EmptyState icon={<Camera className="h-5 w-5" />} text="Không tìm thấy ảnh điểm danh." />}
                <div className="grid gap-4 sm:grid-cols-2">
                  {result.attendanceSnapshots.map((snapshot) => (
                    <article key={snapshot.id} className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50">
                      <div className="aspect-[4/3] bg-slate-100">
                        {snapshot.imageUrl ? (
                          <img
                            src={snapshot.imageUrl}
                            alt={`Attendance snapshot ${snapshot.id}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <Camera className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
                              SNAPSHOT_STATUS_STYLES[snapshot.status],
                            )}
                          >
                            <SnapshotStatusIcon status={snapshot.status} />
                            {snapshot.status}
                          </span>
                        </div>
                        <div className="space-y-1.5 text-[11px] text-slate-600">
                          <p><span className="font-semibold text-slate-800">Session:</span> {snapshot.examSessionId}</p>
                          {snapshot.confidence != null && <p><span className="font-semibold text-slate-800">Confidence:</span> {(snapshot.confidence * 100).toFixed(1)}%</p>}
                          <p><span className="font-semibold text-slate-800">Thời gian:</span> {format(new Date(snapshot.captureTimestamp), "dd/MM/yyyy HH:mm")}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
