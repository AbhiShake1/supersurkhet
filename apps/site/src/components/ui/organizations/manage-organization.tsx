import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  CreditCard,
  Search,
  UserPlus,
  Mail
} from "lucide-react";
import { AutoForm, fieldConfig } from "../autoform";
import { z } from "zod";
import { api } from "@/lib/api";
import type { BusinessInvitation, BusinessMember } from "@/lib/schema";
import { Avatar, AvatarImage, AvatarFallback } from "../avatar";
import { sendMail } from "@/emails/send-mail";
import InvitationEmail from "@/emails/invitation-template";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import { render } from "@react-email/render";
import type { PossibleTabConfig } from "@/components/auto-admin";

type Invitation = BusinessInvitation
type Member = BusinessMember;

interface ManageOrganizationProps {
  slug: string
  tabs: PossibleTabConfig[]
}

export function ManageOrganization({ slug, tabs }: ManageOrganizationProps) {
  const [activeTab, setActiveTab] = useState("members");
  const [searchTerm, setSearchTerm] = useState("");
  const members = useOrgMembers(slug)
  const [showInviteForm, setShowInviteForm] = useState(false);
  const { user } = useAuth();
  const { data: businesses } = api.business.useGet({ keys: [slug], single: true });
  const business = businesses?.[0];
  const updateBusinessMutation = api.business.useUpdate();

  // Handle inviting a new member
  const handleInviteMember = async (data: any) => {
    try {
      if (!business) {
        toast.error("Business not found");
      }

      // Generate a unique token for the invitation
      const invitationToken = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create the invitation link with the token
      const invitationUrl = `${window.location.origin}/${slug}/admin/invitation?token=${invitationToken}`;

      // Send the invitation email. dont wait
      sendMail({
        data: {
          from: "SuperSurkhet <onboarding@surkhet.app>",
          to: data.email,
          subject: `Invitation to join ${business!.name}`,
          html: await render(
            <InvitationEmail
              inviterName={user?.name || user?.email || "A user"}
              businessName={business!.name}
              inviteeEmail={data.email}
              role="staff" // Default role, can be changed based on requirements
              invitationUrl={invitationUrl}
            />
          ),
        },
      });

      await updateBusinessMutation.mutateAsync({
        id: business!.id,
        invitations: {
          [invitationToken]: {
            email: data.email,
            role: "staff",
            permissions: data.permissions.reduce((acc: any, perm: string) => {
              acc[perm] = true;
              return acc;
            }, {}),
            invitedAt: Date.now(),
            token: invitationToken,
          }
        }
      });

      setShowInviteForm(false);
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error("Failed to send invitation. Please try again.");
    }
  };

  // Handle updating member permissions
  const handleUpdatePermissions = (memberId: string, permissions: string[]) => {
    // console.log(`Updating permissions for member ${memberId}:`, permissions);
    // // In a real app, this would make an API call
    // setMembers(prevMembers =>
    //   prevMembers.map(member =>
    //     member.id === memberId ? { ...member, permissions } : member
    //   )
    // );
  };

  // Handle removing a member
  const handleRemoveMember = (memberId: string) => {
    // console.log(`Removing member with ID: ${memberId}`);
    // // In a real app, this would make an API call
    // setMembers(prevMembers => prevMembers.filter(member => member.id !== memberId));
  };

  const navigationItems = [
    { id: "members", label: "Members", icon: Users },
    { id: "invitations", label: "Invitations", icon: Mail },
    { id: "billing", label: "Billing", icon: CreditCard },
  ];

  return (
    <div className="flex flex-col min-w-0">
      {/* Sidebar */}
      <div className={`w-full bg-card border-r transition-all duration-300 flex flex-row`}>
        <nav className="flex-1 p-2">
          <ul className="space-x-1 flex flex-row justify-center">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <Button
                    variant={activeTab === item.id ? "secondary" : "ghost"}
                    className={`w-full justify-start ${activeTab === item.id ? "font-semibold" : ""}`}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {item.label}
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {activeTab === "members" && (
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
        {activeTab === "invitations" && (
          <InvitationsTab
            slug={slug}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        )}
        {activeTab === "billing" && (
          <BillingTab />
        )}
      </div>
    </div>
  );
}

const BillingTab = () => {
  return "Coming Soon!"
}

function useOrgMembers(slug: string) {
  const { data } = api.business.useGet({ keys: [slug], single: true })
  if (!data?.[0]?.members) return []
  return Object.values(data?.[0]?.members).filter(m => typeof m === "object" && !!m.userId)
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
  onInviteMember: (data: any) => void;
  onUpdatePermissions: (id: string, permissions: string[]) => void;
  onRemoveMember: (id: string) => void;
  tabs: PossibleTabConfig[]
  slug: string
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Search members..."
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-[30%]"
          leadingIcon={<Search className="h-4 w-4" />}
        />
        <Button onClick={() => setShowInviteForm(!showInviteForm)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite
        </Button>
      </div>

      {showInviteForm && (
        <div className="border rounded-lg p-4 bg-card">
          <h3 className="text-lg font-medium mb-4">Invite New Member</h3>
          <AutoForm
            schema={z.object({
              email: z.string().email("Invalid email address"),
              permissions: z.record(z.string(), z.boolean()).superRefine(fieldConfig({ fieldType: "permissions", customData: { tabs, slug } })),
            })}
            onSubmit={onInviteMember}
          />
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-card">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Permissions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Joined On
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-200">
            {members.map((member) => (
              <MemberRow
                key={member.userId}
                member={member}
                onUpdatePermissions={onUpdatePermissions}
                onRemoveMember={onRemoveMember}
                searchTerm={searchTerm}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Member Row Component
const MemberRow = ({
  member: { userId, role, permissions, joinedAt },
  onUpdatePermissions,
  onRemoveMember,
  searchTerm,
}: {
  member: Member;
  onUpdatePermissions: (id: string, permissions: string[]) => void;
  onRemoveMember: (id: string) => void;
  searchTerm: string;
}) => {
  const { data } = api.user.useGet({ keys: [userId?.substring(1)], single: true })
  const member = data?.[0]

  if (!member) return null

  if (
    !!searchTerm &&
    (
      !member.name?.toLowerCase().includes(searchTerm.toLowerCase())
      || !member.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ) return null

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <Avatar className="bg-card border-2 border-dashed rounded-xl w-10 h-10">
              <AvatarImage src={member?.avatar} alt={member?.name} className="rounded-xl" />
              <AvatarFallback className="rounded-xl">
                <span>{member?.name?.substring(0, 1)?.toUpperCase() ?? "U"}</span>
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-foreground">{member?.name}</div>
            <div className="text-sm text-muted-foreground">{member?.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Badge variant="secondary" className="rounded-xl">{role}</Badge>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {
          <div className="flex flex-wrap gap-1">
            {
              role === "owner" ?
                "*"
                : permissions && `${Object.keys(permissions).length} Permissions`
            }
          </div>
        }
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
        {joinedAt && new Date(joinedAt).toLocaleString()}
      </td>
    </tr>
  );
};

// Invitations Tab Component
const InvitationsTab = ({
  slug,
  searchTerm,
  setSearchTerm
}: {
  slug: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}) => {
  const invitations = useOrgInvitations(slug);
  const filteredInvitations = invitations.filter(invitation =>
    !searchTerm ||
    invitation.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Search invitations..."
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-[30%]"
          leadingIcon={<Search className="h-4 w-4" />}
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-card">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Permissions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Invited On
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-200">
            {filteredInvitations.map((invitation) => (
              <InvitationRow
                role key={invitation.email}
                invitation={invitation}
                searchTerm={searchTerm}
              />
            ))}
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
  onUpdatePermissions: (id: string, permissions: string[]) => void;

  searchTerm: string;
}) => {
  if (
    !!searchTerm &&
    !email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) return null;

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-foreground">{email}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Badge variant="secondary" className="rounded-xl">{role}</Badge>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-wrap gap-1">
          {role === "owner"
            ? "*"
            : permissions && `${Object.keys(permissions).length} Permissions`}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
        {invitedAt && new Date(invitedAt).toLocaleString()}
      </td>
    </tr>
  );
};

// Hook to get organization invitations
function useOrgInvitations(slug: string) {
  const { data } = api.business.useGet({ keys: [slug], single: true });
  if (!data?.[0]?.invitations) return [];
  return Object.values(data?.[0]?.invitations).filter(inv => typeof inv === "object" && !!inv.email);
}

