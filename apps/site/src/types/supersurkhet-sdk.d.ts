import type { FieldTypes as AutoformFieldTypes } from '@/components/ui/autoform';

declare module '@supersurkhet/sdk' {
  interface SupersurkhetSdkFieldTypeMap {
    FieldTypes?: AutoformFieldTypes;
  }
}

export {};
