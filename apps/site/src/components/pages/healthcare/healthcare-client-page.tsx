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
  Stethoscope,
  Heart,
  CalendarDays,
  FileText,
  Award,
  Building,
  CheckCircle,
  ArrowRight,
  PlusCircle,
  MinusCircle,
  ThumbsUp,
  MessageCircle,
  Bookmark,
  Share2,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
  Users,
  TrendingUp,
  PieChart,
  DollarSign,
  CreditCard,
  PiggyBank,
  Shield,
  TrendingDown,
  TrendingUp as TrendingUpIcon,
  BarChart3,
  LineChart,
  Wallet,
  Coins,
  Scale,
  Target,
  CalendarCheck,
  BookOpen,
  Microscope,
  Activity,
  Pill,
  Syringe,
  Thermometer,
  Wind,
  Zap,
  Mountain,
  Leaf,
  Sun,
  Moon,
  Cloud,
  Droplets,
  Eye,
  Ear,
  Bone,
  Brain,
  Baby,
  Female,
  Male,
  Accessibility,
  Settings,
  Bell,
  X,
} from "lucide-react";
import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

interface Service {
  id: string;
  name: string;
  description: string;
  department: string;
  duration: string;
  price?: number;
  features: string[];
  popular?: boolean;
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  experience: string;
  rating: number;
  qualifications: string[];
  avatar: string;
}

interface Department {
  id: string;
  name: string;
  description: string;
  doctorCount: number;
  head: string;
  services: string[];
}

interface HealthcareClientPageProps {
  slug: string;
}

export function HealthcareClientPage({ slug }: HealthcareClientPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [activeFAQ, setActiveFAQ] = useState<string | null>(null);

  // Mock data - in a real implementation, this would come from the API
  const healthcareInfo = {
    name: "Surkhet Valley Medical Center",
    tagline: "Your Trusted Healthcare Partner",
    description:
      "Premier healthcare facility in Surkhet Valley offering comprehensive medical services with experienced professionals",
    rating: 4.9,
    totalReviews: 892,
    address: "Birendranagar, Surkhet",
    phone: "+977-98XXXXXXXX",
    email: "info@surkhetmedicalcenter.com.np",
    hours: "24/7 Emergency Services, 8:00 AM - 8:00 PM (Sun-Fri)",
  };

  const services: Service[] = [
    {
      id: "1",
      name: "General Consultation",
      description:
        "Comprehensive health assessment and diagnosis by experienced physicians",
      department: "General Medicine",
      duration: "30 mins",
      price: 500,
      features: [
        "Initial health assessment",
        "Diagnosis and treatment plan",
        "Follow-up recommendations",
        "Electronic health records",
      ],
    },
    {
      id: "2",
      name: "Dental Care",
      description:
        "Complete dental care including cleaning, filling, and cosmetic dentistry",
      department: "Dentistry",
      duration: "45 mins",
      price: 800,
      features: [
        "Professional cleaning",
        "Cavity detection and filling",
        "Cosmetic procedures",
        "Oral health education",
      ],
      popular: true,
    },
    {
      id: "3",
      name: "Diagnostic Imaging",
      description:
        "Advanced imaging services including X-ray, CT Scan, and MRI",
      department: "Radiology",
      duration: "Varies",
      price: 1500,
      features: [
        "Digital X-ray imaging",
        "CT Scan services",
        "MRI diagnostics",
        "Immediate results delivery",
      ],
    },
    {
      id: "4",
      name: "Laboratory Services",
      description: "Comprehensive pathology testing with quick turnaround time",
      department: "Pathology",
      duration: "Same day",
      price: 1200,
      features: [
        "Blood tests",
        "Urine analysis",
        "Biochemistry panels",
        "Microbiology testing",
      ],
    },
    {
      id: "5",
      name: "Pediatric Care",
      description: "Specialized care for infants, children, and adolescents",
      department: "Pediatrics",
      duration: "45 mins",
      price: 700,
      features: [
        "Child-friendly environment",
        "Vaccination programs",
        "Growth monitoring",
        "Developmental assessments",
      ],
    },
    {
      id: "6",
      name: "Women's Health",
      description: "Comprehensive gynecological and obstetric services",
      department: "Gynecology",
      duration: "60 mins",
      price: 1000,
      features: [
        "Prenatal care",
        "Routine checkups",
        "Family planning",
        "Menopause management",
      ],
    },
  ];

  const doctors: Doctor[] = [
    {
      id: "1",
      name: "Dr. Rajesh K.C.",
      specialization: "General Physician",
      experience: "15+ years",
      rating: 4.9,
      qualifications: ["MBBS", "MD (Internal Medicine)"],
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    },
    {
      id: "2",
      name: "Dr. Sunita Thapa",
      specialization: "Dentist",
      experience: "12+ years",
      rating: 4.8,
      qualifications: ["BDS", "MDS (Orthodontics)"],
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    },
    {
      id: "3",
      name: "Dr. Amit Shah",
      specialization: "Pediatrician",
      experience: "10+ years",
      rating: 5.0,
      qualifications: ["MBBS", "MD (Pediatrics)"],
      avatar: "https://randomuser.me/api/portraits/men/67.jpg",
    },
    {
      id: "4",
      name: "Dr. Priya Gurung",
      specialization: "Gynecologist",
      experience: "8+ years",
      rating: 4.7,
      qualifications: ["MBBS", "MD (Gynecology)"],
      avatar: "https://randomuser.me/api/portraits/women/68.jpg",
    },
    {
      id: "5",
      name: "Dr. Krishna KC",
      specialization: "Cardiologist",
      experience: "18+ years",
      rating: 4.9,
      qualifications: ["MBBS", "MD (Cardiology)", "DM (Interventional)"],
      avatar: "https://randomuser.me/api/portraits/men/72.jpg",
    },
    {
      id: "6",
      name: "Dr. Nisha Thakuri",
      specialization: "Orthopedic Surgeon",
      experience: "14+ years",
      rating: 4.8,
      qualifications: ["MBBS", "MS (Orthopedics)"],
      avatar: "https://randomuser.me/api/portraits/women/56.jpg",
    },
  ];

  const departments: Department[] = [
    {
      id: "1",
      name: "General Medicine",
      description:
        "Primary healthcare services for all age groups with preventive care",
      doctorCount: 8,
      head: "Dr. Rajesh K.C.",
      services: [
        "Routine Checkups",
        "Chronic Disease Management",
        "Preventive Care",
        "Vaccinations",
      ],
    },
    {
      id: "2",
      name: "Dentistry",
      description:
        "Comprehensive dental care including preventive, restorative, and cosmetic treatments",
      doctorCount: 4,
      head: "Dr. Sunita Thapa",
      services: [
        "Teeth Cleaning",
        "Fillings",
        "Root Canal",
        "Cosmetic Dentistry",
      ],
    },
    {
      id: "3",
      name: "Pediatrics",
      description:
        "Specialized care for infants, children, and adolescents with child-friendly environment",
      doctorCount: 3,
      head: "Dr. Amit Shah",
      services: [
        "Well-child Visits",
        "Vaccinations",
        "Growth Monitoring",
        "Behavioral Assessment",
      ],
    },
    {
      id: "4",
      name: "Gynecology & Obstetrics",
      description:
        "Women's health services including prenatal care, childbirth, and reproductive health",
      doctorCount: 3,
      head: "Dr. Priya Gurung",
      services: [
        "Prenatal Care",
        "Childbirth Services",
        "Family Planning",
        "Menopause Management",
      ],
    },
    {
      id: "5",
      name: "Cardiology",
      description:
        "Heart health services including diagnostics, treatment, and prevention",
      doctorCount: 2,
      head: "Dr. Krishna KC",
      services: [
        "Heart Screening",
        "ECG/Echo",
        "Stress Testing",
        "Interventional Procedures",
      ],
    },
    {
      id: "6",
      name: "Orthopedics",
      description:
        "Bone and joint care including diagnostics, treatment, and rehabilitation",
      doctorCount: 2,
      head: "Dr. Nisha Thakuri",
      services: [
        "Fracture Care",
        "Joint Replacement",
        "Sports Injury",
        "Physical Therapy",
      ],
    },
  ];

  const facilities = [
    { icon: Heart, name: "ICU & CCU" },
    { icon: Stethoscope, name: "Emergency Services" },
    { icon: Building, name: "Modern Infrastructure" },
    { icon: Award, name: "Certified Professionals" },
    { icon: Microscope, name: "Advanced Laboratory" },
    { icon: Activity, name: "24/7 Monitoring" },
    { icon: Pill, name: "Pharmacy" },
    { icon: Syringe, name: "Vaccination Center" },
  ];

  const healthResources = [
    { icon: BookOpen, name: "Health Articles" },
    { icon: CalendarDays, name: "Health Calendar" },
    { icon: Award, name: "Health Programs" },
    { icon: Users, name: "Support Groups" },
    { icon: Thermometer, name: "Health Tracker" },
    { icon: Wind, name: "Wellness Tips" },
  ];

  const insurancePartners = [
    { name: "National Insurance" },
    { name: "Life Insurance Corp" },
    { name: "Private Insurance" },
    { name: "MediCare Nepal" },
    { name: "HealthGuard" },
    { name: "Wellness Assurance" },
  ];

  const faqs = [
    {
      id: "1",
      question: "Do you accept insurance?",
      answer: "Yes, we accept most major insurance providers including National Insurance, Life Insurance Corp, and Private Insurance. Please bring your insurance card and ID to your appointment.",
    },
    {
      id: "2",
      question: "What are your operating hours?",
      answer: "We operate from 8:00 AM to 8:00 PM (Sun-Fri) with 24/7 emergency services available. Our emergency department is always staffed with qualified professionals.",
    },
    {
      id: "3",
      question: "How do I book an appointment?",
      answer: "You can book appointments through our website, mobile app, or by calling our front desk at +977-98XXXXXXXX. Same-day appointments are often available.",
    },
    {
      id: "4",
      question: "What should I bring to my first visit?",
      answer: "Please bring a valid ID, insurance card, list of current medications, and any relevant medical records. For specific procedures, additional documentation may be required.",
    },
    {
      id: "5",
      question: "Do you offer telemedicine consultations?",
      answer: "Yes, we offer virtual consultations for follow-up visits and certain conditions. Please contact our front desk to inquire about availability for your specific needs.",
    },
    {
      id: "6",
      question: "What safety measures do you have in place?",
      answer: "We follow strict infection control protocols, maintain clean facilities, and ensure all staff are properly trained in safety procedures. We're committed to providing a safe environment for all patients.",
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would connect to the contact system
    alert(
      `Thank you ${name}! Your message has been sent to ${healthcareInfo.name}.`,
    );
    setName("");
    setEmail("");
    setMessage("");
  };

  // Refs for animations
  const heroRef = useRef(null);
  const departmentsRef = useRef(null);
  const servicesRef = useRef(null);
  const doctorsRef = useRef(null);
  const resourcesRef = useRef(null);
  const faqRef = useRef(null);
  const contactRef = useRef(null);

  const isHeroInView = useInView(heroRef, { once: true, margin: "-100px" });
  const isDepartmentsInView = useInView(departmentsRef, { once: true, margin: "-100px" });
  const isServicesInView = useInView(servicesRef, { once: true, margin: "-100px" });
  const isDoctorsInView = useInView(doctorsRef, { once: true, margin: "-100px" });
  const isResourcesInView = useInView(resourcesRef, { once: true, margin: "-100px" });
  const isFAQInView = useInView(faqRef, { once: true, margin: "-100px" });
  const isContactInView = useInView(contactRef, { once: true, margin: "-100px" });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden" ref={heroRef}>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70 z-10" />
        <img
          src="https://images.unsplash.com/photo-1519494026892-80bb07c5d511?w=1200"
          alt="Healthcare Facility"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="relative z-20 flex flex-col items-center justify-center min-h-[70vh] px-6 py-20 text-center text-white">
          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 max-w-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {healthcareInfo.name}
          </motion.h1>
          <motion.div
            className="flex items-center justify-center mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          >
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={`healthcare-rating-star-${i}`}
                  className={`w-6 h-6 ${
                    i < Math.floor(healthcareInfo.rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="ml-3 text-lg font-medium">
              {healthcareInfo.rating} ({healthcareInfo.totalReviews} reviews)
            </span>
          </motion.div>
          <motion.p
            className="text-xl md:text-2xl max-w-3xl mb-4 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
          >
            {healthcareInfo.tagline}
          </motion.p>
          <motion.p
            className="text-lg md:text-xl max-w-3xl mb-10 leading-relaxed text-white/90"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
          >
            {healthcareInfo.description}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.8 }}
          >
            <Button
              size="lg"
              className="text-lg px-8 py-6 rounded-full bg-white text-primary hover:bg-white/90 transition-all duration-300 transform hover:scale-105"
            >
              Book Appointment Now
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
            {/* Departments */}
            <section ref={departmentsRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isDepartmentsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Our Departments
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full"></span>
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {departments.map((department, index) => (
                  <motion.div
                    key={department.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isDepartmentsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -10 }}
                    className="transition-all duration-300"
                  >
                    <Card className="overflow-hidden h-full border border-border rounded-2xl hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-5">
                        <div className="flex items-center gap-3">
                          <Building className="w-6 h-6 text-primary" />
                          <CardTitle>{department.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="mb-4">
                          {department.description}
                        </CardDescription>
                        <div className="space-y-3">
                          <div className="flex items-center text-sm">
                            <User className="w-4 h-4 mr-2 text-primary" />
                            <span>{department.doctorCount} specialists</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Stethoscope className="w-4 h-4 mr-2 text-primary" />
                            <span>Head: {department.head}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {department.services.slice(0, 3).map((service, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
                              >
                                {service}
                              </span>
                            ))}
                            {department.services.length > 3 && (
                              <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                                +{department.services.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button
                          variant="outline"
                          className="w-full py-5 text-base rounded-xl border-border hover:bg-primary/10 transition-all duration-300"
                        >
                          View Doctors
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Medical Services */}
            <section ref={servicesRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isServicesInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Medical Services
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full"></span>
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {services.map((service, index) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isServicesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                    className="transition-all duration-300"
                  >
                    <Card
                      className={`overflow-hidden h-full border-2 ${
                        service.popular ? "border-primary shadow-xl relative" : "border-border"
                      } rounded-2xl hover:shadow-lg transition-all duration-300`}
                    >
                      {service.popular && (
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold z-10">
                          MOST POPULAR
                        </div>
                      )}
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="flex items-center gap-2 text-2xl">
                              <Stethoscope className="w-6 h-6 text-primary" />
                              {service.name}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {service.department}
                            </CardDescription>
                          </div>
                          {service.price && (
                            <span className="text-xl font-bold text-primary">
                              Rs. {service.price}
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {service.description}
                        </p>
                        <div className="flex items-center text-sm mb-3">
                          <Clock className="w-4 h-4 mr-1 text-primary" />
                          <span>{service.duration}</span>
                        </div>
                        <ul className="space-y-2 mb-4">
                          {service.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start">
                              <CheckCircle className="w-4 h-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <Button
                          className={`w-full py-5 text-base rounded-xl ${
                            service.popular
                              ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                              : "bg-secondary hover:bg-secondary/90"
                          } text-primary-foreground transition-all duration-300 transform hover:scale-[1.02]`}
                          variant={service.popular ? "default" : "secondary"}
                        >
                          Book Appointment
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Featured Doctors */}
            <section ref={doctorsRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isDoctorsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Meet Our Specialists
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full"></span>
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {doctors.map((doctor, index) => (
                  <motion.div
                    key={doctor.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isDoctorsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                    className="transition-all duration-300"
                  >
                    <Card className="text-center h-full border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="mx-auto bg-muted rounded-full w-20 h-20 flex items-center justify-center mb-4 overflow-hidden">
                          <img
                            src={doctor.avatar}
                            alt={doctor.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardTitle className="text-xl">{doctor.name}</CardTitle>
                        <CardDescription>{doctor.specialization}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-center gap-1 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={`doctor-rating-star-${doctor.id}-${i}`}
                              className={`w-4 h-4 ${
                                i < Math.floor(doctor.rating)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                          <span className="text-sm ml-1">{doctor.rating}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {doctor.experience} experience
                        </p>
                        <div className="flex flex-wrap justify-center gap-1">
                          {doctor.qualifications.map((qual, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
                            >
                              {qual}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button
                          variant="outline"
                          className="w-full py-5 text-base rounded-xl border-border hover:bg-primary/10 transition-all duration-300"
                        >
                          View Profile
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Health Resources */}
            <section ref={resourcesRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isResourcesInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Health Resources
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full"></span>
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {healthResources.map((resource, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isResourcesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                    className="transition-all duration-300"
                  >
                    <Card className="text-center h-full border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="mx-auto bg-muted rounded-xl w-16 h-16 flex items-center justify-center mb-4">
                          <resource.icon className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{resource.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <Button
                          variant="outline"
                          className="w-full py-5 text-base rounded-xl border-border hover:bg-primary/10 transition-all duration-300"
                        >
                          Explore
                        </Button>
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
                    <Card className="border border-border rounded-xl overflow-hidden">
                      <CardHeader
                        className="cursor-pointer pb-4"
                        onClick={() => setActiveFAQ(activeFAQ === faq.id ? null : faq.id)}
                      >
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">{faq.question}</CardTitle>
                          <ArrowRight
                            className={`w-5 h-5 transition-transform duration-300 ${
                              activeFAQ === faq.id ? "rotate-90" : ""
                            }`}
                          />
                        </div>
                      </CardHeader>
                      {activeFAQ === faq.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
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
                      <Button
                        type="submit"
                        className="w-full text-lg py-7 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300 transform hover:scale-[1.02]"
                      >
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
              animate={isDepartmentsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Building className="w-7 h-7 text-primary" />
                    Facility Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-start">
                    <MapPin className="w-6 h-6 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span className="text-lg">{healthcareInfo.address}</span>
                  </div>
                  <div className="flex items-start">
                    <Phone className="w-6 h-6 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span className="text-lg">{healthcareInfo.phone}</span>
                  </div>
                  <div className="flex items-start">
                    <Mail className="w-6 h-6 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span className="text-lg">{healthcareInfo.email}</span>
                  </div>
                  <div className="flex items-start">
                    <Clock className="w-6 h-6 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span className="text-lg">{healthcareInfo.hours}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Emergency Services */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isDepartmentsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Heart className="w-7 h-7 text-primary" />
                    Emergency Services
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <span className="font-medium text-red-800 dark:text-red-200">
                        24/7 Emergency
                      </span>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Call immediately for life-threatening emergencies
                    </p>
                    <Button className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white">
                      <Phone className="w-4 h-4 mr-2" />
                      Call Emergency
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm">
                      <span className="font-medium">Ambulance:</span> +977-98XXXXXXXX
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Blood Bank:</span> Available 24/7
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">ICU:</span> 12 beds available
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Facilities */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isDepartmentsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Stethoscope className="w-7 h-7 text-primary" />
                    Our Facilities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {facilities.map((facility, index) => (
                      <motion.div
                        key={index}
                        className="flex items-center gap-2 p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-all duration-300"
                        initial={{ opacity: 0, y: 10 }}
                        animate={isDepartmentsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ x: 5 }}
                      >
                        <facility.icon className="w-5 h-5 text-primary" />
                        <span className="text-base">{facility.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Appointment Booking */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isDepartmentsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Calendar className="w-7 h-7 text-primary" />
                    Book an Appointment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-all duration-300">
                    <CalendarDays className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-base">Schedule a Visit</p>
                      <p className="text-sm text-muted-foreground">
                        Book with our specialists
                      </p>
                    </div>
                  </div>
                  <Button className="w-full py-6 text-base rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300 transform hover:scale-[1.02]">
                    <Calendar className="w-5 h-5 mr-2" />
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Insurance Partners */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isDepartmentsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <FileText className="w-7 h-7 text-primary" />
                    Insurance Partners
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm">
                      We accept major insurance providers:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {insurancePartners.map((partner, index) => (
                        <motion.span
                          key={index}
                          className="px-3 py-1.5 text-sm rounded-full bg-primary/10 text-primary"
                          initial={{ opacity: 0, y: 10 }}
                          animate={isDepartmentsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                          {partner.name}
                        </motion.span>
                      ))}
                    </div>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-sm"
                      onClick={() => alert("Viewing all insurance partners")}
                    >
                      View all partners
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Social Media */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isDepartmentsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
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
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-12 w-12 border-border hover:bg-primary/10 transition-all duration-300"
                      onClick={() => window.open(healthcareInfo.socialLinks.facebook, "_blank")}
                    >
                      <Facebook className="w-5 h-5 text-primary" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-12 w-12 border-border hover:bg-primary/10 transition-all duration-300"
                      onClick={() => window.open(healthcareInfo.socialLinks.twitter, "_blank")}
                    >
                      <Twitter className="w-5 h-5 text-primary" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-12 w-12 border-border hover:bg-primary/10 transition-all duration-300"
                      onClick={() => window.open(healthcareInfo.socialLinks.instagram, "_blank")}
                    >
                      <Instagram className="w-5 h-5 text-primary" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-12 w-12 border-border hover:bg-primary/10 transition-all duration-300"
                      onClick={() => window.open(healthcareInfo.socialLinks.youtube, "_blank")}
                    >
                      <Youtube className="w-5 h-5 text-primary" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-12 w-12 border-border hover:bg-primary/10 transition-all duration-300"
                      onClick={() => window.open(healthcareInfo.socialLinks.linkedin, "_blank")}
                    >
                      <Linkedin className="w-5 h-5 text-primary" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-12 w-12 border-border hover:bg-primary/10 transition-all duration-300"
                      onClick={() => window.open(`mailto:${healthcareInfo.email}`, "_blank")}
                    >
                      <Mail className="w-5 h-5 text-primary" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Health Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isDepartmentsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Heart className="w-7 h-7 text-primary" />
                    Health Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-all duration-300">
                    <Heart className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Stay Hydrated</p>
                      <p className="text-xs text-muted-foreground">
                        Drink at least 8 glasses of water daily
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-all duration-300">
                    <Activity className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Regular Exercise</p>
                      <p className="text-xs text-muted-foreground">
                        Aim for 30 minutes of activity daily
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-all duration-300">
                    <Leaf className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Balanced Diet</p>
                      <p className="text-xs text-muted-foreground">
                        Eat fruits and vegetables daily
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-sm w-full text-center"
                    onClick={() => alert("Viewing all health tips")}
                  >
                    View All Tips
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
