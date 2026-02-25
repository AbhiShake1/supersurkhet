import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export const AI_MUTATION_PERMISSION_OPTIONS = [
  {
    value: 'allow_once',
    label: 'allow once',
    description: 'Permit exactly one mutating AI action, then ask again.',
  },
  {
    value: 'allow_always',
    label: 'always allow',
    description: 'Persist permission locally for this browser until changed.',
  },
  {
    value: 'deny_session',
    label: 'deny (session)',
    description: 'Block all mutating AI actions for this session.',
  },
] as const;

export type AiMutationPermissionOptionValue =
  (typeof AI_MUTATION_PERMISSION_OPTIONS)[number]['value'];

export interface AiMutationPermissionDialogProps {
  open: boolean;
  onSelect: (value: AiMutationPermissionOptionValue) => void;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  isSubmitting?: boolean;
}

export function AiMutationPermissionDialog({
  open,
  onSelect,
  onOpenChange,
  title = 'Allow AI to make changes?',
  description = 'Mutating AI actions can edit data or configuration. Choose a permission level.',
  isSubmitting = false,
}: AiMutationPermissionDialogProps) {
  const [selected, setSelected] = useState<
    AiMutationPermissionOptionValue | ''
  >('');

  const handleConfirm = () => {
    if (!selected) return;
    onSelect(selected);
    setSelected('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelected('');
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent hideClose className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={selected}
          onValueChange={(value) =>
            setSelected(value as AiMutationPermissionOptionValue)
          }
          aria-label="AI mutation permission options"
        >
          {AI_MUTATION_PERMISSION_OPTIONS.map((option) => {
            const id = `ai-mutation-option-${option.value}`;
            return (
              <div
                key={option.value}
                className="flex items-start gap-3 rounded-md border p-3"
              >
                <RadioGroupItem id={id} value={option.value} className="mt-1" />
                <div className="space-y-1">
                  <Label
                    htmlFor={id}
                    className="text-sm font-medium capitalize"
                  >
                    {option.label}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    {option.description}
                  </p>
                </div>
              </div>
            );
          })}
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selected || isSubmitting}
            aria-disabled={!selected || isSubmitting}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
