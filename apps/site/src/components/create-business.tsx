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
} from "@/components/ui/credenza";
import { useCreate, useGet } from "@/lib/gun/hooks";
import { businessSchema } from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BusinessCreationForm } from "./business-creation-form";
import { Button } from "./ui/button";
import { Form } from "./ui/form";
import { ScrollArea } from "./ui/scroll-area";

const businessCreationSchema = businessSchema.pick({
  name: true,
  businessType: true,
  features: true,
});

type BusinessCreationValues = z.infer<typeof businessCreationSchema>;

const stepContent = {
  1: {
    title: "Welcome! Let's start with the basics.",
    description: "What is your business and what does it do?",
  },
  2: {
    title: "Choose your features.",
    description: "Select the tools you need to run your business.",
  },
  3: {
    title: "Congratulations!",
    description: "Your business is ready to fly.",
  },
};

export function CreateBusiness({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [createdBusiness, setCreatedBusiness] = useState<z.infer<typeof businessSchema>>();

  const createBusinessGun = useCreate("business");
  const existingBusinesses = useGet("business");
  const { fire: fireConfetti } = useConfetti();
  const { promptLogin } = useLoginPrompt();

  const form = useForm<BusinessCreationValues>({
    resolver: zodResolver(businessCreationSchema),
    defaultValues: {
      name: "",
      features: {},
    },
  });

  const { mutateAsync: createBusiness, isPending, isError, error } = useMutation({
    mutationFn: async (data: BusinessCreationValues & { basePath: string }) => {
      return createBusinessGun(data);
    },
    onSuccess: (_, data) => {
      setCreatedBusiness(data);
      setStep(3);
    },
    onError: (err) => {
      console.error("Error creating business:", err);
      form.setError("name", { type: "manual", message: err.message || "Failed to create business. Please try again." });
    },
  });

  const handleNextStep1 = async () => {
    const isValid = await form.trigger("name");
    if (!isValid) return;

    const businessName = form.getValues("name");
    const basePath = businessName.toLowerCase().replace(/\s+/g, "-");

    const isNameTaken = existingBusinesses.some(
      (b) => b.basePath === basePath
    );

    if (isNameTaken) {
      form.setError("name", { type: "manual", message: "A business with this name already exists." });
      return;
    }

    setStep(2);
  };

  const onSubmit = async (values: BusinessCreationValues) => {
    const basePath = values.name.toLowerCase().replace(/\s+/g, "-");
    await createBusiness({ ...values, basePath });
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
    <Credenza open={open} onOpenChange={async (open) => {
      if (open) {
        await promptLogin();
        setOpen(true)
      }
      else handleClose()
    }}>
      <CredenzaTrigger>
        {children}
      </CredenzaTrigger>
      <CredenzaContent>
        <CredenzaHeader>
          <CredenzaTitle>{currentContent.title}</CredenzaTitle>
          <CredenzaDescription>{currentContent.description}</CredenzaDescription>
        </CredenzaHeader>
        <CredenzaBody>
          <ScrollArea className="h-[50vh]">
            <Form {...form}>
              <form id="business-creation-form" onSubmit={form.handleSubmit(onSubmit)}>
                <CredenzaBody className="">
                  <BusinessCreationForm step={step} form={form} setStep={setStep} createdBusiness={createdBusiness} isSubmitting={isPending} />
                </CredenzaBody>
              </form>
            </Form>
          </ScrollArea>
        </CredenzaBody>
        <CredenzaFooter>
          {step === 1 && (
            <Button onClick={handleNextStep1} disabled={!form.watch("name") || !form.watch("businessType")}>Next</Button>
          )}
          {step === 2 && (
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={() => setStep(1)} disabled={isPending}>Back</Button>
              <Button type="submit" form="business-creation-form" disabled={isPending}>
                {isPending ? "Creating..." : "Create Business"}
              </Button>
            </div>
          )}
        </CredenzaFooter>
      </CredenzaContent >
    </Credenza >
  );
}

