import { Link } from '@tanstack/react-router';
import type React from 'react';
import {
  Credenza,
  CredenzaBody,
  CredenzaClose,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  type CredenzaProps,
  CredenzaTitle,
  CredenzaTrigger,
} from '@/components/ui/credenza';
import { BusinessList } from './business-list';
import { Button } from './ui/button';

export function BrowseBusiness({
  children,
  ...props
}: { children: React.ReactNode } & CredenzaProps) {
  return (
    <Credenza>
      <CredenzaTrigger {...props}>{children}</CredenzaTrigger>
      <CredenzaContent className="max-h-[80vh]">
        <CredenzaHeader>
          <CredenzaTitle>Explore Local Businesses</CredenzaTitle>
          <CredenzaDescription>
            Discover the vibrant businesses that power Surkhet. Find your
            favorites or stumble upon a new gem.
          </CredenzaDescription>
        </CredenzaHeader>
        <CredenzaBody>
          <BusinessList className="h-[40vh]" />
        </CredenzaBody>
        <CredenzaFooter>
          <Button asChild className="w-full">
            <Link to="/create-business">Create Your Own Business</Link>
          </Button>
          <CredenzaClose asChild>
            <Button variant="outline">Close</Button>
          </CredenzaClose>
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  );
}
