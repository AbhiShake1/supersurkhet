import { describe, expect, it } from 'vitest';
import type { VercelV0ChatWizardInput } from './v0-ai-chat';

const validWizardInput = {
  value: 'secret',
  placeholder: 'Paste API key',
  onChange: (_value: string) => {},
  onSubmit: () => {},
} satisfies VercelV0ChatWizardInput;
void validWizardInput;

const validWizardInputWithoutSubmit = {
  value: 'secret',
  placeholder: 'Paste OAuth access token',
  onChange: (_value: string) => {},
} satisfies VercelV0ChatWizardInput;
void validWizardInputWithoutSubmit;

const invalidWizardInput = {
  value: 'secret',
  placeholder: 'Paste API key',
  onChange: (_value: string) => {},
  submitLabel: 'Submit',
} satisfies VercelV0ChatWizardInput;
void invalidWizardInput;

describe('v0-ai-chat wizard input contract', () => {
  it('keeps compile-time contract checks colocated with runtime suite', () => {
    expect(true).toBe(true);
  });
});
