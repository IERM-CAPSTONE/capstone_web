"use client";

import { useState } from "react";
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
    Clock
} from "lucide-react";
import { createPortal } from "react-dom";
import { useStudentExamsBySession } from "@/hooks/use-student-exams";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentExam } from "@/lib/api/student-exams";

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
        const student = seatMap.get(seatId);

        return (
            <div
                key={seatId}
                onClick={() => student && setSelectedStudent(student)}
                className={`
          relative aspect-[4/3] rounded-lg border-2 transition-all duration-200
          flex flex-col items-center justify-center p-2 text-center group
          ${student
                        ? "bg-white border-orange-200 shadow-sm hover:shadow-md hover:border-orange-500 cursor-pointer"
                        : "bg-slate-50 border-dashed border-slate-200 opacity-60"}
        `}
            >
                {/* Desk Icon/Shape */}
                <div className={`
          w-full h-2 rounded-full mb-2 
          ${student ? "bg-orange-400" : "bg-slate-300"}
        `} />

                {student ? (
                    <>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">
                            Seat {seatId}
                        </span>
                        <span className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                            {student.studentCode}
                        </span>
                    </>
                ) : (
                    <span className="text-[10px] text-slate-400 font-medium">
                        {seatId}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-orange-50 rounded-md">
                        <Info className="h-4 w-4 text-orange-500" />
                    </div>
                    <h3 className="font-bold text-slate-900">Seating Plan ({students.length}/{totalSeats || rows * cols})</h3>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-white border-2 border-orange-200 rounded-sm" />
                        <span className="text-slate-600">Occupied</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-sm" />
                        <span className="text-slate-600">Empty</span>
                    </div>
                </div>
            </div>

            <Card className="border-none shadow-sm bg-slate-100/50 p-6 md:p-8">
                <div
                    className="grid gap-3 md:gap-4 max-w-4xl mx-auto"
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
                    <div className="px-10 py-2 bg-slate-200 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-300">
                        Teacher Desk / Entrance
                    </div>
                </div>
            </Card>

            {/* Student Detail Modal */}
            {selectedStudent && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="relative h-24 bg-gradient-to-r from-orange-400 to-orange-600">
                            <button
                                onClick={() => setSelectedStudent(null)}
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
                                <h4 className="text-xl font-bold text-slate-900">{selectedStudent.studentName || "Unknown Student"}</h4>
                                <p className="text-sm text-slate-500 font-medium mb-6">Student ID: {selectedStudent.studentCode}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                        <MapPin className="h-4 w-4 text-orange-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Assigned Seat</p>
                                        <p className="text-sm font-bold text-slate-900">Desk {selectedStudent.seatNumber}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-slate-400" />
                                            <span className="text-slate-600">Email</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <UserCheck className="h-4 w-4 text-slate-400" />
                                            <span className="text-slate-600">Status</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3 text-right">
                                        <p className="font-medium text-slate-900 truncate">student@fpt.edu.vn</p>
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
                            </div>

                            <div className="mt-8">
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
