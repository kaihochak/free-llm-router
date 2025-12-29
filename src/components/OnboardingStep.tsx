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
    <div className="flex flex-col items-center text-center space-y-10 py-10">
      {/* Step Number + Title */}
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold shrink-0">
          {stepNumber}
        </span>
        <h2 className="text-4xl font-bold sm:text-5xl">{title}</h2>
      </div>

      {/* Step Content */}
      <div className="max-w-xl">{children}</div>

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
