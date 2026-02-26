import { Link } from '@tanstack/react-router';
import { SearchX } from 'lucide-react';
import { BusinessList } from '@/components/business-list';
import { Button } from '@/components/ui/button';

interface BusinessPickerFallbackProps {
  requestedBusinessName?: string;
}

export function BusinessPickerFallback({
  requestedBusinessName,
}: BusinessPickerFallbackProps) {
  const normalizedBusinessName = requestedBusinessName?.trim();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <div className="mb-6 rounded-xl border bg-card/60 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-muted p-2">
            <SearchX className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold sm:text-2xl">
              Business not found
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              {normalizedBusinessName
                ? `We couldn't find "${normalizedBusinessName}".`
                : "We couldn't find that business."}{' '}
              Pick one from your available businesses instead.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild>
                <Link to="/create-business">Create Business</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/apps">Open App Drawer</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <BusinessList className="h-[55vh]" />
    </div>
  );
}
