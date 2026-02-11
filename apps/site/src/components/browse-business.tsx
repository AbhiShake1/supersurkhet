import type React from 'react';
import {
  Credenza,
  CredenzaBody,
  CredenzaClose,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaTrigger,
  type CredenzaProps,
} from '@/components/ui/credenza';
import { Button } from './ui/button';
import { CreateBusiness } from './create-business';
import { BusinessList } from './business-list';

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
          <CreateBusiness asChild>
            <Button className="w-full">Create Your Own Business</Button>
          </CreateBusiness>
          <CredenzaClose asChild>
            <Button variant="outline">Close</Button>
          </CredenzaClose>
        </CredenzaFooter>
      </CredenzaContent>
    </Credenza>
  );
}
