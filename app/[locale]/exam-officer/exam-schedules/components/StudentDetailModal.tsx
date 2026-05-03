import { createPortal } from "react-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  User,
  MapPin,
  Mail,
  UserCheck,
  X,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowRightCircle,
  AlertCircle,
} from "lucide-react";
import { ExamSeat } from "@/hooks/use-seat-management";
import { StudentExam } from "@/lib/api/student-exams";
import { useUpdateStudentExamPart } from "@/hooks/use-student-exams";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface StudentDetailModalProps {
  student: StudentExam | null;
  seat: ExamSeat | null;
  isOpen: boolean;
  onClose: () => void;
  selectedPart?: string | null;
  canChangeSeat?: boolean;
  onChangeSeat?: () => void;
}

export function StudentDetailModal({
  student,
  seat,
  isOpen,
  onClose,
  selectedPart = null,
  canChangeSeat = false,
  onChangeSeat,
}: StudentDetailModalProps) {
  const t = useTranslations("Dashboard.examOfficer.schedulesPage.board");
  const tCommon = useTranslations("Common");
  const updatePartMutation = useUpdateStudentExamPart();

  if (!isOpen || !student || typeof document === 'undefined') {
    return null;
  }

  // Find the specific part data
  const partData = selectedPart
    ? student.parts?.find((p: any) => p.examPartCode === selectedPart)
    : null;

  const handleToggleAttendance = async () => {
    if (!partData) return;

    try {
      const isCheckingIn = !partData.isCheckedIn;
      await updatePartMutation.mutateAsync({
        id: partData.id,
        data: {
          isCheckedIn: isCheckingIn,
          checkInTime: isCheckingIn ? new Date().toISOString() : null,
        }
      });
      toast.success(tCommon(`success.${isCheckingIn ? 'update' : 'update'}`)); // or a more specific message
    } catch (err: any) {
      toast.error(err?.message || tCommon("errors.updateFailed"));
    }
  };

  const isPresent = partData ? partData.isCheckedIn : student.status === 'CHECKEDIN';
  const displayStatus = partData ? (isPresent ? t("legend.present") : t("legend.absent")) : tCommon(`statuses.${student.status}`);

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="relative h-24 bg-gradient-to-r from-orange-400 to-orange-600">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <CardContent className="px-6 pb-6 -mt-10">
          <div className="flex flex-col items-center">
            <div className="p-1 bg-white rounded-full shadow-lg mb-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center border-4 border-slate-50">
                <User className="h-10 w-10 text-slate-400" />
              </div>
            </div>
            <h4 className="text-xl font-bold text-slate-900">
              {student.studentName || t("unknownStudent")}
            </h4>
            <p className="text-sm text-slate-500 font-medium mb-6">
              {t("studentId")}: {student.studentCode}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <MapPin className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  {t("assignedSeat")}
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {seat ? `R${seat.row}C${seat.col}` : t("noSeatAssigned")} ({t("desk")} {student.seatNumber})
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">{t("email")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">{t("status")}</span>
                </div>
              </div>
              <div className="space-y-3 text-right">
                <p className="font-medium text-slate-900 truncate">
                  {student.email || "student@fpt.edu.vn"}
                </p>
                <div className="flex items-center justify-end gap-1.5">
                  {isPresent ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-slate-400" />
                  )}
                  <span className={`font-bold uppercase text-[10px] ${isPresent ? 'text-green-600' : 'text-slate-500'
                    }`}>
                    {displayStatus}
                  </span>
                </div>
              </div>
            </div>

            {selectedPart && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                <div className="flex items-start gap-3">
                  <ArrowRightCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">{t("attendanceMode")}: {selectedPart}</h5>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {t("attendanceModeDesc", { part: selectedPart })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!partData && selectedPart && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-[11px] text-red-600 font-medium">{t("studentNotRegisteredPart")}</p>
              </div>
            )}

            {seat && seat.status === 'Locked' && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <p className="text-[11px] text-orange-700 font-bold">
                  {t("seatLockedWarning")}
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {canChangeSeat ? (
              <Button
                variant="outline"
                className="border-orange-200 text-orange-700 font-bold py-6 uppercase tracking-wider text-xs"
                onClick={() => {
                  onChangeSeat?.();
                  onClose();
                }}
              >
                {t("changeSeat")}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="border-slate-200 text-slate-600 font-bold py-6 uppercase tracking-wider text-xs"
                onClick={onClose}
              >
                {tCommon("cancel")}
              </Button>
            )}
            {selectedPart && partData ? (
              <Button
                className={`text-white py-6 text-xs font-black uppercase tracking-widest shadow-lg transition-all duration-300 ${isPresent
                    ? "bg-slate-400 hover:bg-slate-500"
                    : "bg-green-600 hover:bg-green-700 active:scale-95"
                  }`}
                onClick={handleToggleAttendance}
                disabled={updatePartMutation.isPending}
              >
                {updatePartMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPresent ? (
                  t("markAbsent")
                ) : (
                  t("markPresent")
                )}
              </Button>
            ) : (
              <Button
                className="bg-slate-900 hover:bg-slate-800 text-white py-6 text-xs font-black uppercase tracking-widest"
                onClick={onClose}
              >
                {canChangeSeat ? t("close") : t("ok")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
}
