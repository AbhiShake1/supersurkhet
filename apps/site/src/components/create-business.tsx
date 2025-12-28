import { useConfetti } from "@/components/confetti-provider";
import { useLoginPrompt } from "@/components/login-prompt-provider";
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaTrigger,
  type CredenzaProps,
} from "@/components/ui/credenza";
import { api } from "@/lib/api";
import { businessSchema } from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BusinessCreationForm, getBusinessTypeDataField } from "./business-creation-form";
import { Button } from "./ui/button";
import { Form } from "./ui/form";
import { ScrollArea } from "./ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "./auth-provider";
import { gun } from "@/lib/gun";
import { getGunRef } from "@/lib/gun/utils";

const businessCreationSchema = businessSchema
  .pick({
    name: true,
    businessType: true,
  })
  .extend({
    prepopulateData: z.record(z.string(), z.boolean().default(false)).optional(),
  });

type BusinessCreationValues = z.infer<typeof businessCreationSchema>;

const stepContent = {
  1: {
    title: "Welcome! Let's start with the basics.",
    description: "What is your business and what does it do?",
  },
  2: {
    title: "Pre-populate Your Data.",
    description: "Select which items you'd like to pre-populate based on similar businesses. Common items are pre-selected for you.",
  },
  3: {
    title: "Congratulations!",
    description: "Your business is ready to fly.",
  },
};

export function CreateBusiness({ children, ...props }: { children: React.ReactNode } & CredenzaProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [createdBusiness, setCreatedBusiness] =
    useState<z.infer<typeof businessSchema>>();

  const { data: existingBusinesses = [], isLoading } = api.business.useGet();
  const { fire: fireConfetti } = useConfetti();
  const { promptLogin } = useLoginPrompt();

  const form = useForm<BusinessCreationValues>({
    resolver: zodResolver(businessCreationSchema),
    defaultValues: {
      name: "",
      businessType: "other",
    },
  });

  const { mutateAsync: createBusiness, isPending } = api.business.useCreate({
    onSuccess: (_, data) => {
      setCreatedBusiness(data);
      setStep(3);
    },
    onError: (err) => {
      console.error("Error creating business:", err);
      toast.error(
        err.message || "Failed to create business. Please try again.",
      );
      form.setError("name", {
        type: "manual",
        message: err.message || "Failed to create business. Please try again.",
      });
    },
  });

  const handleNextStep1 = async () => {
    if (isLoading) {
      return form.setError("name", {
        type: "manual",
        message: "Something went wrong. Please try again.",
      });
    }
    const isValid = await form.trigger("name");
    if (!isValid) return;

    const businessName = form.getValues("name");
    const basePath = businessName.toLowerCase().replace(/\s+/g, "-");

    const isNameTaken = existingBusinesses.some((b) => b.basePath === basePath);

    if (isNameTaken) {
      return form.setError("name", {
        type: "manual",
        message: "A business with this name already exists.",
      });
    }

    setStep(2);
  };

  const onSubmit = async (values: BusinessCreationValues) => {
    const basePath = values.name.toLowerCase().replace(/\s+/g, "-");
    // Extract prepopulateData to avoid including it in the business creation
    const { prepopulateData, ...businessData } = values;
    for (const [key, value] of Object.entries(prepopulateData ?? {})) {
      if (!value) continue
      if (key === "undefined") continue
      gun.get(key).load((data) => {
        if (!data) return
        const field = getBusinessTypeDataField(businessData.businessType)
        const keyParts = key.split("/")
        const indexOfField = keyParts.findIndex(v => v === field)
        keyParts[indexOfField + 1] = businessData.name
        const newKey = keyParts.join("/")
        getGunRef(newKey).put(data, (ack) => {
          if ("err" in ack && !!ack.err) {
            console.error("Error updating prepopulated data:", ack.err);
          }
        })
      })
    }
    if (!user) {
      return toast.error("You must be logged in to create a business.")
    }
    await createBusiness({
      ...businessData,
      basePath,
      isActive: true,
      created_by: user?._?.soul ?? "anon",
      id: basePath,
      timestamp: Date.now(),
      members: {
        [user?._?.soul ?? "anon"]: {
          role: "owner",
          userId: user?._?.soul ?? "",
          joinedAt: Date.now(),
        }
      }
    });
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
            <Button
              onClick={handleNextStep1}
              disabled={!form.watch("name") || !form.watch("businessType")}
            >
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
                {isPending ? "Creating..." : "Create Business"}
              </Button>
            </div>
          )}
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  );
}
