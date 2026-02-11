import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api } from '@/lib/api';
import { useConfetti } from '@/components/confetti-provider';
import { useAuth } from '@/components/auth-provider';
import z from 'zod';

export const Route = createFileRoute('/$businessName/admin/invitation')({
  validateSearch: z.object({
    token: z.string(),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { businessName } = Route.useParams();
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<
    'loading' | 'pending' | 'accepted' | 'rejected' | 'error'
  >('loading');
  const { user } = useAuth();
  const { fire: fireConfetti } = useConfetti();
  const navigate = Route.useNavigate();
  const updateBusinessMutation = api.business.useUpdate();
  const { data: businesses } = api.business.useGet({
    keys: [businessName],
    single: true,
  });
  const business = businesses?.[0];
  const invitation = business?.invitations?.[token];

  const handleAccept = async () => {
    try {
      if (business && user) {
        // Update the business to add the user as a member
        const updatedMembers = {
          ...business.members,
          [user._?.soul ?? 'anon']: {
            role: invitation?.role || 'staff',
            userId: user._?.soul ?? '',
            joinedAt: Date.now(),
            permissions: invitation?.permissions || {},
          },
        };

        await updateBusinessMutation.mutateAsync({
          id: business.id,
          members: updatedMembers,
          invitations: {
            [token]: null,
          },
        });

        setStatus('accepted');
        fireConfetti();
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setStatus('error');
    }
  };

  const handleReject = () => {
    // In a real implementation, you would update the invitation status to 'rejected'
    setStatus('rejected');
  };

  const handleGoToAdmin = () => {
    navigate({ to: `/$businessName/admin`, params: { businessName } });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              There was an error processing your invitation.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-between">
            <Button onClick={() => navigate({ to: '/' })}>Go To Home</Button>
            <Button
              variant="outline"
              onClick={() => window.close()}
              className="w-full"
            >
              Close Tab
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (status === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation Accepted!</CardTitle>
            <CardDescription>
              You have successfully joined the organization.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2">
            <Button onClick={handleGoToAdmin} className="w-full">
              Go to Admin Panel
            </Button>
            <Button
              variant="outline"
              onClick={() => window.close()}
              className="w-full"
            >
              Close Tab
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation Rejected</CardTitle>
            <CardDescription>You have declined the invitation.</CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2">
            <Button onClick={() => window.close()} className="w-full">
              Close Tab
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Organization Invitation</CardTitle>
          <CardDescription>
            You've been invited to join{' '}
            <span className="font-semibold">{businessName}</span> as a{' '}
            <span className="font-semibold">{invitation?.role}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Email:</span> {user?.email}
            </p>
            <p className="text-sm">
              <span className="font-medium">Role:</span> {invitation?.role}
            </p>
            {invitation?.permissions && (
              <p className="text-sm">
                <span className="font-medium">Permissions:</span>{' '}
                {Object.keys(invitation.permissions).join(', ')}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleReject}>
            Reject
          </Button>
          <Button onClick={handleAccept}>Accept</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
