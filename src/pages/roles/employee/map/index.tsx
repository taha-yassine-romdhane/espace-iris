import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Users, Filter, Search } from 'lucide-react';
import EmployeeLayout from '../EmployeeLayout';

// Dynamically import the entire Map component to avoid SSR issues
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
    </div>
  ),
});

interface Patient {
  id: string;
  name: string;
  delegation: string;
  region: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  lastVisit?: string;
  hasDevices?: boolean;
  hasDiagnostics?: boolean;
}

// Tunisia regions with their center coordinates
const tunisiaRegions = {
  'Tunis': { lat: 36.8065, lng: 10.1815 },
  'Ariana': { lat: 36.8625, lng: 10.1956 },
  'Ben Arous': { lat: 36.7545, lng: 10.2487 },
  'Manouba': { lat: 36.8101, lng: 10.0956 },
  'Nabeul': { lat: 36.4561, lng: 10.7376 },
  'Zaghouan': { lat: 36.4019, lng: 10.1430 },
  'Bizerte': { lat: 37.2746, lng: 9.8739 },
  'Béja': { lat: 36.7255, lng: 9.1817 },
  'Jendouba': { lat: 36.5011, lng: 8.7808 },
  'Le Kef': { lat: 36.1826, lng: 8.7148 },
  'Siliana': { lat: 36.0850, lng: 9.3708 },
  'Sousse': { lat: 35.8288, lng: 10.6405 },
  'Monastir': { lat: 35.7643, lng: 10.8113 },
  'Mahdia': { lat: 35.5047, lng: 11.0622 },
  'Sfax': { lat: 34.7406, lng: 10.7603 },
  'Kairouan': { lat: 35.6781, lng: 10.0963 },
  'Kasserine': { lat: 35.1674, lng: 8.8365 },
  'Sidi Bouzid': { lat: 35.0381, lng: 9.4858 },
  'Gabès': { lat: 33.8815, lng: 10.0982 },
  'Médenine': { lat: 33.3540, lng: 10.5053 },
  'Tataouine': { lat: 32.9297, lng: 10.4518 },
  'Gafsa': { lat: 34.4250, lng: 8.7842 },
  'Tozeur': { lat: 33.9197, lng: 8.1337 },
  'Kébili': { lat: 33.7048, lng: 8.9699 }
};

const MapPreview: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite' | 'light'>('street');

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    filterPatients();
  }, [patients, selectedRegion, searchTerm]);

  const fetchPatients = async () => {
    try {
      // Fetch only assigned patients for employee
      const response = await fetch('/api/patients/locations?assignedToMe=true');
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      }
    } catch (error) {
      console.error('Error fetching patient locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPatients = () => {
    let filtered = patients;

    if (selectedRegion !== 'all') {
      filtered = filtered.filter(patient => patient.region === selectedRegion);
    }

    if (searchTerm) {
      filtered = filtered.filter(patient =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.delegation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPatients(filtered);
  };

  const getRegionStats = (region: string) => {
    return patients.filter(patient => patient.region === region).length;
  };

  return (
    <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Mes Patients - Carte</h1>
          <p className="text-gray-600">Visualisez la répartition géographique de vos patients assignés</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Search and Filter Row */}
            <div className="flex flex-wrap gap-4 items-center flex-1">
              {/* Search */}
              <div className="flex-1 min-w-[250px] max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Rechercher un patient, délégation, adresse..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Region Filter */}
              <div className="flex items-center gap-2">
                <Filter className="text-gray-400" size={20} />
                <select
                  className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                >
                  <option value="all">Toutes les régions</option>
                  {Object.keys(tunisiaRegions).map(region => (
                    <option key={region} value={region}>
                      {region} ({getRegionStats(region)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2 px-4 py-3 bg-green-50 rounded-lg border border-green-200">
                <Users className="text-green-600" size={20} />
                <div className="text-right">
                  <div className="text-lg font-bold text-green-900">{filteredPatients.length}</div>
                  <div className="text-xs text-green-600">Mes Patients</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <MapPin className="text-emerald-600" size={20} />
                <div className="text-right">
                  <div className="text-lg font-bold text-emerald-900">{Object.keys(tunisiaRegions).filter(region => getRegionStats(region) > 0).length}</div>
                  <div className="text-xs text-emerald-600">Régions</div>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4 py-3 bg-teal-50 rounded-lg border border-teal-200">
                <svg className="text-teal-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="4" width="16" height="12" rx="2"/>
                  <path d="M8 12h8"/>
                  <path d="M8 16h8"/>
                </svg>
                <div className="text-right">
                  <div className="text-lg font-bold text-teal-900">{filteredPatients.filter(p => p.hasDevices === true).length}</div>
                  <div className="text-xs text-teal-600">Avec équipements</div>
                </div>
              </div>
            </div>
          </div>

          {/* Map Instructions */}
          <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-green-900 mb-1">Guide d'utilisation de la carte</h4>
                <div className="text-xs text-green-700 space-y-1">
                  <p>• <strong>Changez la vue</strong> : Utilisez les contrôles en haut à droite pour basculer entre les vues (rue détaillée, satellite, terrain)</p>
                  <p>• <strong>Naviguez</strong> : Faites glisser pour déplacer, molette pour zoomer, cliquez sur les marqueurs pour voir les détails</p>
                  <p>• <strong>Filtrez</strong> : Utilisez la recherche et les filtres pour trouver des patients spécifiques</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden relative border border-gray-200" style={{ height: '700px' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement de la carte...</p>
              </div>
            </div>
          ) : (
            <MapComponent patients={filteredPatients} />
          )}
          
          {/* Enhanced Legend */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-[1000] max-w-sm">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <h4 className="font-semibold text-sm text-gray-900">Légende de la carte</h4>
            </div>
            
            <div className="space-y-3">
              {/* Company Headquarters */}
              <div className="pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-green-800 rounded-md flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M3 21h18M4 21V7l8-4v18M20 21V11l-8-4"/>
                    </svg>
                  </div>
                  <span className="text-xs text-gray-700 font-medium">Siège Elite Medical</span>
                </div>
              </div>
              
              {/* Patient Visit Status */}
              <div className="pb-2 border-b border-gray-100">
                <h5 className="text-xs font-semibold text-gray-800 mb-2">Statut des visites patients</h5>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
                    <span className="text-xs text-gray-600">Récente (30j)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow-sm"></div>
                    <span className="text-xs text-gray-600">Modérée (30-90j)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
                    <span className="text-xs text-gray-600">Ancienne (90j)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gray-500 border-2 border-white shadow-sm"></div>
                    <span className="text-xs text-gray-600">Aucune visite</span>
                  </div>
                </div>
              </div>

              {/* Special Patient Categories */}
              <div className="pb-2 border-b border-gray-100">
                <h5 className="text-xs font-semibold text-gray-800 mb-2">Catégories spéciales</h5>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-orange-600 shadow-sm"></div>
                    <span className="text-xs text-gray-600">Diagnostics actifs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-purple-600 border-2 border-purple-800 shadow-sm"></div>
                    <span className="text-xs text-gray-600">Avec équipements</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-green-900 mb-2">Statistiques rapides</h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-bold text-green-900">{filteredPatients.length}</div>
                    <div className="text-green-600">Patients</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-emerald-900">{Object.keys(tunisiaRegions).filter(region => getRegionStats(region) > 0).length}</div>
                    <div className="text-emerald-600">Régions</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Map Controls Info */}
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md border border-gray-200 p-3 z-[1000]">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
              </svg>
              <div className="text-xs">
                <div className="font-semibold text-gray-900">Contrôles disponibles</div>
                <div className="text-gray-600">Zoom • Couches • Plein écran • Centrage</div>
              </div>
            </div>
          </div>
        </div>

        {/* Region Statistics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(tunisiaRegions).map(([region]) => {
            const count = getRegionStats(region);
            if (count === 0) return null;
            
            return (
              <div key={region} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="text-green-600" size={16} />
                    <h3 className="font-medium text-gray-900">{region}</h3>
                  </div>
                  <span className="text-lg font-semibold text-green-600">{count}</span>
                </div>
              </div>
            );
          })}
        </div>
    </div>
  );
};

(MapPreview as any).getLayout = (page: React.ReactNode) => (
  <EmployeeLayout>{page}</EmployeeLayout>
);

export default MapPreview;