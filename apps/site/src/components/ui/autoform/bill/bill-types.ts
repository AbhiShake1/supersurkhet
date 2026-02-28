import type { ParsedField, ParsedSchema } from '@autoform/core';
import type React from 'react';
import type { BillColumnAlign, BillConfig } from '@/lib/zod/with-bill';

export type RuntimeBillConfig = BillConfig<
  Record<string, unknown>,
  Record<string, unknown>
>;

export type NormalizedBillColumn = {
  key: string;
  label: string;
  width: string;
  align: BillColumnAlign;
  readOnly: boolean;
};

export type ResolvedBillSchema = {
  arrayField: ParsedField;
  lineItemObjectField: ParsedField;
};

export type BillLayoutProps = {
  parsedSchema: ParsedSchema;
  billConfig: RuntimeBillConfig;
  withSubmit: boolean;
  children: React.ReactNode;
  submitButton: React.ReactNode;
};
