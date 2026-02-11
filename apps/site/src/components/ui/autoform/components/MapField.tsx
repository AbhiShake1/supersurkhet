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
import type React from 'react';
import { useState, useEffect, useCallback } from 'react';

type GpsCoordinate = [number, number]; // [latitude, longitude]

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
  // biome-ignore lint/correctness/noUnusedFunctionParameters: lint debt cleanup
  id,
  value,
}) => {
  // biome-ignore lint/correctness/noUnusedVariables: lint debt cleanup
  const { key, onChange, ...props } = inputProps;

  // Parse the value from the form state - expecting a stringified array like "[28.597,81.634]"
  const [coordinates, setCoordinates] = useState<GpsCoordinate>([
    28.597, 81.634,
  ]); // Default to Surkhet, Nepal

  useEffect(() => {
    if (value) {
      try {
        // Attempt to parse the value as a JSON array
        const parsedValue = JSON.parse(value);
        if (Array.isArray(parsedValue) && parsedValue.length === 2) {
          setCoordinates(parsedValue as GpsCoordinate);
        }
      } catch (_e) {
        // If parsing fails, try to split by comma if it's a string
        if (typeof value === 'string') {
          const coords = value.split(',').map(Number);
          if (coords.length === 2 && !coords.some(Number.isNaN)) {
            setCoordinates(coords as GpsCoordinate);
          }
        }
      }
    }
  }, [value]);

  const handleMapClick = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    (e: any) => {
      // Using 'any' since maplibregl types might not be available here
      const newCoords: GpsCoordinate = [e.lngLat.lat, e.lngLat.lng];
      setCoordinates(newCoords);

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
