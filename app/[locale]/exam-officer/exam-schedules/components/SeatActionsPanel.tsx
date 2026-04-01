import { Button } from "@/components/ui/button";
import { AlertCircle, Edit2, Save, X, CheckCircle } from "lucide-react";
import { SeatTemplateType } from "@/lib/api/exam-schedules";

interface SeatActionsPanelProps {
  isEditing: boolean;
  onEditToggle: (editing: boolean) => void;
  onRefresh: () => void;
  onFinalize?: () => void;
  onTemplateApply?: (templateType: SeatTemplateType) => void;
  userRole?: string;
  error?: string | null;
  hasStudentsImported?: boolean;
  hasUnassignedStudents?: boolean;
  isFinalizingSeats?: boolean;
  isApplyingTemplate?: boolean;
  selectedTemplate?: SeatTemplateType;
  onSelectedTemplateChange?: (template: SeatTemplateType) => void;
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
  onTemplateApply,
  isApplyingTemplate = false,
  selectedTemplate = 'U_SHAPE',
  onSelectedTemplateChange,
}: SeatActionsPanelProps) {
  const normalizedRole = String(userRole || '').toUpperCase();
  const canViewPanel = ['ADMIN', 'EXAM_OFFICER', 'PROCTOR'].includes(normalizedRole);
  const canUseLayoutTools = ['ADMIN', 'EXAM_OFFICER'].includes(normalizedRole);
  const canUseTemplates = canUseLayoutTools && !hasStudentsImported;

  if (!canViewPanel) {
    return null;
  }

  const showFinalizeButton = canUseLayoutTools && !hasStudentsImported && hasUnassignedStudents && !isEditing;

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
              disabled={hasStudentsImported || !canUseLayoutTools}
            >
              <Edit2 className="h-4 w-4" />
              Edit Seats
            </Button>
            {showFinalizeButton && (
              <Button
                onClick={onFinalize}
                variant="default"
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
              variant="default"
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

      {canUseTemplates && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-2 md:flex-row md:items-center">
          <p className="text-[11px] font-semibold text-slate-600 md:min-w-[120px]">Seat Template</p>
          <select
            value={selectedTemplate}
            onChange={(e) => onSelectedTemplateChange?.(e.target.value as SeatTemplateType)}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
            disabled={isApplyingTemplate || isEditing}
          >
            <option value="U_SHAPE">U Shape</option>
            <option value="L_LEFT">Left L</option>
            <option value="L_RIGHT">Right L</option>
            <option value="O_SHAPE">O Shape</option>
            <option value="GAP_PATTERN">Gap Pattern</option>
            <option value="ALTERNATE_ROWS">Alternate Rows</option>
          </select>
          <Button
            onClick={() => onTemplateApply?.(selectedTemplate)}
            variant="outline"
            disabled={isApplyingTemplate || isEditing}
          >
            {isApplyingTemplate ? 'Applying...' : 'Apply Template'}
          </Button>
        </div>
      )}

      {/* Help text in edit mode */}
      {isEditing && canUseLayoutTools && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-[12px] text-blue-700 font-medium">
            💡 Click a seat to toggle Available ⇄ Locked. Locked seats cannot be assigned to students.
          </p>
        </div>
      )}

      {!canUseLayoutTools && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-[12px] text-slate-700 font-medium">
            Proctors can swap assigned seats, but cannot edit seat layout or apply templates.
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
      {hasStudentsImported && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-[12px] text-green-700 font-medium">
            ✅ Seats have been finalized. Layout editing is locked.
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
