import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Edit3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import MapSelectorWrapper from './MapSelectorWrapper';

interface AddressSelectorProps {
  value?: {
    lat: number;
    lng: number;
    address?: string;
  };
  onChange: (coordinates: { 
    lat: number; 
    lng: number; 
    address?: string;
    governorate?: string;
    delegation?: string;
  }) => void;
  className?: string;
}

export default function AddressSelector({ value, onChange, className = '' }: AddressSelectorProps) {
  const { toast } = useToast();
  const [showMap, setShowMap] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Could not get current location:', error);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, []);

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Géolocalisation non disponible",
        description: "Votre navigateur ne supporte pas la géolocalisation.",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Try to get address from coordinates using reverse geocoding
          const geocodeResult = await reverseGeocode(latitude, longitude);
          
          onChange({
            lat: latitude,
            lng: longitude,
            address: geocodeResult.address || `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`,
            governorate: geocodeResult.governorate,
            delegation: geocodeResult.delegation
          });

          console.log('Current location geocoding result:', geocodeResult);

          toast({
            title: "Position actuelle obtenue",
            description: geocodeResult.address || "Coordonnées récupérées avec succès",
            variant: "default",
          });
        } catch (error) {
          console.error('Error getting address:', error);
          onChange({
            lat: latitude,
            lng: longitude,
            address: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`
          });

          toast({
            title: "Position obtenue",
            description: "Coordonnées récupérées (adresse non disponible)",
            variant: "default",
          });
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = "Impossible d'obtenir votre position";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Autorisation refusée. Veuillez autoriser l'accès à votre position.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Position non disponible.";
            break;
          case error.TIMEOUT:
            errorMessage = "Délai d'attente dépassé.";
            break;
        }

        toast({
          title: "Erreur de géolocalisation",
          description: errorMessage,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000
      }
    );
  };

  const handleMapSelect = (coordinates: { 
    lat: number; 
    lng: number; 
    address?: string;
    governorate?: string;
    delegation?: string;
  }) => {
    onChange(coordinates);
    setShowMap(false);
    
    toast({
      title: "Position sélectionnée",
      description: coordinates.address || "Position sélectionnée sur la carte",
      variant: "default",
    });
  };

  // Enhanced reverse geocoding using Nominatim (OpenStreetMap)
  const reverseGeocode = async (lat: number, lng: number): Promise<{
    address: string | null;
    governorate?: string;
    delegation?: string;
  }> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      console.log('Reverse geocoding response:', data);
      const address = data.address || {};
      
      // Extract governorate (state/county level)
      let governorate = address.state || address.county || '';
      
      // Extract delegation (more specific location)
      // Priority order: city > town > suburb > neighbourhood > village
      let delegation = address.city || 
                      address.town || 
                      address.suburb || 
                      address.neighbourhood ||
                      address.village || 
                      address.municipality || '';

      console.log('Extracted raw location info:', { governorate, delegation });

      // Clean up the values (remove extra spaces, normalize)
      governorate = governorate.trim();
      delegation = delegation.trim();

      // If delegation is the same as governorate, try to find a more specific location
      if (delegation === governorate && address.suburb) {
        delegation = address.suburb;
      }
      
      return {
        address: data.display_name || null,
        governorate: governorate || undefined,
        delegation: delegation || undefined
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return { address: null };
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Selection Display */}
      {value && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Position sélectionnée</p>
                <p className="text-sm text-gray-600 break-words">
                  {value.address || `${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Coordonnées: {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowMap(true)}
                className="flex-shrink-0"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Current Location Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleCurrentLocation}
          disabled={isGettingLocation}
          className="flex items-center gap-2 h-auto py-3"
        >
          <Navigation className={`h-5 w-5 ${isGettingLocation ? 'animate-pulse' : ''}`} />
          <div className="text-left">
            <div className="font-medium">
              {isGettingLocation ? 'Localisation...' : 'Ma position actuelle'}
            </div>
            <div className="text-xs text-gray-500">
              Utiliser ma position GPS
            </div>
          </div>
        </Button>

        {/* Map Selection Button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowMap(true)}
          className="flex items-center gap-2 h-auto py-3"
        >
          <MapPin className="h-5 w-5" />
          <div className="text-left">
            <div className="font-medium">Sélectionner sur carte</div>
            <div className="text-xs text-gray-500">
              Cliquer sur la carte
            </div>
          </div>
        </Button>
      </div>

      {/* Map Modal */}
      {showMap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] h-[600px] flex flex-col">
            <CardHeader className="flex-shrink-0 border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Sélectionner la position du patient</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMap(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden" style={{ height: 'calc(600px - 80px)' }}>
              <MapSelectorWrapper
                initialCenter={value || currentLocation || { lat: 36.8065, lng: 10.1815 }} // Default to Tunis
                onLocationSelect={handleMapSelect}
                className="h-full w-full"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}