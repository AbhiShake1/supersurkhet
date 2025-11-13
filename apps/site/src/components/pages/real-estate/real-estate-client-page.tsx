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
  Home,
  Building,
  Landmark,
  Filter,
  Search,
  Bed,
  Bath,
  Car,
  Ruler,
  CalendarDays,
  Users,
} from "lucide-react";
import { useState } from "react";

interface Property {
  id: string;
  title: string;
  description: string;
  type: "residential" | "commercial" | "industrial" | "land";
  status: "available" | "sold" | "leased" | "under_contract";
  price: number;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  yearBuilt?: number;
  features: string[];
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  agent: {
    name: string;
    phone: string;
    email: string;
  };
  imageUrl: string;
}

interface Agent {
  id: string;
  name: string;
  phone: string;
  email: string;
  experience: string;
  rating: number;
}

interface RealEstateClientPageProps {
  slug: string;
}

export default function RealEstateClientPage({ slug }: RealEstateClientPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  // Mock data - in a real implementation, this would come from the API
  const realEstateInfo = {
    name: "Surkhet Valley Realty",
    description:
      "Premier real estate agency in Surkhet Valley offering comprehensive property services",
    rating: 4.7,
    address: "Birendranagar, Surkhet",
    phone: "+977-98XXXXXXXX",
    email: "info@surkhetvalleyrealty.com.np",
    hours: "9:00 AM - 6:00 PM (Sun-Fri)",
  };

  const properties: Property[] = [
    {
      id: "1",
      title: "Modern Family Home",
      description:
        "Beautiful 3-bedroom family home with spacious backyard and modern amenities",
      type: "residential",
      status: "available",
      price: 4500000,
      area: 2500,
      bedrooms: 3,
      bathrooms: 2,
      parkingSpaces: 2,
      yearBuilt: 2018,
      features: ["Garden", "Garage", "Central AC", "Security System"],
      location: {
        address: "Peaceful Lane 123",
        city: "Birendranagar",
        state: "Surkhet",
        zipCode: "21900",
      },
      agent: {
        name: "Rajesh K.C.",
        phone: "+977-98XXXXXXXX",
        email: "rajesh@surkhetvalleyrealty.com.np",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600",
    },
    {
      id: "2",
      title: "Downtown Commercial Space",
      description:
        "Prime commercial space in downtown area with high foot traffic and excellent visibility",
      type: "commercial",
      status: "available",
      price: 8500000,
      area: 4200,
      parkingSpaces: 15,
      yearBuilt: 2015,
      features: ["High Visibility", "Parking", "Elevator", "Security"],
      location: {
        address: "Main Street 456",
        city: "Birendranagar",
        state: "Surkhet",
        zipCode: "21900",
      },
      agent: {
        name: "Sunita Thapa",
        phone: "+977-98XXXXXXXX",
        email: "sunita@surkhetvalleyrealty.com.np",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=600",
    },
    {
      id: "3",
      title: "Industrial Warehouse",
      description:
        "Large industrial warehouse with loading dock and high ceilings, perfect for manufacturing",
      type: "industrial",
      status: "leased",
      price: 12000000,
      area: 15000,
      parkingSpaces: 25,
      yearBuilt: 2010,
      features: ["Loading Dock", "High Ceilings", "Security", "HVAC"],
      location: {
        address: "Industrial Zone 789",
        city: "Birendranagar",
        state: "Surkhet",
        zipCode: "21900",
      },
      agent: {
        name: "Amit Shah",
        phone: "+977-98XXXXXXXX",
        email: "amit@surkhetvalleyrealty.com.np",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600",
    },
    {
      id: "4",
      title: "Scenic Land Parcel",
      description:
        "Large scenic land parcel perfect for development or agricultural use",
      type: "land",
      status: "available",
      price: 3200000,
      area: 12000,
      features: ["Scenic Views", "Water Access", "Utilities", "Road Access"],
      location: {
        address: "Mountain View Road",
        city: "Birendranagar",
        state: "Surkhet",
        zipCode: "21900",
      },
      agent: {
        name: "Priya Gurung",
        phone: "+977-98XXXXXXXX",
        email: "priya@surkhetvalleyrealty.com.np",
      },
      imageUrl:
        "https://images.unsplash.com/photo-1506439773649-6e0eb8cfbf55?w=600",
    },
  ];

  const agents: Agent[] = [
    {
      id: "1",
      name: "Rajesh K.C.",
      phone: "+977-98XXXXXXXX",
      email: "rajesh@surkhetvalleyrealty.com.np",
      experience: "12+ years",
      rating: 4.9,
    },
    {
      id: "2",
      name: "Sunita Thapa",
      phone: "+977-98XXXXXXXX",
      email: "sunita@surkhetvalleyrealty.com.np",
      experience: "10+ years",
      rating: 4.8,
    },
    {
      id: "3",
      name: "Amit Shah",
      phone: "+977-98XXXXXXXX",
      email: "amit@surkhetvalleyrealty.com.np",
      experience: "8+ years",
      rating: 4.7,
    },
    {
      id: "4",
      name: "Priya Gurung",
      phone: "+977-98XXXXXXXX",
      email: "priya@surkhetvalleyrealty.com.np",
      experience: "6+ years",
      rating: 4.6,
    },
  ];

  const propertyTypes = [
    { icon: Home, name: "Residential" },
    { icon: Building, name: "Commercial" },
    { icon: Landmark, name: "Industrial" },
    { icon: Ruler, name: "Land" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would connect to the contact system
    alert(
      `Thank you ${name}! Your message has been sent to ${realEstateInfo.name}.`,
    );
    setName("");
    setEmail("");
    setMessage("");
  };

  const getPropertyIcon = (type: Property["type"]) => {
    switch (type) {
      case "residential":
        return Home;
      case "commercial":
        return Building;
      case "industrial":
        return Landmark;
      case "land":
        return Ruler;
      default:
        return Home;
    }
  };

  const getPropertyTypeName = (type: Property["type"]) => {
    switch (type) {
      case "residential":
        return "Residential";
      case "commercial":
        return "Commercial";
      case "industrial":
        return "Industrial";
      case "land":
        return "Land";
      default:
        return "Property";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Hero Section */}
      <div className="relative h-80 overflow-hidden rounded-b-3xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/40 z-10" />
        <img
          src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200"
          alt="Real Estate Agency"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-center items-start p-8 text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            {realEstateInfo.name}
          </h1>
          <div className="flex items-center mb-4">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${i < Math.floor(realEstateInfo.rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
                  }`}
              />
            ))}
            <span className="ml-2">{realEstateInfo.rating} (247 reviews)</span>
          </div>
          <p className="text-lg max-w-2xl">{realEstateInfo.description}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Property Types */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Property Types</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {propertyTypes.map((type, index) => (
                  <Card key={index} className="text-center">
                    <CardHeader className="pb-3">
                      <div className="mx-auto bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-3">
                        <type.icon className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{type.name}</CardTitle>
                    </CardHeader>
                    <CardFooter className="pb-4">
                      <Button variant="outline" className="w-full">
                        View Properties
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </section>

            {/* Featured Properties */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Featured Properties</h2>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Advanced Filters
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {properties.map((property) => {
                  const PropertyIcon = getPropertyIcon(property.type);
                  return (
                    <Card
                      key={property.id}
                      className="overflow-hidden transition-all hover:shadow-lg"
                    >
                      <img
                        src={property.imageUrl}
                        alt={property.title}
                        className="w-full h-48 object-cover"
                      />
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <PropertyIcon className="w-4 h-4" />
                              {property.title}
                            </CardTitle>
                            <CardDescription>
                              {property.location.address},{" "}
                              {property.location.city}
                            </CardDescription>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${property.status === "available"
                              ? "bg-green-100 text-green-800"
                              : property.status === "sold"
                                ? "bg-red-100 text-red-800"
                                : property.status === "leased"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                          >
                            {property.status.charAt(0).toUpperCase() +
                              property.status.slice(1)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {property.description}
                        </p>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="flex items-center text-sm">
                            <Ruler className="w-4 h-4 mr-1" />
                            <span>{property.area} sq.ft.</span>
                          </div>
                          {property.bedrooms !== undefined && (
                            <div className="flex items-center text-sm">
                              <Bed className="w-4 h-4 mr-1" />
                              <span>{property.bedrooms} beds</span>
                            </div>
                          )}
                          {property.bathrooms !== undefined && (
                            <div className="flex items-center text-sm">
                              <Bath className="w-4 h-4 mr-1" />
                              <span>{property.bathrooms} baths</span>
                            </div>
                          )}
                          {property.parkingSpaces !== undefined && (
                            <div className="flex items-center text-sm">
                              <Car className="w-4 h-4 mr-1" />
                              <span>{property.parkingSpaces} parking</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {property.features
                            .slice(0, 3)
                            .map((feature, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs rounded-full bg-muted"
                              >
                                {feature}
                              </span>
                            ))}
                          {property.features.length > 3 && (
                            <span className="px-2 py-1 text-xs rounded-full bg-muted">
                              +{property.features.length - 3} more
                            </span>
                          )}
                        </div>
                        <p className="text-2xl font-bold text-primary">
                          Rs. {property.price.toLocaleString()}
                        </p>
                      </CardContent>
                      <CardFooter className="flex gap-2">
                        <Button className="flex-1">View Details</Button>
                        <Button variant="outline">Contact Agent</Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </section>

            {/* Top Agents */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Our Top Agents</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {agents.map((agent) => (
                  <Card key={agent.id} className="text-center">
                    <CardHeader className="pb-3">
                      <div className="mx-auto bg-muted rounded-full w-16 h-16 flex items-center justify-center mb-3">
                        <User className="w-8 h-8" />
                      </div>
                      <CardTitle>{agent.name}</CardTitle>
                      <CardDescription>Real Estate Agent</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < Math.floor(agent.rating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                              }`}
                          />
                        ))}
                        <span className="text-sm ml-1">{agent.rating}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {agent.experience} experience
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">Contact</Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </section>

            {/* Services */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Our Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="w-5 h-5" />
                      Property Buying
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Expert guidance through the property buying process
                    </CardDescription>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline">Learn More</Button>
                  </CardFooter>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="w-5 h-5" />
                      Property Selling
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Maximize your property's value with our selling expertise
                    </CardDescription>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline">Learn More</Button>
                  </CardFooter>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Landmark className="w-5 h-5" />
                      Property Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Professional property management services
                    </CardDescription>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline">Learn More</Button>
                  </CardFooter>
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
                <CardTitle>Agency Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-3 text-primary" />
                  <span>{realEstateInfo.address}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-5 h-5 mr-3 text-primary" />
                  <span>{realEstateInfo.phone}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-5 h-5 mr-3 text-primary" />
                  <span>{realEstateInfo.email}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-3 text-primary" />
                  <span>{realEstateInfo.hours}</span>
                </div>
              </CardContent>
            </Card>

            {/* Property Search */}
            <Card>
              <CardHeader>
                <CardTitle>Find Your Dream Property</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by location, property type..."
                    className="pl-10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline">Buy</Button>
                  <Button variant="outline">Rent</Button>
                </div>
                <Button className="w-full">
                  <Filter className="w-4 h-4 mr-2" />
                  Advanced Search
                </Button>
              </CardContent>
            </Card>

            {/* Featured Listings */}
            <Card>
              <CardHeader>
                <CardTitle>Recently Listed</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {properties.slice(0, 2).map((property) => {
                  const PropertyIcon = getPropertyIcon(property.type);
                  return (
                    <div key={property.id} className="flex gap-3">
                      <img
                        src={property.imageUrl}
                        alt={property.title}
                        className="w-16 h-16 rounded-md object-cover flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{property.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {property.location.city}, {property.location.state}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-bold text-primary">
                            Rs. {property.price.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {getPropertyTypeName(property.type)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Testimonials */}
            <Card>
              <CardHeader>
                <CardTitle>Client Testimonials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm italic">
                      "Surkhet Valley Realty helped us find our dream home.
                      Their agents were professional and knowledgeable."
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      - Ram Bahadur Thapa
                    </p>
                  </div>
                  <div>
                    <p className="text-sm italic">
                      "Sold our property in just two weeks! Highly recommend
                      their services."
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      - Sita Kumari Shah
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
