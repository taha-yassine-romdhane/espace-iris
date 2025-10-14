import React, { useEffect, useState } from 'react';

interface SimpleMapProps {
  center: [number, number];
  zoom: number;
  address: string;
  onLocationSelect: (lat: number, lng: number) => void;
}

const SimpleMap: React.FC<SimpleMapProps> = ({ center, zoom, address, onLocationSelect }) => {
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Initialize the map on component mount
    const initMap = async () => {
      try {
        // Dynamically import Leaflet
        const L = await import('leaflet');
        
        // Fix icon issues
         
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconUrl: '/images/marker-icon.png',
          iconRetinaUrl: '/images/marker-icon.png',
          shadowUrl: '/images/marker-shadow.png',
        });
        
        // Create map container if it doesn't exist
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) return;
        
        // Clear any existing map
        mapContainer.innerHTML = '';
        
        // Initialize the map
        const map = L.map(mapContainer).setView(center, zoom);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // Add marker
        const marker = L.marker(center).addTo(map);
        marker.bindPopup(address).openPopup();
        
        // Handle click events
         
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          
          // Update marker position
          marker.setLatLng([lat, lng]);
          
          // Call the callback
          onLocationSelect(lat, lng);
        });
        
        setMapLoaded(true);
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };
    
    initMap();
    
    // Cleanup function
    return () => {
      const mapContainer = document.getElementById('map-container');
      if (mapContainer) {
        mapContainer.innerHTML = '';
      }
    };
  }, [center, zoom, address, onLocationSelect]); // Empty dependency array to run only once on mount
  
  // Update marker position when center changes
  useEffect(() => {
    if (!mapLoaded) return;
    
    const updateMap = async () => {
      try {
        const L = await import('leaflet');
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) return;
        
        // Get the map instance
         
        const mapInstance = L.DomUtil.get('map-container') as any;
        if (mapInstance && mapInstance._leaflet_id) {
          const map = L.map(mapInstance);
          map.setView(center, zoom);
          
          // Update marker
          const markers = document.querySelectorAll('.leaflet-marker-icon');
          if (markers.length === 0) {
            const marker = L.marker(center).addTo(map);
            marker.bindPopup(address).openPopup();
          }
        }
      } catch (error) {
        console.error('Error updating map:', error);
      }
    };
    
    updateMap();
  }, [center, zoom, address, mapLoaded]);
  
  return (
    <div 
      id="map-container" 
      style={{ 
        height: '100%', 
        width: '100%', 
        position: 'relative',
        background: '#f0f0f0'
      }}
    >
      {!mapLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-2"></div>
          <p>Chargement de la carte...</p>
        </div>
      )}
    </div>
  );
};

export default SimpleMap;
