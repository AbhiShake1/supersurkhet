'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Star,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface Service {
  id: string;
  name: string;
  description: string;
  price: string;
  features: string[];
  popular?: boolean;
}

interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
  avatar: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface GenericClientPageProps {
  slug: string;
  businessType: string;
}

export default function GenericClientPage({
  // biome-ignore lint/correctness/noUnusedFunctionParameters: lint debt cleanup
  slug,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: lint debt cleanup
  businessType,
}: GenericClientPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [activeFAQ, setActiveFAQ] = useState<string | null>(null);

  // Mock data - in a real implementation, this would come from the API
  const businessInfo = {
    name: 'Business Name',
    tagline: 'Your Trusted Partner in Surkhet',
    description:
      'Delivering exceptional service and quality solutions tailored to your needs in the heart of Surkhet Valley.',
    rating: 4.7,
    totalReviews: 89,
    address: 'Business Address, Birendranagar, Surkhet',
    phone: '+977-98XXXXXXXX',
    email: 'info@business.com',
    hours: '9:00 AM - 6:00 PM, Sun-Fri',
  };

  const services: Service[] = [
    {
      id: '1',
      name: 'Basic Service',
      description: 'Essential service package for small needs',
      price: 'Starting from Rs. 1,000',
      features: [
        'Core feature one',
        'Core feature two',
        'Email support',
        'Basic reporting',
      ],
    },
    {
      id: '2',
      name: 'Premium Service',
      description: 'Comprehensive solution with advanced features',
      price: 'Starting from Rs. 2,500',
      features: [
        'All Basic features',
        'Priority support',
        'Advanced analytics',
        'Customization options',
        'Monthly reviews',
      ],
      popular: true,
    },
    {
      id: '3',
      name: 'Enterprise Solution',
      description: 'Full-service package for large organizations',
      price: 'Starting from Rs. 5,000',
      features: [
        'All Premium features',
        '24/7 dedicated support',
        'Custom development',
        'Training sessions',
        'SLA guarantee',
        'Quarterly strategy sessions',
      ],
    },
  ];

  const testimonials: Testimonial[] = [
    {
      id: '1',
      name: 'Ramesh Thapa',
      role: 'Local Business Owner',
      content:
        'Outstanding service that exceeded our expectations. The team was professional and delivered results on time.',
      rating: 5,
      avatar: '',
    },
    {
      id: '2',
      name: 'Sita Gurung',
      role: 'Entrepreneur',
      content:
        'Reliable partners who understand our business needs. Their solutions have helped us grow significantly.',
      rating: 4,
      avatar: '',
    },
    {
      id: '3',
      name: 'Krishna KC',
      role: 'Community Leader',
      content:
        "Exceptional quality and customer service. They truly care about their clients' success.",
      rating: 5,
      avatar: '',
    },
  ];

  const faqs: FAQ[] = [
    {
      id: '1',
      question: 'How long does it take to see results?',
      answer:
        'Most clients see significant improvements within 30-60 days, though results can vary based on specific needs and commitment levels.',
    },
    {
      id: '2',
      question: 'Do you offer customized solutions?',
      answer:
        'Yes, we specialize in creating tailored solutions that align with your specific business goals and requirements.',
    },
    {
      id: '3',
      question: 'What sets you apart from competitors?',
      answer:
        'Our local expertise, personalized approach, and commitment to long-term partnerships distinguish us from generic service providers.',
    },
    {
      id: '4',
      question: 'How do you ensure quality?',
      answer:
        'We follow industry best practices, conduct regular quality checks, and maintain transparent communication throughout the process.',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would connect to the contact system
    alert(
      `Thank you ${name}! Your message has been sent to ${businessInfo.name}.`,
    );
    setName('');
    setEmail('');
    setMessage('');
  };

  // Refs for animations
  const heroRef = useRef(null);
  const servicesRef = useRef(null);
  const testimonialsRef = useRef(null);
  const faqRef = useRef(null);
  const contactRef = useRef(null);

  const isHeroInView = useInView(heroRef, { once: true, margin: '-100px' });
  const isServicesInView = useInView(servicesRef, {
    once: true,
    margin: '-100px',
  });
  const isTestimonialsInView = useInView(testimonialsRef, {
    once: true,
    margin: '-100px',
  });
  const isFAQInView = useInView(faqRef, { once: true, margin: '-100px' });
  const isContactInView = useInView(contactRef, {
    once: true,
    margin: '-100px',
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden" ref={heroRef}>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70 z-10" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920')] bg-cover bg-center opacity-20" />
        <div className="relative z-20 flex flex-col items-center justify-center min-h-[70vh] px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={
              isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
            }
            transition={{ duration: 0.6 }}
            className="max-w-4xl"
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-white">
              {businessInfo.name}
            </h1>
            <p className="text-xl md:text-2xl mb-4 text-white/90 font-medium">
              {businessInfo.tagline}
            </p>
            <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 text-white/80">
              {businessInfo.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={`business-rating-star-${// biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
i}`}
                    className={`w-5 h-5 ${
                      i < Math.floor(businessInfo.rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-white/30'
                    }`}
                  />
                ))}
                <span className="ml-2 text-white font-medium">
                  {businessInfo.rating}
                </span>
                <span className="mx-2 text-white/50">•</span>
                <span className="text-white/80">
                  {businessInfo.totalReviews} reviews
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="text-lg px-8 py-6 rounded-full bg-white text-primary hover:bg-white/90 transition-all duration-300 transform hover:scale-105"
              >
                Get Started
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6 rounded-full border-white text-white hover:bg-white/10 transition-all duration-300"
              >
                Contact Us
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {/* Services */}
        <section className="mb-24" ref={servicesRef}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={
              isServicesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }
            }
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Our Services
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive solutions tailored to meet your specific needs
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 30 }}
                animate={
                  isServicesInView
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 30 }
                }
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="h-full"
              >
                <Card
                  className={`overflow-hidden h-full border-2 ${service.popular ? 'border-primary shadow-xl relative' : 'border-border'} rounded-2xl`}
                >
                  {service.popular && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold z-10">
                      MOST POPULAR
                    </div>
                  )}
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl">{service.name}</CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold text-primary">
                        {service.price}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <ul className="space-y-3">
                      {service.features.map((feature, idx) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
<li key={idx} className="flex items-start">
                          <CheckCircle className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className={`w-full py-6 text-lg rounded-xl ${service.popular ? 'bg-primary hover:bg-primary/90' : 'bg-secondary hover:bg-secondary/90'}`}
                      variant={service.popular ? 'default' : 'secondary'}
                    >
                      Learn More
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="mb-24" ref={testimonialsRef}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={
              isTestimonialsInView
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 30 }
            }
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What Our Clients Say
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Don't just take our word for it - hear from our satisfied
              customers
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, y: 30 }}
                animate={
                  isTestimonialsInView
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 30 }
                }
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="overflow-hidden h-full border border-border rounded-2xl">
                  <CardContent className="pt-8">
                    <div className="flex items-center mb-4">
                      <div className="bg-muted rounded-full w-12 h-12 flex items-center justify-center mr-4">
                        <span className="font-bold">
                          {testimonial.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{testimonial.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                    <div className="flex mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={`testimonial-rating-${testimonial.id}-${i}`}
                          className={`w-4 h-4 ${
                            i < testimonial.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-muted-foreground">
                      "{testimonial.content}"
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-24" ref={faqRef}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isFAQInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions about our services
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={
                  isFAQInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                }
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="border border-border rounded-xl overflow-hidden">
                  <CardHeader
                    className="cursor-pointer pb-4"
                    onClick={() =>
                      setActiveFAQ(activeFAQ === faq.id ? null : faq.id)
                    }
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

        {/* Contact Section */}
        <section ref={contactRef}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={
                isContactInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }
              }
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Get In Touch
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Ready to get started? Contact us today for a free consultation.
              </p>

              <div className="space-y-6">
                <div className="flex items-start">
                  <MapPin className="w-6 h-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg">Location</h3>
                    <p className="text-muted-foreground">
                      {businessInfo.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Phone className="w-6 h-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg">Phone</h3>
                    <p className="text-muted-foreground">
                      {businessInfo.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Mail className="w-6 h-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg">Email</h3>
                    <p className="text-muted-foreground">
                      {businessInfo.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Clock className="w-6 h-6 text-primary mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg">Hours</h3>
                    <p className="text-muted-foreground">
                      {businessInfo.hours}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10 p-6 bg-muted rounded-2xl">
                <h3 className="font-semibold text-lg mb-3">
                  Need Immediate Assistance?
                </h3>
                <p className="text-muted-foreground mb-4">
                  Call us directly for urgent inquiries.
                </p>
                <Button className="w-full py-6">Call Now</Button>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={
                isContactInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }
              }
              transition={{ duration: 0.6 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Send Us a Message</CardTitle>
                  <CardDescription>
                    We'll respond to your inquiry within 24 hours
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
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
                        {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
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
                      {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
                      <Input
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        className="py-5 text-base rounded-xl"
                        placeholder="How can we help you?"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full py-6 text-lg rounded-xl"
                    >
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
