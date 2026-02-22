import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Boxes,
  ChevronLeft,
  Compass,
  Rocket,
  SkipForward,
  Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { useConfetti } from '@/components/confetti-provider';
import { useLoginPrompt } from '@/components/login-prompt-provider';
import { api } from '@/lib/api';
import { gun } from '@/lib/gun';
import { getGunRef } from '@/lib/gun/utils';
import { getBusinessDataFieldFromSelectedReleases } from '@/lib/plugins/business-onboarding-prepopulate';
import { parseReleaseId } from '@/lib/plugins/marketplace-seed';
import type { PluginReleaseDoc } from '@/lib/plugins/types';
import type { businessSchema } from '@/lib/schema';
import { installPluginRelease } from '@/server-functions/plugins';
import { useAuth } from './auth-provider';
import {
  BusinessCreationForm,
  type BusinessCreationValues,
  businessCreationSchema,
} from './business-creation-form';
import { Button } from './ui/button';
import { ButtonGroup } from './ui/button-group';
import { Form } from './ui/form';

const stepContent = {
  1: {
    title: 'Start your business',
    description:
      'Set the essentials first. Name and location create the foundation.',
  },
  2: {
    title: 'Connect AI',
    description:
      'Configure AI provider authentication and collect business context.',
  },
  3: {
    title: 'Choose plugins',
    description:
      'Use the plugin browser to review AI suggestions and finalize installs.',
  },
  4: {
    title: 'Launch',
    description: 'Your business is live. Start operating and iterate fast.',
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
    mode: 'onChange',
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
  const canUsePrimaryActions = form.formState.isValid && !isPending;
  const selectedPluginReleaseIds = form.watch('selectedPluginReleaseIds') ?? [];
  const hasSelectedPlugins = selectedPluginReleaseIds.length > 0;

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
    if ((values.selectedPluginReleaseIds ?? []).length === 0) {
      form.setError('selectedPluginReleaseIds', {
        type: 'manual',
        message: 'Select at least one plugin before creating your business.',
      });
      toast.error('Select at least one plugin before creating your business.');
      setStep(3);
      return;
    }

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
    setStep(4);
  };

  const currentContent = stepContent[step as keyof typeof stepContent];

  useEffect(() => {
    if (step === 4) {
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
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_10%_10%,hsl(22_95%_58%/.12),transparent_40%),radial-gradient(circle_at_90%_0%,hsl(192_95%_56%/.12),transparent_35%),linear-gradient(145deg,hsl(224_21%_12%),hsl(236_24%_9%))] px-4 py-8 sm:px-8 sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(hsl(0_0%_100%/.06)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_100%/.06)_1px,transparent_1px)] [background-size:32px_32px]"
      />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" asChild>
            <Link to="/" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back home
            </Link>
          </Button>
          <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs text-white/80">
            Create Business
          </span>
        </div>

        <section className="rounded-3xl border border-white/20 bg-black/25 p-5 text-white shadow-xl backdrop-blur-xl sm:p-7">
          <header className="mb-6 flex items-center justify-between border-b border-white/15 pb-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-white/10">
                {step === 1 && <Compass className="h-4 w-4 text-white/85" />}
                {step === 2 && <Bot className="h-4 w-4 text-white/85" />}
                {step === 3 && <Boxes className="h-4 w-4 text-white/85" />}
                {step === 4 && <Rocket className="h-4 w-4 text-white/85" />}
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/60">
                  Business creation
                </p>
                <p className="mt-1 font-semibold text-xl tracking-tight">
                  {currentContent.title}
                </p>
                <p className="mt-1 text-sm text-white/75">
                  {currentContent.description}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/85">
              <Sparkles className="h-3.5 w-3.5" />
              Step {step} / 4
            </span>
          </header>
          <div className="rounded-2xl border border-border/70 bg-background/95 p-4 text-foreground sm:p-5">
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

            {step !== 4 && <div className="h-24 sm:h-28" />}
          </div>
        </section>
      </div>
      {step !== 4 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="pointer-events-auto w-full max-w-3xl">
            {step === 1 && (
              <Button
                size="lg"
                onClick={handleNextStep1}
                disabled={isPending || isLoading}
                className="h-12 w-full rounded-xl px-5 text-sm font-semibold shadow-lg transition-all duration-200 sm:h-13 sm:text-base"
              >
                <span className="inline-flex items-center gap-2">
                  <Compass className="h-4 w-4" />
                  Continue
                </span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {step === 2 && (
              <ButtonGroup className="w-full justify-center [&>button]:h-12 [&>button]:px-4 [&>button]:font-medium [&>button]:shadow-lg sm:[&>button]:h-13">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setStep(1)}
                  disabled={isPending}
                  className="min-w-[96px] rounded-l-xl transition-all duration-200"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setStep(3)}
                  disabled={isPending}
                  className="min-w-[116px] transition-all duration-200"
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  Continue without AI
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => setStep(3)}
                  disabled={isPending}
                  className="min-w-[152px] rounded-r-xl transition-all duration-200"
                >
                  <ArrowRight className="mr-2 h-4.5 w-4.5" />
                  Review Plugins
                </Button>
              </ButtonGroup>
            )}
            {step === 3 && (
              <ButtonGroup className="w-full justify-center [&>button]:h-12 [&>button]:px-4 [&>button]:font-medium [&>button]:shadow-lg sm:[&>button]:h-13">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setStep(2)}
                  disabled={isPending}
                  className="min-w-[96px] rounded-l-xl transition-all duration-200"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  form="business-creation-form"
                  size="lg"
                  disabled={!canUsePrimaryActions || !hasSelectedPlugins}
                  className="min-w-[176px] rounded-r-xl transition-all duration-200"
                >
                  <Rocket className="mr-2 h-4.5 w-4.5" />
                  {isPending
                    ? 'Creating...'
                    : hasSelectedPlugins
                      ? 'Create Business'
                      : 'Select at least one plugin to create business'}
                  {!isPending && hasSelectedPlugins && (
                    <ArrowRight className="ml-2 h-4.5 w-4.5" />
                  )}
                </Button>
              </ButtonGroup>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
