import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';

export const Route = createFileRoute('/$businessName/')({
  component: BusinessIndexRedirectRoute,
});

function BusinessIndexRedirectRoute() {
  const { businessName } = Route.useParams();
  const navigate = Route.useNavigate();

  useEffect(() => {
    void navigate({
      to: '/$businessName/$subdomain',
      params: {
        businessName,
        subdomain: 'index',
      },
      replace: true,
    });
  }, [businessName, navigate]);

  return <Spinner />;
}
