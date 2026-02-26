"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    User,
    MapPin,
    Mail,
    UserCheck,
    X,
    Info,
    CheckCircle2,
    Clock,
    Users
} from "lucide-react";
import { createPortal } from "react-dom";
import { useStudentExamsBySession } from "@/hooks/use-student-exams";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentExam } from "@/lib/api/student-exams";
import { cn } from "@/lib/utils/cn";

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
    const { data: studentsResponse, isLoading } = useStudentExamsBySession(examSessionId);
    const [selectedStudent, setSelectedStudent] = useState<StudentExam | null>(null);
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

    useEffect(() => {
        setAvatarLoadFailed(false);
    }, [selectedStudent?.id]);

    const students = studentsResponse?.data || [];

    // Real dimensions from room, fallback to 5x6
    const rows = maxRows || 5;
    const cols = maxColumns || 6;

    // Map students to seats for easy lookup
    const seatMap = new Map<string, StudentExam>();
    students.forEach(st => {
        if (st.seatNumber) {
            seatMap.set(st.seatNumber, st);
        }
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                    {Array.from({ length: rows * cols }).map((_, i) => (
                        <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    const renderSeat = (row: number, col: number) => {
        const seatId = `${row}-${col}`;
        const label = `R${row}C${col}`;
        const student = seatMap.get(seatId);

        let seatStyles = "bg-[#F8FAFC] border-slate-100 opacity-60"; // Default: Available
        let textStyles = "text-slate-400";
        let labelStyles = "text-slate-300";
        let statusText = "Available";

        if (student) {
            if (student.status === 'CHECKEDIN') {
                seatStyles = "bg-[#F0FDF4] border-[#DCFCE7] shadow-sm";
                textStyles = "text-[#15803D]";
                labelStyles = "text-[#16A34A]";
                statusText = student.studentCode || "PRESENT";
            } else if (student.status === 'ABSENT' || (student.status === 'REGISTERED' && students.some(s => s.status === 'CHECKEDIN'))) {
                // If some are checked in but this one isn't, it's basically absent or pending
                seatStyles = "bg-[#FEF2F2] border-[#FEE2E2] shadow-sm";
                textStyles = "text-[#EF4444]";
                labelStyles = "text-[#EF4444]";
                statusText = student.studentCode || "ABSENT";
            } else {
                // Default Occupied/Registered (Blue)
                seatStyles = "bg-[#EFF6FF] border-[#DBEAFE] shadow-sm";
                textStyles = "text-[#1D4ED8]";
                labelStyles = "text-[#2563EB]";
                statusText = student.studentCode || "OCCUPIED";
            }
        }

        return (
            <div
                key={seatId}
                onClick={() => student && setSelectedStudent(student)}
                className={cn(
                    "relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 h-[70px]",
                    student ? "cursor-pointer hover:scale-105 hover:shadow-md z-10" : "cursor-default",
                    seatStyles
                )}
            >
                <div className={cn("text-[10px] font-black mb-0.5 uppercase tracking-tighter", labelStyles)}>
                    {label}
                </div>
                <div className={cn("text-[13px] font-black tracking-tight", textStyles)}>
                    {statusText}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-xl">
                        <Users className="h-5 w-5 text-slate-500" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Seating Plan ({students.filter(s => s.status === 'CHECKEDIN').length}/{totalSeats || rows * cols})</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <LegendItem color="bg-slate-200" label="AVAILABLE" dotColor="bg-slate-300" />
                    <LegendItem color="bg-blue-50 border-blue-200" label="OCCUPIED" dotColor="bg-blue-500" textColor="text-blue-600" />
                    <LegendItem color="bg-green-50 border-green-200" label="PRESENT" dotColor="bg-green-500" textColor="text-green-600" />
                    <LegendItem color="bg-red-50 border-red-200" label="ABSENT" dotColor="bg-red-500" textColor="text-red-600" />
                </div>
            </div>

            <Card className="border border-slate-200 shadow-none bg-white p-6 md:p-8">
                <div
                    className="grid gap-3 md:gap-4 max-w-5xl mx-auto"
                    style={{
                        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
                    }}
                >
                    {Array.from({ length: rows }).map((_, r) => (
                        Array.from({ length: cols }).map((_, c) => renderSeat(r + 1, c + 1))
                    ))}
                </div>

                {/* Legend: Teacher Desk Indicator */}
                <div className="mt-12 flex justify-center">
                    <div className="px-12 py-3 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200">
                        Teacher Desk / Entrance
                    </div>
                </div>
            </Card>

            {/* Student Detail Modal */}
            {selectedStudent && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden rounded-2xl animate-in zoom-in-95 duration-200">
                        <div className="relative h-24 bg-gradient-to-r from-orange-400 to-orange-600">
                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="absolute top-4 right-4 p-1.5 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <CardContent className="px-6 pb-6 -mt-6 space-y-5">
                            <div className="flex flex-col items-center">
                                <div className="relative z-10 p-1 bg-white rounded-full shadow-lg mb-4">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center border-4 border-slate-50">
                                        {selectedStudent.studentAvatarUrl && !avatarLoadFailed ? (
                                            <img
                                                src={selectedStudent.studentAvatarUrl}
                                                alt={selectedStudent.studentName || "Student avatar"}
                                                className="w-full h-full rounded-full object-cover"
                                                onError={() => setAvatarLoadFailed(true)}
                                            />
                                        ) : (
                                            <User className="h-10 w-10 text-slate-400" />
                                        )}
                                    </div>
                                </div>
                                <h4 className="text-xl font-bold text-slate-900">{selectedStudent.studentName || "Unknown Student"}</h4>
                                <p className="text-sm text-slate-500 font-medium">Student ID: {selectedStudent.studentCode}</p>
                            </div>

                            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/80">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                        <MapPin className="h-4 w-4 text-orange-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Assigned Seat</p>
                                        <p className="text-sm font-bold text-slate-900">Desk {selectedStudent.seatNumber}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-dashed border-slate-200" />

                            <div className="space-y-3 text-sm">
                                <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Mail className="h-4 w-4 text-slate-400" />
                                        <span>Email</span>
                                    </div>
                                    <p className="font-medium text-slate-900 truncate text-right">student@fpt.edu.vn</p>
                                </div>

                                <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Info className="h-4 w-4 text-slate-400" />
                                        <span>CCCD</span>
                                    </div>
                                    <p className="font-medium text-slate-900 truncate text-right">{selectedStudent.citizenId || '-'}</p>
                                </div>

                                <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <UserCheck className="h-4 w-4 text-slate-400" />
                                        <span>Status</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-1.5">
                                        {selectedStudent.status === 'CHECKEDIN' ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Clock className="h-4 w-4 text-slate-400" />
                                        )}
                                        <span className={`font-bold uppercase text-[10px] ${selectedStudent.status === 'CHECKEDIN' ? 'text-green-600' : 'text-slate-500'}`}>
                                            {selectedStudent.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-dashed border-slate-200" />

                            <div>
                                <Button
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-6 text-sm font-bold uppercase tracking-wider"
                                    onClick={() => setSelectedStudent(null)}
                                >
                                    Close Detail
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>,
                document.body
            )}
        </div>
    );
}

function LegendItem({ color, label, dotColor, textColor = "text-slate-500" }: any) {
    return (
        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black tracking-widest", color, textColor)}>
            <div className={cn("w-2 h-2 rounded-full", dotColor)} />
            {label}
        </div>
    );
}
