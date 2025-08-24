"use client";

import ReactPlayer from 'react-player'
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
import { MediaPlayer, MediaPlayerVideo, MediaPlayerControls, MediaPlayerPlay, MediaPlayerSeek, MediaPlayerTime, MediaPlayerVolume, MediaPlayerFullscreen, MediaPlayerLoading, MediaPlayerControlsOverlay, MediaPlayerSeekBackward, MediaPlayerSeekForward, MediaPlayerPlaybackSpeed, MediaPlayerPiP, MediaPlayerError, MediaPlayerVolumeIndicator, MediaPlayerCaptions, MediaPlayerSettings } from "@/components/ui/media-player";
import {
  Calendar,
  Clock,
  Film,
  Mail,
  MapPin,
  Phone,
  Popcorn,
  Star,
  Ticket,
  User,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Heart,
  Share2,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
  Check,
  ChevronRight,
  CalendarDays,
  Timer,
  Tag,
  Award,
  Users,
  Eye,
  ThumbsUp,
  MessageCircle,
  Bookmark,
  Download,
  Wifi,
  Car,
  Coffee,
  Dumbbell,
  Map as MapIcon,
  X,
} from "lucide-react";
import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

interface Movie {
  id: string;
  title: string;
  genre: string;
  rating: number;
  duration: string;
  description: string;
  imageUrl: string;
  trailerUrl: string;
  releaseDate: string;
  director: string;
  cast: string[];
  showtimes: Showtime[];
}

interface Showtime {
  id: string;
  time: string;
  screen: string;
  availableSeats: number;
  totalSeats: number;
  price: number;
}

interface Snack {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  category: string;
}

interface Review {
  id: string;
  name: string;
  rating: number;
  date: string;
  content: string;
  likes: number;
  replies: number;
  avatar: string;
}

interface CinemaClientPageProps {
  slug: string;
}

export function CinemaClientPage({ slug }: CinemaClientPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [trailerPlaying, setTrailerPlaying] = useState(false);
  const [trailerMuted, setTrailerMuted] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [activeTab, setActiveTab] = useState("now-showing");

  // Mock data - in a real implementation, this would come from the API
  const cinemaInfo = {
    name: "Surkhet Cinema Hall",
    tagline: "Experience the Magic of Movies",
    description:
      "Experience the magic of movies in the heart of Surkhet with premium sound and visuals",
    rating: 4.7,
    totalReviews: 256,
    address: "Birendranagar, Surkhet",
    phone: "+977-98XXXXXXXX",
    email: "info@surkhetcinema.com",
    hours: "10:00 AM - 11:00 PM",
  };

  const movies: Movie[] = [
    {
      id: "1",
      title: "Inception",
      genre: "Sci-Fi, Thriller",
      rating: 8.8,
      duration: "2h 28m",
      description:
        "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
      imageUrl:
        "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400",
      trailerUrl: "https://www.youtube.com/embed/YoHD9XEInc0",
      releaseDate: "2010-07-16",
      director: "Christopher Nolan",
      cast: ["Leonardo DiCaprio", "Marion Cotillard", "Tom Hardy", "Elliot Page"],
      showtimes: [
        {
          id: "s1",
          time: "2:00 PM",
          screen: "Screen 1",
          availableSeats: 45,
          totalSeats: 100,
          price: 350,
        },
        {
          id: "s2",
          time: "6:30 PM",
          screen: "Screen 2",
          availableSeats: 78,
          totalSeats: 100,
          price: 350,
        },
        {
          id: "s3",
          time: "9:45 PM",
          screen: "Screen 1",
          availableSeats: 32,
          totalSeats: 100,
          price: 350,
        },
      ],
    },
    {
      id: "2",
      title: "The Dark Knight",
      genre: "Action, Crime, Drama",
      rating: 9.0,
      duration: "2h 32m",
      description:
        "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
      imageUrl:
        "https://images.unsplash.com/photo-1542204165-65bfec8098b5?w=400",
      trailerUrl: "https://www.youtube.com/embed/EXeTwQWrcwY",
      releaseDate: "2008-07-18",
      director: "Christopher Nolan",
      cast: ["Christian Bale", "Heath Ledger", "Aaron Eckhart", "Michael Caine"],
      showtimes: [
        {
          id: "s4",
          time: "3:15 PM",
          screen: "Screen 3",
          availableSeats: 67,
          totalSeats: 100,
          price: 350,
        },
        {
          id: "s5",
          time: "7:00 PM",
          screen: "Screen 1",
          availableSeats: 23,
          totalSeats: 100,
          price: 350,
        },
        {
          id: "s6",
          time: "10:30 PM",
          screen: "Screen 2",
          availableSeats: 89,
          totalSeats: 100,
          price: 350,
        },
      ],
    },
    {
      id: "3",
      title: "Interstellar",
      genre: "Adventure, Drama, Sci-Fi",
      rating: 8.6,
      duration: "2h 49m",
      description:
        "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
      imageUrl:
        "https://images.unsplash.com/photo-1537944434965-cf4669107b0d?w=400",
      trailerUrl: "https://www.youtube.com/embed/zSWdZVtXT7E",
      releaseDate: "2014-11-07",
      director: "Christopher Nolan",
      cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain", "Michael Caine"],
      showtimes: [
        {
          id: "s7",
          time: "1:45 PM",
          screen: "Screen 2",
          availableSeats: 56,
          totalSeats: 100,
          price: 350,
        },
        {
          id: "s8",
          time: "5:30 PM",
          screen: "Screen 3",
          availableSeats: 12,
          totalSeats: 100,
          price: 350,
        },
        {
          id: "s9",
          time: "9:15 PM",
          screen: "Screen 1",
          availableSeats: 74,
          totalSeats: 100,
          price: 350,
        },
      ],
    },
    {
      id: "4",
      title: "Tenet",
      genre: "Action, Sci-Fi, Thriller",
      rating: 7.3,
      duration: "2h 30m",
      description:
        "Armed with only one word, Tenet, and fighting for the survival of the entire world, a Protagonist journeys through a twilight world of international espionage on a mission that will unfold in something beyond real time.",
      imageUrl:
        "https://images.unsplash.com/photo-1598928926845-9d581c0a2a1a?w=400",
      trailerUrl: "https://www.youtube.com/embed/LdOM0x0XDMo",
      releaseDate: "2020-08-26",
      director: "Christopher Nolan",
      cast: ["John David Washington", "Robert Pattinson", "Elizabeth Debicki", "Kenneth Branagh"],
      showtimes: [
        {
          id: "s10",
          time: "4:00 PM",
          screen: "Screen 3",
          availableSeats: 48,
          totalSeats: 100,
          price: 400,
        },
        {
          id: "s11",
          time: "8:15 PM",
          screen: "Screen 2",
          availableSeats: 63,
          totalSeats: 100,
          price: 400,
        },
      ],
    },
  ];

  const snacks: Snack[] = [
    {
      id: "1",
      name: "Large Popcorn",
      price: 250,
      description: "Buttered popcorn in a large container",
      imageUrl:
        "https://images.unsplash.com/photo-1537944434965-cf4669107b0d?w=100",
      category: "Snacks",
    },
    {
      id: "2",
      name: "Nachos with Cheese",
      price: 300,
      description: "Crispy nachos with melted cheese",
      imageUrl:
        "https://images.unsplash.com/photo-1537944434965-cf4669107b0d?w=100",
      category: "Snacks",
    },
    {
      id: "3",
      name: "Soft Drinks",
      price: 150,
      description: "Assorted soft drinks (Coke, Sprite, Fanta)",
      imageUrl:
        "https://images.unsplash.com/photo-1537944434965-cf4669107b0d?w=100",
      category: "Beverages",
    },
    {
      id: "4",
      name: "Candy Pack",
      price: 200,
      description: "Assorted candies (Snickers, M&Ms, Twix)",
      imageUrl:
        "https://images.unsplash.com/photo-1537944434965-cf4669107b0d?w=100",
      category: "Candy",
    },
    {
      id: "5",
      name: "Hot Dog",
      price: 180,
      description: "Grilled hot dog with ketchup and mustard",
      imageUrl:
        "https://images.unsplash.com/photo-1537944434965-cf4669107b0d?w=100",
      category: "Food",
    },
    {
      id: "6",
      name: "Ice Cream",
      price: 120,
      description: "Vanilla ice cream with chocolate sauce",
      imageUrl:
        "https://images.unsplash.com/photo-1537944434965-cf4669107b0d?w=100",
      category: "Desserts",
    },
  ];

  const reviews: Review[] = [
    {
      id: "1",
      name: "Ramesh Thapa",
      rating: 5,
      date: "2023-10-15",
      content:
        "Amazing cinema experience! The sound system is incredible and the seats are so comfortable. Will definitely be coming back!",
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
        "Beautiful cinema hall with great amenities. The staff was incredibly helpful and the movie selection is fantastic.",
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
        "Best cinema I've been to in Nepal! The premium experience was worth every penny. Highly recommended!",
      likes: 32,
      replies: 5,
      avatar: "https://randomuser.me/api/portraits/men/67.jpg",
    },
  ];

  const amenities = [
    { icon: Film, name: "IMAX Screens" },
    { icon: Popcorn, name: "Concession Stand" },
    { icon: Calendar, name: "Online Booking" },
    { icon: Ticket, name: "E-Tickets" },
    { icon: Wifi, name: "Free WiFi" },
    { icon: Car, name: "Parking" },
    { icon: Coffee, name: "Café" },
    { icon: Dumbbell, name: "Gaming Zone" },
  ];

  const comingSoon: Movie[] = [
    {
      id: "5",
      title: "Oppenheimer",
      genre: "Biography, Drama, History",
      rating: 8.5,
      duration: "3h 00m",
      description:
        "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
      imageUrl:
        "https://images.unsplash.com/photo-1689511954621-7c1a2a0a2a1a?w=400",
      trailerUrl: "https://www.youtube.com/embed/uYPbbksJxIg",
      releaseDate: "2023-07-21",
      director: "Christopher Nolan",
      cast: ["Cillian Murphy", "Emily Blunt", "Matt Damon", "Robert Downey Jr."],
      showtimes: [],
    },
    {
      id: "6",
      title: "Dune: Part Two",
      genre: "Action, Adventure, Drama",
      rating: 8.8,
      duration: "2h 46m",
      description:
        "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
      imageUrl:
        "https://images.unsplash.com/photo-1689511954621-7c1a2a0a2a1b?w=400",
      trailerUrl: "https://www.youtube.com/embed/Q1f2J2Jivuo",
      releaseDate: "2024-03-01",
      director: "Denis Villeneuve",
      cast: ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson", "Josh Brolin"],
      showtimes: [],
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would connect to the contact system
    alert(
      `Thank you ${name}! Your message has been sent to ${cinemaInfo.name}.`,
    );
    setName("");
    setEmail("");
    setMessage("");
  };

  const playTrailer = (movie: Movie) => {
    setSelectedMovie(movie);
    setTrailerPlaying(true);
    setTrailerMuted(false);
  };

  const closeTrailer = () => {
    setTrailerPlaying(false);
    setSelectedMovie(null);
  };

  // Refs for animations
  const heroRef = useRef(null);
  const moviesRef = useRef(null);
  const snacksRef = useRef(null);
  const reviewsRef = useRef(null);
  const contactRef = useRef(null);

  const isHeroInView = useInView(heroRef, { once: true, margin: "-100px" });
  const isMoviesInView = useInView(moviesRef, { once: true, margin: "-100px" });
  const isSnacksInView = useInView(snacksRef, { once: true, margin: "-100px" });
  const isReviewsInView = useInView(reviewsRef, { once: true, margin: "-100px" });
  const isContactInView = useInView(contactRef, { once: true, margin: "-100px" });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden" ref={heroRef}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/40 z-10" />
        <img
          src="https://images.unsplash.com/photo-1537944434965-cf4669107b0d?w=1200"
          alt="Cinema"
          className="w-full h-full object-cover"
        />
        <div className="relative z-20 flex flex-col items-center justify-center min-h-[70vh] px-6 py-20 text-center text-white">
          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 max-w-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {cinemaInfo.name}
          </motion.h1>
          <motion.div
            className="flex items-center justify-center mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          >
            {[...Array(5)].map((_, i) => (
              <Star
                key={`cinema-rating-star-${i}`}
                className={`w-6 h-6 ${
                  i < Math.floor(cinemaInfo.rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
            <span className="ml-3 text-lg font-medium">{cinemaInfo.rating} ({cinemaInfo.totalReviews} reviews)</span>
          </motion.div>
          <motion.p
            className="text-xl md:text-2xl max-w-3xl mb-4 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
          >
            {cinemaInfo.tagline}
          </motion.p>
          <motion.p
            className="text-lg md:text-xl max-w-3xl mb-10 leading-relaxed text-white/90"
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
          >
            {cinemaInfo.description}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.8 }}
          >
            <Button size="lg" className="text-lg px-8 py-6 rounded-full bg-white text-primary hover:bg-white/90 transition-all duration-300 transform hover:scale-105">
              Book Tickets Now
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
            {/* Now Showing */}
            <section ref={moviesRef}>
              <motion.div
                className="flex items-center justify-between mb-12"
                initial={{ opacity: 0, x: -20 }}
                animate={isMoviesInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4 relative inline-block">
                  Now Showing
                  <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full"></span>
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant={activeTab === "now-showing" ? "default" : "outline"}
                    onClick={() => setActiveTab("now-showing")}
                    className="rounded-full"
                  >
                    Now Showing
                  </Button>
                  <Button
                    variant={activeTab === "coming-soon" ? "default" : "outline"}
                    onClick={() => setActiveTab("coming-soon")}
                    className="rounded-full"
                  >
                    Coming Soon
                  </Button>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {(activeTab === "now-showing" ? movies : comingSoon).map((movie, index) => (
                  <motion.div
                    key={movie.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isMoviesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -10 }}
                    className="transition-all duration-300"
                  >
                    <Card className="overflow-hidden h-full border border-border rounded-2xl hover:shadow-lg transition-all duration-300">
                      <div className="relative">
                        <img
                          src={movie.imageUrl}
                          alt={movie.title}
                          className="w-full h-64 object-cover"
                        />
                        <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold flex items-center shadow-lg">
                          <Star className="w-4 h-4 fill-current mr-1" />
                          {movie.rating}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm rounded-full w-10 h-10 border-primary/30 hover:bg-primary/10 transition-all duration-300"
                          onClick={() => playTrailer(movie)}
                        >
                          <Play className="w-5 h-5 text-primary" />
                        </Button>
                      </div>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl mb-2">{movie.title}</CardTitle>
                            <CardDescription>{movie.genre}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {movie.description}
                        </p>
                        <div className="flex items-center text-sm mb-2">
                          <Clock className="w-4 h-4 mr-1 text-primary" />
                          <span>{movie.duration}</span>
                        </div>
                        <div className="flex items-center text-sm mb-4">
                          <Calendar className="w-4 h-4 mr-1 text-primary" />
                          <span>{new Date(movie.releaseDate).toLocaleDateString()}</span>
                        </div>
                        {activeTab === "now-showing" && (
                          <div className="space-y-3">
                            <p className="font-medium text-sm">Showtimes:</p>
                            <div className="flex flex-wrap gap-2">
                              {movie.showtimes.map((showtime) => (
                                <Button
                                  key={showtime.id}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs border-primary/30 hover:bg-primary/10 transition-all duration-300 rounded-full"
                                >
                                  <Clock className="w-3 h-3 mr-1" />
                                  {showtime.time} ({showtime.screen}) -{" "}
                                  <span className="font-bold ml-1">{showtime.availableSeats}</span> seats -{" "}
                                  <span className="font-bold ml-1">Rs. {showtime.price}</span>
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full py-6 text-lg rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300 transform hover:scale-[1.02]">
                          {activeTab === "now-showing" ? "Book Tickets" : "Notify Me"}
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Snacks & Beverages */}
            <section ref={snacksRef}>
              <motion.h2
                className="text-3xl md:text-4xl font-bold mb-12 relative inline-block"
                initial={{ opacity: 0, x: -20 }}
                animate={isSnacksInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.6 }}
              >
                Snacks & Beverages
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full"></span>
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {snacks.map((snack, index) => (
                  <motion.div
                    key={snack.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isSnacksInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                    className="transition-all duration-300"
                  >
                    <Card className="text-center h-full border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-3">
                        <div className="mx-auto bg-muted rounded-xl w-20 h-20 flex items-center justify-center mb-4">
                          <Popcorn className="w-10 h-10 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{snack.name}</CardTitle>
                        <CardDescription>{snack.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <p className="text-xl font-bold text-primary">
                          Rs. {snack.price}
                        </p>
                        <span className="text-xs text-muted-foreground">{snack.category}</span>
                      </CardContent>
                      <CardFooter className="pb-6">
                        <Button size="sm" className="rounded-full py-5 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300">
                          Add to Cart
                        </Button>
                      </CardFooter>
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
                What Our Customers Say
                <span className="absolute bottom-0 left-0 w-1/3 h-1 bg-primary rounded-full"></span>
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
                                  className={`w-4 h-4 ${
                                    i < review.rating
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
            {/* Business Info Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isMoviesInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Film className="w-6 h-6 text-primary" />
                    Business Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span>{cinemaInfo.address}</span>
                  </div>
                  <div className="flex items-start">
                    <Phone className="w-5 h-5 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span>{cinemaInfo.phone}</span>
                  </div>
                  <div className="flex items-start">
                    <Mail className="w-5 h-5 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span>{cinemaInfo.email}</span>
                  </div>
                  <div className="flex items-start">
                    <Clock className="w-5 h-5 mr-4 mt-1 text-primary flex-shrink-0" />
                    <span>{cinemaInfo.hours}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Amenities Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isMoviesInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Ticket className="w-6 h-6 text-primary" />
                    Amenities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {amenities.map((amenity, index) => (
                      <motion.div
                        key={`cinema-amenity-${amenity.name}`}
                        className="flex items-center gap-3 p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-all duration-300"
                        initial={{ opacity: 0, y: 10 }}
                        animate={isMoviesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
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

            {/* Social Media */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isMoviesInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Users className="w-6 h-6 text-primary" />
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

            {/* Upcoming Releases Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={isMoviesInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="border border-border rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <Calendar className="w-6 h-6 text-primary" />
                    Coming Soon
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-all duration-300">
                    <div className="bg-muted rounded-xl w-16 h-16 flex items-center justify-center flex-shrink-0">
                      <Film className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Spider-Man: Beyond</p>
                      <p className="text-sm text-muted-foreground">
                        Release: Aug 15
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-all duration-300">
                    <div className="bg-muted rounded-xl w-16 h-16 flex items-center justify-center flex-shrink-0">
                      <Film className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Avatar 3</p>
                      <p className="text-sm text-muted-foreground">
                        Release: Sep 22
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-all duration-300">
                    <div className="bg-muted rounded-xl w-16 h-16 flex items-center justify-center flex-shrink-0">
                      <Film className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Fast X: Part 2</p>
                      <p className="text-sm text-muted-foreground">
                        Release: Oct 5
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Trailer Modal */}
      {trailerPlaying && selectedMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl mx-4">
            <Button
              variant="outline"
              size="icon"
              className="absolute -top-12 right-0 rounded-full bg-background/80 backdrop-blur-sm border-border hover:bg-primary/10 transition-all duration-300"
              onClick={closeTrailer}
            >
              <X className="w-5 h-5 text-primary" />
            </Button>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <MediaPlayer autoHide>
                <MediaPlayerVideo
                  asChild
                >
                  <ReactPlayer src={selectedMovie.trailerUrl} width="100%" height="100%" autoPlay />
                </MediaPlayerVideo>
                <MediaPlayerLoading />
                <MediaPlayerError />
                <MediaPlayerVolumeIndicator />
                <MediaPlayerControls className="flex-col items-start gap-2.5">
                  <MediaPlayerControlsOverlay />
                  <MediaPlayerSeek />
                  <div className="flex w-full items-center gap-2">
                    <div className="flex flex-1 items-center gap-2">
                      <MediaPlayerPlay />
                      <MediaPlayerSeekBackward />
                      <MediaPlayerSeekForward />
                      <MediaPlayerVolume expandable />
                      <MediaPlayerTime />
                    </div>
                    <div className="flex items-center gap-2">
                      <MediaPlayerCaptions />
                      <MediaPlayerSettings />
                      <MediaPlayerPiP />
                      <MediaPlayerFullscreen />
                    </div>
                  </div>
                </MediaPlayerControls>
              </MediaPlayer>
            </div>
            <div className="mt-4 bg-background/80 backdrop-blur-sm rounded-2xl p-6">
              <h3 className="text-2xl font-bold mb-2">{selectedMovie.title}</h3>
              <p className="text-muted-foreground mb-4">{selectedMovie.description}</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  {selectedMovie.genre}
                </span>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  {selectedMovie.duration}
                </span>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  <Star className="w-4 h-4 inline mr-1 fill-yellow-400 text-yellow-400" />
                  {selectedMovie.rating}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
