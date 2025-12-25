import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Settings,
  CreditCard,
  Search, Trash2,
  UserPlus
} from "lucide-react";
import { AutoForm } from "../autoform";
import { z } from "zod";
import { api } from "@/lib/api";
import type { BusinessMember } from "@/lib/schema";
import { Avatar, AvatarImage, AvatarFallback } from "../avatar";

// Define the schema for member invitations
const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  permissions: z.array(z.string()).min(1, "At least one permission is required"),
});

// Define the schema for member permissions
const memberPermissionsSchema = z.object({
  permissions: z.array(z.string()).min(1, "At least one permission is required"),
});

// Types for our data
type Member = BusinessMember;

// Permissions options for the form
const permissionOptions = [
  { label: "Read", value: "read" },
  { label: "Write", value: "write" },
  { label: "Delete", value: "delete" },
  { label: "Manage Members", value: "manage_members" },
  { label: "Billing", value: "billing" },
  { label: "Admin", value: "admin" }
];

interface ManageOrganizationProps {
}

export function ManageOrganization({ }: ManageOrganizationProps) {
  const [activeTab, setActiveTab] = useState("members");
  const [searchTerm, setSearchTerm] = useState("");
  const members = useOrgMembers()
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Filter members based on search term
  const filteredMembers = members.filter(member =>
    true
    // member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    // member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle inviting a new member
  const handleInviteMember = (data: any) => {
    console.log("Inviting member:", data);
    // In a real app, this would make an API call
    setShowInviteForm(false);
  };

  // Handle updating member permissions
  const handleUpdatePermissions = (memberId: string, permissions: string[]) => {
    console.log(`Updating permissions for member ${memberId}:`, permissions);
    // In a real app, this would make an API call
    setMembers(prevMembers =>
      prevMembers.map(member =>
        member.id === memberId ? { ...member, permissions } : member
      )
    );
  };

  // Handle removing a member
  const handleRemoveMember = (memberId: string) => {
    console.log(`Removing member with ID: ${memberId}`);
    // In a real app, this would make an API call
    setMembers(prevMembers => prevMembers.filter(member => member.id !== memberId));
  };

  const navigationItems = [
    { id: "members", label: "Members", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
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
            members={filteredMembers}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            showInviteForm={showInviteForm}
            setShowInviteForm={setShowInviteForm}
            onInviteMember={handleInviteMember}
            onUpdatePermissions={handleUpdatePermissions}
            onRemoveMember={handleRemoveMember}
          />
        )}
        {activeTab === "settings" && (
          <SettingsTab />
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

function useOrgMembers() {
  const { data } = api.business.useGet({ keys: ["orgstore"], single: true })
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
  onRemoveMember
}: {
  members: Member[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showInviteForm: boolean;
  setShowInviteForm: (show: boolean) => void;
  onInviteMember: (data: any) => void;
  onUpdatePermissions: (id: string, permissions: string[]) => void;
  onRemoveMember: (id: string) => void;
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Search members..."
          // value={searchTerm}
          // onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 w-[30%]"
          leadingIcon={<Search className="h-4 w-4" />}
        />
        <Button onClick={() => setShowInviteForm(!showInviteForm)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {showInviteForm && (
        <div className="border rounded-lg p-4 bg-card">
          <h3 className="text-lg font-medium mb-4">Invite New Member</h3>
          <AutoForm
            schema={inviteMemberSchema}
            onSubmit={onInviteMember}
            fieldConfig={{
              email: {
                label: "Email Address",
                placeholder: "Enter member's email"
              },
              permissions: {
                label: "Permissions",
                description: "Select the permissions to grant to this member",
                fieldType: "select",
                options: permissionOptions
              }
            }}
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
                Joined
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
  onRemoveMember
}: {
  member: Member;
  onUpdatePermissions: (id: string, permissions: string[]) => void;
  onRemoveMember: (id: string) => void;
}) => {
  const [editingPermissions, setEditingPermissions] = useState(false);
  const { data } = api.user.useGet({ keys: [userId?.substring(1)], single: true })
  const member = data?.[0]

  if (!member) return null

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <Avatar className="bg-card border-2 border-dashed rounded-xl w-10 h-10">
              <AvatarImage src={member?.avatar} alt={member?.name} />
              <AvatarFallback>
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
        <div className="text-sm text-foreground">{role}</div>
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

// Settings Tab Component
const SettingsTab = () => {
  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Business Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="businessName">Business Name</Label>
            <Input id="businessName" defaultValue="SuperSurkhet" />
          </div>
          <div>
            <Label htmlFor="businessEmail">Business Email</Label>
            <Input id="businessEmail" type="email" defaultValue="contact@supersurkhet.com" />
          </div>
          <div>
            <Label htmlFor="businessPhone">Business Phone</Label>
            <Input id="businessPhone" defaultValue="+977-1234567890" />
          </div>
          <div>
            <Label htmlFor="businessAddress">Business Address</Label>
            <Input id="businessAddress" defaultValue="Surkhet, Nepal" />
          </div>
        </div>
        <Button className="mt-4">Save Changes</Button>
      </div>
    </div>
  );
};

