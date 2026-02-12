import type React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Spinner } from '../../spinner';

export const SubmitButton: React.FC<
  { children: React.ReactNode; loading?: boolean } & ButtonProps
> = ({ children, loading, ...props }) => (
  <Button {...props} type="submit" disabled={props.disabled || loading}>
    {loading && <Spinner className="mr-2 h-4 w-4" />}
    {children}
  </Button>
);
