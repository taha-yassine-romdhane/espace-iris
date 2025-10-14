import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapSelectorProps {
  initialCenter: { lat: number; lng: number };
  onLocationSelect: (coordinates: { lat: number; lng: number; address?: string }) => void;
  className?: string;
}

// Component to handle map clicks
function LocationMarker({ onLocationSelect }: { onLocationSelect: (coordinates: { lat: number; lng: number; address?: string }) => void }) {
  const [position, setPosition] = useState<LatLngExpression | null>(null);

  const map = useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      
      try {
        // Try to get address from coordinates
        const address = await reverseGeocode(lat, lng);
        onLocationSelect({
          lat,
          lng,
          address: address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        });
      } catch (error) {
        console.error('Error getting address:', error);
        onLocationSelect({
          lat,
          lng,
          address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        });
      }
    },
  });

  // Simple reverse geocoding using Nominatim (OpenStreetMap)
  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'PatientForm/1.0'
          }
        }
      );
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      
      // Format Tunisian address
      const address = data.address;
      if (address) {
        const parts = [];
        if (address.house_number) parts.push(address.house_number);
        if (address.road) parts.push(address.road);
        if (address.suburb) parts.push(address.suburb);
        if (address.city || address.town || address.village) {
          parts.push(address.city || address.town || address.village);
        }
        if (address.state) parts.push(address.state);
        
        return parts.length > 0 ? parts.join(', ') : data.display_name;
      }
      
      return data.display_name || null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  };

  return position === null ? null : (
    <Marker position={position} />
  );
}

export default function MapSelector({ initialCenter, onLocationSelect, className = '' }: MapSelectorProps) {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setMapReady(true);
  }, []);

  if (!mapReady) {
    return (
      <div className={`h-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-gray-500">Chargement de la carte...</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Show initial position if provided */}
        {initialCenter && (
          <Marker position={[initialCenter.lat, initialCenter.lng]} />
        )}
        
        {/* Handle map clicks */}
        <LocationMarker onLocationSelect={onLocationSelect} />
      </MapContainer>
      
      {/* Instructions */}
      <div className="absolute bottom-4 left-4 right-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-lg">
        <p className="text-sm text-gray-700">
          <strong>Instructions:</strong> Cliquez sur la carte pour sélectionner la position du patient. 
          L'adresse sera automatiquement déterminée à partir des coordonnées.
        </p>
      </div>
    </div>
  );
}