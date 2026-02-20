import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { useConfetti } from '@/components/confetti-provider';
import { useLoginPrompt } from '@/components/login-prompt-provider';
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  type CredenzaProps,
  CredenzaTitle,
  CredenzaTrigger,
} from '@/components/ui/credenza';
import { api } from '@/lib/api';
import { gun } from '@/lib/gun';
import { getGunRef } from '@/lib/gun/utils';
import { getBusinessDataFieldFromSelectedReleases } from '@/lib/plugins/business-onboarding-prepopulate';
import {
  parseReleaseId,
} from '@/lib/plugins/marketplace-seed';
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
import { Form } from './ui/form';
import { ScrollArea } from './ui/scroll-area';

const stepContent = {
  1: {
    title: "Welcome! Let's start with the basics.",
    description: 'What is your business and what does it do?',
  },
  2: {
    title: 'AI Onboarding Setup.',
    description:
      'Describe your business in chat and let AI draft your optional setup plan.',
  },
  3: {
    title: 'Congratulations!',
    description: 'Your business is ready to fly.',
  },
};

export function CreateBusiness({
  children,
  ...props
}: { children: React.ReactNode } & CredenzaProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [createdBusiness, setCreatedBusiness] =
    useState<z.infer<typeof businessSchema>>();

  const { data: existingBusinesses = [], isLoading } = api.business.useGet();
  const { data: releaseRows = [] } = api.pluginRelease.useGet();
  const { fire: fireConfetti } = useConfetti();
  const { promptLogin } = useLoginPrompt();
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

  const handleClose = () => {
    setOpen(false);
    // Reset form and step after a short delay to allow modal to close
    form.reset();
    setStep(1);
    setCreatedBusiness(undefined);
  };

  const currentContent = stepContent[step as keyof typeof stepContent];

  useEffect(() => {
    if (step === 3) {
      fireConfetti();
      // Fire confetti from the right
      fireConfetti();
    }
  }, [step, fireConfetti]);

  return (
    <Credenza
      open={open}
      onOpenChange={async (open) => {
        if (open) {
          await promptLogin();
          setOpen(true);
        } else handleClose();
      }}
    >
      <CredenzaTrigger {...props}>{children}</CredenzaTrigger>
      <CredenzaContent>
        <CredenzaHeader>
          <CredenzaTitle>{currentContent.title}</CredenzaTitle>
          <CredenzaDescription>
            {currentContent.description}
          </CredenzaDescription>
        </CredenzaHeader>
        <CredenzaBody>
          <ScrollArea className="h-[50vh]">
            <Form {...form}>
              {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
              <form
                id="business-creation-form"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <CredenzaBody>
                  <BusinessCreationForm
                    step={step}
                    form={form}
                    setStep={setStep}
                    createdBusiness={createdBusiness}
                    isSubmitting={isPending}
                  />
                </CredenzaBody>
              </form>
            </Form>
          </ScrollArea>
        </CredenzaBody>
        <CredenzaFooter>
          {step === 1 && (
            <Button onClick={handleNextStep1} disabled={!form.watch('name')}>
              Next
            </Button>
          )}
          {step === 2 && (
            <div className="flex justify-between w-full">
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
          )}
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  );
}
