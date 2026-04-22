import { cn } from "@/lib/utils/cn";
import { ExamSeat } from "@/hooks/use-seat-management";
import { Lock, Unlock } from "lucide-react";
import { useRef } from "react";

interface SeatCellProps {
  seat?: ExamSeat;
  row: number;
  col: number;
  stt?: number | null;
  studentCode?: string;
  onSelect: (seat: ExamSeat | undefined) => void;
  onLongPress?: (seat: ExamSeat) => void;
  onLockToggle?: (seat: ExamSeat) => void;
  onHover?: (seat: ExamSeat | undefined) => void;
  isEditing?: boolean;
  userRole?: string;
  isSwapSource?: boolean;
  isSwapTarget?: boolean;
  isSwapModeEnabled?: boolean;
}

export function SeatCell({
  seat,
  row,
  col,
  stt,
  studentCode,
  onSelect,
  onLongPress,
  onLockToggle,
  onHover,
  isEditing = false,
  userRole = 'GUEST',
  isSwapSource = false,
  isSwapTarget = false,
  isSwapModeEnabled = false,
}: SeatCellProps) {
  const label = stt ? `#${stt}` : `R${row}C${col}`;
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

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
    labelStyles = "text-orange-800";
    statusText = "ASSIGNED";
  } else if (seat?.status === 'Present') {
    // Present seat - Green (xanh lá)
    seatStyles = "bg-green-50 border-green-200 shadow-sm";
    textStyles = "text-green-700";
    labelStyles = "text-green-800";
    statusText = "PRESENT";
  } else if (seat?.status === 'Absent') {
    // Absent seat - Red
    seatStyles = "bg-red-50 border-red-200 shadow-sm";
    textStyles = "text-red-700";
    labelStyles = "text-red-800";
    statusText = "ABSENT";
  } else if (seat?.status === 'Available') {
    // Available seat - Neutral
    seatStyles = "bg-[#F8FAFC] border-slate-100";
    textStyles = "text-slate-400";
    labelStyles = "text-slate-300";
    statusText = "Available";
  }

  // Override text if student is assigned
  if (studentCode) {
    statusText = studentCode;
  }

  const canManage = isEditing && ['admin', 'exam_officer', 'proctor'].includes(userRole);
  const canLock = canManage && seat && (seat.status === 'Available' || seat.status === 'Locked');
  const canSwap = !!seat && ['admin', 'exam_officer', 'proctor'].includes((userRole || '').toLowerCase());

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startLongPress = () => {
    if (!seat || !onLongPress || !canSwap) return;
    longPressTriggeredRef.current = false;
    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      onLongPress(seat);
    }, 450);
  };

  return (
    <div
      onClick={() => {
        if (longPressTriggeredRef.current) {
          longPressTriggeredRef.current = false;
          return;
        }
        if (canLock && seat) {
          onLockToggle?.(seat);
          return;
        }
        if (seat) {
          onSelect(seat);
        }
      }}
      onMouseDown={startLongPress}
      onMouseUp={clearLongPress}
      onMouseLeave={() => {
        clearLongPress();
        onHover?.(undefined);
      }}
      onMouseEnter={() => {
        if (seat) {
          onHover?.(seat);
        }
      }}
      onTouchStart={startLongPress}
      onTouchEnd={clearLongPress}
      onTouchCancel={clearLongPress}
      className={cn(
        "relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ease-out h-[70px] group",
        seat ? "cursor-pointer hover:scale-105 hover:shadow-md z-10" : "cursor-default",
        seatStyles,
        isSwapSource && "scale-[1.12] -translate-y-2 rotate-1 shadow-2xl ring-4 ring-blue-500 ring-offset-2 bg-blue-50/90 animate-[pulse_1.2s_ease-in-out_infinite]",
        isSwapTarget && "scale-[1.08] shadow-lg ring-4 ring-emerald-400 ring-offset-2 bg-emerald-50/80 animate-[pulse_0.9s_ease-in-out_infinite]",
        isSwapModeEnabled && !isSwapSource && "ring-1 ring-blue-200"
      )}
    >
      {isSwapSource && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest shadow-md animate-bounce">
          Picked up
        </div>
      )}

      {isSwapTarget && (
        <div className="absolute inset-0 rounded-xl bg-emerald-500/10 animate-pulse pointer-events-none" />
      )}

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
