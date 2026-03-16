import { cn } from "@/lib/utils/cn";
import { ExamSeat } from "@/hooks/use-seat-management";
import { Lock, Unlock, Shuffle } from "lucide-react";

interface SeatCellProps {
  seat?: ExamSeat;
  row: number;
  col: number;
  stt?: number | null;
  studentCode?: string;
  onSelect: (seat: ExamSeat | undefined) => void;
  onLockToggle?: (seat: ExamSeat) => void;
  isEditing?: boolean;
  userRole?: string;
  isSwapMode?: boolean;
  isSwapSource?: boolean;
}

export function SeatCell({
  seat,
  row,
  col,
  stt,
  studentCode,
  onSelect,
  onLockToggle,
  isSwapMode = false,
  isSwapSource = false,
  isEditing = false,
  userRole = 'GUEST',
}: SeatCellProps) {
  const normalizedRole = (userRole || '').toLowerCase();
  const seatId = `${row}-${col}`;
  const label = stt ? `#${stt}` : `R${row}C${col}`;

  // Determine seat styling based on status
  let seatStyles = "bg-[#F8FAFC] border-slate-100";
  let textStyles = "text-slate-400";
  let labelStyles = "text-slate-300";
  let statusText = "Available";
  let statusIcon = null;

  if (seat?.status === 'Locked') {
    // Locked seat - Indigo/Slate Blue
    seatStyles = "bg-indigo-50 border-indigo-100 opacity-70";
    textStyles = "text-indigo-400";
    labelStyles = "text-indigo-300";
    statusText = "LOCKED";
    statusIcon = <Lock className="h-3 w-3" />;
  } else if (seat?.status === 'Assigned') {
    // Assigned seat - Orange/Yellow
    seatStyles = "bg-orange-50 border-orange-200 shadow-sm";
    textStyles = "text-orange-700";
    labelStyles = "text-orange-500";
    statusText = studentCode || "ASSIGNED";
  } else if (seat?.status === 'Present') {
    // Present seat - Blue
    seatStyles = "bg-blue-50 border-blue-200 shadow-sm";
    textStyles = "text-blue-700";
    labelStyles = "text-blue-500";
    statusText = studentCode || "PRESENT";
  } else if (seat?.status === 'Absent') {
    // Absent seat - Red
    seatStyles = "bg-red-50 border-red-200 shadow-sm";
    textStyles = "text-red-700";
    labelStyles = "text-red-500";
    statusText = studentCode || "ABSENT";
  } else if (seat?.status === 'Available') {
    // Available seat - Green
    seatStyles = "bg-green-50 border-green-200 shadow-sm";
    textStyles = "text-green-700";
    labelStyles = "text-green-500";
    statusText = "Available";
  }

  // Override text if student is assigned
  if (studentCode) {
    statusText = studentCode;
  }

  const canSwap = isSwapMode && seat && seat.status !== 'Locked' && ['admin', 'exam_officer', 'proctor'].includes(normalizedRole);
  const canManage = isEditing && ['admin', 'exam_officer', 'proctor'].includes(normalizedRole);
  const canLock = canManage && seat && (seat.status === 'Available' || seat.status === 'Locked');

  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (canLock && seat) {
          onLockToggle?.(seat);
          return;
        }
        if (canSwap && seat) {
          onSelect(seat);
          return;
        }
        if (seat) {
          onSelect(seat);
        }
      }}
      className={cn(
        "relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 h-[70px] group",
        seat ? "cursor-pointer hover:scale-105 hover:shadow-md z-10" : "cursor-default",
        // Add swap mode styling
        isSwapSource && "ring-4 ring-cyan-400 shadow-lg scale-105",
        canSwap && !isSwapSource && "hover:ring-2 hover:ring-cyan-300",
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

      {/* Swap mode indicator - appears when seat is selected as source */}
      {isSwapSource && (
        <div className="absolute top-1 right-1 p-1 rounded-md bg-cyan-100 text-cyan-600">
          <Shuffle className="h-3 w-3" />
        </div>
      )}

      <div className={cn("text-[10px] font-black mb-0.5 uppercase tracking-tighter", labelStyles)}>
        {label}
      </div>
      <div className={cn("text-[14px] font-black tracking-tight flex items-center gap-1", textStyles)}>
        {statusIcon}
        {statusText}
      </div>
    </div>
  );
}
