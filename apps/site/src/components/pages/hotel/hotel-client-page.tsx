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
  Bed,
  Bell,
  Calendar,
  CalendarDays,
  Car,
  Clock,
  Coffee,
  Dumbbell,
  Mail,
  MapPin,
  Phone,
  Star,
  Sunrise,
  Sunset,
  ThumbsUp,
  Waves,
  Wifi,
  MessageCircle,
  Bookmark,
  Share2,
  Users,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
} from "lucide-react";
import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

interface RoomType {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  amenities: string[];
  popular?: boolean;
}

interface Review {
  id: string;
  name: string;
  rating: number;
  date: string;
  content: string;
  avatar: string;
  likes: number;
  replies: number;
}

interface GalleryItem {
  id: string;
  imageUrl: string;
  caption: string;
}

interface SpecialOffer {
  id: string;
  title: string;
  description: string;
  discount: string;
  validUntil: string;
}

interface HotelClientPageProps {
  slug: string;
}

export default function HotelClientPage({ slug }: HotelClientPageProps) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  // Mock data - in a real implementation, this would come from the API
  const hotelInfo = {
    name: "Grand Surkhet Hotel",
    tagline: "Luxury & Comfort in the Heart of Surkhet Valley",
    description:
      "Experience luxury and comfort in the heart of Surkhet Valley with premium amenities and breathtaking mountain views",
    rating: 4.8,
    totalReviews: 128,
    address: "Ratnapark, Surkhet",
    phone: "+977-98XXXXXXXX",
    email: "info@grandsurkhet.com",
    checkInTime: "2:00 PM",
    checkOutTime: "11:00 AM",
    hours: "24/7 Front Desk, 8:00 AM - 10:00 PM (Sun-Fri)",
  };

  const roomTypes: RoomType[] = [
    {
      id: "1",
      name: "Deluxe Room",
      description: "Spacious room with mountain view and premium amenities",
      price: 4500,
      imageUrl:
        "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400",
      amenities: ["WiFi", "AC", "TV", "Mini Bar"],
      popular: true,
    },
    {
      id: "2",
      name: "Executive Suite",
      description:
        "Luxurious suite with separate living area and panoramic views",
      price: 7500,
      imageUrl:
        "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400",
      amenities: ["WiFi", "AC", "TV", "Mini Bar", "Jacuzzi"],
    },
    {
      id: "3",
      name: "Family Room",
      description: "Perfect for families with extra space and connecting rooms",
      price: 6000,
      imageUrl:
        "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400",
      amenities: ["WiFi", "AC", "TV", "Mini Bar", "Kitchenette"],
    },
    {
      id: "4",
      name: "Garden View Room",
      description: "Beautiful room with garden views and modern amenities",
      price: 5200,
      imageUrl:
        "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400",
      amenities: ["WiFi", "AC", "TV", "Balcony", "Garden View"],
    },
  ];

  const amenities = [
    { icon: Wifi, name: "Free WiFi" },
    { icon: Car, name: "Parking" },
    { icon: Coffee, name: "Restaurant" },
    { icon: Dumbbell, name: "Fitness Center" },
    { icon: Waves, name: "Swimming Pool" },
    { icon: Bell, name: "24/7 Service" },
    { icon: Sunrise, name: "Breakfast Included" },
    { icon: Sunset, name: "Sunset Views" },
  ];

  const reviews: Review[] = [
    {
      id: "1",
      name: "Ramesh Thapa",
      rating: 5,
      date: "2023-10-15",
      content:
        "Amazing experience! The staff was incredibly helpful and the room was spotless. Will definitely be coming back!",
      likes: 24,
      replies: 3,
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    },
    {
      id: "2",
      name: "Sita Gurung",
      rating: 4,
      date: "2023-09-22",
      content:
        "Beautiful hotel with great amenities. The location is perfect for exploring Surkhet. Highly recommended!",
      likes: 18,
      replies: 2,
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    },
    {
      id: "3",
      name: "Krishna KC",
      rating: 5,
      date: "2023-08-30",
      content:
        "Best hotel I've stayed at in Nepal! The mountain views from our room were breathtaking. Excellent service!",
      likes: 32,
      replies: 5,
      avatar: "https://randomuser.me/api/portraits/men/67.jpg",
    },
  ];

  const gallery: GalleryItem[] = [
    {
      id: "1",
      imageUrl:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
      caption: "Hotel Exterior",
    },
    {
      id: "2",
      imageUrl:
        "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400",
      caption: "Deluxe Room",
    },
    {
      id: "3",
      imageUrl:
        "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400",
      caption: "Executive Suite",
    },
    {
      id: "4",
      imageUrl:
        "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=400",
      caption: "Swimming Pool",
    },
    {
      id: "5",
      imageUrl:
        "https://images.unsplash.com/photo-1551632436-7a879920dd8f?w=400",
      caption: "Restaurant",
    },
    {
      id: "6",
      imageUrl:
        "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400",
      caption: "Family Room",
    },
  ];

  const specialOffers: SpecialOffer[] = [
    {
      id: "1",
      title: "Weekend Getaway",
      description:
        "Enjoy a luxurious weekend stay with complimentary breakfast",
      discount: "20% off",
      validUntil: "2023-12-31",
    },
    {
      id: "2",
      title: "Family Package",
      description: "Special rates for families with kids under 12",
      discount: "25% off",
      validUntil: "2023-11-30",
    },
  ];

  const facilities = [
    { icon: Wifi, name: "Free High-Speed WiFi" },
    { icon: Car, name: "Complimentary Parking" },
    { icon: Coffee, name: "Multi-Cuisine Restaurant" },
    { icon: Dumbbell, name: "Fully-Equipped Gym" },
    { icon: Waves, name: "Temperature-Controlled Pool" },
    { icon: Bell, name: "24/7 Concierge Service" },
    { icon: Sunrise, name: "Buffet Breakfast" },
    { icon: Sunset, name: "Rooftop Bar & Lounge" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would connect to the contact system
    alert(
      `Thank you ${name}! Your message has been sent to ${hotelInfo.name}.`,
    );
    setName("");
    setEmail("");
    setMessage("");
  };

  const handleBooking = () => {
    // In a real implementation, this would connect to the booking system
    if (!checkIn || !checkOut) {
      alert("Please select both check-in and check-out dates");
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      alert("Check-out date must be after check-in date");
      return;
    }

    alert(
      `Booking request for ${hotelInfo.name} from ${checkIn} to ${checkOut} for ${guests} guests`,
    );
  };

  // Refs for animations
  const heroRef = useRef(null);
  const bookingRef = useRef(null);
  const roomsRef = useRef(null);
  const galleryRef = useRef(null);
  const reviewsRef = useRef(null);
  const offersRef = useRef(null);
  const contactRef = useRef(null);

  const isHeroInView = useInView(heroRef, { once: true, margin: "-100px" });
  const isBookingInView = useInView(bookingRef, { once: true, margin: "-100px" });
  const isRoomsInView = useInView(roomsRef, { once: true, margin: "-100px" });
  const isGalleryInView = useInView(galleryRef, { once: true, margin: "-100px" });
  const isReviewsInView = useInView(reviewsRef, { once: true, margin: "-100px" });
  const isOffersInView = useInView(offersRef, { once: true, margin: "-100px" });
  const isContactInView = useInView(contactRef, { once: true, margin: "-100px" });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden" ref={heroRef}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/40 z-10" />
        <img
          src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200"
          alt="Hotel Exterior"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="relative z-20 flex flex-col items-center justify-center min-h-[70vh] px-6 py-20 text-center text-white">
          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 max-w-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {hotelInfo.name}
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
                  key={`hotel-rating-star-${i}`}
                  className={`w-6 h-6 ${i < Math.floor(hotelInfo.rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                    }`}
                />
              ))}
            </div>
            <span className="ml-3 text-lg font-medium">{hotelInfo.rating} ({hotelInfo.totalReviews} reviews)</span>
          </motion.div>
          <motion.p
            className="text-xl md:text-2xl max-w-3xl mb-4 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
          >
            {hotelInfo.tagline}
          </motion.p>
          <motion.p
            className="text-lg md:text-xl max-w-3xl mb-10 leading-relaxed text-white/90"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
          >
            {hotelInfo.description}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.8 }}
          >
            <Button size="lg" className="text-lg px-8 py-6 rounded-full bg-white text-primary hover:bg-white/90 transition-all duration-300 transform hover:scale-105">
              Explore Rooms
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
            {/* Booking Widget */}
            <section ref={bookingRef}>
              <motion.div
                className="flex items-center justify-between mb-12"
                initial={{ opacity: 0, x: -20 }}
                animate={isBookingInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4 relative inline-block">
                  Book Your Stay
                  <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full" />
                </h2>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={isBookingInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.6 }}
              >
                <Card className="border border-border rounded-2xl shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <CalendarDays className="w-6 h-6 text-primary" />
                      Find Your Perfect Room
                    </CardTitle>
                    <CardDescription>
                      Find the perfect room for your stay in Surkhet Valley
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="check-in" className="text-lg">Check In</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="check-in"
                          type="date"
                          value={checkIn}
                          onChange={(e) => setCheckIn(e.target.value)}
                          className="py-6 text-lg pl-10 rounded-xl border-border focus:border-primary focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="check-out" className="text-lg">Check Out</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="check-out"
                          type="date"
                          value={checkOut}
                          onChange={(e) => setCheckOut(e.target.value)}
                          className="py-6 text-lg pl-10 rounded-xl border-border focus:border-primary focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guests" className="text-lg">Guests</Label>
                      <Input
                        id="guests"
                        type="number"
                        min="1"
                        max="10"
                        value={guests}
                        onChange={(e) =>
                          setGuests(Number.parseInt(e.target.value) || 1)
                        }
                        className="py-6 text-lg rounded-xl border-border focus:border-primary focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={handleBooking}
                        className="w-full text-lg py-6 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300 transform hover:scale-[1.02]"
                      >
                        Check Availability
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </section>

            {/* Room Types */}
            <section ref={roomsRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isRoomsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Room Types
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full" />
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {roomTypes.map((room, index) => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isRoomsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -10 }}
                    className="transition-all duration-300"
                  >
                    <Card className={`overflow-hidden h-full border-2 ${room.popular ? 'border-primary shadow-xl relative' : 'border-border'} rounded-2xl hover:shadow-lg transition-all duration-300`}>
                      {room.popular && (
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold z-10">
                          MOST POPULAR
                        </div>
                      )}
                      <div className="relative">
                        <img
                          src={room.imageUrl}
                          alt={room.name}
                          className="w-full h-64 object-cover"
                        />
                        <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold flex items-center shadow-lg">
                          <Bed className="w-4 h-4 mr-1" />
                          Rs. {room.price}/night
                        </div>
                      </div>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-2xl">{room.name}</CardTitle>
                        <CardDescription>{room.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            {room.amenities.map((amenity, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary"
                              >
                                {amenity}
                              </span>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button
                          className={`w-full text-lg py-6 rounded-xl ${room.popular ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70' : 'bg-secondary hover:bg-secondary/90'} text-primary-foreground transition-all duration-300 transform hover:scale-[1.02]`}
                          variant={room.popular ? "default" : "secondary"}
                        >
                          Book Now
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Gallery */}
            <section ref={galleryRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isGalleryInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Gallery
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full" />
              </motion.h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {gallery.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isGalleryInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                    className="transition-all duration-300"
                  >
                    <Card className="overflow-hidden rounded-2xl border border-border hover:shadow-lg transition-all duration-300">
                      <img
                        src={item.imageUrl}
                        alt={item.caption}
                        className="w-full h-48 object-cover"
                      />
                      <CardContent className="p-4">
                        <p className="text-center font-medium">{item.caption}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Reviews */}
            <section ref={reviewsRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isReviewsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Guest Reviews
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full" />
              </motion.h2>
              <div className="space-y-6">
                {reviews.map((review, index) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isReviewsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                    className="transition-all duration-300"
                  >
                    <Card className="border border-border rounded-2xl hover:shadow-lg transition-all duration-300">
                      <CardContent className="pt-6">
                        <div className="flex items-start">
                          <img
                            src={review.avatar}
                            alt={review.name}
                            className="w-16 h-16 rounded-full mr-6"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <h4 className="font-bold text-lg">{review.name}</h4>
                              <span className="text-sm text-muted-foreground">
                                {review.date}
                              </span>
                            </div>
                            <div className="flex items-center mb-3">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={`review-star-${review.id}-${i}`}
                                  className={`w-4 h-4 ${i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                    }`}
                                />
                              ))}
                            </div>
                            <p className="text-base mb-4">{review.content}</p>
                            <div className="flex items-center gap-6">
                              <Button variant="ghost" size="sm" className="gap-2 p-0 h-auto">
                                <ThumbsUp className="w-4 h-4" />
                                <span className="text-sm">{review.likes}</span>
                              </Button>
                              <Button variant="ghost" size="sm" className="gap-2 p-0 h-auto">
                                <MessageCircle className="w-4 h-4" />
                                <span className="text-sm">{review.replies} replies</span>
                              </Button>
                              <Button variant="ghost" size="sm" className="gap-2 p-0 h-auto">
                                <Bookmark className="w-4 h-4" />
                                <span className="text-sm">Save</span>
                              </Button>
                              <Button variant="ghost" size="sm" className="gap-2 p-0 h-auto">
                                <Share2 className="w-4 h-4" />
                                <span className="text-sm">Share</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Special Offers */}
            <section ref={offersRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isOffersInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Special Offers
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full" />
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {specialOffers.map((offer, index) => (
                  <motion.div
                    key={offer.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isOffersInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                    className="transition-all duration-300"
                  >
                    <Card className="border border-primary/20 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl">
                          <Bell className="w-6 h-6 text-primary" />
                          {offer.title}
                        </CardTitle>
                        <CardDescription>{offer.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-3xl font-bold text-primary">
                            {offer.discount}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Valid until {offer.validUntil}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Limited time offer - book now to save!
                        </p>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full text-lg py-6 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300 transform hover:scale-[1.02]">
                          Claim Offer
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
            {/* Business Info Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isBookingInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Bed className="w-7 h-7 text-primary" />
                    Hotel Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-start">
                    <MapPin className="w-6 h-6 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span className="text-lg">{hotelInfo.address}</span>
                  </div>
                  <div className="flex items-start">
                    <Phone className="w-6 h-6 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span className="text-lg">{hotelInfo.phone}</span>
                  </div>
                  <div className="flex items-start">
                    <Mail className="w-6 h-6 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span className="text-lg">{hotelInfo.email}</span>
                  </div>
                  <div className="flex items-start">
                    <Clock className="w-6 h-6 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span className="text-lg">{hotelInfo.hours}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Amenities Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isBookingInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Wifi className="w-7 h-7 text-primary" />
                    Hotel Amenities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {amenities.map((amenity, index) => (
                      <motion.div
                        key={`hotel-amenity-${amenity.name}`}
                        className="flex items-center gap-3 p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-all duration-300"
                        initial={{ opacity: 0, y: 10 }}
                        animate={isBookingInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ x: 5 }}
                      >
                        <amenity.icon className="w-5 h-5 text-primary" />
                        <span>{amenity.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Facilities Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isBookingInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Dumbbell className="w-7 h-7 text-primary" />
                    Our Facilities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {facilities.map((facility, index) => (
                      <motion.div
                        key={`hotel-facility-${facility.name}`}
                        className="flex items-center gap-3 p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-all duration-300"
                        initial={{ opacity: 0, y: 10 }}
                        animate={isBookingInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
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

            {/* Social Media */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isBookingInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.3 }}
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

            {/* Booking Assistance */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isBookingInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Phone className="w-7 h-7 text-primary" />
                    Need Help?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <Phone className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-lg">24/7 Booking Assistance</p>
                      <p className="text-sm text-muted-foreground">
                        Call us directly for immediate help
                      </p>
                    </div>
                  </div>
                  <Button className="w-full text-lg py-6 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300 transform hover:scale-[1.02]">
                    <Phone className="w-5 h-5 mr-2" />
                    Call Now
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
