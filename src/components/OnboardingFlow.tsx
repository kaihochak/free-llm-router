import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useModels } from '@/hooks/useModels';
import { OnboardingStep } from '@/components/OnboardingStep';
import { UseCaseSelector } from '@/components/UseCaseSelector';
import { SortSelector } from '@/components/SortSelector';
import { ApiUsageStep } from '@/components/ApiUsageStep';
import { ModelList } from '@/components/ModelList';
import { Button } from '@/components/ui/button';

const ITEMS_PER_PAGE = 10;

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
  const [currentPage, setCurrentPage] = useState(1);

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

  const totalPages = Math.ceil(models.length / ITEMS_PER_PAGE);

  // Reset to page 1 when models change (e.g., filter/sort changes)
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

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
      title: 'What are you building?',
      description: 'Filter models by capability',
      content: (
        <UseCaseSelector
          activeFilters={activeFilters}
          onToggleFilter={toggleFilter}
          onConfirm={goToNextStep}
        />
      ),
    },
    {
      title: 'What matters most?',
      description: 'Order results by your priority',
      content: <SortSelector activeSort={activeSort} onSortChange={setActiveSort} onConfirm={goToNextStep} />,
    },
    {
      title: 'Ready to code?',
      description: 'Copy the snippet and start building',
      content: (
        <ApiUsageStep
          apiUrl={apiUrl}
          activeFilters={activeFilters}
          activeSort={activeSort}
          onToggleFilter={toggleFilter}
          onSortChange={setActiveSort}
          showBrowseModels={false}
        />
      ),
      wide: true,
    },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentStep > 0) {
        goToPrevStep();
      } else if (e.key === 'ArrowRight' && currentStep < steps.length - 1) {
        goToNextStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

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
              description={steps[currentStep].description}
              showConfirm={false}
              wide={steps[currentStep].wide}
            >
              {steps[currentStep].content}
            </OnboardingStep>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Model List with Pagination (Hidden on Step 3) */}
      {currentStep !== 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{models.length}</span> free models
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </Button>
                <span className="text-sm text-muted-foreground px-1">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </Button>
              </div>
            )}
          </div>

          <ModelList models={models} loading={loading} error={error} currentPage={currentPage} itemsPerPage={ITEMS_PER_PAGE} />
        </div>
      )}
    </div>
  );
}
