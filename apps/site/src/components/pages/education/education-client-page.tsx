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
  BookOpen,
  GraduationCap,
  Users,
  CalendarDays,
  TrendingUp,
  Award,
  Building,
  Handshake,
  FileText,
  School,
  Briefcase,
  Brain,
  Globe,
  Music,
  Palette,
  Microscope,
  Laptop,
  Dumbbell,
  Utensils,
  Theater,
  CheckCircle,
  ArrowRight,
  Search,
  Filter,
  Book,
  Library,
  Flask,
  Monitor,
  Smartphone,
  Tablet,
  Tv,
  Speaker,
  Headphones,
  Camera,
  Video,
  Image,
  Film,
  Radio,
  Gamepad,
  Coffee,
  Apple,
  Banana,
  Cherry,
  Grape,
  Lemon,
  Orange,
  Pear,
  Pineapple,
  Strawberry,
  Watermelon,
  Heart,
  Share2,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
  X,
} from "lucide-react";
import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

interface Course {
  id: string;
  name: string;
  description: string;
  duration: string;
  fees: number;
  instructor: string;
  category: string;
  popular?: boolean;
  imageUrl?: string;
  features: string[];
}

interface Instructor {
  id: string;
  name: string;
  qualification: string;
  experience: string;
  rating: number;
  specialization: string;
  avatar?: string;
  certifications: string[];
}

interface EducationClientPageProps {
  slug: string;
}

export function EducationClientPage({ slug }: EducationClientPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [activeFAQ, setActiveFAQ] = useState<string | null>(null);

  // Mock data - in a real implementation, this would come from the API
  const institutionInfo = {
    name: "Surkhet Valley Academy",
    tagline: "Premier Educational Institution in Surkhet Valley",
    description:
      "Premier educational institution in Surkhet Valley offering quality education and holistic development for students of all ages",
    rating: 4.8,
    totalReviews: 512,
    address: "Birendranagar, Surkhet",
    phone: "+977-98XXXXXXXX",
    email: "info@surkhetvalleyacademy.edu.np",
    hours: "7:00 AM - 5:00 PM (Sun-Fri)",
    establishmentYear: "2005",
    studentCount: "2,500+",
    facultyCount: "120+",
    graduationRate: "95%",
  };

  const courses: Course[] = [
    {
      id: "1",
      name: "Bachelor of Science (BSc)",
      description:
        "Comprehensive science program covering physics, chemistry, and mathematics with laboratory practice",
      duration: "4 Years",
      fees: 120000,
      instructor: "Dr. Rajesh K.C.",
      category: "Science",
      popular: true,
      imageUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400",
      features: [
        "Laboratory Practice",
        "Research Projects",
        "Industry Internships",
        "Career Guidance",
      ],
    },
    {
      id: "2",
      name: "Bachelor of Arts (BA)",
      description:
        "Liberal arts program focusing on humanities, social sciences, and literature with critical thinking emphasis",
      duration: "4 Years",
      fees: 100000,
      instructor: "Prof. Sunita Thapa",
      category: "Arts",
      imageUrl: "https://images.unsplash.com/photo-1498908912083-4b912b91cc71?w=400",
      features: [
        "Critical Thinking",
        "Communication Skills",
        "Cultural Studies",
        "Creative Writing",
      ],
    },
    {
      id: "3",
      name: "Master of Business Administration (MBA)",
      description:
        "Advanced business management program with focus on entrepreneurship, leadership, and strategic planning",
      duration: "2 Years",
      fees: 200000,
      instructor: "Dr. Amit Shah",
      category: "Business",
      popular: true,
      imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400",
      features: [
        "Leadership Training",
        "Strategic Planning",
        "Entrepreneurship",
        "Global Perspective",
      ],
    },
    {
      id: "4",
      name: "Computer Science Engineering",
      description:
        "Modern computer science program covering programming, algorithms, software development, and emerging technologies",
      duration: "4 Years",
      fees: 150000,
      instructor: "Er. Priya Gurung",
      category: "Technology",
      imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400",
      features: [
        "Programming Languages",
        "Software Development",
        "AI & Machine Learning",
        "Cloud Computing",
      ],
    },
    {
      id: "5",
      name: "Bachelor of Commerce (BCom)",
      description:
        "Commerce program focusing on accounting, economics, and business principles with practical applications",
      duration: "3 Years",
      fees: 90000,
      instructor: "CA. Krishna KC",
      category: "Commerce",
      imageUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400",
      features: [
        "Accounting Principles",
        "Economics Fundamentals",
        "Business Law",
        "Financial Analysis",
      ],
    },
    {
      id: "6",
      name: "Diploma in Nursing",
      description:
        "Professional nursing program with clinical training and healthcare management skills",
      duration: "3 Years",
      fees: 110000,
      instructor: "Nurse Sunita Basnet",
      category: "Healthcare",
      popular: true,
      imageUrl: "https://images.unsplash.com/photo-1519494026892-80bb07c5d511?w=400",
      features: [
        "Clinical Training",
        "Patient Care",
        "Healthcare Management",
        "Emergency Response",
      ],
    },
  ];

  const instructors: Instructor[] = [
    {
      id: "1",
      name: "Dr. Rajesh K.C.",
      qualification: "Ph.D. in Physics",
      experience: "15+ years",
      rating: 4.9,
      specialization: "Physics & Mathematics",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
      certifications: ["PhD Physics", "MSc Mathematics", "BSc Physics"],
    },
    {
      id: "2",
      name: "Prof. Sunita Thapa",
      qualification: "M.A. in Literature",
      experience: "12+ years",
      rating: 4.8,
      specialization: "Literature & Humanities",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
      certifications: ["MA Literature", "BA English", "TESOL Certified"],
    },
    {
      id: "3",
      name: "Dr. Amit Shah",
      qualification: "MBA, Ph.D. in Management",
      experience: "18+ years",
      rating: 5.0,
      specialization: "Business Management",
      avatar: "https://randomuser.me/api/portraits/men/67.jpg",
      certifications: ["PhD Management", "MBA", "PMP Certified"],
    },
    {
      id: "4",
      name: "Er. Priya Gurung",
      qualification: "B.E. Computer Engineering",
      experience: "10+ years",
      rating: 4.7,
      specialization: "Computer Science",
      avatar: "https://randomuser.me/api/portraits/women/68.jpg",
      certifications: ["BE Computer", "AWS Certified", "Google Developer"],
    },
    {
      id: "5",
      name: "CA. Krishna KC",
      qualification: "Chartered Accountant",
      experience: "14+ years",
      rating: 4.8,
      specialization: "Accounting & Finance",
      avatar: "https://randomuser.me/api/portraits/men/72.jpg",
      certifications: ["Chartered Accountant", "CFA Level 1", "FRM Certified"],
    },
    {
      id: "6",
      name: "Nurse Sunita Basnet",
      qualification: "B.Sc. Nursing, Post Basic B.Sc.",
      experience: "20+ years",
      rating: 4.9,
      specialization: "Nursing & Healthcare",
      avatar: "https://randomuser.me/api/portraits/women/56.jpg",
      certifications: ["BSc Nursing", "Post Basic BSc", "Emergency Care"],
    },
  ];

  const facilities = [
    { icon: BookOpen, name: "Well-stocked Library" },
    { icon: Users, name: "Modern Laboratories" },
    { icon: CalendarDays, name: "Flexible Schedule" },
    { icon: GraduationCap, name: "Career Counseling" },
    { icon: Building, name: "Smart Classrooms" },
    { icon: Laptop, name: "Computer Labs" },
    { icon: Dumbbell, name: "Sports Facilities" },
    { icon: Utensils, name: "Cafeteria" },
    { icon: Library, name: "Digital Library" },
    { icon: Flask, name: "Research Labs" },
    { icon: Monitor, name: "Multimedia Rooms" },
    { icon: Smartphone, name: "Tech Support" },
  ];

  const extracurriculars = [
    { icon: Music, name: "Music & Dance" },
    { icon: Palette, name: "Fine Arts" },
    { icon: Theater, name: "Drama Club" },
    { icon: Microscope, name: "Science Club" },
    { icon: Globe, name: "Debate Society" },
    { icon: Laptop, name: "Coding Club" },
    { icon: Brain, name: "Mathematics Olympiad" },
    { icon: Briefcase, name: "Entrepreneurship Cell" },
    { icon: Camera, name: "Photography Club" },
    { icon: Video, name: "Film Making" },
    { icon: Gamepad, name: "Gaming Club" },
    { icon: Coffee, name: "Literary Society" },
  ];

  const achievements = [
    { icon: Award, title: "Best Educational Institution", year: "2023" },
    { icon: Trophy, title: "Academic Excellence Award", year: "2022" },
    { icon: Star, title: "Student Satisfaction Award", year: "2021" },
    { icon: Medal, title: "Innovation in Teaching", year: "2020" },
  ];

  const faqs = [
    {
      id: "1",
      question: "What are the admission requirements?",
      answer: "Admission requirements vary by program. Generally, we require academic transcripts, recommendation letters, and an entrance exam. Specific requirements are available on our admissions page.",
    },
    {
      id: "2",
      question: "Do you offer scholarships?",
      answer: "Yes, we offer merit-based and need-based scholarships. Students can apply during the admission process or after enrollment based on academic performance.",
    },
    {
      id: "3",
      question: "What is the faculty-student ratio?",
      answer: "Our faculty-student ratio is 1:15, ensuring personalized attention and mentorship for each student.",
    },
    {
      id: "4",
      question: "Are campus tours available?",
      answer: "Yes, we offer guided campus tours every Saturday and Sunday. You can also schedule a private tour by contacting our admissions office.",
    },
    {
      id: "5",
      question: "What career support services do you provide?",
      answer: "We offer comprehensive career counseling, internship placement assistance, job fairs, alumni networking events, and resume-building workshops.",
    },
    {
      id: "6",
      question: "Do you have hostel facilities?",
      answer: "Yes, we provide safe and comfortable hostel accommodations for both male and female students with 24/7 security and modern amenities.",
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would connect to the contact system
    alert(
      `Thank you ${name}! Your message has been sent to ${institutionInfo.name}.`,
    );
    setName("");
    setEmail("");
    setMessage("");
  };

  // Filter courses based on search term and active tab
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === "all" || course.category.toLowerCase() === activeTab.toLowerCase() || 
                      (activeTab === "popular" && course.popular);
    
    return matchesSearch && matchesTab;
  });

  // Get unique categories for tabs
  const categories = ["all", "popular", ...Array.from(new Set(courses.map(course => course.category)))];

  // Refs for animations
  const heroRef = useRef(null);
  const coursesRef = useRef(null);
  const instructorsRef = useRef(null);
  const admissionRef = useRef(null);
  const achievementsRef = useRef(null);
  const faqRef = useRef(null);
  const contactRef = useRef(null);
  
  const isHeroInView = useInView(heroRef, { once: true, margin: "-100px" });
  const isCoursesInView = useInView(coursesRef, { once: true, margin: "-100px" });
  const isInstructorsInView = useInView(instructorsRef, { once: true, margin: "-100px" });
  const isAdmissionInView = useInView(admissionRef, { once: true, margin: "-100px" });
  const isAchievementsInView = useInView(achievementsRef, { once: true, margin: "-100px" });
  const isFAQInView = useInView(faqRef, { once: true, margin: "-100px" });
  const isContactInView = useInView(contactRef, { once: true, margin: "-100px" });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden" ref={heroRef}>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70 z-10" />
        <img
          src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1200"
          alt="Educational Institution"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="relative z-20 flex flex-col items-center justify-center min-h-[70vh] px-6 py-20 text-center text-white">
          <motion.h1 
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 max-w-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {institutionInfo.name}
          </motion.h1>
          <motion.div 
            className="flex items-center justify-center mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          >
            {[...Array(5)].map((_, i) => (
              <Star
                key={`institution-rating-star-${i}`}
                className={`w-6 h-6 ${
                  i < Math.floor(institutionInfo.rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
            <span className="ml-3 text-lg font-medium">{institutionInfo.rating} ({institutionInfo.totalReviews} reviews)</span>
          </motion.div>
          <motion.p 
            className="text-xl md:text-2xl max-w-3xl mb-4 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
          >
            {institutionInfo.tagline}
          </motion.p>
          <motion.p 
            className="text-lg md:text-xl max-w-3xl mb-10 leading-relaxed text-white/90"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
          >
            {institutionInfo.description}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.8 }}
          >
            <Button size="lg" className="text-lg px-8 py-6 rounded-full bg-white text-primary hover:bg-white/90 transition-all duration-300 transform hover:scale-105">
              Explore Programs
            </Button>
          </motion.div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-40 h-40 rounded-full bg-white/10 blur-2xl"></div>
        <div className="absolute bottom-32 left-20 w-32 h-32 rounded-full bg-primary/30 blur-2xl"></div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-20">
            {/* Courses/Programs */}
            <section ref={coursesRef}>
              <motion.h2 
                className="text-3xl md:text-4xl font-bold mb-8 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isCoursesInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Our Programs
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full"></span>
              </motion.h2>
              
              {/* Search and Filter */}
              <motion.div
                className="flex flex-col md:flex-row gap-4 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={isCoursesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search programs..."
                    className="pl-10 py-6 text-lg rounded-xl border-border focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={activeTab === category ? "default" : "outline"}
                      onClick={() => setActiveTab(category)}
                      className={`rounded-full whitespace-nowrap ${
                        activeTab === category 
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                          : "border-border hover:bg-primary/10"
                      }`}
                    >
                      {category === "all" ? "All Programs" : 
                       category === "popular" ? "Popular" : 
                       category}
                    </Button>
                  ))}
                </div>
              </motion.div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredCourses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isCoursesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -10 }}
                    className="transition-all duration-300"
                  >
                    <Card className={`overflow-hidden h-full border-2 ${course.popular ? 'border-primary shadow-xl relative' : 'border-border'} rounded-2xl hover:shadow-lg transition-all duration-300`}>
                      {course.popular && (
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold z-10">
                          MOST POPULAR
                        </div>
                      )}
                      <div className="relative">
                        <img
                          src={course.imageUrl}
                          alt={course.name}
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold flex items-center shadow-lg">
                          <GraduationCap className="w-4 h-4 mr-1" />
                          {course.category}
                        </div>
                      </div>
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="flex items-center gap-3 text-2xl">
                              <Book className="w-6 h-6 text-primary" />
                              {course.name}
                            </CardTitle>
                            <CardDescription className="text-base mt-2">
                              {course.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="space-y-4">
                          <div className="flex items-center text-sm">
                            <Clock className="w-4 h-4 mr-1 text-primary" />
                            <span>Duration: {course.duration}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <User className="w-4 h-4 mr-1 text-primary" />
                            <span>Instructor: {course.instructor}</span>
                          </div>
                          <div className="flex items-center justify-between mt-4">
                            <p className="text-3xl font-bold text-primary">
                              Rs. {course.fees.toLocaleString()}
                            </p>
                            <span className="text-base text-muted-foreground">
                              per year
                            </span>
                          </div>
                          <div className="space-y-2">
                            <p className="font-medium text-sm">Key Features:</p>
                            <div className="flex flex-wrap gap-2">
                              {course.features.map((feature, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
                                >
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className={`w-full py-6 text-lg rounded-xl ${course.popular ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70' : 'bg-secondary hover:bg-secondary/90'} text-primary-foreground transition-all duration-300 transform hover:scale-[1.02]`}>
                          Enroll Now
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Instructors/Faculty */}
            <section ref={instructorsRef}>
              <motion.h2 
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isInstructorsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Meet Our Faculty
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full"></span>
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {instructors.map((instructor, index) => (
                  <motion.div
                    key={instructor.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInstructorsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                    className="transition-all duration-300"
                  >
                    <Card className="text-center h-full border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="mx-auto bg-muted rounded-full w-20 h-20 flex items-center justify-center mb-4 overflow-hidden">
                          <img
                            src={instructor.avatar}
                            alt={instructor.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardTitle className="text-xl">{instructor.name}</CardTitle>
                        <CardDescription>
                          {instructor.specialization}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-center gap-1 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={`instructor-rating-star-${instructor.id}-${i}`}
                              className={`w-4 h-4 ${
                                i < Math.floor(instructor.rating)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                          <span className="text-sm ml-1">{instructor.rating}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {instructor.experience} experience
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">
                          {instructor.qualification}
                        </p>
                        <div className="flex flex-wrap justify-center gap-1">
                          {instructor.certifications.map((cert, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
                            >
                              {cert}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" className="w-full py-5 text-base rounded-xl border-border hover:bg-primary/10 transition-all duration-300">
                          View Profile
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Admission Process */}
            <section ref={admissionRef}>
              <motion.h2 
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isAdmissionInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Admission Process
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full"></span>
              </motion.h2>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={isAdmissionInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.6 }}
              >
                <Card className="border border-border rounded-2xl shadow-lg">
                  <CardContent className="pt-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <motion.div
                        className="text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={isAdmissionInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                      >
                        <div className="mx-auto bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                          <span className="text-2xl font-bold text-primary">1</span>
                        </div>
                        <h3 className="font-bold text-lg mb-2">Apply Online</h3>
                        <p className="text-sm text-muted-foreground">
                          Fill application form
                        </p>
                      </motion.div>
                      <motion.div
                        className="text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={isAdmissionInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                      >
                        <div className="mx-auto bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                          <span className="text-2xl font-bold text-primary">2</span>
                        </div>
                        <h3 className="font-bold text-lg mb-2">Submit Documents</h3>
                        <p className="text-sm text-muted-foreground">
                          Upload required files
                        </p>
                      </motion.div>
                      <motion.div
                        className="text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={isAdmissionInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                      >
                        <div className="mx-auto bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                          <span className="text-2xl font-bold text-primary">3</span>
                        </div>
                        <h3 className="font-bold text-lg mb-2">Entrance Exam</h3>
                        <p className="text-sm text-muted-foreground">
                          Appear for test/interview
                        </p>
                      </motion.div>
                      <motion.div
                        className="text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={isAdmissionInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                      >
                        <div className="mx-auto bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                          <span className="text-2xl font-bold text-primary">4</span>
                        </div>
                        <h3 className="font-bold text-lg mb-2">Admission Confirmation</h3>
                        <p className="text-sm text-muted-foreground">
                          Receive offer letter
                        </p>
                      </motion.div>
                    </div>
                    <div className="mt-10">
                      <Button className="w-full text-lg py-7 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300 transform hover:scale-[1.02]">
                        Start Application
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </section>

            {/* Achievements */}
            <section ref={achievementsRef}>
              <motion.h2 
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isAchievementsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Our Achievements
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full"></span>
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.title}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isAchievementsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                    className="transition-all duration-300"
                  >
                    <Card className="text-center h-full border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="mx-auto bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                          <achievement.icon className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-xl">{achievement.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Awarded in {achievement.year}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section ref={faqRef}>
              <motion.h2 
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isFAQInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Frequently Asked Questions
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full"></span>
              </motion.h2>
              <div className="max-w-3xl mx-auto space-y-4">
                {faqs.map((faq, index) => (
                  <motion.div
                    key={faq.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isFAQInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card 
                      className="border border-border rounded-xl overflow-hidden cursor-pointer"
                      onClick={() => setActiveFAQ(activeFAQ === faq.id ? null : faq.id)}
                    >
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">{faq.question}</CardTitle>
                          <ArrowRight 
                            className={`w-5 h-5 transition-transform duration-300 ${activeFAQ === faq.id ? 'rotate-90' : ''}`} 
                          />
                        </div>
                      </CardHeader>
                      {activeFAQ === faq.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <CardContent className="pt-0">
                            <p className="text-muted-foreground">{faq.answer}</p>
                          </CardContent>
                        </motion.div>
                      )}
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
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full"></span>
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
            {/* Institution Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isCoursesInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <School className="w-7 h-7 text-primary" />
                    Institution Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-start">
                    <MapPin className="w-6 h-6 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span>{institutionInfo.address}</span>
                  </div>
                  <div className="flex items-start">
                    <Phone className="w-6 h-6 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span>{institutionInfo.phone}</span>
                  </div>
                  <div className="flex items-start">
                    <Mail className="w-6 h-6 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span>{institutionInfo.email}</span>
                  </div>
                  <div className="flex items-start">
                    <Clock className="w-6 h-6 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span>{institutionInfo.hours}</span>
                  </div>
                  <div className="flex items-start">
                    <Calendar className="w-6 h-6 mr-4 mt-1 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-medium">Established:</p>
                      <p>{institutionInfo.establishmentYear}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{institutionInfo.studentCount}</p>
                      <p className="text-sm text-muted-foreground">Students</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{institutionInfo.facultyCount}</p>
                      <p className="text-sm text-muted-foreground">Faculty</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{institutionInfo.graduationRate}</p>
                      <p className="text-sm text-muted-foreground">Grad Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Facilities */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isCoursesInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Building className="w-7 h-7 text-primary" />
                    Facilities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {facilities.map((facility, index) => (
                      <motion.div
                        key={index}
                        className="flex items-center gap-2 p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-all duration-300"
                        initial={{ opacity: 0, y: 10 }}
                        animate={isCoursesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ x: 5 }}
                      >
                        <facility.icon className="w-5 h-5 text-primary" />
                        <span>{facility.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Extracurricular Activities */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isCoursesInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Palette className="w-7 h-7 text-primary" />
                    Extracurricular
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {extracurriculars.map((activity, index) => (
                      <motion.div
                        key={index}
                        className="flex items-center gap-2 p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-all duration-300"
                        initial={{ opacity: 0, y: 10 }}
                        animate={isCoursesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ x: 5 }}
                      >
                        <activity.icon className="w-5 h-5 text-primary" />
                        <span className="text-base">{activity.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Academic Calendar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isCoursesInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Calendar className="w-7 h-7 text-primary" />
                    Academic Calendar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-base">Admission Opens</span>
                    <span className="font-bold text-base">Jan 1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base">Last Date to Apply</span>
                    <span className="font-bold text-base">May 30</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base">Entrance Exam</span>
                    <span className="font-bold text-base">Jun 15</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base">Result Declaration</span>
                    <span className="font-bold text-base">Jul 10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base">Classes Begin</span>
                    <span className="font-bold text-base">Aug 1</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full py-5 text-lg rounded-xl border-border hover:bg-primary/10 transition-all duration-300">
                    Download Calendar
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>

            {/* Quick Links */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isCoursesInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Handshake className="w-7 h-7 text-primary" />
                    Quick Links
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="link" className="block w-full text-left text-lg py-4 px-4 rounded-xl hover:bg-primary/10 transition-all duration-300">
                    Download Prospectus
                  </Button>
                  <Button variant="link" className="block w-full text-left text-lg py-4 px-4 rounded-xl hover:bg-primary/10 transition-all duration-300">
                    View Syllabus
                  </Button>
                  <Button variant="link" className="block w-full text-left text-lg py-4 px-4 rounded-xl hover:bg-primary/10 transition-all duration-300">
                    Scholarships
                  </Button>
                  <Button variant="link" className="block w-full text-left text-lg py-4 px-4 rounded-xl hover:bg-primary/10 transition-all duration-300">
                    Campus Tour
                  </Button>
                  <Button variant="link" className="block w-full text-left text-lg py-4 px-4 rounded-xl hover:bg-primary/10 transition-all duration-300">
                    Alumni Network
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Social Media */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isCoursesInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Users className="w-7 h-7 text-primary" />
                    Connect With Us
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <Button variant="outline" size="icon" className="rounded-full h-12 w-12 border-border hover:bg-primary/10 transition-all duration-300">
                      <Facebook className="w-5 h-5 text-primary" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full h-12 w-12 border-border hover:bg-primary/10 transition-all duration-300">
                      <Twitter className="w-5 h-5 text-primary" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full h-12 w-12 border-border hover:bg-primary/10 transition-all duration-300">
                      <Instagram className="w-5 h-5 text-primary" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full h-12 w-12 border-border hover:bg-primary/10 transition-all duration-300">
                      <Youtube className="w-5 h-5 text-primary" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full h-12 w-12 border-border hover:bg-primary/10 transition-all duration-300">
                      <Linkedin className="w-5 h-5 text-primary" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full h-12 w-12 border-border hover:bg-primary/10 transition-all duration-300">
                      <Mail className="w-5 h-5 text-primary" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      <style>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}