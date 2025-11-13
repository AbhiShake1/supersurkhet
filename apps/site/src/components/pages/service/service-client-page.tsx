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
  Wrench,
  CheckCircle,
} from "lucide-react";
import { useState } from "react";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  category: string;
}

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
}

interface ServiceProvider {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  experience: string;
}

interface ServiceClientPageProps {
  slug: string;
}

export default function ServiceClientPage({ slug }: ServiceClientPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  // Mock data - in a real implementation, this would come from the API
  const serviceInfo = {
    name: "Surkhet Service Hub",
    description:
      "Professional service solutions for your home and business needs in Surkhet Valley",
    rating: 4.8,
    address: "Birendranagar, Surkhet",
    phone: "+977-98XXXXXXXX",
    email: "info@surkhetservice.com",
    hours: "8:00 AM - 8:00 PM (Sun-Fri)",
  };

  const serviceCategories: ServiceCategory[] = [
    {
      id: "1",
      name: "Home Services",
      icon: "🏠",
    },
    {
      id: "2",
      name: "Business Services",
      icon: "🏢",
    },
    {
      id: "3",
      name: "Repair Services",
      icon: "🔧",
    },
    {
      id: "4",
      name: "Consulting",
      icon: "💼",
    },
  ];

  const services: Service[] = [
    {
      id: "1",
      name: "Plumbing Service",
      description: "Professional plumbing solutions for your home or business",
      price: 500,
      duration: "2-3 hours",
      category: "Home Services",
    },
    {
      id: "2",
      name: "Electrical Repair",
      description: "Expert electrical work and maintenance services",
      price: 600,
      duration: "1-2 hours",
      category: "Home Services",
    },
    {
      id: "3",
      name: "AC Maintenance",
      description: "Complete air conditioning maintenance and repair",
      price: 800,
      duration: "2-4 hours",
      category: "Home Services",
    },
    {
      id: "4",
      name: "Business Consulting",
      description: "Strategic business advice and planning services",
      price: 2000,
      duration: "1-2 hours",
      category: "Business Services",
    },
  ];

  const serviceProviders: ServiceProvider[] = [
    {
      id: "1",
      name: "Rajesh K.C.",
      specialization: "Plumbing & Electrical",
      rating: 4.9,
      experience: "10+ years",
    },
    {
      id: "2",
      name: "Sunita Thapa",
      specialization: "AC Specialist",
      rating: 4.8,
      experience: "8+ years",
    },
    {
      id: "3",
      name: "Amit Shah",
      specialization: "Business Consultant",
      rating: 4.7,
      experience: "12+ years",
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would connect to the contact system
    alert(
      `Thank you ${name}! Your message has been sent to ${serviceInfo.name}.`,
    );
    setName("");
    setEmail("");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Hero Section */}
      <div className="relative h-80 overflow-hidden rounded-b-3xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/40 z-10" />
        <img
          src="https://images.unsplash.com/photo-1551431342-601c4475bd5e?w=1200"
          alt="Service Business"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-center items-start p-8 text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            {serviceInfo.name}
          </h1>
          <div className="flex items-center mb-4">
            {[...Array(5)].map((_, i) => (
              <Star
                key={`service-rating-star-${i}`}
                className={`w-5 h-5 ${i < Math.floor(serviceInfo.rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
                  }`}
              />
            ))}
            <span className="ml-2">{serviceInfo.rating} (342 reviews)</span>
          </div>
          <p className="text-lg max-w-2xl">{serviceInfo.description}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Service Categories */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Service Categories</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {serviceCategories.map((category) => (
                  <Card key={category.id} className="text-center">
                    <CardHeader className="pb-3">
                      <div className="mx-auto bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-3">
                        <span className="text-lg">{category.icon}</span>
                      </div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                    </CardHeader>
                    <CardFooter className="pb-4">
                      <Button variant="outline" className="w-full">
                        View Services
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </section>

            {/* Popular Services */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Popular Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((service) => (
                  <Card
                    key={service.id}
                    className="overflow-hidden transition-all hover:shadow-lg"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Wrench className="w-5 h-5" />
                            {service.name}
                          </CardTitle>
                          <CardDescription>{service.category}</CardDescription>
                        </div>
                        <span className="text-2xl font-bold text-primary">
                          Rs. {service.price}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {service.description}
                      </p>
                      <div className="flex items-center text-sm">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{service.duration}</span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">Book Service</Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </section>

            {/* Service Providers */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Our Experts</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {serviceProviders.map((provider) => (
                  <Card key={provider.id} className="text-center">
                    <CardHeader className="pb-3">
                      <div className="mx-auto bg-muted rounded-full w-16 h-16 flex items-center justify-center mb-3">
                        <User className="w-8 h-8" />
                      </div>
                      <CardTitle>{provider.name}</CardTitle>
                      <CardDescription>
                        {provider.specialization}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={`provider-rating-star-${provider.id}-${i}`}
                            className={`w-4 h-4 ${i < Math.floor(provider.rating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                              }`}
                          />
                        ))}
                        <span className="text-sm ml-1">{provider.rating}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {provider.experience} experience
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">Book Appointment</Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </section>

            {/* Contact Form */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Get In Touch</h2>
              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
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
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Business Info */}
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-3 text-primary" />
                  <span>{serviceInfo.address}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-5 h-5 mr-3 text-primary" />
                  <span>{serviceInfo.phone}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-5 h-5 mr-3 text-primary" />
                  <span>{serviceInfo.email}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-3 text-primary" />
                  <span>{serviceInfo.hours}</span>
                </div>
              </CardContent>
            </Card>

            {/* Book Appointment */}
            <Card>
              <CardHeader>
                <CardTitle>Book an Appointment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Schedule a Service</p>
                    <p className="text-sm text-muted-foreground">
                      Book with our experts
                    </p>
                  </div>
                </div>
                <Button className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Now
                </Button>
              </CardContent>
            </Card>

            {/* Service Guarantee */}
            <Card>
              <CardHeader>
                <CardTitle>Our Guarantee</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Quality Work</p>
                    <p className="text-sm text-muted-foreground">
                      100% satisfaction guarantee
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">On-Time Service</p>
                    <p className="text-sm text-muted-foreground">
                      Punctual and reliable
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Expert Technicians</p>
                    <p className="text-sm text-muted-foreground">
                      Certified professionals
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Transparent Pricing</p>
                    <p className="text-sm text-muted-foreground">
                      No hidden charges
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
