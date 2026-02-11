'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Users,
  User,
  Calendar,
  DollarSign,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdminComponent } from '@/components/ui/admin';

interface Member {
  id: string;
  name: string;
  membershipNumber: string;
  joinDate: string;
  sharesOwned: number;
  position?: string;
  email: string;
  phone: string;
  address: string;
  active: boolean;
}

interface Committee {
  id: string;
  name: string;
  description: string;
  chairperson: string;
  members: string[];
  active: boolean;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  agenda: string[];
  minutes?: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  active: boolean;
}

interface FinancialReport {
  id: string;
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  dividendPerShare: number;
  active: boolean;
}

const mockMembers: Member[] = [
  {
    id: '1',
    name: 'Rajesh K.C.',
    membershipNumber: 'CVS-001',
    joinDate: '2020-01-15',
    sharesOwned: 100,
    position: 'Chairperson',
    email: 'rajesh@example.com',
    phone: '+977-98XXXXXXXX',
    address: 'Birendranagar, Surkhet',
    active: true,
  },
  {
    id: '2',
    name: 'Sunita Thapa',
    membershipNumber: 'CVS-002',
    joinDate: '2020-02-20',
    sharesOwned: 75,
    position: 'Vice-Chairperson',
    email: 'sunita@example.com',
    phone: '+977-98XXXXXXXX',
    address: 'Birendranagar, Surkhet',
    active: true,
  },
  {
    id: '3',
    name: 'Amit Shah',
    membershipNumber: 'CVS-003',
    joinDate: '2020-03-10',
    sharesOwned: 50,
    position: 'Secretary',
    email: 'amit@example.com',
    phone: '+977-98XXXXXXXX',
    address: 'Birendranagar, Surkhet',
    active: false,
  },
  {
    id: '4',
    name: 'Priya Gurung',
    membershipNumber: 'CVS-004',
    joinDate: '2020-04-05',
    sharesOwned: 60,
    position: 'Treasurer',
    email: 'priya@example.com',
    phone: '+977-98XXXXXXXX',
    address: 'Birendranagar, Surkhet',
    active: true,
  },
];

const mockCommittees: Committee[] = [
  {
    id: '1',
    name: 'Finance Committee',
    description: 'Oversees financial operations and budgeting',
    chairperson: 'Amit Shah',
    members: ['Rajesh K.C.', 'Sunita Thapa', 'Priya Gurung'],
    active: true,
  },
  {
    id: '2',
    name: 'Membership Committee',
    description: 'Manages member relations and recruitment',
    chairperson: 'Sunita Thapa',
    members: ['Rajesh K.C.', 'Amit Shah', 'Priya Gurung'],
    active: true,
  },
  {
    id: '3',
    name: 'Operations Committee',
    description: 'Supervises daily operations and services',
    chairperson: 'Priya Gurung',
    members: ['Rajesh K.C.', 'Sunita Thapa', 'Amit Shah'],
    active: false,
  },
];

const mockMeetings: Meeting[] = [
  {
    id: '1',
    title: 'Monthly General Meeting',
    date: '2025-09-15',
    time: '10:00 AM',
    agenda: [
      'Review of monthly financial report',
      'Discussion on new member applications',
      'Planning for upcoming community events',
    ],
    status: 'upcoming',
    active: true,
  },
  {
    id: '2',
    title: 'Annual General Meeting',
    date: '2025-08-20',
    time: '9:00 AM',
    agenda: [
      'Presentation of annual financial report',
      'Election of board members',
      'Approval of annual budget',
      'Discussion on expansion plans',
    ],
    minutes:
      'Meeting concluded successfully with election of new board members and approval of budget.',
    status: 'completed',
    active: true,
  },
  {
    id: '3',
    title: 'Emergency Board Meeting',
    date: '2025-08-05',
    time: '2:00 PM',
    agenda: [
      'Urgent discussion on water supply issues',
      'Allocation of emergency funds',
      'Coordination with local authorities',
    ],
    minutes:
      'Resolved water supply issues through coordination with local authorities and allocation of emergency funds.',
    status: 'completed',
    active: false,
  },
];

const mockFinancialReports: FinancialReport[] = [
  {
    id: '1',
    period: 'July 2025',
    revenue: 1250000,
    expenses: 850000,
    profit: 400000,
    dividendPerShare: 50,
    active: true,
  },
  {
    id: '2',
    period: 'June 2025',
    revenue: 1100000,
    expenses: 780000,
    profit: 320000,
    dividendPerShare: 40,
    active: true,
  },
  {
    id: '3',
    period: 'May 2025',
    revenue: 1350000,
    expenses: 920000,
    profit: 430000,
    dividendPerShare: 54,
    active: false,
  },
];

export const CooperativeManagement: AdminComponent = () => {
  return (
    <_CooperativeManagement
      members={mockMembers}
      committees={mockCommittees}
      meetings={mockMeetings}
      financialReports={mockFinancialReports}
      onAddMember={() => {}}
      onAddCommittee={() => {}}
      onAddMeeting={() => {}}
      onAddFinancialReport={() => {}}
    />
  );
};

interface CooperativeManagementProps {
  onAddMember: () => void;
  onAddCommittee: () => void;
  onAddMeeting: () => void;
  onAddFinancialReport: () => void;
  members: Member[];
  committees: Committee[];
  meetings: Meeting[];
  financialReports: FinancialReport[];
}

function _CooperativeManagement({
  onAddMember,
  onAddCommittee,
  onAddMeeting,
  onAddFinancialReport,
  members,
  committees,
  meetings,
  financialReports,
}: CooperativeManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('members');

  const filteredMembers = members.filter((member) => {
    return (
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.membershipNumber
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery) ||
      member.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredCommittees = committees.filter((committee) => {
    return (
      committee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      committee.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      committee.chairperson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      committee.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredMeetings = meetings.filter((meeting) => {
    return (
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.date.includes(searchQuery) ||
      meeting.time.includes(searchQuery) ||
      meeting.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredFinancialReports = financialReports.filter((report) => {
    return (
      report.period.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const toggleMemberActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Member ${active ? 'activated' : 'deactivated'}`);
  };

  const toggleCommitteeActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Committee ${active ? 'activated' : 'deactivated'}`);
  };

  const toggleMeetingActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Meeting ${active ? 'activated' : 'deactivated'}`);
  };

  const toggleFinancialReportActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Financial report ${active ? 'activated' : 'deactivated'}`);
  };

  const deleteMember = (_id: string) => {
    // In a real implementation, this would delete the member from GunDB
    toast.success('Member removed');
  };

  const deleteCommittee = (_id: string) => {
    // In a real implementation, this would delete the committee from GunDB
    toast.success('Committee removed');
  };

  const deleteMeeting = (_id: string) => {
    // In a real implementation, this would delete the meeting from GunDB
    toast.success('Meeting removed');
  };

  const deleteFinancialReport = (_id: string) => {
    // In a real implementation, this would delete the financial report from GunDB
    toast.success('Financial report removed');
  };

  const updateMeetingStatus = (_id: string, status: Meeting['status']) => {
    // In a real implementation, this would update the meeting status in GunDB
    toast.success(`Meeting ${status}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Cooperative Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your cooperative members, committees, meetings, and finances
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onAddMember} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
          <Button onClick={onAddCommittee} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Committee
          </Button>
          <Button onClick={onAddMeeting} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Meeting
          </Button>
          <Button onClick={onAddFinancialReport} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Financial Report
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active Members
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {members.filter((m) => m.active).length}
                </p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active Committees
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {committees.filter((c) => c.active).length}
                </p>
              </div>
              <User className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upcoming Meetings
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {meetings.filter((m) => m.status === 'upcoming').length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Financial Reports
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {financialReports.filter((f) => f.active).length}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search members, committees, meetings, or financial reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs for Members, Committees, Meetings, and Financial Reports */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger
            value="members"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <Users className="w-4 h-4" />
            <span className="truncate">Members</span>
          </TabsTrigger>
          <TabsTrigger
            value="committees"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <User className="w-4 h-4" />
            <span className="truncate">Committees</span>
          </TabsTrigger>
          <TabsTrigger
            value="meetings"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <Calendar className="w-4 h-4" />
            <span className="truncate">Meetings</span>
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <DollarSign className="w-4 h-4" />
            <span className="truncate">Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMembers.map((member) => (
              <Card
                key={member.id}
                className={`${!member.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="bg-muted rounded-full w-10 h-10 flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {member.name}
                        </CardTitle>
                        <CardDescription>
                          {member.membershipNumber}
                        </CardDescription>
                        <p className="text-sm text-muted-foreground mt-1">
                          Joined:{' '}
                          {new Date(member.joinDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Shares: {member.sharesOwned}
                        </p>
                        {member.position && (
                          <p className="text-sm font-medium text-primary mt-1">
                            {member.position}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={member.active}
                        onCheckedChange={() =>
                          toggleMemberActive(member.id, !member.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {member.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMember(member.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No members found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new member
              </p>
              <Button onClick={onAddMember}>
                <Plus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="committees" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCommittees.map((committee) => (
              <Card
                key={committee.id}
                className={`${!committee.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="bg-muted rounded-full w-10 h-10 flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {committee.name}
                        </CardTitle>
                        <CardDescription>
                          {committee.description}
                        </CardDescription>
                        <p className="text-sm text-muted-foreground mt-1">
                          Chairperson: {committee.chairperson}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Members: {committee.members.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={committee.active}
                        onCheckedChange={() =>
                          toggleCommitteeActive(committee.id, !committee.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {committee.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCommittee(committee.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCommittees.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No committees found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new committee
              </p>
              <Button onClick={onAddCommittee}>
                <Plus className="w-4 h-4 mr-2" />
                Add Committee
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="meetings" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMeetings.map((meeting) => (
              <Card
                key={meeting.id}
                className={`${!meeting.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="bg-muted rounded-full w-10 h-10 flex items-center justify-center">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {meeting.title}
                        </CardTitle>
                        <CardDescription>
                          {new Date(meeting.date).toLocaleDateString()} at{' '}
                          {meeting.time}
                        </CardDescription>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {meeting.agenda.join(', ')}
                        </p>
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                            meeting.status === 'upcoming'
                              ? 'bg-blue-100 text-blue-800'
                              : meeting.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {meeting.status.charAt(0).toUpperCase() +
                            meeting.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={meeting.active}
                        onCheckedChange={() =>
                          toggleMeetingActive(meeting.id, !meeting.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {meeting.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {meeting.status === 'upcoming' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateMeetingStatus(meeting.id, 'completed')
                          }
                          className="text-green-600 hover:text-green-700"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMeeting(meeting.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredMeetings.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No meetings found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new meeting
              </p>
              <Button onClick={onAddMeeting}>
                <Plus className="w-4 h-4 mr-2" />
                Add Meeting
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredFinancialReports.map((report) => (
              <Card
                key={report.id}
                className={`${!report.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="bg-muted rounded-full w-10 h-10 flex items-center justify-center">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          {report.period}
                        </CardTitle>
                        <CardDescription>Financial Report</CardDescription>
                        <div className="flex justify-between mt-2">
                          <span className="text-lg font-bold text-green-600">
                            Profit: Rs. {report.profit.toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Dividend: Rs. {report.dividendPerShare}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={report.active}
                        onCheckedChange={() =>
                          toggleFinancialReportActive(report.id, !report.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {report.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFinancialReport(report.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredFinancialReports.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No financial reports found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new financial report
              </p>
              <Button onClick={onAddFinancialReport}>
                <Plus className="w-4 h-4 mr-2" />
                Add Financial Report
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
