import { Card } from "@/components/ui/card";
import { ExamSeat } from "@/hooks/use-seat-management";
import { SeatCell } from "./SeatCell";
import { StudentExam } from "@/lib/api/student-exams";

interface SeatGridProps {
  rows: number;
  cols: number;
  seats: ExamSeat[];
  students: StudentExam[];
  onSeatSelect: (seat: ExamSeat | undefined) => void;
  onSeatLockToggle?: (seat: ExamSeat) => void;
  isEditing?: boolean;
  userRole?: string;
  selectedPart?: string | null;
}

export function SeatGrid({
  rows,
  cols,
  seats,
  students,
  onSeatSelect,
  onSeatLockToggle,
  isEditing = false,
  userRole = 'GUEST',
  selectedPart = null,
}: SeatGridProps) {
  const hasAnyCheckedInPart = (student?: StudentExam | null) =>
    !!student?.parts?.some((part: any) => part?.isCheckedIn);

  // Map students to seats for easy lookup
  const studentMap = new Map<string, StudentExam>();
  students.forEach(st => {
    if (st.seatNumber) {
      studentMap.set(st.seatNumber, st);
    }
  });

  const renderSeat = (row: number, col: number) => {
    const seatIdx = (row - 1) * cols + col;
    const seatRC = `R${row}C${col}`;

    const seat = seats.find(s => s.row === row && s.col === col);

    // Find student by index string, R-C string, or matching seatPosition ID
    const student = studentMap.get(seatIdx.toString()) ||
      studentMap.get(seatRC) ||
      students.find(s => s.seatPosition === seat?.id);

    // Compute status based on selected part
    let computedStatus = seat?.status;
    if (student && selectedPart && seat?.status !== 'Locked') {
      const part = student.parts?.find(p => p.examPartCode === selectedPart);
      if (part?.isCheckedIn) {
        computedStatus = 'Present';
      } else {
        computedStatus = 'Assigned';
      }
    } else if (student && seat?.status !== 'Locked') {
      computedStatus = hasAnyCheckedInPart(student) ? 'Present' : (seat?.status ?? 'Assigned');
    }

    return (
      <SeatCell
        key={`${row}-${col}`}
        seat={seat ? { ...seat, status: computedStatus as any } : undefined}
        row={row}
        col={col}
        stt={student?.stt}
        studentCode={student?.studentCode || undefined}
        onSelect={onSeatSelect}
        onLockToggle={onSeatLockToggle}
        isEditing={isEditing}
        userRole={userRole}
      />
    );
  };

  return (
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
  );
}
