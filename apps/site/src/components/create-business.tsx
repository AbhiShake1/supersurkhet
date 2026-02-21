import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { useConfetti } from '@/components/confetti-provider';
import { useLoginPrompt } from '@/components/login-prompt-provider';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { gun } from '@/lib/gun';
import { getGunRef } from '@/lib/gun/utils';
import { getBusinessDataFieldFromSelectedReleases } from '@/lib/plugins/business-onboarding-prepopulate';
import { parseReleaseId } from '@/lib/plugins/marketplace-seed';
import type { PluginReleaseDoc } from '@/lib/plugins/types';
import type { businessSchema } from '@/lib/schema';
import { cn } from '@/lib/utils';
import { installPluginRelease } from '@/server-functions/plugins';
import { useAuth } from './auth-provider';
import {
  BusinessCreationForm,
  type BusinessCreationValues,
  businessCreationSchema,
} from './business-creation-form';
import { Button } from './ui/button';
import { Form } from './ui/form';

const stepContent = {
  1: {
    title: "Welcome! Let's start with the basics.",
    description: 'Name your business and pin where it operates.',
    label: 'Basics',
  },
  2: {
    title: 'AI Setup Journey (optional)',
    description:
      'Use chat to shape your setup plan, or skip directly to creation anytime.',
    label: 'AI setup',
  },
  3: {
    title: 'Business created',
    description: 'You are ready to launch and manage your business.',
    label: 'Launch',
  },
};

export function CreateBusinessPageFlow() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [createdBusiness, setCreatedBusiness] =
    useState<z.infer<typeof businessSchema>>();

  const { data: existingBusinesses = [], isLoading } = api.business.useGet();
  const { data: releaseRows = [] } = api.pluginRelease.useGet();
  const { fire: fireConfetti } = useConfetti();
  const { promptLogin } = useLoginPrompt();
  const didPromptLogin = useRef(false);
  const releases = useMemo(
    () => releaseRows as PluginReleaseDoc[],
    [releaseRows],
  );

  const form = useForm<BusinessCreationValues>({
    resolver: zodResolver(businessCreationSchema),
    defaultValues: {
      name: '',
      features: {},
      locationCoordinates: '',
      selectedPluginReleaseIds: [],
    },
  });

  const { mutateAsync: createBusiness, isPending } = api.business.useCreate({
    onError: (err) => {
      console.error('Error creating business:', err);
      toast.error(
        err.message || 'Failed to create business. Please try again.',
      );
      form.setError('name', {
        type: 'manual',
        message: err.message || 'Failed to create business. Please try again.',
      });
    },
  });

  const handleNextStep1 = async () => {
    if (isLoading) {
      return form.setError('name', {
        type: 'manual',
        message: 'Something went wrong. Please try again.',
      });
    }
    const isValid = await form.trigger('name');
    if (!isValid) return;

    const businessName = form.getValues('name');
    const basePath = businessName.toLowerCase().replace(/\s+/g, '-');

    const isNameTaken = existingBusinesses.some((b) => b.basePath === basePath);

    if (isNameTaken) {
      return form.setError('name', {
        type: 'manual',
        message: 'A business with this name already exists.',
      });
    }

    setStep(2);
  };

  const onSubmit = async (values: BusinessCreationValues): Promise<void> => {
    const basePath = values.name.toLowerCase().replace(/\s+/g, '-');
    // Extract prepopulateData to avoid including it in the business creation
    const { prepopulateData, selectedPluginReleaseIds, ...businessData } =
      values;
    const prepopulateField = getBusinessDataFieldFromSelectedReleases({
      selectedReleaseIds: selectedPluginReleaseIds,
      releases,
    });
    if (prepopulateField) {
      for (const [key, value] of Object.entries(prepopulateData ?? {})) {
        if (!value) continue;
        if (key === 'undefined') continue;
        gun.get(key).load((data) => {
          if (!data) return;
          const keyParts = key.split('/');
          const indexOfField = keyParts.indexOf(prepopulateField);
          if (indexOfField < 0 || indexOfField + 1 >= keyParts.length) return;
          keyParts[indexOfField + 1] = businessData.name;
          const newKey = keyParts.join('/');
          getGunRef(newKey).put(data, (ack) => {
            if ('err' in ack && !!ack.err) {
              console.error('Error updating prepopulated data:', ack.err);
            }
          });
        });
      }
    }
    if (!user) {
      toast.error('You must be logged in to create a business.');
      return;
    }
    const created = (await createBusiness({
      ...businessData,
      basePath,
      isActive: true,
      created_by: user?._?.soul ?? 'anon',
      id: basePath,
      timestamp: Date.now(),
      members: {
        [user?._?.soul ?? 'anon']: {
          role: 'owner',
          userId: user?._?.soul ?? '',
          joinedAt: Date.now(),
        },
      },
    })) as unknown as z.infer<typeof businessSchema>;

    const installTargets = selectedPluginReleaseIds
      .map((releaseId) => parseReleaseId(releaseId))
      .filter(
        (release): release is { pluginId: string; version: string } =>
          release !== null,
      );

    if (installTargets.length > 0) {
      const installResults = await Promise.allSettled(
        installTargets.map((target) =>
          installPluginRelease({
            data: {
              actorUserId: user?._?.soul ?? 'anon',
              actorRole: 'owner',
              businessId: basePath,
              pluginId: target.pluginId,
              version: target.version,
              explicitOwnerAction: true,
            },
          }),
        ),
      );

      const successfulInstalls = installResults.filter(
        (result) => result.status === 'fulfilled',
      ).length;
      const failedInstalls = installResults.length - successfulInstalls;

      if (successfulInstalls > 0) {
        toast.success(
          `${successfulInstalls} plugin${successfulInstalls === 1 ? '' : 's'} installed.`,
        );
      }
      if (failedInstalls > 0) {
        toast.warning(
          `Business created, but ${failedInstalls} plugin install${failedInstalls === 1 ? '' : 's'} failed. You can retry from Admin > Plugins.`,
        );
      }
    }

    setCreatedBusiness(created);
    setStep(3);
  };

  const currentContent = stepContent[step as keyof typeof stepContent];

  useEffect(() => {
    if (step === 3) {
      fireConfetti();
      fireConfetti();
    }
  }, [step, fireConfetti]);

  useEffect(() => {
    if (didPromptLogin.current || user) return;
    didPromptLogin.current = true;
    void promptLogin();
  }, [promptLogin, user]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,hsl(var(--primary)/0.25),transparent_45%),radial-gradient(circle_at_80%_0%,hsl(var(--accent)/0.2),transparent_35%)] px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" asChild>
            <Link to="/" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back home
            </Link>
          </Button>
          <Badge variant="secondary" className="px-3 py-1 text-xs">
            Create Business
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-2xl border bg-card/70 p-4 backdrop-blur-sm">
              <p className="font-semibold text-sm text-foreground">
                Your journey
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                A cleaner full-page flow with optional AI onboarding.
              </p>
              <div className="mt-4 space-y-2">
                {([1, 2, 3] as const).map((currentStep) => {
                  const isActive = step === currentStep;
                  const isDone = step > currentStep;

                  return (
                    <div
                      key={currentStep}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                        isActive && 'border-primary/60 bg-primary/10',
                        isDone && 'border-green-500/50 bg-green-500/10',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs',
                          isActive && 'border-primary text-primary',
                          isDone && 'border-green-600 text-green-600',
                        )}
                      >
                        {currentStep}
                      </span>
                      <span className="font-medium">
                        {stepContent[currentStep].label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border bg-card/70 p-4 backdrop-blur-sm">
              <p className="font-semibold text-sm">AI is optional</p>
              <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                You can use AI to shape your setup, or skip straight to creation
                from step two.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Chat guidance and plugin suggestions are optional.
              </div>
            </div>
          </aside>

          <section className="rounded-2xl border bg-card/80 p-5 shadow-sm backdrop-blur-sm sm:p-7">
            <header className="mb-6 border-b pb-4">
              <h1 className="font-semibold text-2xl tracking-tight">
                {currentContent.title}
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
                {currentContent.description}
              </p>
            </header>

            <Form {...form}>
              {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
              <form
                id="business-creation-form"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <BusinessCreationForm
                  step={step}
                  form={form}
                  setStep={setStep}
                  createdBusiness={createdBusiness}
                  isSubmitting={isPending}
                />
              </form>
            </Form>

            {step !== 3 && (
              <footer className="mt-8 border-t pt-5">
                {step === 1 && (
                  <div className="flex items-center justify-end gap-3">
                    <Button
                      onClick={handleNextStep1}
                      disabled={!form.watch('name')}
                    >
                      Continue to AI setup
                    </Button>
                  </div>
                )}
                {step === 2 && (
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="text-muted-foreground text-xs">
                      AI is optional. You can create right now with current
                      inputs.
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setStep(1)}
                        disabled={isPending}
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        form="business-creation-form"
                        disabled={isPending}
                      >
                        {isPending ? 'Creating...' : 'Create Business'}
                      </Button>
                    </div>
                  </div>
                )}
              </footer>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export function CreateBusinessCallToAction() {
  return (
    <Button asChild>
      <Link to="/create-business">Create Business</Link>
    </Button>
  );
}
