import React, { useEffect, useState } from 'react';

interface MapSelectorWrapperProps {
  initialCenter: { lat: number; lng: number };
  onLocationSelect: (coordinates: { lat: number; lng: number; address?: string }) => void;
  className?: string;
}

export default function MapSelectorWrapper(props: MapSelectorWrapperProps) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<MapSelectorWrapperProps> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only load on client side
    if (typeof window !== 'undefined') {
      import('./SimpleMapSelector')
        .then((module) => {
          setMapComponent(() => module.default);
        })
        .catch((err) => {
          console.error('Error loading map:', err);
          setError('Erreur lors du chargement de la carte');
        });
    }
  }, []);

  if (error) {
    return (
      <div className={`h-full bg-red-50 rounded-lg flex items-center justify-center ${props.className}`}>
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (!MapComponent) {
    return (
      <div className={`h-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center min-h-[400px] ${props.className}`}>
        <div className="text-gray-500">Chargement de la carte...</div>
      </div>
    );
  }

  return (
    <div className={`h-full w-full min-h-[400px] ${props.className}`}>
      <MapComponent {...props} className="h-full w-full" />
    </div>
  );
}