import { Card } from "@/components/ui/card";
import { Map, MapControls, MapMarker, MarkerContent } from "@/components/ui/map";
import type { AutoPreviewComponent } from "../../../auto-preview";
import type React from "react";

type GpsCoordinate = [number, number]; 

export const MapPreview: AutoPreviewComponent<string> = ({ value }) => {

  let coordinates: GpsCoordinate = [28.597, 81.634]; // Default to Surkhet, Nepal

  if (value) {
    try {
      // Attempt to parse the value as a JSON array
      const parsedValue = JSON.parse(value);
      if (Array.isArray(parsedValue) && parsedValue.length === 2) {
        coordinates = parsedValue as GpsCoordinate;
      }
    } catch (e) {
      // If parsing fails, try to split by comma if it's a string
      if (typeof value === 'string') {
        const coords = value.split(',').map(Number);
        if (coords.length === 2 && !coords.some(isNaN)) {
          coordinates = coords as GpsCoordinate;
        }
      }
    }
  }

  return (
    <div className="space-y-2">
      <Card className="h-[300px] p-0 overflow-hidden relative">
        <Map 
          center={[coordinates[1], coordinates[0]]} // Note: Map expects [longitude, latitude] but we store [latitude, longitude]
          zoom={13}
        >
          <MapControls showZoom={true} showLocate={false} />
          <MapMarker 
            longitude={coordinates[1]} 
            latitude={coordinates[0]}
          >
            <MarkerContent />
          </MapMarker>
        </Map>
      </Card>
      <div className="text-sm text-muted-foreground">
        Business location: [{coordinates[0]}, {coordinates[1]}]
      </div>
    </div>
  );
};