"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Star,
  Calendar,
  User,
  Users,
  FileText,
  CalendarDays,
  DollarSign,
  Award,
  Building,
  Handshake,
  TrendingUp,
  PieChart,
  Users2,
} from "lucide-react";
import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

interface Member {
  id: string;
  name: string;
  membershipNumber: string;
  joinDate: string;
  sharesOwned: number;
  position?: string;
  active: boolean;
}

interface Committee {
  id: string;
  name: string;
  description: string;
  chairperson: string;
  members: string[];
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  agenda: string[];
  minutes?: string;
  status: "upcoming" | "completed" | "cancelled";
}

interface FinancialReport {
  id: string;
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  dividendPerShare: number;
}

interface CooperativeClientPageProps {
  slug: string;
}

export function CooperativeClientPage({ slug }: CooperativeClientPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  // Mock data - in a real implementation, this would come from the API
  const cooperativeInfo = {
    name: "Surkhet Valley Cooperative Society",
    tagline: "Democratic cooperative society serving the community",
    description:
      "Democratic cooperative society serving the community of Surkhet Valley with mutual benefit and shared ownership",
    rating: 4.6,
    totalReviews: 156,
    address: "Birendranagar, Surkhet",
    phone: "+977-98XXXXXXXX",
    email: "info@surkhetvalleycoop.com.np",
    hours: "9:00 AM - 5:00 PM (Sun-Fri)",
  };

  const boardMembers: Member[] = [
    {
      id: "1",
      name: "Rajesh K.C.",
      membershipNumber: "CVS-001",
      joinDate: "2020-01-15",
      sharesOwned: 100,
      position: "Chairperson",
      active: true,
    },
    {
      id: "2",
      name: "Sunita Thapa",
      membershipNumber: "CVS-002",
      joinDate: "2020-02-20",
      sharesOwned: 75,
      position: "Vice-Chairperson",
      active: true,
    },
    {
      id: "3",
      name: "Amit Shah",
      membershipNumber: "CVS-003",
      joinDate: "2020-03-10",
      sharesOwned: 50,
      position: "Secretary",
      active: true,
    },
    {
      id: "4",
      name: "Priya Gurung",
      membershipNumber: "CVS-004",
      joinDate: "2020-04-05",
      sharesOwned: 60,
      position: "Treasurer",
      active: true,
    },
  ];

  const committees: Committee[] = [
    {
      id: "1",
      name: "Finance Committee",
      description: "Oversees financial operations and budgeting",
      chairperson: "Amit Shah",
      members: ["Rajesh K.C.", "Sunita Thapa", "Priya Gurung"],
    },
    {
      id: "2",
      name: "Membership Committee",
      description: "Manages member relations and recruitment",
      chairperson: "Sunita Thapa",
      members: ["Rajesh K.C.", "Amit Shah", "Priya Gurung"],
    },
    {
      id: "3",
      name: "Operations Committee",
      description: "Supervises daily operations and services",
      chairperson: "Priya Gurung",
      members: ["Rajesh K.C.", "Sunita Thapa", "Amit Shah"],
    },
  ];

  const meetings: Meeting[] = [
    {
      id: "1",
      title: "Monthly General Meeting",
      date: "2025-09-15",
      time: "10:00 AM",
      agenda: [
        "Review of monthly financial report",
        "Discussion on new member applications",
        "Planning for upcoming community events",
      ],
      status: "upcoming",
    },
    {
      id: "2",
      title: "Annual General Meeting",
      date: "2025-08-20",
      time: "9:00 AM",
      agenda: [
        "Presentation of annual financial report",
        "Election of board members",
        "Approval of annual budget",
        "Discussion on expansion plans",
      ],
      minutes:
        "Meeting concluded successfully with election of new board members and approval of budget.",
      status: "completed",
    },
    {
      id: "3",
      title: "Emergency Board Meeting",
      date: "2025-08-05",
      time: "2:00 PM",
      agenda: [
        "Urgent discussion on water supply issues",
        "Allocation of emergency funds",
        "Coordination with local authorities",
      ],
      minutes:
        "Resolved water supply issues through coordination with local authorities and allocation of emergency funds.",
      status: "completed",
    },
  ];

  const financialReports: FinancialReport[] = [
    {
      id: "1",
      period: "July 2025",
      revenue: 1250000,
      expenses: 850000,
      profit: 400000,
      dividendPerShare: 50,
    },
    {
      id: "2",
      period: "June 2025",
      revenue: 1100000,
      expenses: 780000,
      profit: 320000,
      dividendPerShare: 40,
    },
    {
      id: "3",
      period: "May 2025",
      revenue: 1350000,
      expenses: 920000,
      profit: 430000,
      dividendPerShare: 54,
    },
  ];

  const facilities = [
    { icon: Building, name: "Head Office" },
    { icon: Users, name: "Member Services" },
    { icon: DollarSign, name: "Financial Services" },
    { icon: Handshake, name: "Community Programs" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would connect to the contact system
    alert(
      `Thank you ${name}! Your message has been sent to ${cooperativeInfo.name}.`,
    );
    setName("");
    setEmail("");
    setMessage("");
  };

  // Refs for animations
  const heroRef = useRef(null);
  const boardRef = useRef(null);
  const committeesRef = useRef(null);
  const meetingsRef = useRef(null);
  const financeRef = useRef(null);
  const contactRef = useRef(null);

  const isHeroInView = useInView(heroRef, { once: true, margin: "-100px" });
  const isBoardInView = useInView(boardRef, { once: true, margin: "-100px" });
  const isCommitteesInView = useInView(committeesRef, { once: true, margin: "-100px" });
  const isMeetingsInView = useInView(meetingsRef, { once: true, margin: "-100px" });
  const isFinanceInView = useInView(financeRef, { once: true, margin: "-100px" });
  const isContactInView = useInView(contactRef, { once: true, margin: "-100px" });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden" ref={heroRef}>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70 z-10" />
        <img
          src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200"
          alt="Cooperative Society"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="relative z-20 flex flex-col items-center justify-center min-h-[70vh] px-6 py-20 text-center text-white">
          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 max-w-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {cooperativeInfo.name}
          </motion.h1>
          <motion.p
            className="text-xl md:text-2xl max-w-3xl mb-4 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          >
            {cooperativeInfo.tagline}
          </motion.p>
          <motion.div
            className="flex items-center justify-center mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
          >
            {[...Array(5)].map((_, i) => (
              <Star
                key={`cooperative-rating-star-${i}`}
                className={`w-6 h-6 ${i < Math.floor(cooperativeInfo.rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
                  }`}
              />
            ))}
            <span className="ml-3 text-lg font-medium">{cooperativeInfo.rating} ({cooperativeInfo.totalReviews} reviews)</span>
          </motion.div>
          <motion.p
            className="text-xl md:text-2xl max-w-3xl mb-10 leading-relaxed text-white/90"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
          >
            {cooperativeInfo.description}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.8 }}
          >
            <Button size="lg" className="text-lg px-8 py-6 rounded-full bg-white text-primary hover:bg-white/90 transition-all duration-300 transform hover:scale-105">
              Become a Member
            </Button>
          </motion.div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-32 left-20 w-32 h-32 rounded-full bg-primary/30 blur-2xl" />
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-20">
            {/* Board Members */}
            <section ref={boardRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isBoardInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Board Members
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full" />
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {boardMembers.map((member, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isBoardInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -10 }}
                    className="transition-all duration-300"
                  >
                    <Card className="text-center h-full border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-5">
                        <div className="mx-auto bg-muted rounded-full w-24 h-24 flex items-center justify-center mb-5">
                          <User className="w-12 h-12 text-primary" />
                        </div>
                        <CardTitle className="text-2xl mb-2">{member.name}</CardTitle>
                        <CardDescription className="text-lg">
                          {member.position || "Board Member"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Membership #:</span>
                            <span>{member.membershipNumber}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Joined:</span>
                            <span>{new Date(member.joinDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Shares Owned:</span>
                            <span>{member.sharesOwned}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full py-6 text-lg rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300 transform hover:scale-[1.02]">
                          View Profile
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Committees */}
            <section ref={committeesRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isCommitteesInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Committees
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full" />
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {committees.map((committee, index) => (
                  <motion.div
                    key={committee.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isCommitteesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                    className="transition-all duration-300"
                  >
                    <Card className="h-full border border-border rounded-2xl hover:shadow-lg transition-all duration-300">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl">
                          <Users2 className="w-7 h-7 text-primary" />
                          {committee.name}
                        </CardTitle>
                        <CardDescription className="text-base">{committee.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-5">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Chairperson:</span>
                            <span>{committee.chairperson}</span>
                          </div>
                          <div>
                            <p className="font-medium mb-2">Members:</p>
                            <div className="flex flex-wrap gap-2">
                              {committee.members.map((member, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1.5 text-sm rounded-full bg-primary/10 text-primary"
                                >
                                  {member}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" className="w-full py-6 text-lg rounded-xl border-border hover:bg-primary/10 transition-all duration-300">
                          View Details
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Meetings */}
            <section ref={meetingsRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isMeetingsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Meetings
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full" />
              </motion.h2>
              <div className="space-y-8">
                {meetings.map((meeting, index) => (
                  <motion.div
                    key={meeting.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isMeetingsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                    className="transition-all duration-300"
                  >
                    <Card className="border border-border rounded-2xl hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-5">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="flex items-center gap-3 text-2xl">
                              <Calendar className="w-7 h-7 text-primary" />
                              {meeting.title}
                            </CardTitle>
                            <CardDescription className="text-lg mt-2">
                              {new Date(meeting.date).toLocaleDateString()} at{" "}
                              {meeting.time}
                            </CardDescription>
                          </div>
                          <span
                            className={`px-4 py-2 text-base rounded-full font-bold ${meeting.status === "upcoming"
                              ? "bg-blue-100 text-blue-800"
                              : meeting.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                              }`}
                          >
                            {meeting.status.charAt(0).toUpperCase() +
                              meeting.status.slice(1)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-5">
                          <div>
                            <p className="font-bold text-lg mb-2">Agenda:</p>
                            <ul className="list-disc list-inside space-y-2 text-base">
                              {meeting.agenda.map((item, index) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>
                          {meeting.minutes && (
                            <div>
                              <p className="font-bold text-lg mb-2">Minutes:</p>
                              <p className="text-base">{meeting.minutes}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter>
                        {meeting.status === "upcoming" ? (
                          <Button className="w-full text-lg py-7 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300 transform hover:scale-[1.02]">
                            RSVP for Meeting
                          </Button>
                        ) : (
                          <Button variant="outline" className="w-full text-lg py-7 rounded-xl border-border hover:bg-primary/10 transition-all duration-300">
                            View Meeting Minutes
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Financial Reports */}
            <section ref={financeRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isFinanceInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Financial Reports
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full" />
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {financialReports.map((report, index) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isFinanceInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                    className="transition-all duration-300"
                  >
                    <Card className="border border-border rounded-2xl hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-5">
                        <CardTitle className="text-2xl">{report.period}</CardTitle>
                        <CardDescription className="text-base">Financial Summary</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-5">
                          <div className="flex justify-between items-center">
                            <span className="text-base">Revenue:</span>
                            <span className="font-bold text-base">
                              Rs. {report.revenue.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-base">Expenses:</span>
                            <span className="font-bold text-base">
                              Rs. {report.expenses.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-t pt-3">
                            <span className="text-base">Profit:</span>
                            <span className="font-bold text-green-600 text-base">
                              Rs. {report.profit.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-base">Dividend/Share:</span>
                            <span className="font-bold text-base">
                              Rs. {report.dividendPerShare}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" className="w-full text-lg py-6 rounded-xl border-border hover:bg-primary/10 transition-all duration-300">
                          View Full Report
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Contact Form */}
            <section ref={contactRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isContactInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Get In Touch
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full" />
              </motion.h2>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={isContactInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.6 }}
              >
                <Card className="border border-border rounded-2xl shadow-lg">
                  <CardContent className="pt-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-lg">Name</Label>
                          <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="py-6 text-lg rounded-xl border-border focus:border-primary focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-lg">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="py-6 text-lg rounded-xl border-border focus:border-primary focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message" className="text-lg">Message</Label>
                        <Input
                          id="message"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          required
                          className="py-6 text-lg rounded-xl border-border focus:border-primary focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <Button type="submit" className="w-full text-lg py-7 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300 transform hover:scale-[1.02]">
                        Send Message
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-10">
            {/* Business Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isBoardInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Building className="w-7 h-7 text-primary" />
                    Cooperative Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start">
                    <MapPin className="w-6 h-6 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span className="text-lg">{cooperativeInfo.address}</span>
                  </div>
                  <div className="flex items-start">
                    <Phone className="w-6 h-6 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span className="text-lg">{cooperativeInfo.phone}</span>
                  </div>
                  <div className="flex items-start">
                    <Mail className="w-6 h-6 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span className="text-lg">{cooperativeInfo.email}</span>
                  </div>
                  <div className="flex items-start">
                    <Clock className="w-6 h-6 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span className="text-lg">{cooperativeInfo.hours}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Membership Benefits */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isBoardInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Award className="w-7 h-7 text-primary" />
                    Membership Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-background/50 hover:bg-background/80 transition-all duration-300">
                    <DollarSign className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-lg">Dividend Payments</p>
                      <p className="text-base text-muted-foreground">
                        Annual profit sharing with members
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-background/50 hover:bg-background/80 transition-all duration-300">
                    <Users className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-lg">Democratic Participation</p>
                      <p className="text-base text-muted-foreground">
                        Equal voting rights for all members
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-background/50 hover:bg-background/80 transition-all duration-300">
                    <Award className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-lg">Community Programs</p>
                      <p className="text-base text-muted-foreground">
                        Access to exclusive member programs
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-background/50 hover:bg-background/80 transition-all duration-300">
                    <Building className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-lg">Shared Resources</p>
                      <p className="text-base text-muted-foreground">
                        Access to cooperative facilities and services
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Facilities */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isBoardInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Handshake className="w-7 h-7 text-primary" />
                    Our Facilities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {facilities.map((facility, index) => (
                      <motion.div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-all duration-300"
                        initial={{ opacity: 0, y: 10 }}
                        animate={isBoardInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ x: 5 }}
                      >
                        <facility.icon className="w-6 h-6 text-primary" />
                        <span className="text-base">{facility.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Membership Application */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isBoardInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Handshake className="w-7 h-7 text-primary" />
                    Join Our Cooperative
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <Handshake className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-lg">Become a Member</p>
                      <p className="text-base text-muted-foreground">
                        Apply for membership today
                      </p>
                    </div>
                  </div>
                  <Button className="w-full text-lg py-7 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300 transform hover:scale-[1.02]">
                    <Handshake className="w-5 h-5 mr-3" />
                    Apply Now
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Important Documents */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isBoardInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <FileText className="w-7 h-7 text-primary" />
                    Important Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="link" className="block w-full text-left text-lg py-4 px-4 rounded-xl hover:bg-primary/10 transition-all duration-300">
                    Cooperative Bylaws
                  </Button>
                  <Button variant="link" className="block w-full text-left text-lg py-4 px-4 rounded-xl hover:bg-primary/10 transition-all duration-300">
                    Membership Agreement
                  </Button>
                  <Button variant="link" className="block w-full text-left text-lg py-4 px-4 rounded-xl hover:bg-primary/10 transition-all duration-300">
                    Financial Policies
                  </Button>
                  <Button variant="link" className="block w-full text-left text-lg py-4 px-4 rounded-xl hover:bg-primary/10 transition-all duration-300">
                    Annual Reports
                  </Button>
                  <Button variant="link" className="block w-full text-left text-lg py-4 px-4 rounded-xl hover:bg-primary/10 transition-all duration-300">
                    Meeting Minutes
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
