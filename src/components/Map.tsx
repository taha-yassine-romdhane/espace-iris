import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Building2 } from 'lucide-react';

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
}

interface MapProps {
  patients: Patient[];
}

const Map: React.FC<MapProps> = ({ patients }) => {
  // Fix leaflet default icon issue
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  // Get initials from patient name
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  // Get color based on last visit
  const getMarkerColor = (patient: Patient) => {
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

  // Create custom icon with initials
  const createInitialsIcon = (patient: Patient) => {
    const initials = getInitials(patient.name);
    const color = getMarkerColor(patient);
    
    return L.divIcon({
      html: `
        <div style="
          width: 40px;
          height: 40px;
          background-color: ${color};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          border: 2px solid white;
        ">
          ${initials}
        </div>
      `,
      className: 'custom-initials-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });
  };

  // Tunisia center coordinates
  const tunisiaCenter: LatLngExpression = [33.8869, 9.5375];
  
  // IrisMedical Services headquarters coordinates in M'saken
  const companyLocation: LatLngExpression = [35.734867, 10.5740649];
  
  // Create company headquarters icon
  const createCompanyIcon = () => {
    return L.divIcon({
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
          position: relative;
        ">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 21h18M4 21V7l8-4v18M20 21V11l-8-4M9 9h0M9 12h0M9 15h0M14 12h0M14 15h0"/>
          </svg>
        </div>
      `,
      className: 'company-headquarters-icon',
      iconSize: [50, 50],
      iconAnchor: [25, 25],
      popupAnchor: [0, -25],
    });
  };

  return (
    <MapContainer
      center={tunisiaCenter}
      zoom={7}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      {/* Company Headquarters Marker */}
      <Marker
        position={companyLocation}
        icon={createCompanyIcon()}
      >
        <Popup className="custom-popup" maxWidth={320}>
          <div className="p-3">
            <h3 className="font-bold text-lg text-gray-900 mb-2 pb-2 border-b flex items-center gap-2">
              <Building2 size={20} className="text-blue-900" />
              IrisMedical Services
            </h3>
            <div className="space-y-2 text-sm">
              <div className="bg-blue-50 p-2 rounded">
                <h4 className="font-semibold text-gray-700 mb-1">Siège Social</h4>
                <p className="text-gray-600">M'saken, Sousse</p>
                <p className="text-gray-600">Tunisie</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <h4 className="font-semibold text-gray-700 mb-1">Services</h4>
                <p className="text-gray-600">• Équipements médicaux</p>
                <p className="text-gray-600">• Service technique</p>
                <p className="text-gray-600">• Support client</p>
              </div>
              <div className="bg-green-50 p-2 rounded">
                <h4 className="font-semibold text-gray-700 mb-1">Contact</h4>
                <p className="text-gray-600">📞 +216 XX XXX XXX</p>
                <p className="text-gray-600">📧 contact@elitemedical.tn</p>
              </div>
            </div>
          </div>
        </Popup>
      </Marker>
      
      {/* Patient Markers */}
      {patients.map((patient) => (
        <Marker
          key={patient.id}
          position={[patient.latitude, patient.longitude]}
          icon={createInitialsIcon(patient)}
        >
          <Popup className="custom-popup" maxWidth={320} maxHeight={300}>
            <div className="p-2">
              <h3 className="font-bold text-base text-gray-900 mb-2 pb-1 border-b sticky top-0 bg-white">{patient.name}</h3>
              
              <div className="max-h-[220px] overflow-y-auto pr-2 space-y-3">
                {/* Location Section */}
                <div className="bg-gray-50 p-2 rounded">
                  <h4 className="text-xs font-semibold text-gray-600 mb-1">📍 Localisation</h4>
                  <div className="text-xs space-y-0.5">
                    <p><span className="font-medium">Région:</span> {patient.region}</p>
                    <p><span className="font-medium">Délégation:</span> {patient.delegation}</p>
                    {patient.address !== 'Adresse non spécifiée' && (
                      <p><span className="font-medium">Adresse:</span> {patient.address}</p>
                    )}
                  </div>
                </div>

                {/* Contact Section */}
                <div className="bg-blue-50 p-2 rounded">
                  <h4 className="text-xs font-semibold text-gray-600 mb-1">📞 Contact</h4>
                  <div className="text-xs space-y-0.5">
                    <p><span className="font-medium">Tél 1:</span> {patient.phone}</p>
                    {patient.phoneTwo && <p><span className="font-medium">Tél 2:</span> {patient.phoneTwo}</p>}
                  </div>
                </div>

                {/* Personal Info Section */}
                {(patient.cin || patient.age !== null) && (
                  <div className="bg-green-50 p-2 rounded">
                    <h4 className="text-xs font-semibold text-gray-600 mb-1">👤 Informations personnelles</h4>
                    <div className="text-xs space-y-0.5">
                      {patient.cin && <p><span className="font-medium">CIN:</span> {patient.cin}</p>}
                      {patient.age !== null && (
                        <p><span className="font-medium">Âge:</span> {patient.age} ans {patient.dateOfBirth && `(${patient.dateOfBirth})`}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Medical Section */}
                <div className="bg-yellow-50 p-2 rounded">
                  <h4 className="text-xs font-semibold text-gray-600 mb-1">🏥 Suivi médical</h4>
                  <div className="text-xs space-y-0.5">
                    {patient.technician && <p><span className="font-medium">Technicien:</span> {patient.technician}</p>}
                    {patient.lastVisit ? (
                      <>
                        <p><span className="font-medium">Dernière visite:</span> {patient.lastVisit}</p>
                        {patient.lastVisitStatus && <p><span className="font-medium">Statut:</span> {patient.lastVisitStatus}</p>}
                      </>
                    ) : (
                      <p className="text-gray-500 italic">Aucune visite enregistrée</p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                {patient.createdAt && (
                  <div className="text-xs text-gray-500 text-center pt-1 border-t">
                    Enregistré le {patient.createdAt}
                  </div>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default Map;