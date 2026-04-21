import { createPortal } from "react-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExamSeat } from "@/hooks/use-seat-management";
import { Lock, Unlock, X } from "lucide-react";

interface SeatLockConfirmDialogProps {
  isOpen: boolean;
  action: 'lock' | 'unlock';
  seat?: ExamSeat;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SeatLockConfirmDialog({
  isOpen,
  action,
  seat,
  onConfirm,
  onCancel,
}: SeatLockConfirmDialogProps) {
  if (!isOpen || !seat || typeof document === 'undefined') return null;

  const isLocking = action === 'lock';

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-sm border-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isLocking ? 'bg-orange-100' : 'bg-blue-100'
            }`}>
              {isLocking ? (
                <Lock className="h-6 w-6 text-orange-600" />
              ) : (
                <Unlock className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {isLocking ? `Lock Seat R${seat.row}C${seat.col}?` : `Unlock Seat R${seat.row}C${seat.col}?`}
            </h3>
            <p className="text-sm text-slate-600">
              {isLocking 
                ? "This seat will be locked and cannot be assigned to any student during the exam session."
                : "This seat will be unlocked and can be assigned to students again."
              }
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className={`flex-1 text-white ${
                isLocking 
                  ? 'bg-orange-600 hover:bg-orange-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLocking ? 'Lock Seat' : 'Unlock Seat'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
}
