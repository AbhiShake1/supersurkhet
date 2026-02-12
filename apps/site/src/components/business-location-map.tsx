import { Card } from '@/components/ui/card';
import {
  // biome-ignore lint/suspicious/noShadowRestrictedNames: lint debt cleanup
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
} from '@/components/ui/map';
import type { Business } from '@/lib/schema';
import type React from 'react';

interface BusinessLocationMapProps {
  business: Business;
  className?: string;
}

export const BusinessLocationMap: React.FC<BusinessLocationMapProps> = ({
  business,
  className,
}) => {
  if (!business.locationCoordinates) {
    return (
      <div className={className}>
        <Card className="p-4 flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            Location not set for this business
          </p>
        </Card>
      </div>
    );
  }

  let coordinates: [number, number] | null = null;

  try {
    // Attempt to parse the value as a JSON array
    const parsedValue = JSON.parse(business.locationCoordinates);
    if (Array.isArray(parsedValue) && parsedValue.length === 2) {
      coordinates = parsedValue as [number, number];
    }
  } catch (_e) {
    // If parsing fails, try to split by comma if it's a string
    if (typeof business.locationCoordinates === 'string') {
      const coords = business.locationCoordinates.split(',').map(Number);
      if (coords.length === 2 && !coords.some(Number.isNaN)) {
        coordinates = coords as [number, number];
      }
    }
  }

  if (!coordinates) {
    return (
      <div className={className}>
        <Card className="p-4 flex items-center justify-center h-64">
          <p className="text-muted-foreground">Invalid location coordinates</p>
        </Card>
      </div>
    );
  }

  // Note: Map expects [longitude, latitude] but we store [latitude, longitude]
  const mapCenter: [number, number] = [coordinates[1], coordinates[0]];

  return (
    <div className={className}>
      <Card className="h-64 p-0 overflow-hidden relative">
        <Map center={mapCenter} zoom={13}>
          <MapControls showZoom={true} showLocate={false} />
          <MapMarker longitude={coordinates[1]} latitude={coordinates[0]}>
            <MarkerContent />
          </MapMarker>
        </Map>
      </Card>
      <div className="text-sm text-muted-foreground mt-2">
        Business location: [{coordinates[0]}, {coordinates[1]}]
      </div>
    </div>
  );
};
