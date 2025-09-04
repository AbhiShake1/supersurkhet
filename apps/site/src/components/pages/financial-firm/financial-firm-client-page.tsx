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
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  Calculator,
  CheckCircle,
  Coins,
  DollarSign,
  PieChart,
  PiggyBank,
  PlusCircle,
  Scale,
  Search,
  Shield,
  Star,
  Target,
  TrendingUp as TrendingUpIcon,
  Wallet
} from "lucide-react";
import { useRef, useState } from "react";

interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  features: string[];
  popular?: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  riskLevel: "Low" | "Medium" | "High";
  minimumInvestment: number;
  returns: string;
  category: string;
  features: string[];
  popular?: boolean;
}

interface Advisor {
  id: string;
  name: string;
  specialization: string;
  experience: string;
  rating: number;
  certifications: string[];
  avatar?: string;
}

interface FinancialReport {
  id: string;
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  dividendPerShare: number;
}

interface FinancialFirmClientPageProps {
  slug: string;
}

export function FinancialFirmClientPage({
  slug,
}: FinancialFirmClientPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFAQ, setActiveFAQ] = useState<string | null>(null);

  // Mock data - in a real implementation, this would come from the API
  const firmInfo = {
    name: "Surkhet Financial Services",
    tagline: "Your Trusted Partner for Financial Solutions",
    description:
      "Comprehensive financial solutions for individuals and businesses in Surkhet Valley with personalized advisory services",
    rating: 4.9,
    totalReviews: 89,
    address: "Birendranagar, Surkhet",
    phone: "+977-98XXXXXXXX",
    email: "info@surkhetfinancial.com",
    hours: "9:00 AM - 5:00 PM (Sun-Fri)",
    establishmentYear: "2010",
    clientCount: "5,000+",
    assetsManaged: "Rs. 2.5B+",
  };

  const services: Service[] = [
    {
      id: "1",
      name: "Investment Advisory",
      description:
        "Personalized investment strategies tailored to your financial goals and risk tolerance",
      icon: "📈",
      features: [
        "Portfolio Analysis",
        "Risk Assessment",
        "Asset Allocation",
        "Performance Monitoring",
      ],
      popular: true,
    },
    {
      id: "2",
      name: "Insurance Planning",
      description:
        "Comprehensive insurance solutions to protect your assets and family's future",
      icon: "🛡️",
      features: [
        "Life Insurance",
        "Health Coverage",
        "Property Protection",
        "Risk Evaluation",
      ],
    },
    {
      id: "3",
      name: "Retirement Planning",
      description: "Strategic planning for a secure and comfortable retirement",
      icon: "🌅",
      features: [
        "Pension Planning",
        "Annuity Selection",
        "Estate Planning",
        "Tax Optimization",
      ],
      popular: true,
    },
    {
      id: "4",
      name: "Tax Planning",
      description: "Optimize your tax strategy to maximize savings and ensure compliance",
      icon: "📋",
      features: [
        "Tax Compliance",
        "Savings Strategies",
        "Filing Assistance",
        "Audit Support",
      ],
    },
    {
      id: "5",
      name: "Wealth Management",
      description:
        "Holistic approach to managing and growing your wealth across asset classes",
      icon: "💰",
      features: [
        "Asset Management",
        "Estate Planning",
        "Philanthropy",
        "Legacy Planning",
      ],
      popular: true,
    },
    {
      id: "6",
      name: "Business Advisory",
      description:
        "Financial guidance for businesses to optimize operations and growth strategies",
      icon: "🏢",
      features: [
        "Financial Strategy",
        "Cash Flow Management",
        "Growth Planning",
        "Risk Mitigation",
      ],
    },
  ];

  const products: Product[] = [
    {
      id: "1",
      name: "Mutual Funds",
      description:
        "Diversified investment options with professional fund management across sectors",
      riskLevel: "Medium",
      minimumInvestment: 5000,
      returns: "8-12% annually",
      category: "Investment",
      features: [
        "Professional Management",
        "Sector Diversification",
        "Liquidity",
        "Tax Benefits",
      ],
      popular: true,
    },
    {
      id: "2",
      name: "Fixed Deposits",
      description:
        "Secure investment with guaranteed returns and flexible tenure options",
      riskLevel: "Low",
      minimumInvestment: 1000,
      returns: "6-8% annually",
      category: "Savings",
      features: [
        "Guaranteed Returns",
        "Flexible Tenure",
        "Easy Withdrawal",
        "Nominee Facility",
      ],
    },
    {
      id: "3",
      name: "Life Insurance",
      description:
        "Comprehensive life coverage with additional benefits for you and your family",
      riskLevel: "Low",
      minimumInvestment: 2000,
      returns: "Guaranteed + Bonuses",
      category: "Insurance",
      features: [
        "Death Benefit",
        "Maturity Benefit",
        "Tax Exemption",
        "Loan Facility",
      ],
      popular: true,
    },
    {
      id: "4",
      name: "Stock Portfolio",
      description:
        "High-growth potential with active portfolio management by expert advisors",
      riskLevel: "High",
      minimumInvestment: 10000,
      returns: "12-18% annually",
      category: "Investment",
      features: [
        "Active Management",
        "Sector Expertise",
        "Risk Monitoring",
        "Regular Updates",
      ],
    },
    {
      id: "5",
      name: "Real Estate Investment",
      description:
        "Direct investment in premium real estate properties with rental income",
      riskLevel: "Medium",
      minimumInvestment: 500000,
      returns: "10-15% annually",
      category: "Investment",
      features: [
        "Property Selection",
        "Rental Income",
        "Capital Appreciation",
        "Legal Support",
      ],
    },
    {
      id: "6",
      name: "Gold Investment",
      description:
        "Precious metals investment as hedge against inflation and market volatility",
      riskLevel: "Low",
      minimumInvestment: 10000,
      returns: "6-10% annually",
      category: "Savings",
      features: [
        "Inflation Hedge",
        "Liquidity",
        "Safe Haven Asset",
        "Easy Storage",
      ],
    },
  ];

  const advisors: Advisor[] = [
    {
      id: "1",
      name: "Rajesh K.C.",
      specialization: "Investment Advisory",
      experience: "15+ years",
      rating: 4.9,
      certifications: ["CFA Charterholder", "FRM Certified"],
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    },
    {
      id: "2",
      name: "Sunita Thapa",
      specialization: "Insurance Planning",
      experience: "12+ years",
      rating: 4.8,
      certifications: ["Life Insurance Advisor", "Health Insurance Specialist"],
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    },
    {
      id: "3",
      name: "Amit Shah",
      specialization: "Retirement Planning",
      experience: "18+ years",
      rating: 5.0,
      certifications: ["Retirement Planning Expert", "Estate Planner"],
      avatar: "https://randomuser.me/api/portraits/men/67.jpg",
    },
    {
      id: "4",
      name: "Priya Gurung",
      specialization: "Tax Planning",
      experience: "14+ years",
      rating: 4.7,
      certifications: ["Tax Consultant", "Chartered Accountant"],
      avatar: "https://randomuser.me/api/portraits/women/68.jpg",
    },
    {
      id: "5",
      name: "Krishna KC",
      specialization: "Wealth Management",
      experience: "20+ years",
      rating: 4.9,
      certifications: ["Certified Wealth Manager", "Financial Planner"],
      avatar: "https://randomuser.me/api/portraits/men/72.jpg",
    },
    {
      id: "6",
      name: "Nisha Thakuri",
      specialization: "Business Advisory",
      experience: "16+ years",
      rating: 4.8,
      certifications: ["MBA", "Business Consultant", "CPA"],
      avatar: "https://randomuser.me/api/portraits/women/56.jpg",
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

  const marketInsights = [
    { icon: TrendingUpIcon, title: "Market Update", content: "Nepal Stock Exchange up 2.3%" },
    { icon: DollarSign, title: "Interest Rates", content: "Fixed deposit rates at 8.5%" },
    { icon: Target, title: "Investment Tips", content: "Diversification strategies for 2025" },
    { icon: Wallet, title: "Currency News", content: "NPR strengthens against USD" },
    { icon: Coins, title: "Crypto Watch", content: "Bitcoin stabilizes at $42K" },
    { icon: Scale, title: "Regulatory Update", content: "New tax laws for investments" },
  ];

  const faqs = [
    {
      id: "1",
      question: "What investment options do you offer?",
      answer: "We offer a wide range of investment options including mutual funds, stocks, fixed deposits, real estate, and gold investments. Each option comes with different risk levels and expected returns to suit your financial goals.",
    },
    {
      id: "2",
      question: "How do you determine the right investment strategy for me?",
      answer: "Our certified advisors conduct a comprehensive assessment of your financial situation, risk tolerance, investment timeline, and goals to create a personalized strategy that maximizes returns while managing risk appropriately.",
    },
    {
      id: "3",
      question: "What are your fees and charges?",
      answer: "Our fees are transparent and competitive. We charge a nominal percentage of assets under management, with discounts available for larger portfolios. Specific fees depend on the services selected.",
    },
    {
      id: "4",
      question: "How often will I receive updates on my investments?",
      answer: "You'll receive monthly performance reports and can schedule quarterly review meetings with your advisor. Emergency updates are provided immediately for significant market events affecting your portfolio.",
    },
    {
      id: "5",
      question: "Do you provide services for NRNs (Non-Resident Nepalis)?",
      answer: "Yes, we have specialized services for NRNs including NRE/NRO account management, foreign investment guidance, and repatriation assistance compliant with RBI and Nepal Rastra Bank regulations.",
    },
    {
      id: "6",
      question: "Can you help with tax planning and compliance?",
      answer: "Absolutely. Our tax consultants provide comprehensive services including tax optimization strategies, filing assistance, audit support, and compliance with both Nepal and international tax laws where applicable.",
    },
  ];

  const financialTools = [
    { icon: Calculator, name: "Investment Calculator", description: "Estimate potential returns" },
    { icon: TrendingUpIcon, name: "Returns Estimator", description: "Project growth over time" },
    { icon: Shield, name: "Insurance Planner", description: "Determine coverage needs" },
    { icon: PiggyBank, name: "Savings Goal Tracker", description: "Monitor progress toward goals" },
    { icon: PieChart, name: "Portfolio Analyzer", description: "Evaluate asset allocation" },
    { icon: Wallet, name: "Retirement Planner", description: "Calculate retirement needs" },
    { icon: Scale, name: "Risk Assessment", description: "Determine risk tolerance" },
    { icon: Target, name: "Financial Goal Setter", description: "Set and track objectives" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would connect to the contact system
    alert(
      `Thank you ${name}! Your message has been sent to ${firmInfo.name}.`,
    );
    setName("");
    setEmail("");
    setMessage("");
  };

  // Filter products based on search term and active tab
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab = activeTab === "all" || product.category.toLowerCase() === activeTab.toLowerCase() ||
      (activeTab === "popular" && product.popular);

    return matchesSearch && matchesTab;
  });

  // Get unique categories for tabs
  const categories = ["all", "popular", ...Array.from(new Set(products.map(product => product.category)))];

  // Refs for animations
  const heroRef = useRef(null);
  const servicesRef = useRef(null);
  const productsRef = useRef(null);
  const advisorsRef = useRef(null);
  const reportsRef = useRef(null);
  const insightsRef = useRef(null);
  const toolsRef = useRef(null);
  const faqRef = useRef(null);
  const contactRef = useRef(null);

  const isHeroInView = useInView(heroRef, { once: true, margin: "-100px" });
  const isServicesInView = useInView(servicesRef, { once: true, margin: "-100px" });
  const isProductsInView = useInView(productsRef, { once: true, margin: "-100px" });
  const isAdvisorsInView = useInView(advisorsRef, { once: true, margin: "-100px" });
  const isReportsInView = useInView(reportsRef, { once: true, margin: "-100px" });
  const isInsightsInView = useInView(insightsRef, { once: true, margin: "-100px" });
  const isToolsInView = useInView(toolsRef, { once: true, margin: "-100px" });
  const isFAQInView = useInView(faqRef, { once: true, margin: "-100px" });
  const isContactInView = useInView(contactRef, { once: true, margin: "-100px" });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden" ref={heroRef}>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70 z-10" />
        <img
          src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200"
          alt="Financial Firm"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="relative z-20 flex flex-col items-center justify-center min-h-[70vh] px-6 py-20 text-center text-white">
          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 max-w-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {firmInfo.name}
          </motion.h1>
          <motion.div
            className="flex items-center justify-center mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          >
            {[...Array(5)].map((_, i) => (
              <Star
                key={`financial-firm-rating-star-${i}`}
                className={`w-6 h-6 ${i < Math.floor(firmInfo.rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
                  }`}
              />
            ))}
            <span className="ml-3 text-lg font-medium">
              {firmInfo.rating} ({firmInfo.totalReviews} reviews)
            </span>
          </motion.div>
          <motion.p
            className="text-xl md:text-2xl max-w-3xl mb-4 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
          >
            {firmInfo.tagline}
          </motion.p>
          <motion.p
            className="text-lg md:text-xl max-w-3xl mb-10 leading-relaxed text-white/90"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
          >
            {firmInfo.description}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.8 }}
          >
            <Button size="lg" className="text-lg px-8 py-6 rounded-full bg-white text-primary hover:bg-white/90 transition-all duration-300 transform hover:scale-105">
              Schedule Consultation
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
            {/* Services */}
            <section ref={servicesRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isServicesInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Our Services
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full" />
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {services.map((service, index) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isServicesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -10 }}
                    className="transition-all duration-300"
                  >
                    <Card className={`overflow-hidden h-full border-2 ${service.popular ? 'border-primary shadow-xl relative' : 'border-border'} rounded-2xl hover:shadow-lg transition-all duration-300`}>
                      {service.popular && (
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold z-10">
                          MOST POPULAR
                        </div>
                      )}
                      <CardHeader className="pb-5">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{service.icon}</span>
                          <CardTitle className="text-2xl">{service.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-base mb-6">
                          {service.description}
                        </CardDescription>
                        <div className="space-y-2 mb-6">
                          {service.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                        <Button className={`w-full text-lg py-6 rounded-xl ${service.popular ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70' : 'bg-secondary hover:bg-secondary/90'} text-primary-foreground transition-all duration-300 transform hover:scale-[1.02]`}>
                          Learn More
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Financial Products */}
            <section ref={productsRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isProductsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Financial Products
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full" />
              </motion.h2>

              {/* Search and Filter */}
              <motion.div
                className="flex flex-col md:flex-row gap-4 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={isProductsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search financial products..."
                    className="w-full pl-10 pr-4 py-6 text-lg rounded-xl border-border focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={activeTab === category ? "default" : "outline"}
                      onClick={() => setActiveTab(category)}
                      className="rounded-full whitespace-nowrap"
                    >
                      {category === "all" ? "All Products" :
                        category === "popular" ? "Popular" :
                          category}
                    </Button>
                  ))}
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isProductsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                    className="transition-all duration-300"
                  >
                    <Card className={`overflow-hidden h-full border-2 ${product.popular ? 'border-primary shadow-xl relative' : 'border-border'} rounded-2xl hover:shadow-lg transition-all duration-300`}>
                      {product.popular && (
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold z-10">
                          MOST POPULAR
                        </div>
                      )}
                      <CardHeader className="pb-5">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-2xl">{product.name}</CardTitle>
                          <span
                            className={`px-3 py-1 text-sm rounded-full font-bold ${product.riskLevel === "Low"
                              ? "bg-green-100 text-green-800"
                              : product.riskLevel === "Medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                              }`}
                          >
                            {product.riskLevel} Risk
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-base mb-4">
                          {product.description}
                        </CardDescription>
                        <div className="space-y-3 mb-6">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Minimum Investment:</span>
                            <span className="font-bold">
                              Rs. {product.minimumInvestment.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Expected Returns:</span>
                            <span className="font-bold text-primary">
                              {product.returns}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Category:</span>
                            <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                              {product.category}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2 mb-6">
                          {product.features.slice(0, 3).map((feature, idx) => (
                            <div key={idx} className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                          {product.features.length > 3 && (
                            <div className="flex items-center">
                              <PlusCircle className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                              <span className="text-sm">+{product.features.length - 3} more features</span>
                            </div>
                          )}
                        </div>
                        <Button className={`w-full text-lg py-6 rounded-xl ${product.popular ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70' : 'bg-secondary hover:bg-secondary/90'} text-primary-foreground transition-all duration-300 transform hover:scale-[1.02]`}>
                          View Details
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Financial Advisors */}
            <section ref={advisorsRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isAdvisorsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Meet Our Advisors
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full" />
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {advisors.map((advisor, index) => (
                  <motion.div
                    key={advisor.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isAdvisorsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                    className="transition-all duration-300"
                  >
                    <Card className="text-center h-full border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-5">
                        <div className="mx-auto bg-muted rounded-full w-20 h-20 flex items-center justify-center mb-4 overflow-hidden">
                          <img
                            src={advisor.avatar}
                            alt={advisor.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardTitle className="text-xl">{advisor.name}</CardTitle>
                        <CardDescription>
                          {advisor.specialization}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-5">
                        <div className="flex items-center justify-center gap-1 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={`advisor-rating-star-${advisor.id}-${i}`}
                              className={`w-4 h-4 ${i < Math.floor(advisor.rating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                                }`}
                            />
                          ))}
                          <span className="text-sm ml-1">{advisor.rating}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {advisor.experience} experience
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {advisor.certifications.map((cert, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 text-xs rounded-full bg-primary/10 text-primary"
                            >
                              {cert}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full py-5 text-base rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300 transform hover:scale-[1.02]">
                          Book Appointment
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Financial Reports */}
            <section ref={reportsRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isReportsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
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
                    animate={isReportsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                    className="transition-all duration-300"
                  >
                    <Card className="border border-border rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
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
                        <Button variant="outline" className="w-full py-5 text-base rounded-xl border-border hover:bg-primary/10 transition-all duration-300">
                          View Full Report
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Market Insights */}
            <section ref={insightsRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isInsightsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Market Insights
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full" />
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {marketInsights.map((insight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInsightsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                    className="transition-all duration-300"
                  >
                    <Card className="border border-border rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <insight.icon className="w-6 h-6 text-primary" />
                          <CardTitle className="text-lg">{insight.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">{insight.content}</p>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" className="w-full py-5 text-base rounded-xl border-border hover:bg-primary/10 transition-all duration-300">
                          Learn More
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Financial Tools */}
            <section ref={toolsRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isToolsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Financial Tools
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full" />
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {financialTools.map((tool, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isToolsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                    className="transition-all duration-300"
                  >
                    <Card className="text-center h-full border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="mx-auto bg-muted rounded-xl w-16 h-16 flex items-center justify-center mb-4">
                          <tool.icon className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{tool.name}</CardTitle>
                        <CardDescription>{tool.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <Button variant="outline" className="w-full py-5 text-base rounded-xl border-border hover:bg-primary/10 transition-all duration-300">
                          Try Now
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
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full" />
              </motion.h2>
              <div className="max-w-3xl mx-auto space-y-4">
                {faqs.map((faq, index) => (
                  <motion.div
                    key={faq.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isFAQInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card className="border border-border rounded-2xl shadow-lg">
                      <CardHeader
                        className="cursor-pointer pb-4"
                        onClick={() => setActiveFAQ(activeFAQ === faq.id ? null : faq.id)}
                      >
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
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
