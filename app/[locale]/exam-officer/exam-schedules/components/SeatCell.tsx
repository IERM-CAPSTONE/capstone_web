import { cn } from "@/lib/utils/cn";
import { ExamSeat } from "@/hooks/use-seat-management";
import { Lock, Unlock } from "lucide-react";

interface SeatCellProps {
  seat?: ExamSeat;
  row: number;
  col: number;
  studentCode?: string;
  studentStatus?: string;
  onSelect: (seat: ExamSeat | undefined) => void;
  onLockToggle?: (seat: ExamSeat) => void;
  isEditing?: boolean;
  userRole?: string;
}

export function SeatCell({
  seat,
  row,
  col,
  studentCode,
  studentStatus,
  onSelect,
  onLockToggle,
  isEditing = false,
  userRole = 'GUEST',
}: SeatCellProps) {
  const seatId = `${row}-${col}`;
  const label = `R${row}C${col}`;

  // Determine seat styling based on status
  let seatStyles = "bg-[#F8FAFC] border-slate-100";
  let textStyles = "text-slate-400";
  let labelStyles = "text-slate-300";
  let statusText = "Available";
  let statusIcon = null;

  if (seat?.status === 'Locked') {
    // Locked seat - Faded/Disabled look
    seatStyles = "bg-slate-100 border-slate-200 opacity-50";
    textStyles = "text-slate-400";
    labelStyles = "text-slate-300";
    statusText = "LOCKED";
    statusIcon = <Lock className="h-3 w-3" />;
  } else if (seat?.status === 'Assigned') {
    // Assigned seat - Orange/Yellow
    seatStyles = "bg-orange-50 border-orange-200 shadow-sm";
    textStyles = "text-orange-700";
    labelStyles = "text-orange-800";
    statusText = studentCode || "ASSIGNED";
  } else if (seat?.status === 'Present') {
    // Present seat - Blue
    seatStyles = "bg-blue-50 border-blue-200 shadow-sm";
    textStyles = "text-blue-700";
    labelStyles = "text-blue-800";
    statusText = studentCode || "PRESENT";
  } else if (seat?.status === 'Absent') {
    // Absent seat - Red
    seatStyles = "bg-red-50 border-red-200 shadow-sm";
    textStyles = "text-red-700";
    labelStyles = "text-red-800";
    statusText = studentCode || "ABSENT";
  } else if (seat?.status === 'Available') {
    // Available seat - Green
    seatStyles = "bg-green-50 border-green-200 shadow-sm";
    textStyles = "text-green-700";
    labelStyles = "text-green-800";
    statusText = "Available";
  }

  const canManage = isEditing && ['admin', 'exam_officer', 'proctor'].includes(userRole);
  const canLock = canManage && seat && (seat.status === 'Available' || seat.status === 'Locked');

  return (
    <div
      onClick={() => {
        if (canLock && seat) {
          onLockToggle?.(seat);
          return;
        }
        if (seat) {
          onSelect(seat);
        }
      }}
      className={cn(
        "relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 h-[70px] group",
        seat ? "cursor-pointer hover:scale-105 hover:shadow-md z-10" : "cursor-default",
        seatStyles
      )}
    >
      {/* Lock/Unlock button - appears on hover in edit mode */}
      {canLock && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLockToggle?.(seat);
          }}
          className={cn(
            "absolute top-1 right-1 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity",
            seat.status === 'Locked'
              ? "bg-orange-100 text-orange-600 hover:bg-orange-200"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
          title={seat.status === 'Locked' ? 'Unlock seat' : 'Lock seat'}
        >
          {seat.status === 'Locked' ? (
            <Unlock className="h-3 w-3" />
          ) : (
            <Lock className="h-3 w-3" />
          )}
        </button>
      )}

      <div className={cn("text-[10px] font-black mb-0.5 uppercase tracking-tighter", labelStyles)}>
        {label}
      </div>
      <div className={cn("text-[13px] font-black tracking-tight flex items-center gap-1", textStyles)}>
        {statusIcon}
        {statusText}
      </div>
    </div>
  );
}
