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
	Calendar,
	MapPin,
	Star,
	Wifi,
	Car,
	Coffee,
	Dumbbell,
	Waves,
	Phone,
	Mail,
	Clock,
} from "lucide-react";
import { useState } from "react";

interface RoomType {
	id: string;
	name: string;
	description: string;
	price: number;
	imageUrl: string;
	amenities: string[];
}

interface HotelClientPageProps {
	slug: string;
}

export function HotelClientPage({ slug }: HotelClientPageProps) {
	const [checkIn, setCheckIn] = useState("");
	const [checkOut, setCheckOut] = useState("");
	const [guests, setGuests] = useState(2);

	// Mock data - in a real implementation, this would come from the API
	const hotelInfo = {
		name: "Grand Surkhet Hotel",
		description: "Experience luxury and comfort in the heart of Surkhet Valley",
		rating: 4.8,
		address: "Ratnapark, Surkhet",
		phone: "+977-98XXXXXXXX",
		email: "info@grandsurkhet.com",
		checkInTime: "2:00 PM",
		checkOutTime: "11:00 AM",
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
	];

	const amenities = [
		{ icon: Wifi, name: "Free WiFi" },
		{ icon: Car, name: "Parking" },
		{ icon: Coffee, name: "Restaurant" },
		{ icon: Dumbbell, name: "Fitness Center" },
		{ icon: Waves, name: "Swimming Pool" },
	];

	const handleBooking = () => {
		// In a real implementation, this would connect to the booking system
		alert(
			`Booking request for ${hotelInfo.name} from ${checkIn} to ${checkOut} for ${guests} guests`,
		);
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-background to-muted">
			{/* Hero Section */}
			<div className="relative h-96 overflow-hidden rounded-b-3xl">
				<div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30 z-10" />
				<img
					src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200"
					alt="Hotel Exterior"
					className="w-full h-full object-cover"
				/>
				<div className="absolute inset-0 z-20 flex flex-col justify-center items-start p-8 text-white">
					<h1 className="text-4xl md:text-5xl font-bold mb-2">
						{hotelInfo.name}
					</h1>
					<div className="flex items-center mb-4">
						{[...Array(5)].map((_, i) => (
							<Star
								key={i}
								className={`w-5 h-5 ${i < Math.floor(hotelInfo.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
							/>
						))}
						<span className="ml-2">{hotelInfo.rating} (128 reviews)</span>
					</div>
					<p className="text-lg max-w-2xl">{hotelInfo.description}</p>
				</div>
			</div>

			<div className="container mx-auto px-4 py-8">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Main Content */}
					<div className="lg:col-span-2 space-y-8">
						{/* Booking Widget */}
						<Card className="shadow-lg">
							<CardHeader>
								<CardTitle>Book Your Stay</CardTitle>
								<CardDescription>
									Find the perfect room for your stay in Surkhet
								</CardDescription>
							</CardHeader>
							<CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
								<div className="md:col-span-2 space-y-2">
									<Label htmlFor="check-in">Check In</Label>
									<div className="relative">
										<Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
										<Input
											id="check-in"
											type="date"
											value={checkIn}
											onChange={(e) => setCheckIn(e.target.value)}
											className="pl-10"
										/>
									</div>
								</div>
								<div className="md:col-span-2 space-y-2">
									<Label htmlFor="check-out">Check Out</Label>
									<div className="relative">
										<Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
										<Input
											id="check-out"
											type="date"
											value={checkOut}
											onChange={(e) => setCheckOut(e.target.value)}
											className="pl-10"
										/>
									</div>
								</div>
								<div className="space-y-2">
									<Label htmlFor="guests">Guests</Label>
									<Input
										id="guests"
										type="number"
										min="1"
										max="10"
										value={guests}
										                        onChange={(e) => setGuests(Number.parseInt(e.target.value) || 1)}
									/>
								</div>
								<div className="flex items-end">
									<Button onClick={handleBooking} className="w-full">
										Check Availability
									</Button>
								</div>
							</CardContent>
						</Card>

						{/* Room Types */}
						<section>
							<h2 className="text-2xl font-bold mb-6">Room Types</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{roomTypes.map((room) => (
									<Card
										key={room.id}
										className="overflow-hidden transition-all hover:shadow-lg"
									>
										<img
											src={room.imageUrl}
											alt={room.name}
											className="w-full h-48 object-cover"
										/>
										<CardHeader>
											<div className="flex justify-between items-start">
												<CardTitle>{room.name}</CardTitle>
												<div className="text-right">
													<p className="text-2xl font-bold">Rs. {room.price}</p>
													<p className="text-sm text-muted-foreground">
														per night
													</p>
												</div>
											</div>
											<CardDescription>{room.description}</CardDescription>
										</CardHeader>
										<CardContent>
											<div className="flex flex-wrap gap-2">
												{room.amenities.map((amenity) => (
													<span
														key={amenity}
														className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full"
													>
														{amenity}
													</span>
												))}
											</div>
										</CardContent>
										<CardFooter>
											<Button className="w-full">Book Now</Button>
										</CardFooter>
									</Card>
								))}
							</div>
						</section>

						{/* Amenities */}
						<section>
							<h2 className="text-2xl font-bold mb-6">Hotel Amenities</h2>
							<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
								{amenities.map((amenity, index) => (
									<Card key={index} className="text-center p-4">
										<amenity.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
										<p className="text-sm">{amenity.name}</p>
									</Card>
								))}
							</div>
						</section>
					</div>

					{/* Sidebar */}
					<div className="space-y-6">
						{/* Contact Info */}
						<Card>
							<CardHeader>
								<CardTitle>Contact Information</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center">
									<MapPin className="w-5 h-5 mr-3 text-primary" />
									<span>{hotelInfo.address}</span>
								</div>
								<div className="flex items-center">
									<Phone className="w-5 h-5 mr-3 text-primary" />
									<span>{hotelInfo.phone}</span>
								</div>
								<div className="flex items-center">
									<Mail className="w-5 h-5 mr-3 text-primary" />
									<span>{hotelInfo.email}</span>
								</div>
								<div className="flex items-center">
									<Clock className="w-5 h-5 mr-3 text-primary" />
									<div>
										<p>Check-in: {hotelInfo.checkInTime}</p>
										<p>Check-out: {hotelInfo.checkOutTime}</p>
									</div>
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
									<MapPin className="w-12 h-12 text-primary" />
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
