"use client";

import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { useStudentExamsBySession } from "@/hooks/use-student-exams";
import { useSeatManagement, ExamSeat } from "@/hooks/use-seat-management";
import { useExamScheduleById } from "@/hooks/use-exam-schedules";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { SeatGrid } from "./SeatGrid";
import { SeatActionsPanel } from "./SeatActionsPanel";
import { StudentDetailModal } from "./StudentDetailModal";
import { examSchedulesApi } from "@/lib/api/exam-schedules";
import { toast } from "sonner";

interface SeatingPlanProps {
    examSessionId: string;
    maxRows: number | null;
    maxColumns: number | null;
    totalSeats: number | null;
}

export default function SeatingPlan({
    examSessionId,
    maxRows = 5,
    maxColumns = 6,
    totalSeats = 30
}: SeatingPlanProps) {
    // Auth and data hooks
    const { user } = useAuth();
    const { data: scheduleData, refetch: refetchSchedule } = useExamScheduleById(examSessionId);
    const { data: studentsResponse, isLoading: studentsLoading, refetch: refetchStudents } = useStudentExamsBySession(examSessionId);
    const {
        seats,
        loading: seatsLoading,
        error: seatsError,
        fetchSeats,
        lockSeat,
        unlockSeat,
    } = useSeatManagement(examSessionId);

    // UI state
    const [isEditing, setIsEditing] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [selectedSeat, setSelectedSeat] = useState<ExamSeat | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [isFinalizingSeats, setIsFinalizingSeats] = useState(false);

    const students = studentsResponse?.data || [];
    const rows = maxRows || 5;
    const cols = maxColumns || 6;
    const hasStudentsImported = scheduleData?.hasStudentsImported || false;
    const unassignedStudentsCount = students.filter(s => !s.seatPosition).length;

    // Fetch seats on mount
    useEffect(() => {
        fetchSeats();
    }, [examSessionId, fetchSeats]);

    // Handle seat selection
    const handleSeatSelect = (seat: ExamSeat | undefined) => {
        if (!seat) return;
        
        setSelectedSeat(seat);

        // Find corresponding student
        const seatNumber = (seat.row - 1) * cols + seat.col;
        const student = students.find(s => s.seatNumber === seatNumber.toString());
        setSelectedStudent(student || null);
    };

    // Handle seat lock/unlock - toggle directly without confirmation
    const handleSeatLockToggle = async (seat: ExamSeat) => {
        try {
            setActionError(null);
            
            if (seat.status === 'Locked') {
                const result = await unlockSeat(seat.id);
                if (!result.success) {
                    setActionError(result.error || 'Failed to unlock seat');
                }
            } else {
                const result = await lockSeat(seat.id);
                if (!result.success) {
                    setActionError(result.error || 'Failed to lock seat');
                }
            }
        } catch (err) {
            setActionError('An unexpected error occurred');
        }
    };

    // Handle finalize seat assignments
    const handleFinalizeSeats = async () => {
        try {
            setIsFinalizingSeats(true);
            setActionError(null);
            
            const result = await examSchedulesApi.finalizeSeats(examSessionId);
            
            if (result.success) {
                toast.success(`Successfully assigned ${result.data.studentsAssigned} students to seats`);
                // Refresh all data
                await Promise.all([
                    fetchSeats(),
                    refetchStudents(),
                    refetchSchedule()
                ]);
            }
        } catch (err: any) {
            const errorMsg = err?.response?.data?.message || 'Failed to finalize seat assignments';
            setActionError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsFinalizingSeats(false);
        }
    };

    const isLoading = studentsLoading || seatsLoading;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-xl">
                    <Users className="h-5 w-5 text-slate-500" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Seating Plan ({students.filter(s => s.status === 'CHECKEDIN').length}/{totalSeats || rows * cols})
                </h3>
            </div>

            {/* Actions Panel */}
            <SeatActionsPanel
                isEditing={isEditing}
                onEditToggle={setIsEditing}
                onRefresh={fetchSeats}
                onFinalize={handleFinalizeSeats}
                userRole={user?.role}
                error={actionError || seatsError}
                hasStudentsImported={hasStudentsImported}
                hasUnassignedStudents={unassignedStudentsCount > 0}
                isFinalizingSeats={isFinalizingSeats}
            />

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3">
                <LegendItem color="bg-green-50 border-green-200" label="AVAILABLE" dotColor="bg-green-500" textColor="text-green-600" />
                <LegendItem color="bg-gray-100 border-gray-300" label="LOCKED" dotColor="bg-gray-500" textColor="text-gray-600" />
                <LegendItem color="bg-orange-50 border-orange-200" label="ASSIGNED" dotColor="bg-orange-500" textColor="text-orange-600" />
                <LegendItem color="bg-blue-50 border-blue-200" label="PRESENT" dotColor="bg-blue-500" textColor="text-blue-600" />
                <LegendItem color="bg-red-50 border-red-200" label="ABSENT" dotColor="bg-red-500" textColor="text-red-600" />
            </div>

            {/* Loading state */}
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-64 w-full rounded-xl" />
                    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                        {Array.from({ length: rows * cols }).map((_, i) => (
                            <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
                        ))}
                    </div>
                </div>
            ) : (
                <SeatGrid
                    rows={rows}
                    cols={cols}
                    seats={seats}
                    students={students}
                    onSeatSelect={handleSeatSelect}
                    onSeatLockToggle={handleSeatLockToggle}
                    isEditing={isEditing}
                    userRole={user?.role}
                />
            )}

            {/* Modals */}
            <StudentDetailModal
                student={selectedStudent}
                seat={selectedSeat}
                isOpen={!!selectedStudent}
                onClose={() => {
                    setSelectedStudent(null);
                    setSelectedSeat(null);
                }}
            />
        </div>
    );
}

function LegendItem({ color, label, dotColor, textColor = "text-slate-500" }: any) {
    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black tracking-widest ${color} ${textColor}`}>
            <div className={`w-2 h-2 rounded-full ${dotColor}`} />
            {label}
        </div>
    );
}
