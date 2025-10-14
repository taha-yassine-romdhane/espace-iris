import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Device {
  id: string;
  name: string;
  serialNumber?: string | null;
  model?: string | null;
  brand?: string | null;
  type?: string | null;
  status: 'RENTED' | 'SOLD' | 'ASSIGNED';
  rentalStatus?: string;
  startDate?: string;
  endDate?: string | null;
  saleDate?: string;
  quantity?: number;
  installationDate?: string | null;
  configuration?: string | null;
}

interface DiagnosticDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  serialNumber?: string | null;
  model?: string | null;
  brand?: string | null;
  type?: string | null;
  diagnosticDate: string;
  followUpDate?: string | null;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  notes?: string | null;
  performedBy?: string | null;
}

interface Patient {
  id: string;
  name: string;
  delegation: string;
  region: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  phoneTwo?: string | null;
  cin?: string | null;
  age?: number | null;
  dateOfBirth?: string | null;
  createdAt?: string;
  lastVisit?: string | null;
  lastVisitStatus?: string | null;
  lastVisitLocation?: string | null;
  technician?: string | null;
  devices?: Device[];
  hasDevices?: boolean;
  diagnostics?: DiagnosticDevice[];
  hasDiagnostics?: boolean;
}

interface MapProps {
  patients: Patient[];
}

const MapComponent: React.FC<MapProps> = ({ patients }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      zoomControl: false, // We'll add custom controls
      attributionControl: true
    }).setView([33.8869, 9.5375], 7);

    // Define different tile layers with detailed street information
    const baseLayers = {
      // Detailed OpenStreetMap with street names
      'Street Map (Détaillé)': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }),
      
      // CartoDB Positron - Clean with street names
      'Street Map (Propre)': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
      }),
      
      // CartoDB Dark with street names
      'Street Map (Sombre)': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
      }),
      
      // Voyager with detailed street information
      'Street Map (Voyager)': L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
      }),
      
      // Satellite imagery with labels
      'Vue Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
      }),
      
      // Terrain with labels
      'Terrain': L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png', {
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
      })
    };

    // Add default layer
    baseLayers['Street Map (Détaillé)'].addTo(map);

    // Add custom zoom control in top-left
    L.control.zoom({
      position: 'topleft'
    }).addTo(map);

    // Add layer control
    const layerControl = L.control.layers(baseLayers, undefined, {
      position: 'topright',
      collapsed: false
    }).addTo(map);

    // Add custom scale control
    L.control.scale({
      position: 'bottomleft',
      metric: true,
      imperial: false
    }).addTo(map);

    // Add custom fullscreen control
    const fullscreenControl = L.Control.extend({
      onAdd: function(map: any) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        container.style.backgroundColor = 'white';
        container.style.width = '30px';
        container.style.height = '30px';
        container.style.cursor = 'pointer';
        container.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 5px;"><path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8"/><path d="M3 16.2V21m0 0h4.8M3 21l6-6"/><path d="M21 7.8V3m0 0h-4.8M21 3l-6 6"/><path d="M3 7.8V3m0 0h4.8M3 3l6 6"/></svg>';
        container.title = 'Plein écran';
        
        container.onclick = function() {
          if (map.getContainer().requestFullscreen) {
            map.getContainer().requestFullscreen();
          }
        };
        
        return container;
      }
    });

    map.addControl(new fullscreenControl({ position: 'topleft' }));

    // Add locate control
    const locateControl = L.Control.extend({
      onAdd: function(map: any) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        container.style.backgroundColor = 'white';
        container.style.width = '30px';
        container.style.height = '30px';
        container.style.cursor = 'pointer';
        container.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 5px;"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>';
        container.title = 'Centrer sur la Tunisie';
        
        container.onclick = function() {
          map.setView([33.8869, 9.5375], 7);
        };
        
        return container;
      }
    });

    map.addControl(new locateControl({ position: 'topleft' }));

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Get current zoom level for responsive marker sizing
    const currentZoom = map.getZoom();
    const getMarkerSize = () => {
      if (currentZoom <= 6) return { size: 8, fontSize: '0px', showInitials: false };
      if (currentZoom <= 8) return { size: 12, fontSize: '0px', showInitials: false };
      if (currentZoom <= 10) return { size: 16, fontSize: '8px', showInitials: true };
      if (currentZoom <= 12) return { size: 24, fontSize: '10px', showInitials: true };
      return { size: 32, fontSize: '12px', showInitials: true };
    };

    const markerConfig = getMarkerSize();


    // Get initials from patient name
    const getInitials = (name: string) => {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return parts[0][0].toUpperCase();
    };

    // Get color based on last visit and diagnostic status
    const getMarkerColor = (patient: Patient) => {
      // Priority 1: Check if patient has active diagnostics (orange/yellow for diagnostic patients)
      if (patient.hasDiagnostics) {
        // Diagnostic patients with follow-up required
        if (!patient.lastVisit) {
          return '#F59E0B'; // Orange for diagnostic patients with no visits
        }
        
        const lastVisitDate = new Date(patient.lastVisit.split('/').reverse().join('-'));
        const daysSinceLastVisit = Math.floor((new Date().getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastVisit < 30) {
          return '#D97706'; // Darker orange for diagnostic patients with recent visits
        } else if (daysSinceLastVisit < 90) {
          return '#B45309'; // Even darker orange for diagnostic patients with moderate visits
        } else {
          return '#92400E'; // Very dark orange for diagnostic patients with old visits
        }
      }
      
      // Priority 2: Check if patient has devices (purple border for device patients)
      if (patient.hasDevices) {
        // If has devices, base color on visit but with device indication
        if (!patient.lastVisit) {
          return '#8B5CF6'; // Purple for device patients with no visits
        }
        
        const lastVisitDate = new Date(patient.lastVisit.split('/').reverse().join('-'));
        const daysSinceLastVisit = Math.floor((new Date().getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastVisit < 30) {
          return '#059669'; // Darker green for device patients with recent visits
        } else if (daysSinceLastVisit < 90) {
          return '#D97706'; // Darker orange for device patients with moderate visits
        } else {
          return '#DC2626'; // Darker red for device patients with old visits
        }
      }
      
      // Priority 3: Regular color coding for patients without devices
      if (!patient.lastVisit) {
        return '#6B7280'; // Gray for no visits
      }
      
      const lastVisitDate = new Date(patient.lastVisit.split('/').reverse().join('-'));
      const daysSinceLastVisit = Math.floor((new Date().getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastVisit < 30) {
        return '#10B981'; // Green for recent visits
      } else if (daysSinceLastVisit < 90) {
        return '#F59E0B'; // Orange for moderate
      } else {
        return '#EF4444'; // Red for old visits
      }
    };

    // Create company headquarters marker
    const companyLocation: [number, number] = [35.734867, 10.5740649];
    const companyIcon = L.divIcon({
      html: `
        <div style="
          width: 50px;
          height: 50px;
          background-color: #1e3a8a;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.4);
          border: 3px solid white;
          animation: pulse 3s infinite;
        ">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 21h18M4 21V7l8-4v18M20 21V11l-8-4M9 9h0M9 12h0M9 15h0M14 12h0M14 15h0"/>
          </svg>
        </div>
      `,
      className: 'company-headquarters-icon',
      iconSize: [50, 50],
      iconAnchor: [25, 25],
    });

    const companyMarker = L.marker(companyLocation, { icon: companyIcon }).addTo(map);
    companyMarker.bindPopup(`
      <div class="p-3">
        <h3 class="font-bold text-lg text-gray-900 mb-2 pb-2 border-b flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" stroke-width="2">
            <path d="M3 21h18M4 21V7l8-4v18M20 21V11l-8-4M9 9h0M9 12h0M9 15h0M14 12h0M14 15h0"/>
          </svg>
          IrisMedical Services
        </h3>
        <div class="space-y-2 text-sm">
          <div class="bg-blue-50 p-2 rounded">
            <h4 class="font-semibold text-gray-700 mb-1">Siège Social</h4>
            <p class="text-gray-600">M'saken, Sousse</p>
            <p class="text-gray-600">Tunisie</p>
          </div>
          <div class="bg-gray-50 p-2 rounded">
            <h4 class="font-semibold text-gray-700 mb-1">Services</h4>
            <p class="text-gray-600">• Équipements médicaux</p>
            <p class="text-gray-600">• Service technique</p>
            <p class="text-gray-600">• Support client</p>
          </div>
        </div>
      </div>
    `);

    // Add patient markers
    patients.forEach((patient) => {
      const initials = getInitials(patient.name);
      const color = getMarkerColor(patient);
      
      const patientIcon = L.divIcon({
        html: `
          <div style="
            width: ${markerConfig.size}px;
            height: ${markerConfig.size}px;
            background-color: ${color};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: ${markerConfig.fontSize};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            border: ${Math.max(1, markerConfig.size * 0.08)}px solid ${patient.hasDiagnostics ? '#F59E0B' : patient.hasDevices ? '#7c3aed' : 'white'};
            position: relative;
          ">
            ${markerConfig.showInitials ? initials : ''}
            ${patient.hasDiagnostics ? `
              <div style="
                position: absolute;
                top: -2px;
                right: -2px;
                width: ${Math.max(8, markerConfig.size * 0.3)}px;
                height: ${Math.max(8, markerConfig.size * 0.3)}px;
                background-color: #F59E0B;
                border-radius: 50%;
                border: 2px solid white;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                ${markerConfig.size > 20 ? `
                  <svg width="${Math.max(4, markerConfig.size * 0.15)}" height="${Math.max(4, markerConfig.size * 0.15)}" viewBox="0 0 24 24" fill="white">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                ` : ''}
              </div>
            ` : patient.hasDevices ? `
              <div style="
                position: absolute;
                top: -2px;
                right: -2px;
                width: ${Math.max(8, markerConfig.size * 0.3)}px;
                height: ${Math.max(8, markerConfig.size * 0.3)}px;
                background-color: #7c3aed;
                border-radius: 50%;
                border: 2px solid white;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                ${markerConfig.size > 20 ? `
                  <svg width="${Math.max(4, markerConfig.size * 0.15)}" height="${Math.max(4, markerConfig.size * 0.15)}" viewBox="0 0 24 24" fill="white">
                    <rect x="4" y="4" width="16" height="12" rx="2"/>
                  </svg>
                ` : ''}
              </div>
            ` : ''}
          </div>
        `,
        className: 'custom-initials-icon',
        iconSize: [markerConfig.size, markerConfig.size],
        iconAnchor: [markerConfig.size / 2, markerConfig.size / 2],
      });

      const marker = L.marker([patient.latitude, patient.longitude], { icon: patientIcon }).addTo(map);
      
      const popupContent = `
        <div class="bg-white border border-blue-100" style="width: 380px;">
          <!-- Header -->
          <div class="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-3 rounded-t-lg">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <h3 class="font-bold text-base">${patient.name}</h3>
            </div>
          </div>
          
          <!-- Content -->
          <div class="p-4 space-y-3">
            <!-- Location & Contact Row -->
            <div class="grid grid-cols-2 gap-4">
              <!-- Location Section -->
              <div class="border-l-4 border-blue-500 bg-blue-50 p-3 rounded-r-lg">
                <div class="flex items-center gap-2 mb-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e40af" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span class="font-semibold text-blue-900 text-sm">Localisation</span>
                </div>
                <div class="text-sm space-y-1 text-blue-800">
                  <p><span class="font-medium">Région:</span> ${patient.region}</p>
                  <p><span class="font-medium">Délégation:</span> ${patient.delegation}</p>
                  ${patient.address !== 'Adresse non spécifiée' ? `<p><span class="font-medium">Adresse:</span> ${patient.address}</p>` : ''}
                </div>
              </div>

              <!-- Contact Section -->
              <div class="border-l-4 border-blue-400 bg-slate-50 p-3 rounded-r-lg">
                <div class="flex items-center gap-2 mb-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e40af" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <span class="font-semibold text-blue-900 text-sm">Contact</span>
                </div>
                <div class="text-sm space-y-1 text-blue-800">
                  <p class="flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <span class="font-medium">Tél 1:</span> ${patient.phone}
                  </p>
                  ${patient.phoneTwo ? `
                    <p class="flex items-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      <span class="font-medium">Tél 2:</span> ${patient.phoneTwo}
                    </p>
                  ` : ''}
                </div>
              </div>
            </div>

            <!-- Personal Info & Medical Row -->
            <div class="grid grid-cols-2 gap-4">
              <!-- Personal Info Section -->
              ${(patient.cin || patient.age !== null) ? `
                <div class="border-l-4 border-blue-300 bg-green-50 p-3 rounded-r-lg">
                  <div class="flex items-center gap-2 mb-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e40af" stroke-width="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <span class="font-semibold text-blue-900 text-sm">Informations personnelles</span>
                  </div>
                  <div class="text-sm space-y-1 text-blue-800">
                    ${patient.cin ? `
                      <p class="flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span class="font-medium">CIN:</span> ${patient.cin}
                      </p>
                    ` : ''}
                    ${patient.age !== null ? `
                      <p class="flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12,6 12,12 16,14"/>
                        </svg>
                        <span class="font-medium">Âge:</span> ${patient.age} ans ${patient.dateOfBirth ? `(${patient.dateOfBirth})` : ''}
                      </p>
                    ` : ''}
                  </div>
                </div>
              ` : '<div></div>'}

              <!-- Medical Section -->
              <div class="border-l-4 border-blue-600 bg-yellow-50 p-3 rounded-r-lg">
                <div class="flex items-center gap-2 mb-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e40af" stroke-width="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                  <span class="font-semibold text-blue-900 text-sm">Suivi médical</span>
                </div>
                <div class="text-sm space-y-1 text-blue-800">
                  ${patient.technician ? `
                    <p class="flex items-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      <span class="font-medium">Technicien:</span> ${patient.technician}
                    </p>
                  ` : ''}
                  ${patient.lastVisit ? `
                    <p class="flex items-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <span class="font-medium">Dernière visite:</span> ${patient.lastVisit}
                    </p>
                    ${patient.lastVisitStatus ? `
                      <p class="flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                        <span class="font-medium">Statut:</span> 
                        <span class="px-2 py-1 bg-white bg-opacity-70 rounded text-xs font-medium">${patient.lastVisitStatus}</span>
                      </p>
                    ` : ''}
                  ` : `
                    <p class="flex items-center gap-2 text-blue-600 italic">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                      Aucune visite enregistrée
                    </p>
                  `}
                </div>
              </div>
            </div>

            <!-- Devices Section -->
            ${patient.hasDevices ? `
              <div class="border-l-4 border-purple-500 bg-purple-50 p-3 rounded-r-lg">
                <div class="flex items-center gap-2 mb-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2">
                    <rect x="4" y="4" width="16" height="12" rx="2"/>
                    <path d="M8 12h8"/>
                    <path d="M8 16h8"/>
                  </svg>
                  <span class="font-semibold text-purple-900 text-sm">Équipements (${patient.devices?.length || 0})</span>
                </div>
                <div class="space-y-2 max-h-24 overflow-y-auto">
                  ${patient.devices?.map(device => `
                    <div class="bg-white bg-opacity-70 p-2 rounded text-xs">
                      <div class="flex items-center justify-between mb-1">
                        <span class="font-medium text-purple-900">${device.name}</span>
                        <span class="px-2 py-1 rounded text-xs font-medium ${
                          device.status === 'RENTED' ? 'bg-blue-100 text-blue-700' :
                          device.status === 'SOLD' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }">${
                          device.status === 'RENTED' ? 'Loué' :
                          device.status === 'SOLD' ? 'Vendu' :
                          'Assigné'
                        }</span>
                      </div>
                      <div class="text-purple-800 space-y-0.5">
                        ${device.serialNumber ? `<p><span class="font-medium">S/N:</span> ${device.serialNumber}</p>` : ''}
                        ${device.model && device.brand ? `<p><span class="font-medium">Modèle:</span> ${device.brand} ${device.model}</p>` : ''}
                        ${device.status === 'RENTED' ? `
                          <p><span class="font-medium">Début:</span> ${device.startDate}</p>
                          ${device.endDate ? `<p><span class="font-medium">Fin:</span> ${device.endDate}</p>` : '<p class="italic">Location en cours</p>'}
                        ` : ''}
                        ${device.status === 'SOLD' ? `<p><span class="font-medium">Vendu le:</span> ${device.saleDate}</p>` : ''}
                        ${device.status === 'ASSIGNED' && device.installationDate ? `<p><span class="font-medium">Installé le:</span> ${device.installationDate}</p>` : ''}
                      </div>
                    </div>
                  `).join('') || ''}
                </div>
              </div>
            ` : ''}

            <!-- Diagnostics Section -->
            ${patient.hasDiagnostics ? `
              <div class="border-l-4 border-orange-500 bg-orange-50 p-3 rounded-r-lg">
                <div class="flex items-center gap-2 mb-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                  <span class="font-semibold text-orange-900 text-sm">Diagnostics en cours (${patient.diagnostics?.length || 0})</span>
                </div>
                <div class="space-y-2 max-h-24 overflow-y-auto">
                  ${patient.diagnostics?.map(diagnostic => `
                    <div class="bg-white bg-opacity-70 p-2 rounded text-xs">
                      <div class="flex items-center justify-between mb-1">
                        <span class="font-medium text-orange-900">${diagnostic.deviceName}</span>
                        <span class="px-2 py-1 rounded text-xs font-medium ${
                          diagnostic.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          diagnostic.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }">${
                          diagnostic.status === 'PENDING' ? 'En attente' :
                          diagnostic.status === 'COMPLETED' ? 'Terminé' :
                          'Annulé'
                        }</span>
                      </div>
                      <div class="text-orange-800 space-y-0.5">
                        ${diagnostic.serialNumber ? `<p><span class="font-medium">S/N:</span> ${diagnostic.serialNumber}</p>` : ''}
                        ${diagnostic.model && diagnostic.brand ? `<p><span class="font-medium">Modèle:</span> ${diagnostic.brand} ${diagnostic.model}</p>` : ''}
                        <p><span class="font-medium">Diagnostic:</span> ${diagnostic.diagnosticDate}</p>
                        ${diagnostic.followUpDate ? `<p><span class="font-medium text-red-600">Suivi requis:</span> ${diagnostic.followUpDate}</p>` : ''}
                        ${diagnostic.performedBy ? `<p><span class="font-medium">Par:</span> ${diagnostic.performedBy}</p>` : ''}
                        ${diagnostic.notes ? `<p class="italic text-orange-700">"${diagnostic.notes}"</p>` : ''}
                      </div>
                    </div>
                  `).join('') || ''}
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Footer -->
          ${patient.createdAt ? `
            <div class="bg-blue-50 border-t border-blue-100 px-4 py-2 text-center rounded-b-lg">
              <p class="text-sm text-blue-700 flex items-center justify-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
                Patient enregistré le ${patient.createdAt}
              </p>
            </div>
          ` : ''}
        </div>
      `;
      
      marker.bindPopup(popupContent, { maxWidth: 400 });
    });

    // Add zoom event listener to update marker sizes
    const handleZoom = () => {
      const newZoom = map.getZoom();
      const newConfig = {
        size: newZoom <= 6 ? 8 : newZoom <= 8 ? 12 : newZoom <= 10 ? 16 : newZoom <= 12 ? 24 : 32,
        fontSize: newZoom <= 6 ? '0px' : newZoom <= 8 ? '0px' : newZoom <= 10 ? '8px' : newZoom <= 12 ? '10px' : '12px',
        showInitials: newZoom > 8
      };

      // Update all existing markers with new size
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker && layer.options.icon && layer.options.icon.options.className === 'custom-initials-icon') {
          const patient = patients.find(p => 
            Math.abs(p.latitude - layer.getLatLng().lat) < 0.0001 && 
            Math.abs(p.longitude - layer.getLatLng().lng) < 0.0001
          );
          
          if (patient) {
            const initials = getInitials(patient.name);
            const color = getMarkerColor(patient);
            
            const newIcon = L.divIcon({
              html: `
                <div style="
                  width: ${newConfig.size}px;
                  height: ${newConfig.size}px;
                  background-color: ${color};
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-weight: bold;
                  font-size: ${newConfig.fontSize};
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  border: ${Math.max(1, newConfig.size * 0.08)}px solid ${patient.hasDiagnostics ? '#F59E0B' : patient.hasDevices ? '#7c3aed' : 'white'};
                  position: relative;
                ">
                  ${newConfig.showInitials ? initials : ''}
                  ${patient.hasDiagnostics && newConfig.size > 16 ? `
                    <div style="
                      position: absolute;
                      top: -2px;
                      right: -2px;
                      width: ${Math.max(8, newConfig.size * 0.3)}px;
                      height: ${Math.max(8, newConfig.size * 0.3)}px;
                      background-color: #F59E0B;
                      border-radius: 50%;
                      border: 2px solid white;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                    ">
                      ${newConfig.size > 20 ? `
                        <svg width="${Math.max(4, newConfig.size * 0.15)}" height="${Math.max(4, newConfig.size * 0.15)}" viewBox="0 0 24 24" fill="white">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                        </svg>
                      ` : ''}
                    </div>
                  ` : patient.hasDevices && newConfig.size > 16 ? `
                    <div style="
                      position: absolute;
                      top: -2px;
                      right: -2px;
                      width: ${Math.max(8, newConfig.size * 0.3)}px;
                      height: ${Math.max(8, newConfig.size * 0.3)}px;
                      background-color: #7c3aed;
                      border-radius: 50%;
                      border: 2px solid white;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                    ">
                      ${newConfig.size > 20 ? `
                        <svg width="${Math.max(4, newConfig.size * 0.15)}" height="${Math.max(4, newConfig.size * 0.15)}" viewBox="0 0 24 24" fill="white">
                          <rect x="4" y="4" width="16" height="12" rx="2"/>
                        </svg>
                      ` : ''}
                    </div>
                  ` : ''}
                </div>
              `,
              className: 'custom-initials-icon',
              iconSize: [newConfig.size, newConfig.size],
              iconAnchor: [newConfig.size / 2, newConfig.size / 2],
            });
            
            layer.setIcon(newIcon);
          }
        }
      });
    };

    map.on('zoomend', handleZoom);

    return () => {
      map.off('zoomend', handleZoom);
    };

  }, [patients]);

  return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />;
};

export default MapComponent;