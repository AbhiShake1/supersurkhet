import { render } from '@react-email/render';
import {
  Building2,
  Clock3,
  CreditCard,
  Mail,
  PartyPopper,
  Search,
  UserPlus,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/components/auth-provider';
import type { PossibleTabConfig } from '@/components/auto-admin';
import { ConfettiButton } from '@/components/magicui/confetti';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import InvitationEmail from '@/emails/invitation-template';
import { sendMail } from '@/emails/send-mail';
import { api } from '@/lib/api';
import type { BusinessInvitation, BusinessMember } from '@/lib/schema';
import { cn } from '@/lib/utils';
import { AutoFormSubmit } from '../auto-form';
import { AutoForm, fieldConfig } from '../autoform';
import { Avatar, AvatarFallback, AvatarImage } from '../avatar';

type Invitation = BusinessInvitation;
type Member = BusinessMember;

interface ManageOrganizationProps {
  slug: string;
  tabs: PossibleTabConfig[];
}

export function ManageOrganization({ slug, tabs }: ManageOrganizationProps) {
  const [activeTab, setActiveTab] = useState('members');
  const [searchTerm, setSearchTerm] = useState('');
  const members = useOrgMembers(slug);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const { user } = useAuth();
  const { data: businesses } = api.business.useGet({
    keys: [slug],
    single: true,
  });
  const business = businesses?.[0];
  const invitationCount = business?.invitations
    ? Object.values(business.invitations).filter(
        (inv) => typeof inv === 'object' && !!inv.email,
      ).length
    : 0;
  const updateBusinessMutation = api.business.useUpdate();

  // Handle inviting a new member
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  const handleInviteMember = async (data: any) => {
    try {
      if (!business) {
        toast.error('Business not found');
      }

      // Generate a unique token for the invitation
      const invitationToken = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create the invitation link with the token
      const invitationUrl = `${window.location.origin}/${slug}/admin/invitation?token=${invitationToken}`;

      // Send the invitation email. dont wait
      sendMail({
        data: {
          from: 'SuperSurkhet <onboarding@surkhet.app>',
          to: data.email,
          subject: `Invitation to join ${business?.name}`,
          html: await render(
            <InvitationEmail
              inviterName={user?.name || user?.email || 'A user'}
              businessName={business?.name}
              inviteeEmail={data.email}
              invitationUrl={invitationUrl}
            />,
          ),
        },
      });

      await updateBusinessMutation.mutateAsync({
        id: business?.id,
        invitations: {
          [invitationToken]: {
            email: data.email,
            role: 'staff',
            permissions: data.permissions,
            invitedAt: Date.now(),
            token: invitationToken,
          },
        },
      });

      setShowInviteForm(false);
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation. Please try again.');
    }
  };

  // Handle updating member permissions
  const handleUpdatePermissions = (
    _memberId: string,
    _permissions: string[],
  ) => {
    // console.log(`Updating permissions for member ${memberId}:`, permissions);
    // // In a real app, this would make an API call
    // setMembers(prevMembers =>
    //   prevMembers.map(member =>
    //     member.id === memberId ? { ...member, permissions } : member
    //   )
    // );
  };

  // Handle removing a member
  const handleRemoveMember = (_memberId: string) => {
    // console.log(`Removing member with ID: ${memberId}`);
    // // In a real app, this would make an API call
    // setMembers(prevMembers => prevMembers.filter(member => member.id !== memberId));
  };

  const navigationItems = [
    { id: 'members', label: 'Members', icon: Users, count: members.length },
    {
      id: 'invitations',
      label: 'Invitations',
      icon: Mail,
      count: invitationCount,
    },
    { id: 'billing', label: 'Billing', icon: CreditCard, count: null },
  ];

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-gradient-to-b from-muted/20 to-background">
      <div className="border-b bg-card/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Building2 className="size-4 shrink-0" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Manage Business</h2>
            <p className="text-xs text-muted-foreground">
              Team access, invitations, and billing settings.
            </p>
          </div>
        </div>
        <nav>
          <ul className="flex w-full gap-2 rounded-xl border bg-muted/40 p-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id} className="flex-1">
                  <Button
                    variant="ghost"
                    className={cn(
                      'h-10 w-full justify-center gap-2 rounded-lg border border-transparent whitespace-nowrap transition-colors',
                      isActive
                        ? 'border-primary/20 bg-card font-semibold text-primary'
                        : 'text-muted-foreground hover:bg-card hover:text-foreground',
                    )}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                    {typeof item.count === 'number' && (
                      <span
                        className={cn(
                          'ml-1 rounded-full px-2 py-0.5 text-xs',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {item.count}
                      </span>
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {activeTab === 'members' && (
          <MembersTab
            members={members}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            showInviteForm={showInviteForm}
            setShowInviteForm={setShowInviteForm}
            onInviteMember={handleInviteMember}
            onUpdatePermissions={handleUpdatePermissions}
            onRemoveMember={handleRemoveMember}
            tabs={tabs}
            slug={slug}
          />
        )}
        {activeTab === 'invitations' && (
          <InvitationsTab
            slug={slug}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        )}
        {activeTab === 'billing' && <BillingTab />}
      </div>
    </div>
  );
}

const BillingTab = () => {
  return 'Coming Soon!';
};

function useOrgMembers(slug: string) {
  const { data } = api.business.useGet({ keys: [slug], single: true });
  if (!data?.[0]?.members) return [];
  return Object.values(data?.[0]?.members).filter(
    (m) => typeof m === 'object' && !!m.userId,
  );
}

// Members Tab Component
const MembersTab = ({
  members,
  searchTerm,
  setSearchTerm,
  showInviteForm,
  setShowInviteForm,
  onInviteMember,
  onUpdatePermissions,
  onRemoveMember,
  tabs,
  slug,
}: {
  members: Member[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showInviteForm: boolean;
  setShowInviteForm: (show: boolean) => void;
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  onInviteMember: (data: any) => void;
  onUpdatePermissions: (id: string, permissions: string[]) => void;
  onRemoveMember: (id: string) => void;
  tabs: PossibleTabConfig[];
  slug: string;
}) => {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-end">
        <Input
          placeholder="Search members..."
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-xs"
          leadingIcon={<Search className="size-4 shrink-0" />}
        />
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="w-full gap-2 sm:min-w-44 sm:w-auto"
          >
            <UserPlus className="size-4 shrink-0" />
            {showInviteForm ? 'Close invite' : 'Invite member'}
          </Button>
        </div>
      </div>

      {showInviteForm && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
              <Mail className="size-4 shrink-0" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Invite New Member</h3>
              <p className="text-xs text-muted-foreground">
                Send an invite with scoped permissions.
              </p>
            </div>
          </div>
          <AutoForm
            schema={z.object({
              email: z.string().email('Invalid email address'),
              permissions: z.record(z.string(), z.boolean()).superRefine(
                fieldConfig({
                  fieldType: 'permissions',
                  customData: { tabs, slug },
                }),
              ),
            })}
            onSubmit={onInviteMember}
          >
            <AutoFormSubmit asChild>
              <ConfettiButton className="gap-2">
                <PartyPopper className="size-4 shrink-0" />
                Send Invitation
              </ConfettiButton>
            </AutoFormSubmit>
          </AutoForm>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="min-w-full divide-y">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:px-6">
                Member
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:px-6">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:px-6">
                Permissions
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:px-6">
                Joined On
              </th>
            </tr>
          </thead>
          <tbody className="divide-y bg-card">
            {members.map((member) => (
              <MemberRow
                key={member.userId}
                member={member}
                onUpdatePermissions={onUpdatePermissions}
                onRemoveMember={onRemoveMember}
                searchTerm={searchTerm}
              />
            ))}
            {members.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-6"
                >
                  No members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Member Row Component
const MemberRow = ({
  member: { userId, role, permissions, joinedAt },
  // biome-ignore lint/correctness/noUnusedFunctionParameters: lint debt cleanup
  onUpdatePermissions,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: lint debt cleanup
  onRemoveMember,
  searchTerm,
}: {
  member: Member;
  onUpdatePermissions: (id: string, permissions: string[]) => void;
  onRemoveMember: (id: string) => void;
  searchTerm: string;
}) => {
  const { data } = api.user.useGet({
    keys: [userId?.substring(1)],
    single: true,
  });
  const member = data?.[0];

  if (!member) return null;

  if (
    !!searchTerm &&
    !member.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )
    return null;

  return (
    <tr className="transition-colors hover:bg-muted/20">
      <td className="whitespace-nowrap px-4 py-4 sm:px-6">
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0">
            <Avatar className="bg-card border-2 border-dashed rounded-xl w-10 h-10">
              <AvatarImage
                src={member?.avatar}
                alt={member?.name}
                className="rounded-xl"
              />
              <AvatarFallback className="rounded-xl">
                <span>
                  {member?.name?.substring(0, 1)?.toUpperCase() ?? 'U'}
                </span>
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-foreground">
              {member?.name}
            </div>
            <div className="text-sm text-muted-foreground">{member?.email}</div>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-4 sm:px-6">
        <Badge variant="secondary" className="rounded-xl">
          {role}
        </Badge>
      </td>
      <td className="whitespace-nowrap px-4 py-4 sm:px-6">
        <div className="flex flex-wrap gap-1 text-sm text-muted-foreground">
          {permissionsSummary(role, permissions)}
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-sm text-muted-foreground sm:px-6">
        {joinedAt && new Date(joinedAt).toLocaleString()}
      </td>
    </tr>
  );
};

// Invitations Tab Component
const InvitationsTab = ({
  slug,
  searchTerm,
  setSearchTerm,
}: {
  slug: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}) => {
  const invitations = useOrgInvitations(slug);
  const filteredInvitations = invitations.filter(
    (invitation) =>
      !searchTerm ||
      invitation.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-end">
        <Input
          placeholder="Search invitations..."
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-xs"
          leadingIcon={<Search className="size-4 shrink-0" />}
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="min-w-full divide-y">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:px-6">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:px-6">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:px-6">
                Permissions
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:px-6">
                Invited On
              </th>
            </tr>
          </thead>
          <tbody className="divide-y bg-card">
            {filteredInvitations.map((invitation) => (
              <InvitationRow
                key={invitation.email}
                invitation={invitation}
                searchTerm={searchTerm}
              />
            ))}
            {filteredInvitations.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-6"
                >
                  No invitations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Invitation Row Component
const InvitationRow = ({
  invitation: { email, role, permissions, invitedAt },
  searchTerm,
}: {
  invitation: Invitation;
  searchTerm: string;
}) => {
  if (!!searchTerm && !email?.toLowerCase().includes(searchTerm.toLowerCase()))
    return null;

  return (
    <tr className="transition-colors hover:bg-muted/20">
      <td className="whitespace-nowrap px-4 py-4 sm:px-6">
        <div className="text-sm font-medium text-foreground">{email}</div>
      </td>
      <td className="whitespace-nowrap px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-xl">
            {role}
          </Badge>
          <Badge variant="outline" className="rounded-xl text-xs">
            Pending
          </Badge>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-4 sm:px-6">
        <div className="flex flex-wrap gap-1 text-sm text-muted-foreground">
          {permissionsSummary(role, permissions)}
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-sm text-muted-foreground sm:px-6">
        <div className="flex items-center gap-2">
          <Clock3 className="size-4 shrink-0" />
          {invitedAt && new Date(invitedAt).toLocaleString()}
        </div>
      </td>
    </tr>
  );
};

function permissionsSummary(
  role: string | undefined,
  permissions: Record<string, unknown> | undefined,
) {
  if (role === 'owner') return 'Full access';
  if (!permissions) return 'No scoped permissions';
  const permissionCount = Object.keys(permissions).length;
  if (permissionCount === 0) return 'No scoped permissions';
  return `${permissionCount} permission${permissionCount === 1 ? '' : 's'}`;
}

// Hook to get organization invitations
function useOrgInvitations(slug: string) {
  const { data } = api.business.useGet({ keys: [slug], single: true });
  if (!data?.[0]?.invitations) return [];
  return Object.values(data?.[0]?.invitations).filter(
    (inv) => typeof inv === 'object' && !!inv.email,
  );
}
