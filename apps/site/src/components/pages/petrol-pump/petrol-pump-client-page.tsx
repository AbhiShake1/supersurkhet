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
  Fuel,
  Wrench,
  Coffee,
  Wifi,
  Map as MapIcon,
} from "lucide-react";
import { useState } from "react";

interface FuelType {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  price?: number;
}

interface PetrolPumpClientPageProps {
  slug: string;
}

export default function PetrolPumpClientPage({ slug }: PetrolPumpClientPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  // Mock data - in a real implementation, this would come from the API
  const petrolPumpInfo = {
    name: "Surkhet Fuel Station",
    description:
      "Your trusted fuel station in Surkhet with quality fuels and services",
    rating: 4.6,
    address: "Birendranagar, Surkhet",
    phone: "+977-98XXXXXXXX",
    email: "info@surkhetfuel.com",
    hours: "24 Hours",
  };

  const fuelTypes: FuelType[] = [
    {
      id: "1",
      name: "Petrol",
      price: 120.0,
      description: "High-quality unleaded petrol",
    },
    {
      id: "2",
      name: "Diesel",
      price: 105.0,
      description: "Premium diesel fuel",
    },
    {
      id: "3",
      name: "CNG",
      price: 80.0,
      description: "Compressed natural gas",
    },
    {
      id: "4",
      name: "Premium Petrol",
      price: 140.0,
      description: "High-octane performance petrol",
    },
  ];

  const services: Service[] = [
    {
      id: "1",
      name: "Car Wash",
      description: "Complete car washing service",
      price: 300,
    },
    {
      id: "2",
      name: "Oil Change",
      description: "Engine oil replacement service",
      price: 800,
    },
    {
      id: "3",
      name: "Tire Pressure Check",
      description: "Free tire pressure checking service",
      price: 0,
    },
    {
      id: "4",
      name: "Air Filter Replacement",
      description: "Air filter replacement service",
      price: 500,
    },
  ];

  const amenities = [
    { icon: Wifi, name: "Free WiFi" },
    { icon: Coffee, name: "Café" },
    { icon: Wrench, name: "Mechanic Service" },
    { icon: MapIcon, name: "Restroom" },
  ] as const;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would connect to the contact system
    alert(
      `Thank you ${name}! Your message has been sent to ${petrolPumpInfo.name}.`,
    );
    setName("");
    setEmail("");
    setMessage("");
  };

  const i = 5

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Hero Section */}
      <div className="relative h-80 overflow-hidden rounded-b-3xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/40 z-10" />
        <img
          src="https://images.unsplash.com/photo-1551431342-601c4475bd5e?w=1200"
          alt="Petrol Pump"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-center items-start p-8 text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            {petrolPumpInfo.name}
          </h1>
          <div className="flex items-center mb-4">
            <Star
              key={`petrol-pump-rating-star-${i}`}
              className={`w-5 h-5 ${i < Math.floor(petrolPumpInfo.rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
                }`}
            />
            <span className="ml-2">{petrolPumpInfo.rating} (64 reviews)</span>
          </div>
          <p className="text-lg max-w-2xl">{petrolPumpInfo.description}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Fuel Prices */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Fuel Prices</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {fuelTypes.map((fuel) => (
                  <Card
                    key={fuel.id}
                    className="overflow-hidden transition-all hover:shadow-lg"
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Fuel className="w-5 h-5" />
                            {fuel.name}
                          </CardTitle>
                          <CardDescription>{fuel.description}</CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            Rs. {fuel.price.toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            per liter
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardFooter>
                      <Button className="w-full">Select Fuel</Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </section>

            {/* Services */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Additional Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {services.map((service) => (
                  <Card
                    key={service.id}
                    className="overflow-hidden transition-all hover:shadow-lg"
                  >
                    <CardHeader>
                      <CardTitle>{service.name}</CardTitle>
                      <CardDescription>{service.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {service.price !== undefined && service.price > 0 ? (
                        <p className="text-2xl font-bold text-primary">
                          Rs. {service.price}
                        </p>
                      ) : (
                        <p className="text-2xl font-bold text-green-600">
                          Free
                        </p>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">Request Service</Button>
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
                  <span>{petrolPumpInfo.address}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-5 h-5 mr-3 text-primary" />
                  <span>{petrolPumpInfo.phone}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-5 h-5 mr-3 text-primary" />
                  <span>{petrolPumpInfo.email}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-3 text-primary" />
                  <span>{petrolPumpInfo.hours}</span>
                </div>
              </CardContent>
            </Card>

            {/* Amenities */}
            <Card>
              <CardHeader>
                <CardTitle>Amenities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {amenities.map((amenity) => (
                    <div
                      key={`petrol-pump-amenity-${amenity.name}`}
                      className="flex items-center gap-2"
                    >
                      <amenity.icon className="w-5 h-5 text-primary" />
                      <span>{amenity.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Location Map */}
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg h-64 flex items-center justify-center">
                  <MapIcon className="w-12 h-12 text-primary" />
                  <span className="ml-2">Interactive Map</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
