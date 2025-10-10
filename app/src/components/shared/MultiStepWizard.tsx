import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  component: React.ReactNode;
  validation?: () => boolean | Promise<boolean>;
  isOptional?: boolean;
}

interface MultiStepWizardProps {
  steps: WizardStep[];
  onComplete: () => void | Promise<void>;
  onCancel?: () => void;
  className?: string;
  showProgress?: boolean;
  allowSkipSteps?: boolean;
}

export const MultiStepWizard: React.FC<MultiStepWizardProps> = ({
  steps,
  onComplete,
  onCancel,
  className,
  showProgress = true,
  allowSkipSteps = false
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isValidating, setIsValidating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const validateCurrentStep = async (): Promise<boolean> => {
    if (!currentStep.validation) return true;
    
    setIsValidating(true);
    try {
      const isValid = await currentStep.validation();
      return isValid;
    } catch (error) {
      console.error('Step validation error:', error);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    setCompletedSteps(prev => new Set([...prev, currentStepIndex]));

    if (isLastStep) {
      setIsCompleting(true);
      try {
        await onComplete();
      } finally {
        setIsCompleting(false);
      }
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (!allowSkipSteps) return;
    if (stepIndex <= currentStepIndex || completedSteps.has(stepIndex - 1)) {
      setCurrentStepIndex(stepIndex);
    }
  };

  const canGoToStep = (stepIndex: number): boolean => {
    if (!allowSkipSteps) return false;
    return stepIndex <= currentStepIndex || completedSteps.has(stepIndex - 1);
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Progress Header */}
      <div className="border-b border-border pb-4 mb-6">
        {showProgress && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Step {currentStepIndex + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Step Indicators */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center",
                index < steps.length - 1 && "flex-1"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                  canGoToStep(index) && "cursor-pointer",
                  index === currentStepIndex
                    ? "border-primary bg-primary text-primary-foreground"
                    : completedSteps.has(index)
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-muted-foreground bg-background text-muted-foreground"
                )}
                onClick={() => handleStepClick(index)}
              >
                {completedSteps.has(index) ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              
              <div className="ml-2 min-w-0 flex-1">
                <div className={cn(
                  "text-sm font-medium truncate",
                  index === currentStepIndex
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}>
                  {step.title}
                </div>
                {step.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {step.description}
                  </div>
                )}
              </div>

              {index < steps.length - 1 && (
                <div className="flex-1 h-px bg-border mx-4" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">{currentStep.title}</h2>
          {currentStep.description && (
            <p className="text-muted-foreground">{currentStep.description}</p>
          )}
        </div>
        
        <div className="min-h-0">
          {currentStep.component}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          {currentStep.isOptional && "This step is optional"}
        </div>

        <Button
          onClick={handleNext}
          disabled={isValidating || isCompleting}
        >
          {isValidating || isCompleting ? (
            "Processing..."
          ) : isLastStep ? (
            "Complete"
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};