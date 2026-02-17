'use client';

import type React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { parseSchema } from '@autoform/core';
import { ZodProvider } from './autoform/zod';

interface PossibleStep {
  id: string;
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  schema: z.ZodObject<any>;
}

interface MultiStepFormProps {
  className?: string;
  onSubmit?: (data: FormData) => void;
  steps: PossibleStep[];
}

export default function MultiStepForm({
  className,
  onSubmit,
  steps,
}: MultiStepFormProps) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Get the current step schema
  const currentStepSchema = steps[step].schema;

  const currentField = parseSchema(new ZodProvider(currentStepSchema)).fields;

  // Setup form with the current step schema
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  } = useForm<any>({
    resolver: zodResolver(currentStepSchema),
    defaultValues: formData,
  });

  // Calculate progress percentage
  const progress = ((step + 1) / steps.length) * 100;

  // Handle next step
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  const handleNextStep = (data: any) => {
    const updatedData = { ...formData, ...data };
    setFormData(updatedData);

    if (step < steps.length - 1) {
      setStep(step + 1);
      // Reset form with the updated data for the next step
      reset(updatedData);
    } else {
      // Final step submission
      setIsSubmitting(true);
      setTimeout(() => {
        if (onSubmit) {
          onSubmit(updatedData as FormData);
        }
        setIsComplete(true);
        setIsSubmitting(false);
      }, 1500);
    }
  };

  // Handle previous step
  const handlePrevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  // Animation variants
  const variants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  return (
    <div
      className={cn(
        'bg-card/40 mx-auto w-full max-w-md rounded-lg p-6 shadow-lg',
        className,
      )}
    >
      {!isComplete ? (
        <>
          {/* Progress bar */}
          <div className="mb-8">
            <div className="mb-2 flex justify-between">
              <span className="text-sm font-medium">
                Step {step + 1} of {steps.length}
              </span>
              <span className="text-sm font-medium">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step indicators */}
          <div className="mb-8 flex justify-between">
            {steps.map((s, i) => (
              <div key={s.id} className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                    i < step
                      ? 'bg-primary text-primary-foreground'
                      : i === step
                        ? 'bg-primary text-primary-foreground ring-primary/30 ring-2'
                        : 'bg-secondary text-secondary-foreground',
                  )}
                >
                  {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className="mt-1 hidden text-xs sm:block">{s.title}</span>
              </div>
            ))}
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={variants}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold">{steps[step].title}</h2>
                <p className="text-muted-foreground text-sm">
                  {steps[step].description}
                </p>
              </div>

              <form
                onSubmit={handleSubmit(handleNextStep)}
                className="space-y-4"
              >
                {currentField.map((field) => (
                  <div
                    key={field.fieldConfig?.label?.toString() ?? ''}
                    className="space-y-2"
                  >
                    <Label htmlFor={field.fieldConfig?.label?.toString() ?? ''}>
                      {field.fieldConfig?.label}
                    </Label>
                    <Input
                      id={field.fieldConfig?.label?.toString() ?? ''}
                      type={field.type}
                      placeholder={field.fieldConfig?.inputProps?.placeholder}
                      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
                      {...register(field.fieldConfig?.label?.toString() as any)}
                      className={cn(
                        errors[
                        field.fieldConfig?.label?.toString() as string
                        ] && 'border-destructive',
                      )}
                    />
                    {errors[field.fieldConfig?.label?.toString() as string] && (
                      <p className="text-destructive text-sm">
                        {
                          errors[field.fieldConfig?.label?.toString() as string]
                            ?.message as string
                        }
                      </p>
                    )}
                  </div>
                ))}

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                    disabled={step === 0}
                    className={cn(step === 0 && 'invisible')}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {step === steps.length - 1 ? (
                      isSubmitting ? (
                        'Submitting...'
                      ) : (
                        'Submit'
                      )
                    ) : (
                      <>
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </AnimatePresence>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="py-10 text-center"
        >
          <div className="bg-primary/10 mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full">
            <CheckCircle2 className="text-primary h-8 w-8" />
          </div>
          <h2 className="mb-2 text-2xl font-bold">Form Submitted!</h2>
          <p className="text-muted-foreground mb-6">
            Thank you for completing the form. We&apos;ll be in touch soon.
          </p>
          <Button
            onClick={() => {
              setStep(0);
              setFormData({});
              setIsComplete(false);
              reset({});
            }}
          >
            Start Over
          </Button>
        </motion.div>
      )}
    </div>
  );
}
