import { Button } from '@/components/ui/button';

interface OnboardingStepProps {
  stepNumber: number;
  title: string;
  description?: string;
  children: React.ReactNode;
  onConfirm?: () => void;
  showConfirm?: boolean;
  confirmLabel?: string;
  wide?: boolean;
}

export function OnboardingStep({
  stepNumber,
  title,
  description,
  children,
  onConfirm,
  showConfirm = true,
  confirmLabel = 'Continue',
  wide = false,
}: OnboardingStepProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-10 py-10">
      {/* Step Header */}
      <div className="flex flex-col items-center text-center space-y-2">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Step {stepNumber}
        </span>
        <h2 className="text-4xl font-bold sm:text-5xl">{title}</h2>
        {description && (
          <p className="text-lg text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Step Content */}
      <div className={wide ? 'max-w-2xl w-full' : 'max-w-xl'}>{children}</div>

      {/* Confirm Button */}
      {showConfirm && onConfirm && (
        <Button size="lg" onClick={onConfirm} >
          {confirmLabel}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ml-2"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Button>
      )}
    </div>
  );
}
