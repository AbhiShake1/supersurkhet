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
import { Phone, Mail, MapPin, Clock, Star } from "lucide-react";
import { useState } from "react";

interface GenericClientPageProps {
	slug: string;
	businessType: string;
}

export function GenericClientPage({
	slug,
	businessType,
}: GenericClientPageProps) {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState("");

	// Mock data - in a real implementation, this would come from the API
	const businessInfo = {
		name: "Business Name",
		description:
			"A brief description of what this business offers and why customers should choose them.",
		rating: 4.5,
		address: "Business Address, Surkhet",
		phone: "+977-98XXXXXXXX",
		email: "info@business.com",
		hours: "9:00 AM - 6:00 PM",
		businessType: businessType.replace(/_/g, " "),
	};

	const services = [
		{
			id: "1",
			name: "Service/Product 1",
			description: "Description of the first service or product offered",
			price: "Starting from Rs. 1,000",
		},
		{
			id: "2",
			name: "Service/Product 2",
			description: "Description of the second service or product offered",
			price: "Starting from Rs. 2,500",
		},
		{
			id: "3",
			name: "Service/Product 3",
			description: "Description of the third service or product offered",
			price: "Starting from Rs. 5,000",
		},
	];

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		// In a real implementation, this would connect to the contact system
		alert(
			`Thank you ${name}! Your message has been sent to ${businessInfo.name}.`,
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
					src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200"
					alt="Business"
					className="w-full h-full object-cover"
				/>
				<div className="absolute inset-0 z-20 flex flex-col justify-center items-start p-8 text-white">
					<h1 className="text-4xl md:text-5xl font-bold mb-2">
						{businessInfo.name}
					</h1>
					<div className="flex items-center mb-4">
						{[...Array(5)].map((_, i) => (
							<Star
								key={i}
								className={`w-5 h-5 ${i < Math.floor(businessInfo.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
							/>
						))}
						<span className="ml-2">{businessInfo.rating} (89 reviews)</span>
					</div>
					<p className="text-lg max-w-2xl">{businessInfo.description}</p>
				</div>
			</div>

			<div className="container mx-auto px-4 py-8">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Main Content */}
					<div className="lg:col-span-2 space-y-8">
						{/* Services/Products */}
						<section>
							<h2 className="text-2xl font-bold mb-6">Our Services</h2>
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
											<p className="text-2xl font-bold text-primary">
												{service.price}
											</p>
										</CardContent>
										<CardFooter>
											<Button className="w-full">Learn More</Button>
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
									<span>{businessInfo.address}</span>
								</div>
								<div className="flex items-center">
									<Phone className="w-5 h-5 mr-3 text-primary" />
									<span>{businessInfo.phone}</span>
								</div>
								<div className="flex items-center">
									<Mail className="w-5 h-5 mr-3 text-primary" />
									<span>{businessInfo.email}</span>
								</div>
								<div className="flex items-center">
									<Clock className="w-5 h-5 mr-3 text-primary" />
									<span>{businessInfo.hours}</span>
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
