import { Button } from '@/components/ui/button';

interface OnboardingStepProps {
  stepNumber: number;
  title: string;
  children: React.ReactNode;
  onConfirm?: () => void;
  showConfirm?: boolean;
  confirmLabel?: string;
}

export function OnboardingStep({
  stepNumber,
  title,
  children,
  onConfirm,
  showConfirm = true,
  confirmLabel = 'Continue',
}: OnboardingStepProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-6">
      {/* Step Number + Title */}
      <div className="flex items-center gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold shrink-0">
          {stepNumber}
        </span>
        <h2 className="text-3xl font-bold sm:text-4xl">{title}</h2>
      </div>

      {/* Step Content */}
      <div className="w-full">{children}</div>

      {/* Confirm Button */}
      {showConfirm && onConfirm && (
        <Button size="lg" onClick={onConfirm} className="mt-4">
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
