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
  Car,
  Map as MapIcon,
  CreditCard,
  User,
} from "lucide-react";
import { useState } from "react";

interface VehicleType {
  id: string;
  name: string;
  description: string;
  baseFare: number;
  perKmRate: number;
  eta: string;
}

interface Driver {
  id: string;
  name: string;
  vehicle: string;
  rating: number;
  trips: number;
}

interface RideSharingClientPageProps {
  slug: string;
}

export default function RideSharingClientPage({ slug }: RideSharingClientPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  // Mock data - in a real implementation, this would come from the API
  const serviceInfo = {
    name: "Surkhet RideShare",
    description:
      "Affordable and reliable ride-sharing service throughout Surkhet Valley",
    rating: 4.7,
    address: "Birendranagar, Surkhet",
    phone: "+977-98XXXXXXXX",
    email: "info@surkhetrideshare.com",
    hours: "24/7 Service",
  };

  const vehicleTypes: VehicleType[] = [
    {
      id: "1",
      name: "Economy",
      description: "Affordable rides for everyday travel",
      baseFare: 50,
      perKmRate: 15,
      eta: "2-5 mins",
    },
    {
      id: "2",
      name: "Comfort",
      description: "Spacious rides with extra legroom",
      baseFare: 75,
      perKmRate: 20,
      eta: "3-6 mins",
    },
    {
      id: "3",
      name: "Premium",
      description: "Luxury vehicles with premium experience",
      baseFare: 100,
      perKmRate: 25,
      eta: "4-7 mins",
    },
  ];

  const drivers: Driver[] = [
    {
      id: "1",
      name: "Rajesh K.C.",
      vehicle: "Toyota Corolla - BA 2 KHA 1234",
      rating: 4.9,
      trips: 1240,
    },
    {
      id: "2",
      name: "Sunita Thapa",
      vehicle: "Honda City - BA 3 CHA 5678",
      rating: 4.8,
      trips: 980,
    },
    {
      id: "3",
      name: "Amit Shah",
      vehicle: "Hyundai Elantra - BA 5 DHA 9012",
      rating: 4.7,
      trips: 756,
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
          src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200"
          alt="Ride Sharing"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-center items-start p-8 text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            {serviceInfo.name}
          </h1>
          <div className="flex items-center mb-4">
            {[...Array(5)].map((_, i) => (
              <Star
                key={`ride-sharing-rating-star-${i}`}
                className={`w-5 h-5 ${i < Math.floor(serviceInfo.rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
                  }`}
              />
            ))}
            <span className="ml-2">{serviceInfo.rating} (1,247 reviews)</span>
          </div>
          <p className="text-lg max-w-2xl">{serviceInfo.description}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Vehicle Types */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Choose Your Ride</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {vehicleTypes.map((vehicle) => (
                  <Card
                    key={vehicle.id}
                    className="overflow-hidden transition-all hover:shadow-lg"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Car className="w-6 h-6 text-primary" />
                        <CardTitle>{vehicle.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="mb-3">
                        {vehicle.description}
                      </CardDescription>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Base Fare:</span>
                          <span className="font-medium">
                            Rs. {vehicle.baseFare}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Per Km:</span>
                          <span className="font-medium">
                            Rs. {vehicle.perKmRate}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>ETA:</span>
                          <span className="font-medium">{vehicle.eta}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">Book Now</Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </section>

            {/* Featured Drivers */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Top Rated Drivers</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {drivers.map((driver) => (
                  <Card key={driver.id} className="text-center">
                    <CardHeader className="pb-3">
                      <div className="mx-auto bg-muted rounded-full w-16 h-16 flex items-center justify-center mb-3">
                        <User className="w-8 h-8" />
                      </div>
                      <CardTitle>{driver.name}</CardTitle>
                      <CardDescription>{driver.vehicle}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={`driver-rating-star-${driver.id}-${i}`}
                            className={`w-4 h-4 ${i < Math.floor(driver.rating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                              }`}
                          />
                        ))}
                        <span className="text-sm ml-1">{driver.rating}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {driver.trips} trips completed
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">Request Ride</Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </section>

            {/* How It Works */}
            <section>
              <h2 className="text-2xl font-bold mb-6">How It Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="text-center">
                  <CardHeader className="pb-3">
                    <div className="mx-auto bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-3">
                      <span className="text-primary font-bold">1</span>
                    </div>
                    <CardTitle className="text-lg">Book</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Enter pickup and destination
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardHeader className="pb-3">
                    <div className="mx-auto bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-3">
                      <span className="text-primary font-bold">2</span>
                    </div>
                    <CardTitle className="text-lg">Match</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Get matched with nearby driver
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardHeader className="pb-3">
                    <div className="mx-auto bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-3">
                      <span className="text-primary font-bold">3</span>
                    </div>
                    <CardTitle className="text-lg">Ride</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Enjoy safe and comfortable ride
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardHeader className="pb-3">
                    <div className="mx-auto bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-3">
                      <span className="text-primary font-bold">4</span>
                    </div>
                    <CardTitle className="text-lg">Pay</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Pay seamlessly through app
                    </p>
                  </CardContent>
                </Card>
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

            {/* Service Areas */}
            <Card>
              <CardHeader>
                <CardTitle>Service Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg h-48 flex items-center justify-center">
                  <MapIcon className="w-12 h-12 text-primary" />
                  <span className="ml-2">Interactive Map</span>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Coverage:</span>{" "}
                    Birendranagar, District Hospital Area, Airport Road
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Expansion:</span> Coming soon
                    to surrounding areas
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Options */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <span>Credit/Debit Card</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <span>Mobile Wallet</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <span>Bank Transfer</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <span>Cash</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
