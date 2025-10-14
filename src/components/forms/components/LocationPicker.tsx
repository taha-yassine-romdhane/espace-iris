import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, X, Search, MapPinOff, Loader2 } from 'lucide-react';
import { debounce } from 'lodash';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const defaultCenter = {
  lat: 36.8065, // Default center for Tunisia
  lng: 10.1815
};

interface LocationPickerProps {
  initialAddress?: string;
  onAddressChange: (address: string) => void;
  onCoordinatesChange: (coordinates: { lat: number; lng: number }) => void;
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}



const LocationPicker: React.FC<LocationPickerProps> = ({
  initialAddress = '',
  onAddressChange,
  onCoordinatesChange
}) => {
  const [address, setAddress] = useState(initialAddress);
  const [coordinates, setCoordinates] = useState<Coordinates>(defaultCenter);
  const [showMap, setShowMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Update coordinates if initialAddress changes and we don't have coordinates yet
  useEffect(() => {
    if (initialAddress && initialAddress !== address) {
      setAddress(initialAddress);
    }
  }, [initialAddress, address]);
  
  // Auto-close search results when clicking outside
  useEffect(() => {
    if (searchResults.length > 0) {
      const handleClickOutside = () => setSearchResults([]);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [searchResults.length]);



  // Debounced search function for better performance
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) return;
      
      try {
        setIsSearching(true);
        setError(null);
        
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
          { 
            headers: { 
              'Accept-Language': 'fr',
              'User-Agent': 'EliteSanteApp/1.0' // Proper user-agent as required by Nominatim
            } 
          }
        );
        
        if (!response.ok) {
          throw new Error(`Erreur de recherche: ${response.status}`);
        }
        
        const data = await response.json();
        setSearchResults(data);
        
        if (data.length === 0) {
          setError('Aucun résultat trouvé pour cette adresse');
        }
      } catch (error) {
        console.error('Error searching location:', error);
        setError('Erreur lors de la recherche. Veuillez réessayer.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    []
  );
  
  const searchLocation = () => {
    debouncedSearch(searchQuery);
  };

  const handleManualAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setAddress(newAddress);
    onAddressChange(newAddress);
    setSearchQuery(newAddress);
    
    // Auto-search as user types
    if (newAddress.length > 3) {
      debouncedSearch(newAddress);
    } else {
      setSearchResults([]);
    }
  };

  const toggleMap = () => {
    setShowMap(!showMap);
    // Clear search results when closing the map
    if (showMap) {
      setSearchResults([]);
    }
  };

  const selectSearchResult = (result: SearchResult) => {
    const newCoordinates = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    };
    setCoordinates(newCoordinates);
    onCoordinatesChange(newCoordinates);
    setAddress(result.display_name);
    onAddressChange(result.display_name);
    setSearchResults([]);
    setShowMap(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchLocation();
    }
  };

  return (
    <div className="w-full">
      <div className="relative">
        <Input
          type="text"
          value={address}
          onChange={handleManualAddressChange}
          placeholder="Entrez une adresse"
          className="pr-10"
        />
        <button
          type="button"
          onClick={toggleMap}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700 transition-colors"
          aria-label={showMap ? "Fermer la carte" : "Ouvrir la carte"}
        >
          <MapPin size={20} />
        </button>
      </div>
      
      {/* Show search results directly under the input when typing */}
      {!showMap && searchResults.length > 0 && (
        <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded-md shadow-md z-10 relative bg-white">
          <ul className="divide-y divide-gray-200">
            {searchResults.map((result, index) => (
              <li 
                key={index} 
                className="p-2 hover:bg-blue-50 cursor-pointer text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  selectSearchResult(result);
                }}
              >
                {result.display_name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showMap && (
        <div className="mt-2 relative border border-gray-300 rounded-md p-3 bg-white shadow-md">
          <div className="absolute right-2 top-2 z-10">
            <button
              type="button"
              onClick={toggleMap}
              className="bg-white p-1 rounded-full shadow-md hover:bg-gray-100 transition-colors"
              aria-label="Fermer"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="mb-3 relative">
            <div className="flex space-x-2">
              <div className="relative flex-grow">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Rechercher un lieu"
                  className="pr-10"
                />
                {isSearching ? (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Loader2 size={18} className="animate-spin text-blue-500" />
                  </div>
                ) : (
                  <button 
                    type="button" 
                    onClick={searchLocation}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-500 transition-colors"
                    aria-label="Rechercher"
                  >
                    <Search size={18} />
                  </button>
                )}
              </div>
            </div>
            
            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
          </div>
          
          {searchResults.length > 0 && (
            <div className="mb-3 max-h-48 overflow-y-auto border border-gray-200 rounded-md">
              <ul className="divide-y divide-gray-200">
                {searchResults.map((result, index) => (
                  <li 
                    key={index} 
                    className="p-2.5 hover:bg-blue-50 cursor-pointer text-sm transition-colors"
                    onClick={() => selectSearchResult(result)}
                  >
                    <div className="flex items-start">
                      <MapPin size={16} className="text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>{result.display_name}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">Coordonnées enregistrées</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setCoordinates(defaultCenter);
                  onCoordinatesChange(defaultCenter);
                }}
                className="h-8 text-xs text-gray-500 flex items-center gap-1 hover:text-blue-500"
              >
                <MapPinOff size={14} />
                Réinitialiser
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                <Input 
                  type="text" 
                  value={coordinates.lat.toFixed(6)}
                  readOnly
                  className="bg-white text-sm h-9"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                <Input 
                  type="text" 
                  value={coordinates.lng.toFixed(6)}
                  readOnly
                  className="bg-white text-sm h-9"
                />
              </div>
            </div>
            <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-100">
              <div className="flex items-start">
                <div className="text-blue-500 mr-2">
                  <MapPin size={14} className="mt-0.5" />
                </div>
                <div>
                  Pour une intégration complète avec une carte, veuillez contacter l&apos;équipe de développement.
                </div>
              </div>
            </div>
          </div>
          
          {isSearching && searchResults.length === 0 && (
            <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-20">
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                <span className="text-sm text-blue-700 mt-2">Recherche en cours...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
