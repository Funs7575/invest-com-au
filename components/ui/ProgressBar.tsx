interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  currentStep,
  totalSteps,
  showLabel = true,
  className = "",
}: ProgressBarProps) {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-xs font-bold text-amber-600">
            {percentage}%
          </span>
        </div>
      )}
      <div
        className="h-2 bg-slate-100 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Step ${currentStep} of ${totalSteps}`}
      >
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
