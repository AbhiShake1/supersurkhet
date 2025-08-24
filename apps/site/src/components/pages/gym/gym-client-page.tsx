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
  Clock,
  Dumbbell,
  Mail,
  MapPin,
  Phone,
  Star,
  User,
  Check,
  ArrowRight,
} from "lucide-react";
import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  duration: string;
  features: string[];
  popular?: boolean;
}

interface ClassSchedule {
  id: string;
  name: string;
  trainer: string;
  time: string;
  duration: string;
  level: string;
  spotsLeft: number;
  color: string;
}

interface Trainer {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  rating: number;
}

interface GymClientPageProps {
  slug: string;
}

export function GymClientPage({ slug }: GymClientPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("monday");

  // Mock data - in a real implementation, this would come from the API
  const gymInfo = {
    name: "FitLife Gym",
    tagline: "Transform Your Body, Transform Your Life",
    description:
      "State-of-the-art fitness center in the heart of Surkhet with expert trainers and premium equipment",
    rating: 4.8,
    totalReviews: 128,
    address: "Birendranagar, Surkhet",
    phone: "+977-98XXXXXXXX",
    email: "info@fitlifegym.com",
    hours: "5:00 AM - 10:00 PM Daily",
  };

  const membershipPlans: MembershipPlan[] = [
    {
      id: "1",
      name: "Starter",
      price: 1500,
      duration: "per month",
      features: [
        "Access to gym facilities",
        "Basic equipment usage",
        "Locker room access",
        "Free fitness assessment",
      ],
    },
    {
      id: "2",
      name: "Performance",
      price: 3500,
      duration: "per month",
      features: [
        "All Starter features",
        "Group classes access",
        "1 Personal training session/week",
        "Nutrition plan",
        "Towel service",
      ],
      popular: true,
    },
    {
      id: "3",
      name: "Elite",
      price: 6000,
      duration: "per month",
      features: [
        "All Performance features",
        "Unlimited personal training",
        "Spa access",
        "Priority booking",
        "Guest passes (4/month)",
        "24/7 access",
      ],
    },
  ];

  const weeklySchedule = {
    monday: [
      { id: "1", name: "Morning Yoga", trainer: "Sunita Thapa", time: "6:00 AM", duration: "60 mins", level: "Beginner", spotsLeft: 8, color: "bg-green-500" },
      { id: "2", name: "HIIT Workout", trainer: "Rajesh KC", time: "7:00 AM", duration: "45 mins", level: "Intermediate", spotsLeft: 5, color: "bg-red-500" },
      { id: "3", name: "Strength Training", trainer: "Amit Shah", time: "5:00 PM", duration: "90 mins", level: "Advanced", spotsLeft: 3, color: "bg-blue-500" },
    ],
    tuesday: [
      { id: "4", name: "Evening Zumba", trainer: "Priya Gurung", time: "6:30 PM", duration: "60 mins", level: "All Levels", spotsLeft: 12, color: "bg-purple-500" },
      { id: "5", name: "Pilates Core", trainer: "Sunita Thapa", time: "8:00 AM", duration: "50 mins", level: "Intermediate", spotsLeft: 6, color: "bg-pink-500" },
    ],
    wednesday: [
      { id: "6", name: "Cardio Blast", trainer: "Rajesh KC", time: "6:00 AM", duration: "45 mins", level: "All Levels", spotsLeft: 10, color: "bg-orange-500" },
      { id: "7", name: "Powerlifting", trainer: "Amit Shah", time: "4:00 PM", duration: "75 mins", level: "Advanced", spotsLeft: 4, color: "bg-indigo-500" },
    ],
  };

  const trainers: Trainer[] = [
    {
      id: "1",
      name: "Sunita Thapa",
      specialty: "Yoga & Pilates",
      experience: "8 years",
      rating: 4.9,
    },
    {
      id: "2",
      name: "Rajesh KC",
      specialty: "HIIT & Cardio",
      experience: "6 years",
      rating: 4.8,
    },
    {
      id: "3",
      name: "Amit Shah",
      specialty: "Strength Training",
      experience: "10 years",
      rating: 5.0,
    },
    {
      id: "4",
      name: "Priya Gurung",
      specialty: "Dance Fitness",
      experience: "5 years",
      rating: 4.7,
    },
  ];

  const equipment = [
    { name: "Treadmills", count: 10, brand: "Technogym" },
    { name: "Ellipticals", count: 5, brand: "Life Fitness" },
    { name: "Weight Machines", count: 20, brand: "Hammer Strength" },
    { name: "Free Weights", count: 15, brand: "Rogue" },
    { name: "Rowing Machines", count: 4, brand: "Concept2" },
    { name: "Stationary Bikes", count: 8, brand: "Peloton" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would connect to the contact system
    alert(`Thank you ${name}! Your message has been sent to ${gymInfo.name}.`);
    setName("");
    setEmail("");
    setMessage("");
  };

  // Refs for animations
  const heroRef = useRef(null);
  const membershipRef = useRef(null);
  const scheduleRef = useRef(null);
  const trainersRef = useRef(null);
  const equipmentRef = useRef(null);
  const contactRef = useRef(null);
  
  const isHeroInView = useInView(heroRef, { once: true, margin: "-100px" });
  const isMembershipInView = useInView(membershipRef, { once: true, margin: "-100px" });
  const isScheduleInView = useInView(scheduleRef, { once: true, margin: "-100px" });
  const isTrainersInView = useInView(trainersRef, { once: true, margin: "-100px" });
  const isEquipmentInView = useInView(equipmentRef, { once: true, margin: "-100px" });
  const isContactInView = useInView(contactRef, { once: true, margin: "-100px" });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden" ref={heroRef}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/40 z-10" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920')] bg-cover bg-center" />
        <div className="relative z-20 flex flex-col items-center justify-center min-h-[80vh] px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl"
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-white">
              {gymInfo.name}
            </h1>
            <p className="text-xl md:text-2xl mb-4 text-white/90 font-medium">
              {gymInfo.tagline}
            </p>
            <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 text-white/80">
              {gymInfo.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={`gym-rating-star-${i}`}
                    className={`w-5 h-5 ${
                      i < Math.floor(gymInfo.rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-white/30"
                    }`}
                  />
                ))}
                <span className="ml-2 text-white font-medium">{gymInfo.rating}</span>
                <span className="mx-2 text-white/50">•</span>
                <span className="text-white/80">{gymInfo.totalReviews} reviews</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 py-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 transform hover:scale-105">
                Start Your Free Trial
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 rounded-full border-white text-white hover:bg-white/10 transition-all duration-300">
                Book a Tour
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {/* Membership Plans */}
        <section className="mb-24" ref={membershipRef}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isMembershipInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Membership Plans</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the perfect plan to achieve your fitness goals
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {membershipPlans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={isMembershipInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="h-full"
              >
                <Card className={`overflow-hidden h-full border-2 ${plan.popular ? 'border-primary shadow-xl relative' : 'border-border'} rounded-2xl`}>
                  {plan.popular && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold z-10">
                      MOST POPULAR
                    </div>
                  )}
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl text-center">{plan.name}</CardTitle>
                    <div className="text-center mt-2">
                      <span className="text-4xl font-bold text-primary">Rs. {plan.price}</span>
                      <span className="text-muted-foreground">/{plan.duration}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <Check className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className={`w-full py-6 text-lg rounded-xl ${plan.popular ? 'bg-primary hover:bg-primary/90' : 'bg-secondary hover:bg-secondary/90'}`}
                      variant={plan.popular ? "default" : "secondary"}
                    >
                      Get Started
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Class Schedule */}
        <section className="mb-24" ref={scheduleRef}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isScheduleInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Class Schedule</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find the perfect class to match your fitness level and schedule
            </p>
          </motion.div>
          
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap gap-2 mb-8 justify-center">
              {['monday', 'tuesday', 'wednesday'].map((day) => (
                <Button
                  key={day}
                  variant={activeTab === day ? "default" : "outline"}
                  onClick={() => setActiveTab(day)}
                  className="rounded-full capitalize"
                >
                  {day}
                </Button>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {weeklySchedule[activeTab as keyof typeof weeklySchedule]?.map((classItem, index) => (
                <motion.div
                  key={classItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isScheduleInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden h-full border border-border rounded-2xl hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl flex items-center">
                            <span className={`w-3 h-3 rounded-full ${classItem.color} mr-2`} />
                            {classItem.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            with {classItem.trainer}
                          </CardDescription>
                        </div>
                        <span className="px-2 py-1 text-xs rounded-full bg-muted">
                          {classItem.level}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center text-muted-foreground">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>
                            {classItem.time} • {classItem.duration}
                          </span>
                        </div>
                        <span className={`font-bold ${classItem.spotsLeft > 5 ? 'text-green-600' : classItem.spotsLeft > 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {classItem.spotsLeft} spots
                        </span>
                      </div>
                      <Button className="w-full">
                        Book Class <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Trainers */}
        <section className="mb-24" ref={trainersRef}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isTrainersInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet Our Trainers</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Certified professionals dedicated to helping you achieve your fitness goals
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {trainers.map((trainer, index) => (
              <motion.div
                key={trainer.id}
                initial={{ opacity: 0, y: 30 }}
                animate={isTrainersInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="overflow-hidden h-full text-center border border-border rounded-2xl hover:shadow-lg transition-all duration-300">
                  <div className="bg-muted h-48 flex items-center justify-center">
                    <User className="w-24 h-24 text-muted-foreground" />
                  </div>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl">{trainer.name}</CardTitle>
                    <CardDescription>{trainer.specialty}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="flex items-center justify-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={`trainer-rating-${trainer.id}-${i}`}
                          className={`w-4 h-4 ${
                            i < Math.floor(trainer.rating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                      <span className="ml-1 text-sm">{trainer.rating}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{trainer.experience} experience</p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      View Profile
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Equipment */}
        <section className="mb-24" ref={equipmentRef}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isEquipmentInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Premium Equipment</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              State-of-the-art machines and free weights from leading brands
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {equipment.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 30 }}
                animate={isEquipmentInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="overflow-hidden h-full border border-border rounded-2xl hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-center">
                      <Dumbbell className="w-8 h-8 text-primary mr-3" />
                      <div>
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <CardDescription>{item.brand}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{item.count} units available</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section ref={contactRef}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={isContactInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Get In Touch</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Have questions? Our team is here to help you start your fitness journey.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <MapPin className="w-6 h-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg">Location</h3>
                    <p className="text-muted-foreground">{gymInfo.address}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Phone className="w-6 h-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg">Phone</h3>
                    <p className="text-muted-foreground">{gymInfo.phone}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Mail className="w-6 h-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg">Email</h3>
                    <p className="text-muted-foreground">{gymInfo.email}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Clock className="w-6 h-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg">Hours</h3>
                    <p className="text-muted-foreground">{gymInfo.hours}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-10 p-6 bg-muted rounded-2xl">
                <h3 className="font-semibold text-lg mb-3">Ready to Get Started?</h3>
                <p className="text-muted-foreground mb-4">Schedule a free consultation with one of our trainers.</p>
                <Button className="w-full py-6">
                  Book Free Consultation
                </Button>
              </div>
            </motion.div>
            
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isContactInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Send Us a Message</CardTitle>
                  <CardDescription>
                    We'll get back to you within 24 hours
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="py-5 text-base rounded-xl"
                          placeholder="Your full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="py-5 text-base rounded-xl"
                          placeholder="your.email@example.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Input
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        className="py-5 text-base rounded-xl"
                        placeholder="How can we help you?"
                      />
                    </div>
                    <Button type="submit" className="w-full py-6 text-lg rounded-xl">
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}