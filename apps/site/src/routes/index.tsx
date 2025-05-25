import Features from "@/components/features-3";
import FooterSection from "@/components/footer";
import HeroSection from "@/components/hero-section";
import Pricing from "@/components/pricing";
import StatsSection from "@/components/stats-4";
import TeamSection from "@/components/team";
import WallOfLoveSection from "@/components/testimonials";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useGun } from '../lib/gun/GunProvider'; // Import useGun
import { addToCart } from '../lib/cart'; // Import addToCart
import { initializeSampleSeats } from '../lib/seat'; // Import initializeSampleSeats
import { useEffect } from 'react'; // Import useEffect

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	const { gun } = useGun(); // Get gun instance

	useEffect(() => {
		if (gun) {
			const SAMPLE_VENUE_ID = "main_hall";
			initializeSampleSeats(gun, SAMPLE_VENUE_ID)
				.then(() => console.log(`Sample seats initialization process completed for venue ${SAMPLE_VENUE_ID}.`))
				.catch(err => console.error(`Error during sample seats initialization for venue ${SAMPLE_VENUE_ID}:`, err));
		} else {
			console.log("Gun instance not available on Home mount, skipping seat initialization.");
		}
	}, [gun]); // Run when gun instance becomes available

	const handleGenericAddToCart = async (productId: string, productName: string, price: number, imageUrl?: string) => {
		if (!gun) {
			console.error("Gun instance not available for addToCart");
			alert("Gun instance not available. See console.");
			return;
		}
		try {
			await addToCart(gun, productId, 1, price, productName, imageUrl || "https://via.placeholder.com/150");
			alert(`"${productName}" (ID: ${productId}) added to cart! Quantity: 1, Price: $${price}. Check console and navigate to /cart.`);
		} catch (error) {
			console.error(`Error adding ${productName} to cart:`, error);
			alert(`Failed to add ${productName} to cart. Check console for errors.`);
		}
	};

	const testProducts = [
		{ id: "prod101", name: "Awesome T-Shirt", price: 25.99, imageUrl: "https://via.placeholder.com/150/FF0000/FFFFFF?Text=T-Shirt" },
		{ id: "prod102", name: "Cool Hat", price: 15.50, imageUrl: "https://via.placeholder.com/150/00FF00/FFFFFF?Text=Hat" },
		{ id: "prod103", name: "Stylish Mug", price: 12.75, imageUrl: "https://via.placeholder.com/150/0000FF/FFFFFF?Text=Mug" },
	];

	return (
		<>
			{/* Temporary buttons to test addToCart */}
			<div style={{ 
				position: 'fixed', 
				top: '20px', 
				right: '20px', 
				zIndex: 10000, 
				background: 'rgba(255, 255, 255, 0.9)', 
				padding: '15px', 
				border: '1px solid #ccc', 
				borderRadius: '8px', 
				boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
				display: 'flex',
				flexDirection: 'column',
				gap: '10px'
			}}>
				<h4 style={{ fontWeight: 'bold', marginBottom: '5px', textAlign: 'center', fontSize: '1.1em' }}>Test Products</h4>
				{testProducts.map(product => (
					<button
						key={product.id}
						onClick={() => handleGenericAddToCart(product.id, product.name, product.price, product.imageUrl)}
						style={{ 
							padding: '10px 15px', 
							backgroundColor: '#007bff', 
							color: 'white', 
							border: 'none', 
							borderRadius: '5px', 
							cursor: 'pointer',
							fontSize: '0.9em',
							textAlign: 'left'
						}}
						title={`Add ${product.name} to cart`}
					>
						Add: {product.name} (${product.price})
					</button>
				))}
				<Link 
					to="/cart" 
					style={{ 
						display: 'block',
						padding: '10px 15px',
						backgroundColor: '#28a745',
						color: 'white',
						textDecoration: 'none',
						borderRadius: '5px',
						textAlign: 'center',
						fontSize: '1em',
						marginTop: '10px'
					}}
				>
					Go to Cart
				</Link>
			</div>
			<HeroSection />
			{/* The rest of the page components are commented out for clarity during testing */}
			{/* <StatsSection /> */}
			{/* <Features /> */}
			{/* <WallOfLoveSection /> */}
			{/* <Pricing /> */}
			{/* <TeamSection /> */}
			{/* <FooterSection /> */}
		</>
	);
}
