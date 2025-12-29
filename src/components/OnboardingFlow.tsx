import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useModels } from '@/hooks/useModels';
import { OnboardingStep } from '@/components/OnboardingStep';
import { UseCaseSelector } from '@/components/UseCaseSelector';
import { SortSelector } from '@/components/SortSelector';
import { CodeSnippet } from '@/components/CodeSnippet';
import { ModelList } from '@/components/ModelList';

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);

  const {
    models,
    loading,
    error,
    activeFilters,
    activeSort,
    apiUrl,
    toggleFilter,
    setActiveSort,
  } = useModels();

  const goToNextStep = () => {
    if (currentStep < 2) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const steps = [
    {
      title: "What's your use case?",
      content: (
        <UseCaseSelector
          activeFilters={activeFilters}
          onToggleFilter={toggleFilter}
          modelCount={models.length}
          onConfirm={goToNextStep}
        />
      ),
    },
    {
      title: 'Sort by preference',
      content: <SortSelector activeSort={activeSort} onSortChange={setActiveSort} onConfirm={goToNextStep} />,
    },
    {
      title: 'Use the API',
      content: <CodeSnippet apiUrl={apiUrl} modelIds={models.slice(0, 3).map((m) => m.id)} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Step Navigation */}
      <div className="flex items-center justify-center gap-3">
        {/* Left Arrow */}
        <button
          onClick={goToPrevStep}
          disabled={currentStep === 0}
          className={`p-2 rounded-full transition-colors ${
            currentStep === 0
              ? 'text-muted-foreground/30 cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          aria-label="Previous step"
        >
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
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        {/* Dots */}
        <div className="flex gap-2">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentStep ? 1 : -1);
                setCurrentStep(index);
              }}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentStep
                  ? 'bg-primary'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={goToNextStep}
          disabled={currentStep === steps.length - 1}
          className={`p-2 rounded-full transition-colors ${
            currentStep === steps.length - 1
              ? 'text-muted-foreground/30 cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          aria-label="Next step"
        >
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
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Step Content with Animation */}
      <div className="relative overflow-hidden min-h-45">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={springTransition}
          >
            <OnboardingStep
              stepNumber={currentStep + 1}
              title={steps[currentStep].title}
              showConfirm={false}
            >
              {steps[currentStep].content}
            </OnboardingStep>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Model List (Always Visible) */}
      <ModelList models={models} loading={loading} error={error} />
    </div>
  );
}
