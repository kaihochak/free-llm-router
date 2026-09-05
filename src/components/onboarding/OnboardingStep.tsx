import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface OnboardingStepProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onConfirm?: () => void;
  showConfirm?: boolean;
  confirmLabel?: string;
  wide?: boolean;
}

export function OnboardingStep({
  title,
  description,
  children,
  onConfirm,
  showConfirm = true,
  confirmLabel = 'Continue',
  wide = false,
}: OnboardingStepProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8">
      {/* Step Header */}
      <div className="flex flex-col items-center text-center space-y-1">
        <h2 className="type-heading">{title}</h2>
        {description && <p className="type-body text-muted-foreground">{description}</p>}
      </div>

      {/* Step Content */}
      <div className={wide ? 'max-w-3xl w-full text-left' : 'max-w-xl'}>{children}</div>

      {/* Confirm Button */}
      {showConfirm && onConfirm && (
        <Button size="lg" onClick={onConfirm}>
          {confirmLabel}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
