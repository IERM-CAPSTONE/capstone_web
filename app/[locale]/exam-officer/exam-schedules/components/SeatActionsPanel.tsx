import { Button } from "@/components/ui/button";
import { AlertCircle, Edit2, Save, X, CheckCircle } from "lucide-react";

interface SeatActionsPanelProps {
  isEditing: boolean;
  onEditToggle: (editing: boolean) => void;
  onRefresh: () => void;
  onFinalize?: () => void;
  userRole?: string;
  error?: string | null;
  hasStudentsImported?: boolean;
  hasUnassignedStudents?: boolean;
  isFinalizingSeats?: boolean;
}

export function SeatActionsPanel({
  isEditing,
  onEditToggle,
  onRefresh,
  onFinalize,
  userRole = 'GUEST',
  error,
  hasStudentsImported = false,
  hasUnassignedStudents = false,
  isFinalizingSeats = false,
}: SeatActionsPanelProps) {
  const canEdit = ['admin', 'exam_officer', 'proctor'].includes(userRole);

  if (!canEdit) {
    return null;
  }

  const showFinalizeButton = !hasStudentsImported && hasUnassignedStudents && !isEditing;

  return (
    <div className="space-y-4 mb-6">
      {/* Edit Mode Toggle */}
      <div className="flex items-center gap-3">
        {!isEditing ? (
          <>
            <Button
              onClick={() => onEditToggle(true)}
              variant="outline"
              className="gap-2"
              disabled={hasStudentsImported}
            >
              <Edit2 className="h-4 w-4" />
              Edit Seats
            </Button>
            {showFinalizeButton && (
              <Button
                onClick={onFinalize}
                variant="primary"
                className="gap-2 bg-orange-600 hover:bg-orange-700"
                disabled={isFinalizingSeats}
              >
                {isFinalizingSeats ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Assign Students to Seats
                  </>
                )}
              </Button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 cursor-default pointer-events-none"
            >
              <Edit2 className="h-4 w-4" />
              Edit Mode Active
            </Button>
            <Button
              onClick={() => onEditToggle(false)}
              variant="primary"
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              <Save className="h-4 w-4" />
              Done Editing
            </Button>
            <Button
              onClick={() => onEditToggle(false)}
              variant="ghost"
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        )}
        <Button
          onClick={onRefresh}
          variant="outline"
          size="sm"
          className="ml-auto"
        >
          Refresh
        </Button>
      </div>

      {/* Help text in edit mode */}
      {isEditing && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-[12px] text-blue-700 font-medium">
            💡 Click a seat to toggle Available ⇄ Locked. Locked seats cannot be assigned to students.
          </p>
        </div>
      )}

      {/* Help text when students are unassigned */}
      {showFinalizeButton && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-[12px] text-yellow-700 font-medium">
            ⚠️ Students have been imported but not assigned to seats yet. Lock unwanted seats, then click "Assign Students to Seats" to finalize the layout.
          </p>
        </div>
      )}

      {/* Help text when finalized */}
      {hasStudentsImported && !isEditing && (
        <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
          <p className="text-[12px] text-cyan-700 font-medium">
            ✅ Seats finalized. 🔄 Click two seats to swap students (locked seats cannot be swapped).
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-[12px] text-red-700 font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
