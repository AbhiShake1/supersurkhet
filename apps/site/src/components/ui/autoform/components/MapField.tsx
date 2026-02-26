import type React from 'react';
import { useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import {
  // biome-ignore lint/suspicious/noShadowRestrictedNames: lint debt cleanup
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  useMap,
} from '@/components/ui/map';
import type { AutoFormFieldProps } from '../react';

type GpsCoordinate = [number, number]; // [latitude, longitude]
const DEFAULT_COORDINATES: GpsCoordinate = [28.597, 81.634];

function parseCoordinateValue(value: unknown): GpsCoordinate | null {
  if (!value) return null;

  if (Array.isArray(value) && value.length === 2) {
    const [lat, lng] = value;
    if (typeof lat === 'number' && typeof lng === 'number') {
      return [lat, lng];
    }
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (
        Array.isArray(parsed) &&
        parsed.length === 2 &&
        typeof parsed[0] === 'number' &&
        typeof parsed[1] === 'number'
      ) {
        return [parsed[0], parsed[1]];
      }
    } catch {
      const coords = value.split(',').map(Number);
      if (coords.length === 2 && !coords.some(Number.isNaN)) {
        return [coords[0], coords[1]];
      }
    }
  }

  return null;
}

const MapClickHandler: React.FC<{
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  onMapClick: (e: any) => void;
}> = ({ onMapClick }) => {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    const handleClick = (e: any) => {
      onMapClick(e);
    };

    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
    };
  }, [map, isLoaded, onMapClick]);

  return null;
};

export const MapField: React.FC<AutoFormFieldProps> = ({
  inputProps,
  error,
  value,
}) => {
  const { onChange } = inputProps;
  const coordinates = parseCoordinateValue(value) ?? DEFAULT_COORDINATES;

  const handleMapClick = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    (e: any) => {
      // Using 'any' since maplibregl types might not be available here
      const newCoords: GpsCoordinate = [e.lngLat.lat, e.lngLat.lng];

      // Convert coordinates to string format for form submission
      const coordinateString = JSON.stringify(newCoords);
      onChange(coordinateString);
    },
    [onChange],
  );

  return (
    <div className="space-y-2">
      <Card className="h-[300px] p-0 overflow-hidden relative">
        <Map
          center={[coordinates[1], coordinates[0]]} // Note: Map expects [longitude, latitude] but we store [latitude, longitude]
          zoom={13}
        >
          <MapClickHandler onMapClick={handleMapClick} />
          <MapControls showZoom={true} showLocate={true} />
          <MapMarker longitude={coordinates[1]} latitude={coordinates[0]}>
            <MarkerContent />
          </MapMarker>
        </Map>
      </Card>
      <div className="text-sm text-muted-foreground">
        Click on the map to set the location. Current coordinates: [
        {coordinates[0]}, {coordinates[1]}]
      </div>
      {error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  );
};
