import { Button } from "@/components/ui/button";
import { AlertCircle, Edit2, Save, X, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface SeatActionsPanelProps {
  isEditing: boolean;
  onEditToggle: (editing: boolean) => void;
  onRefresh: () => void;
  onFinalize?: () => void;
  onApplyCheckerboardTemplate?: () => void;
  onResetTemplate?: () => void;
  userRole?: string;
  error?: string | null;
  hasStudentsImported?: boolean;
  hasUnassignedStudents?: boolean;
  isFinalizingSeats?: boolean;
  isApplyingTemplate?: boolean;
}

export function SeatActionsPanel({
  isEditing,
  onEditToggle,
  onRefresh,
  onFinalize,
  onApplyCheckerboardTemplate,
  onResetTemplate,
  userRole = 'GUEST',
  error,
  hasStudentsImported = false,
  hasUnassignedStudents = false,
  isFinalizingSeats = false,
  isApplyingTemplate = false,
}: SeatActionsPanelProps) {
  const t = useTranslations("Dashboard.examOfficer.seatActionsPanel");
  const tCommon = useTranslations("Common");
  const normalizedRole = String(userRole || '').toLowerCase();
  const canEdit = ['admin', 'exam_officer', 'proctor'].includes(normalizedRole);

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
              {t("editSeats")}
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
                    {t("assigning")}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    {t("assignStudents")}
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
              {t("editModeActive")}
            </Button>
            <Button
              onClick={() => onEditToggle(false)}
              variant="default"
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              <Save className="h-4 w-4" />
              {t("doneEditing")}
            </Button>
            <Button
              onClick={() => onEditToggle(false)}
              variant="ghost"
              className="gap-2"
            >
              <X className="h-4 w-4" />
              {tCommon("cancel")}
            </Button>
            {onApplyCheckerboardTemplate && (
              <Button
                onClick={onApplyCheckerboardTemplate}
                variant="outline"
                className="gap-2"
                disabled={isApplyingTemplate}
              >
                {t("checkerboardLock")}
              </Button>
            )}
            {onResetTemplate && (
              <Button
                onClick={onResetTemplate}
                variant="outline"
                className="gap-2"
                disabled={isApplyingTemplate}
              >
                {t("resetLocks")}
              </Button>
            )}
          </div>
        )}
        <Button
          onClick={onRefresh}
          variant="outline"
          size="sm"
          className="ml-auto"
        >
          {t("refresh")}
        </Button>
      </div>

      {/* Help text in edit mode */}
      {isEditing && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-[12px] text-blue-700 font-medium">
            💡 {t("editHint")}
          </p>
        </div>
      )}

      {/* Help text when students are unassigned */}
      {showFinalizeButton && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-[12px] text-yellow-700 font-medium">
            ⚠️ {t("unassignedHint")}
          </p>
        </div>
      )}

      {/* Help text when finalized */}
      {hasStudentsImported && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-[12px] text-green-700 font-medium">
            ✅ {t("finalizedHint")}
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
