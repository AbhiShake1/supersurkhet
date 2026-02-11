import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AuthForm } from '@/components/auth-form';

export const Route = createFileRoute('/_auth/auth')({
  component: RouteComponent,
  validateSearch: z.object({
    m: z.enum(['login', 'signup']).default('login'),
    redirect: z.string().default('/').optional(),
  }),
});

function RouteComponent() {
  const { m: mode, redirect } = Route.useSearch();
  const navigate = Route.useNavigate();

  const handleModeChange = (newMode: 'login' | 'signup') => {
    navigate({ search: (p) => ({ ...p, m: newMode }) });
  };

  const handleAuthSuccess = () => {
    navigate({ to: redirect ?? '/' });
  };

  return (
    <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
      <AuthForm
        mode={mode}
        onModeChange={handleModeChange}
        onAuthSuccess={handleAuthSuccess}
      />
    </section>
  );
}
