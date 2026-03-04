import { Button } from '@/components/ui/button';
import { Link, useRouter } from '@tanstack/react-router';
import { ArrowLeft, Home, Lock } from 'lucide-react';

interface UnauthorizedProps {
  title?: string;
  description?: string;
}

function Illustration(props: React.ComponentPropsWithoutRef<'svg'>) {
  return <Lock {...props} />;
}

export function Unauthorized({
  title = 'Access denied',
  description = "You don't have permission to access this page.",
}: UnauthorizedProps) {
  const router = useRouter();

  return (
    <div className="relative flex flex-col w-full justify-center min-h-svh bg-background p-6 md:p-10">
      <div className="relative max-w-5xl mx-auto w-full">
        <Illustration className="absolute inset-0 w-full h-[50vh] opacity-[0.04] dark:opacity-[0.03] text-foreground" />
        <div className="relative text-center z-[1] pt-52">
          <h1 className="mt-4 text-balance text-5xl font-semibold tracking-tight text-primary sm:text-7xl">
            {title}
          </h1>
          <p className="mt-6 text-pretty text-lg font-medium text-muted-foreground sm:text-xl/8">
            {description}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-center gap-y-3 gap-x-6">
            <Button
              variant="secondary"
              className="group"
              onClick={() => router.history.back()}
            >
              <ArrowLeft
                className="me-2 ms-0 opacity-60 transition-transform group-hover:-translate-x-0.5"
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />
              Go back
            </Button>
            <Button className="-order-1 sm:order-none" asChild>
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Take me home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
