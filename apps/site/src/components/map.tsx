import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

// Fix for the missing marker icon issue
if (typeof window !== "undefined") {
	import("leaflet").then((L) => {
		// @ts-ignore
		delete L.Icon.Default.prototype._getIconUrl;
		L.Icon.Default.mergeOptions({
			iconRetinaUrl:
				"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
			iconUrl:
				"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
			shadowUrl:
				"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
		});
	});
}

export function MapView() {
	// Center coordinates for Surkhet, Nepal
	const position: [number, number] = [28.597, 81.634];

	useEffect(() => {
		// Force a resize event when the map is mounted to ensure proper rendering
		window.dispatchEvent(new Event("resize"));
	}, []);

	return (
		<div className="h-screen w-full relative bg-gray-100 -z-50">
			<MapContainer
				center={position}
				zoom={13}
				style={{ height: "100%", width: "100%" }}
			>
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				<Marker position={position}>
					<Popup>Surkhet, Nepal</Popup>
				</Marker>
			</MapContainer>
		</div>
	);
}
