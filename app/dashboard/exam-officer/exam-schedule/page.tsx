"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useExamSchedules, useArchiveExamSchedule, useImportExamSchedules } from "@/hooks/use-exam-schedules";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Loader2,
  AlertCircle,
  Search,
  LayoutGrid,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Import,
  Download,
  MoreVertical,
  Eye,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Archive,
  Upload,
  CheckCircle,
  Edit2,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { ROUTES } from "@/lib/constants/routes";

// Parse date strings as local time (avoid timezone conversion)
const parseLocalDate = (dateStr: string | null): Date | null => {
  if (!dateStr) return null;
  // If it's an ISO string with timezone, extract local components
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (isoMatch) {
    // Create date using local time components (no timezone conversion)
    return new Date(
      parseInt(isoMatch[1]),
      parseInt(isoMatch[2]) - 1,
      parseInt(isoMatch[3]),
      parseInt(isoMatch[4]),
      parseInt(isoMatch[5]),
      parseInt(isoMatch[6])
    );
  }
  return new Date(dateStr);
};

export default function ExamsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState({
    subjectCode: "",
    examRoomId: "",
    proctorId: "",
  });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"schedules" | "students">("schedules");
  const [schedulePreview, setSchedulePreview] = useState<any[]>([]);
  const [studentPreview, setStudentPreview] = useState<any[]>([]);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [editingType, setEditingType] = useState<"schedules" | "students" | null>(null);
  const [importType, setImportType] = useState<"schedule" | "proctor" | "examcode" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, error } = useExamSchedules({
    page,
    limit: 10,
    ...searchParams,
  });
  const archiveMutation = useArchiveExamSchedule();
  const importMutation = useImportExamSchedules();

  const schedules = data?.data || [];
  const totalPages = data?.totalPages || 1;

  const stats = [
    {
      title: "Total Exam Schedules",
      value: data?.total || 0,
      subtitle: "This semester",
      icon: <Calendar className="h-5 w-5 text-blue-500" />,
      bg: "bg-blue-50",
    },
    {
      title: "Exams Today",
      value: schedules.filter(s => {
        const now = new Date();
        const open = s.examOpenTime ? parseLocalDate(s.examOpenTime) : null;
        return open && open.toDateString() === now.toDateString();
      }).length,
      subtitle: "Currently ongoing",
      icon: <Clock className="h-5 w-5 text-green-500" />,
      bg: "bg-green-50",
      status: "text-green-600"
    },
    {
      title: "Upcoming Exams",
      value: schedules.filter(s => {
        const now = new Date();
        const open = s.examOpenTime ? parseLocalDate(s.examOpenTime) : null;
        return open && open > now;
      }).length,
      subtitle: "Scheduled",
      icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
      bg: "bg-orange-50",
      status: "text-orange-600"
    },
    {
      title: "Completed Exams",
      value: schedules.filter(s => {
        const now = new Date();
        const close = s.examCloseTime ? parseLocalDate(s.examCloseTime) : null;
        return close && close < now;
      }).length,
      subtitle: "This semester",
      icon: <CheckCircle2 className="h-5 w-5 text-gray-500" />,
      bg: "bg-gray-50",
    },
  ];

  const clearFilters = () => {
    setSearchParams({
      subjectCode: "",
      examRoomId: "",
      proctorId: "",
    });
    setPage(1);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
        setImportError("Please select a valid CSV or Excel file");
        return;
      }
      setSelectedFile(file);
      setImportError("");
      parseFile(file);
    }
  };

  const parseFile = async (file: File) => {
    try {
      let headers: string[] = [];
      let data: any[] = [];

      if (file.name.endsWith('.csv')) {
        // Parse CSV file
        const text = await file.text();
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);

        if (lines.length < 2) {
          setImportError("File appears to be empty");
          return;
        }

        headers = lines[0].split(',').map(h => h.trim());
        data = lines.slice(1).map((line, idx) => {
          const values = line.split(',').map(v => v.trim());
          const row: any = { stt: idx + 1 };
          headers.forEach((header, i) => {
            row[header] = values[i] || "";
          });
          return row;
        });
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Parse Excel file
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (jsonData.length < 2) {
          setImportError("File appears to be empty");
          return;
        }

        headers = (jsonData[0] as any[]).map(h => String(h || "").trim());
        data = (jsonData.slice(1) as any[][]).map((row, idx) => {
          const rowData: any = { stt: idx + 1 };
          headers.forEach((header, i) => {
            rowData[header] = String(row[i] || "").trim();
          });
          return rowData;
        }).filter(row => Object.keys(row).length > 1); // Filter empty rows
      } else {
        setImportError("Unsupported file format. Please use CSV or Excel files.");
        return;
      }

      // Check if it's the new single-sheet format (with "Ca thi", "Mã SV", "Họ tên")
      const hasNewFormat = headers.includes("Ca thi") || headers.includes("Mã SV");

      if (hasNewFormat) {
        // Extract unique exam schedules from "Ca thi" column
        const examScheduleMap = new Map();
        data.forEach(row => {
          const caThi = row["Ca thi"];
          const monThi = row["Môn thi"];
          if (caThi && !examScheduleMap.has(caThi)) {
            // Parse ca thi format: "26/12/2025 10h40-12h15 ALPHA 704"
            const match = caThi.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d+h\d+)-(\d+h\d+)\s+(.+)$/);
            if (match) {
              const [, date, startTime, endTime, room] = match;
              examScheduleMap.set(caThi, {
                stt: examScheduleMap.size + 1,
                examCode: `${monThi}_${date.replace(/\//g, '')}_${room.replace(/\s+/g, '_')}`,
                subjectCode: monThi,
                examDate: date,
                startTime: startTime,
                endTime: endTime,
                room: room,
                "Ca thi": caThi,
              });
            }
          }
        });

        // Extract student information
        const students = data.map((row, idx) => ({
          stt: idx + 1,
          StudentCode: row["Mã SV"] || "",
          Name: row["Họ tên"] || "",
          Email: row["Email"] || row["MemberCode"] + "@fpt.edu.vn" || "",
          MemberCode: row["MemberCode"] || "",
          CCCD: row["CCCD"] || "",
          "Ca thi": row["Ca thi"] || "",
          "Môn thi": row["Môn thi"] || "",
          "Phần thi": extractExamPart(row["Nộp bài phần thi"] || row["Phần thi"] || row["ExamPart"] || ""),
        }));

        setSchedulePreview(Array.from(examScheduleMap.values()));
        setStudentPreview(students);
      } else {
        // Old format - separate schedules and students by column names
        const schedules = data.filter(row => row.examCode || row.subjectCode);
        const students = data.filter(row => row.StudentCode || row.Name || row.Email);

        setSchedulePreview(schedules);
        setStudentPreview(students);
      }

      setPreviewLoaded(true);
      setActiveTab("schedules");
      setImportError("");
    } catch (err: any) {
      setImportError("Failed to parse file: " + err.message);
      setPreviewLoaded(false);
    }
  };

  const handleDeleteRow = (type: "schedules" | "students", index: number) => {
    if (type === "schedules") {
      setSchedulePreview(prev => prev.filter((_, i) => i !== index));
    } else {
      setStudentPreview(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleEditRow = (type: "schedules" | "students", row: any) => {
    setEditingRow({ ...row });
    setEditingType(type);
  };

  const handleSaveEdit = () => {
    if (!editingRow || !editingType) return;

    if (editingType === "schedules") {
      setSchedulePreview(prev =>
        prev.map(row => row.stt === editingRow.stt ? editingRow : row)
      );
    } else {
      setStudentPreview(prev =>
        prev.map(row => row.stt === editingRow.stt ? editingRow : row)
      );
    }
    setEditingRow(null);
    setEditingType(null);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setImportError("Please select a file first");
      return;
    }

    try {
      await importMutation.mutateAsync(selectedFile);
      setImportSuccess(true);
      setImportError("");
      setTimeout(() => {
        setShowImportDialog(false);
        setSelectedFile(null);
        setImportSuccess(false);
        setPreviewLoaded(false);
        setSchedulePreview([]);
        setStudentPreview([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }, 2000);
    } catch (err: any) {
      setImportError(err?.response?.data?.message || err?.message || "Failed to import exam schedules");
      setImportSuccess(false);
    }
  };

  const handleCloseImportDialog = () => {
    setShowImportDialog(false);
    setSelectedFile(null);
    setImportError("");
    setImportSuccess(false);
    setPreviewLoaded(false);
    setSchedulePreview([]);
    setStudentPreview([]);
    setEditingRow(null);
    setEditingType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Helper function to extract all exam parts from format like "(S:...)(L:...)(R:...)" -> "S, L, R"
  const extractExamPart = (value: string): string => {
    if (!value) return "";
    const matches = value.match(/\(([A-Z]+):/g);
    if (!matches) return "";
    const parts = matches.map(m => m.replace(/[\(\:]/g, ''));
    return parts.join(', ');
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6 bg-slate-50/50 min-h-screen">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
        <LayoutGrid className="h-4 w-4" />
        <span>Dashboard</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-900 font-medium">Exam Schedule</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exam Schedule</h1>
          <p className="text-slate-500 text-sm">Plan and manage examination schedules</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Import Schedule + Students */}
          <Button
            variant="outline"
            className="gap-2 bg-white hover:bg-blue-50 border-blue-200 text-blue-600 hover:text-blue-700 transition-all"
            onClick={() => {
              setImportType("schedule");
              setShowImportDialog(true);
            }}
          >
            <Upload className="h-4 w-4" />
            Import Schedule + Students
          </Button>

          {/* Import Proctors */}
          <Button
            variant="outline"
            className="gap-2 bg-white hover:bg-green-50 border-green-200 text-green-600 hover:text-green-700 transition-all"
            onClick={() => {
              setImportType("proctor");
              setShowImportDialog(true);
            }}
          >
            <Import className="h-4 w-4" />
            Import Proctors
          </Button>

          {/* Import Exam Codes */}
          <Button
            variant="outline"
            className="gap-2 bg-white hover:bg-purple-50 border-purple-200 text-purple-600 hover:text-purple-700 transition-all"
            onClick={() => {
              setImportType("examcode");
              setShowImportDialog(true);
            }}
          >
            <Import className="h-4 w-4" />
            Import Exam Codes
          </Button>

          {/* Export Button */}
          <Button variant="outline" className="gap-2 bg-white hover:bg-slate-50 transition-all">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <h3 className="text-3xl font-bold text-slate-900">{stat.value}</h3>
                  <p className={`text-xs ${stat.status || "text-slate-400"}`}>{stat.subtitle}</p>
                </div>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by subject name or schedule code..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  value={searchParams.subjectCode}
                  onChange={(e) => setSearchParams({ ...searchParams, subjectCode: e.target.value })}
                />
              </div>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white gap-2 px-6"
                onClick={() => router.push(ROUTES.EXAMS_SCHEDULE_CREATE)}
              >
                <Plus className="h-4 w-4" />
                Create Exam Schedule
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Filter className="h-4 w-4" />
                Filters:
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Room"
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs w-24 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  value={searchParams.examRoomId}
                  onChange={(e) => setSearchParams({ ...searchParams, examRoomId: e.target.value })}
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="text"
                  placeholder="Proctor"
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs w-24 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  value={searchParams.proctorId}
                  onChange={(e) => setSearchParams({ ...searchParams, proctorId: e.target.value })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-500 hover:text-slate-900"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">Exam Code</th>
                  <th className="px-6 py-4 font-semibold">Open Code</th>
                  <th className="px-6 py-4 font-semibold">Subject</th>
                  <th className="px-6 py-4 font-semibold">Exam Date</th>
                  <th className="px-6 py-4 font-semibold">Time</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Linked Rooms</th>
                  <th className="px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-red-500">
                      <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                      Failed to load data
                    </td>
                  </tr>
                ) : schedules.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      No exam schedules found
                    </td>
                  </tr>
                ) : (
                  schedules.map((schedule) => {
                    const now = new Date();
                    const open = schedule.examOpenTime ? parseLocalDate(schedule.examOpenTime) : null;
                    const close = schedule.examCloseTime ? parseLocalDate(schedule.examCloseTime) : null;

                    let status = { label: "Upcoming", color: "bg-blue-50 text-blue-600 border-blue-100", icon: <Clock className="h-3 w-3" /> };

                    if (open && close) {
                      if (now >= open && now <= close) {
                        status = { label: "Ongoing", color: "bg-green-50 text-green-600 border-green-100", icon: <div className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" /> };
                      } else if (now > close) {
                        status = { label: "Completed", color: "bg-slate-100 text-slate-600 border-slate-200", icon: <CheckCircle2 className="h-3 w-3" /> };
                      }
                    }

                    return (
                      <tr key={schedule.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 rounded-lg">
                              <FileText className="h-4 w-4 text-purple-500" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-700">{schedule.examCode || `${schedule.subjectCode || "SCH"}-${schedule.id.slice(-6)}`}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-700">{schedule.openCode || "-"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{schedule.subjectCode || "N/A"}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            {open ? format(open, "yyyy-MM-dd") : "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-400" />
                            {open && close ? `${format(open, "HH:mm")} - ${format(close, "HH:mm")}` : "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-500 border border-red-100">
                            Final
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {schedule.examRoomId ? (
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium border border-blue-100 hover:bg-blue-100 transition-colors">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{schedule.examRoomNumber}</span>
                            </button>
                          ) : (
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium border border-red-100">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>No Room</span>
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                              onClick={() => setOpenDropdown(openDropdown === schedule.id ? null : schedule.id)}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                            {openDropdown === schedule.id && (
                              <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                                <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100"
                                  onClick={() => {
                                    router.push(ROUTES.EXAMS_SCHEDULE_DETAIL(schedule.id));
                                    setOpenDropdown(null);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                  View Schedule Details
                                </button>
                                <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100"
                                  onClick={() => {
                                    router.push(ROUTES.EXAMS_SCHEDULE_EDIT(schedule.id));
                                    setOpenDropdown(null);
                                  }}
                                >
                                  <FileText className="h-4 w-4" />
                                  Update Schedule
                                </button>
                                {status.label === "Completed" && (
                                  <button
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    onClick={async () => {
                                      try {
                                        await archiveMutation.mutateAsync(schedule.id);
                                        setOpenDropdown(null);
                                      } catch (err: any) {
                                        alert(err?.message || "Failed to archive schedule");
                                      }
                                    }}
                                    disabled={archiveMutation.isPending}
                                  >
                                    <Archive className="h-4 w-4" />
                                    {archiveMutation.isPending ? "Archiving..." : "Archive Schedule"}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages || 1}</span> ({data?.total || 0} exam schedules)
            </p>
            <div className="flex items-center gap-1">
              {/* First Page */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 bg-white disabled:opacity-40"
                disabled={page === 1}
                onClick={() => setPage(1)}
              >
                First
              </Button>

              {/* Previous Page */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 bg-white disabled:opacity-40"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Page Numbers */}
              {(() => {
                const maxVisible = 5;
                const pages: (number | string)[] = [];

                if (totalPages <= maxVisible + 2) {
                  // Show all pages if total is small
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  // Always show first page
                  pages.push(1);

                  let start = Math.max(2, page - 1);
                  let end = Math.min(totalPages - 1, page + 1);

                  // Adjust range if near start
                  if (page <= 3) {
                    start = 2;
                    end = maxVisible - 1;
                  }

                  // Adjust range if near end
                  if (page >= totalPages - 2) {
                    start = totalPages - maxVisible + 2;
                    end = totalPages - 1;
                  }

                  // Add ellipsis after first page if needed
                  if (start > 2) {
                    pages.push('...');
                  }

                  // Add middle pages
                  for (let i = start; i <= end; i++) {
                    pages.push(i);
                  }

                  // Add ellipsis before last page if needed
                  if (end < totalPages - 1) {
                    pages.push('...');
                  }

                  // Always show last page
                  pages.push(totalPages);
                }

                return pages.map((pageNum, idx) => {
                  if (pageNum === '...') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">
                        ...
                      </span>
                    );
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant="outline"
                      size="sm"
                      className={`h-8 w-8 p-0 ${page === pageNum
                        ? "bg-orange-500 text-white hover:bg-orange-600 border-orange-500"
                        : "bg-white hover:bg-slate-50"
                        }`}
                      onClick={() => setPage(pageNum as number)}
                    >
                      {pageNum}
                    </Button>
                  );
                });
              })()}

              {/* Next Page */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 bg-white disabled:opacity-40"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              {/* Last Page */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 bg-white disabled:opacity-40"
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
              >
                Last
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50/50 border-blue-100 border shadow-none">
        <CardContent className="p-4 flex items-start gap-4">
          <div className="p-2 bg-blue-500 rounded-md">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-blue-900">Exam Schedule Management</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li><span className="font-semibold">• Schedule Actions:</span> Update schedules before exam starts. Archive only completed exams.</li>
              <li><span className="font-semibold">• Linked Rooms:</span> <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded">Red rooms</span> indicate no exam room assigned yet. Click to assign rooms.</li>
              <li><span className="font-semibold">• Status-Based Permissions:</span> Actions are automatically enabled/disabled based on exam status.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-7xl border-none shadow-xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Import className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {importType === "schedule" && "Import Exam Schedule"}
                      {importType === "proctor" && "Import Giám Thị"}
                      {importType === "examcode" && "Import Exam Code & Open Code"}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {importType === "schedule" && "Upload exam schedule file (Ca thi + Students)"}
                      {importType === "proctor" && "Upload proctor assignment file"}
                      {importType === "examcode" && "Upload exam code and open code file"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseImportDialog}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {importSuccess ? (
                <div className="py-12 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-green-50 rounded-full">
                      <CheckCircle className="h-12 w-12 text-green-500" />
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">Import Successful!</h4>
                  <p className="text-sm text-slate-600">Data has been imported successfully.</p>
                </div>
              ) : (
                <>
                  {/* File Upload Area - Show when no preview */}
                  {!previewLoaded ? (
                    <div className="space-y-4">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-orange-500 transition-colors cursor-pointer bg-slate-50/50"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-3 bg-white rounded-lg shadow-sm">
                            <Upload className="h-8 w-8 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              CSV or Excel files only (Max 10MB)
                            </p>
                          </div>
                        </div>
                      </div>

                      {selectedFile && (
                        <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-orange-500" />
                            <div>
                              <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                              <p className="text-xs text-slate-500">
                                {(selectedFile.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      {importError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-600">{importError}</p>
                        </div>
                      )}

                      {/* File Format Info */}
                      <Card className="bg-blue-50/50 border-blue-100 border shadow-none">
                        <CardContent className="p-4">
                          <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            File Format Requirements
                          </h4>
                          {importType === "schedule" && (
                            <ul className="text-xs text-blue-700 space-y-1">
                              <li>• Columns: Ca thi, Mã SV, MemberCode, Họ tên, CCCD, STT, Môn thi</li>
                              <li>• Ca thi format: DD/MM/YYYY HHhMM-HHhMM ROOM (e.g., 26/12/2025 10h40-12h15 ALPHA 704)</li>
                              <li>• First row should contain column headers</li>
                            </ul>
                          )}
                          {importType === "proctor" && (
                            <ul className="text-xs text-blue-700 space-y-1">
                              <li>• Required columns: Ca thi, Giám thị, Email giám thị, Loại giám thị</li>
                              <li>• Loại giám thị: Proctor, Hall Invigilator</li>
                              <li>• First row should contain column headers</li>
                            </ul>
                          )}
                          {importType === "examcode" && (
                            <ul className="text-xs text-blue-700 space-y-1">
                              <li>• Required columns: Ca thi, Exam Code, Open Code</li>
                              <li>• Each exam session can have multiple codes</li>
                              <li>• First row should contain column headers</li>
                            </ul>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <>
                      {/* Tabs */}
                      <div className="flex gap-4 border-b border-slate-200 mb-4">
                        <button
                          onClick={() => setActiveTab("schedules")}
                          className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === "schedules"
                            ? "text-orange-600 border-b-2 border-orange-600"
                            : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                          Exam Schedules ({schedulePreview.length})
                        </button>
                        <button
                          onClick={() => setActiveTab("students")}
                          className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === "students"
                            ? "text-orange-600 border-b-2 border-orange-600"
                            : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                          Students ({studentPreview.length})
                        </button>
                      </div>

                      {importError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 mb-4">
                          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-600">{importError}</p>
                        </div>
                      )}

                      {/* Preview Table */}
                      <div className="overflow-x-auto border border-slate-200 rounded-lg mb-4 max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr className="border-b border-slate-200">
                              <th className="px-4 py-2 text-left font-semibold text-slate-700">STT</th>
                              {activeTab === "schedules"
                                ? (schedulePreview[0]
                                  ? Object.keys(schedulePreview[0])
                                    .filter(k => k !== "stt")
                                    .map(key => (
                                      <th key={key} className="px-4 py-2 text-left font-semibold text-slate-700">
                                        {key}
                                      </th>
                                    ))
                                  : null)
                                : (studentPreview[0]
                                  ? Object.keys(studentPreview[0])
                                    .filter(k => k !== "stt")
                                    .map(key => (
                                      <th key={key} className="px-4 py-2 text-left font-semibold text-slate-700">
                                        {key}
                                      </th>
                                    ))
                                  : null)}
                              <th className="px-4 py-2 text-center font-semibold text-slate-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(activeTab === "schedules" ? schedulePreview : studentPreview).length === 0 ? (
                              <tr>
                                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                                  No data to preview
                                </td>
                              </tr>
                            ) : (
                              (activeTab === "schedules" ? schedulePreview : studentPreview).map((row, idx) => (
                                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                  <td className="px-4 py-2 font-medium text-slate-700">{row.stt}</td>
                                  {Object.entries(row)
                                    .filter(([k]) => k !== "stt")
                                    .map(([key, value]) => (
                                      <td key={key} className="px-4 py-2 text-slate-600">
                                        {String(value).substring(0, 30)}
                                      </td>
                                    ))}
                                  <td className="px-4 py-2 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => handleEditRow(activeTab, row)}
                                        className="p-1 hover:bg-blue-100 rounded text-blue-600 transition-colors"
                                        title="Edit"
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteRow(activeTab, idx)}
                                        className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Change File Button */}
                      <div className="mb-4">
                        <button
                          onClick={() => {
                            fileInputRef.current?.click();
                          }}
                          className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                        >
                          ← Change file
                        </button>
                      </div>
                    </>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
                    <Button
                      variant="outline"
                      onClick={handleCloseImportDialog}
                      disabled={importMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                      onClick={handleImport}
                      disabled={(!selectedFile || importMutation.isPending || !previewLoaded) && !importSuccess}
                    >
                      {importMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Import
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {editingRow && editingType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg border-none shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Edit Row</h3>
                <button
                  onClick={() => {
                    setEditingRow(null);
                    setEditingType(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {Object.entries(editingRow)
                  .filter(([k]) => k !== "stt")
                  .map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {key}
                      </label>
                      <input
                        type="text"
                        value={String(value)}
                        onChange={(e) =>
                          setEditingRow({ ...editingRow, [key]: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                    </div>
                  ))}
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingRow(null);
                    setEditingType(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={handleSaveEdit}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

