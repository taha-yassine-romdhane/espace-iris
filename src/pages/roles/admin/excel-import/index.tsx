import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Users, Building2, Stethoscope, Monitor, Syringe, Wrench, Package, Truck, Calendar, CreditCard, Download, Upload, RefreshCw, Loader2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ImportExportModal from '@/components/forms/ImportExportModal';
import PatientsImport from './components/PatientsImport';
import ProductsImport from './components/ProductsImport';
import MedicalDevicesImport from './components/MedicalDevicesImport';
import DiagnosticDevicesImport from './components/DiagnosticDevicesImport';
import AccessoriesImport from './components/AccessoriesImport';
import SparePartsImport from './components/SparePartsImport';

interface ImportExportOption {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  type: 'patients' | 'companies' | 'products' | 'medical-devices' | 'diagnostic-devices' | 'accessories' | 'spare-parts';
  available: boolean;
  stats?: {
    totalRecords?: number;
    lastUpdate?: string;
  };
}

interface StatsData {
  modules: {
    [key: string]: {
      totalRecords: number;
      lastUpdate: string | null;
      available: boolean;
    };
  };
  summary: {
    totalRecords: number;
    availableModules: number;
    comingSoonModules: number;
    lastGlobalUpdate: number;
  };
}

export default function ExcelImportExportPage() {
  const [selectedOption, setSelectedOption] = useState<ImportExportOption | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedImport, setShowAdvancedImport] = useState<string | null>(null);

  // Fetch statistics from API
  const fetchStats = async () => {
    try {
      setIsLoadingStats(true);
      setError(null);
      const response = await fetch('/api/excel-import/stats');
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des statistiques');
      }
      
      const result = await response.json();
      setStatsData(result.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Load stats on component mount
  useEffect(() => {
    fetchStats();
  }, []);

  const getOptionWithRealStats = (baseOption: any, moduleKey: string) => {
    if (!statsData || !statsData.modules[moduleKey]) {
      return baseOption;
    }
    
    const moduleData = statsData.modules[moduleKey];
    return {
      ...baseOption,
      available: moduleData.available,
      stats: {
        totalRecords: moduleData.totalRecords,
        lastUpdate: moduleData.lastUpdate || new Date().toISOString()
      }
    };
  };

  const baseImportExportOptions = [
    {
      id: 'patients',
      title: 'Patients',
      description: 'Gérer les données des patients',
      longDescription: 'Importez ou exportez tous les patients avec leurs informations personnelles, coordonnées, détails médicaux, antécédents et informations d\'assurance.',
      icon: <Users className="h-8 w-8" />,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      type: 'patients' as const,
      available: true,
      stats: { totalRecords: 0, lastUpdate: new Date().toISOString() }
    },
    {
      id: 'companies',
      title: 'Sociétés',
      description: 'Gérer les données des sociétés',
      longDescription: 'Importez ou exportez toutes les sociétés avec leurs coordonnées, informations de contact, adresses et détails fiscaux.',
      icon: <Building2 className="h-8 w-8" />,
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      type: 'companies' as const,
      available: true,
      stats: { totalRecords: 0, lastUpdate: new Date().toISOString() }
    },
    {
      id: 'medical-devices',
      title: 'Appareils Médicaux',
      description: 'Gérer les appareils médicaux',
      longDescription: 'Importez ou exportez tous les appareils médicaux (CPAP, VNI, Concentrateurs) avec leurs spécifications techniques, configurations et historique de maintenance.',
      icon: <Stethoscope className="h-8 w-8" />,
      color: 'text-purple-700',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      type: 'medical-devices' as const,
      available: true,
      stats: { totalRecords: 0, lastUpdate: new Date().toISOString() }
    },
    {
      id: 'diagnostic-devices',
      title: 'Appareils de Diagnostic',
      description: 'Gérer les appareils de diagnostic',
      longDescription: 'Importez ou exportez tous les appareils de diagnostic (Tensiomètres, Oxymètres, ECG) avec leurs paramètres et configurations.',
      icon: <Monitor className="h-8 w-8" />,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      type: 'diagnostic-devices' as const,
      available: true,
      stats: { totalRecords: 0, lastUpdate: new Date().toISOString() }
    },
    {
      id: 'accessories',
      title: 'Accessoires',
      description: 'Gérer les accessoires médicaux',
      longDescription: 'Importez ou exportez tous les accessoires (Masques, Circuits, Filtres) avec leurs informations de stock et prix.',
      icon: <Syringe className="h-8 w-8" />,
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      type: 'accessories' as const,
      available: true,
      stats: { totalRecords: 0, lastUpdate: new Date().toISOString() }
    },
    {
      id: 'spare-parts',
      title: 'Pièces de Rechange',
      description: 'Gérer les pièces détachées',
      longDescription: 'Importez ou exportez toutes les pièces de rechange (Moteurs, Capteurs, Valves) avec leurs informations de stock et compatibilité.',
      icon: <Wrench className="h-8 w-8" />,
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      type: 'spare-parts' as const,
      available: true,
      stats: { totalRecords: 0, lastUpdate: new Date().toISOString() }
    },
    {
      id: 'transfers',
      title: 'Transferts de Stock',
      description: 'Historique des transferts',
      longDescription: 'Exportez l\'historique complet des transferts de stock entre différents emplacements avec les détails des quantités et dates.',
      icon: <Truck className="h-8 w-8" />,
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      type: 'patients' as const,
      available: false,
      stats: { totalRecords: 0, lastUpdate: new Date().toISOString() }
    },
    {
      id: 'appointments',
      title: 'Rendez-vous',
      description: 'Gérer les rendez-vous',
      longDescription: 'Importez ou exportez tous les rendez-vous avec leurs détails, statuts, assignations et notes associées.',
      icon: <Calendar className="h-8 w-8" />,
      color: 'text-teal-700',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
      type: 'patients' as const,
      available: false,
      stats: { totalRecords: 0, lastUpdate: new Date().toISOString() }
    },
    {
      id: 'payments',
      title: 'Paiements',
      description: 'Historique des paiements',
      longDescription: 'Exportez l\'historique complet des paiements et transactions avec les détails des montants, méthodes et statuts.',
      icon: <CreditCard className="h-8 w-8" />,
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      type: 'patients' as const,
      available: false,
      stats: { totalRecords: 0, lastUpdate: new Date().toISOString() }
    }
  ];

  // Generate options with real data
  const importExportOptions: ImportExportOption[] = baseImportExportOptions.map(option => {
    const moduleKeys: { [key: string]: string } = {
      'patients': 'patients',
      'companies': 'companies',
      'medical-devices': 'medicalDevices',
      'diagnostic-devices': 'diagnosticDevices',
      'accessories': 'accessories',
      'spare-parts': 'spareParts',
      'products': 'products',
      'transfers': 'transfers',
      'appointments': 'appointments',
      'payments': 'payments'
    };
    
    return getOptionWithRealStats(option, moduleKeys[option.id] || option.id);
  });

  const handleOptionSelect = (option: ImportExportOption) => {
    if (!option.available) return;
    
    setSelectedOption(option);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedOption(null);
  };

  const handleImportComplete = () => {
    fetchStats(); // Refresh stats after import
  };

  const availableOptionsCount = statsData ? statsData.summary.availableModules : importExportOptions.filter(option => option.available).length;
  const totalOptionsCount = importExportOptions.length;
  const totalRecords = statsData ? statsData.summary.totalRecords : importExportOptions.reduce((sum, opt) => sum + (opt.stats?.totalRecords || 0), 0);
  const lastGlobalUpdate = statsData && statsData.summary.lastGlobalUpdate ? new Date(statsData.summary.lastGlobalUpdate).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');

  // Show advanced import component if selected
  if (showAdvancedImport) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => {
              setShowAdvancedImport(null);
              fetchStats(); // Refresh stats when going back
            }}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la vue d'ensemble
          </Button>
        </div>
        
        {showAdvancedImport === 'patients' && <PatientsImport />}
        {showAdvancedImport === 'products' && <ProductsImport />}
        {showAdvancedImport === 'medical-devices' && <MedicalDevicesImport />}
        {showAdvancedImport === 'diagnostic-devices' && <DiagnosticDevicesImport />}
        {showAdvancedImport === 'accessories' && <AccessoriesImport />}
        {showAdvancedImport === 'spare-parts' && <SparePartsImport />}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-[#1e3a8a]" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Import/Export Excel</h1>
              <p className="text-gray-600 mt-1">
                Gérez vos données avec des imports et exports Excel pour tous les modules du système
              </p>
            </div>
          </div>
          <Button
            onClick={fetchStats}
            disabled={isLoadingStats}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {isLoadingStats ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualiser
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-700">
                <span>⚠️</span>
                <span>{error}</span>
                <Button
                  onClick={fetchStats}
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                >
                  Réessayer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Stats Card */}
        <Card className="border-[#1e3a8a]/20 bg-[#1e3a8a]/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#1e3a8a]">
                    {isLoadingStats ? (
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    ) : (
                      availableOptionsCount
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Modules disponibles</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-700">
                    {isLoadingStats ? (
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    ) : (
                      totalOptionsCount - availableOptionsCount
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Bientôt disponibles</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {isLoadingStats ? (
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    ) : (
                      totalRecords.toLocaleString()
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Enregistrements totaux</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Dernière mise à jour</div>
                <div className="text-sm font-medium text-gray-900">
                  {isLoadingStats ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    lastGlobalUpdate
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {importExportOptions.map((option) => (
          <Card 
            key={option.id}
            className={`relative transition-all duration-200 hover:shadow-lg ${
              option.available 
                ? `${option.borderColor} hover:shadow-md` 
                : 'border-gray-200 opacity-60'
            }`}
          >
            <CardHeader className={`${option.bgColor} rounded-t-lg`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={option.color}>
                    {option.icon}
                  </div>
                  <div>
                    <CardTitle className={`text-lg ${option.color}`}>
                      {option.title}
                    </CardTitle>
                    <CardDescription className={option.color}>
                      {option.description}
                    </CardDescription>
                  </div>
                </div>
                {!option.available && (
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                    Bientôt
                  </span>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {option.longDescription}
              </p>
              
              {option.stats && (
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <div className="flex items-center gap-4">
                    <span className="font-medium">
                      {option.stats.totalRecords?.toLocaleString()} enregistrements
                    </span>
                  </div>
                  <span>
                    Maj: {new Date(option.stats.lastUpdate || '').toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
              
              {option.available ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className={`flex-1 ${option.color.replace('text-', 'bg-').replace('-700', '-600')} hover:${option.color.replace('text-', 'bg-').replace('-700', '-700')} text-white`}
                      onClick={() => {
                        // Use advanced import for all device types
                        if (['patients', 'products', 'medical-devices', 'diagnostic-devices', 'accessories', 'spare-parts'].includes(option.id)) {
                          setShowAdvancedImport(option.id);
                        } else {
                          handleOptionSelect(option);
                        }
                      }}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Importer
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className={`flex-1 ${option.borderColor} ${option.color} hover:${option.bgColor}`}
                      onClick={() => handleOptionSelect(option)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Exporter
                    </Button>
                  </div>
                  {['patients', 'products', 'medical-devices', 'diagnostic-devices', 'accessories', 'spare-parts'].includes(option.id) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOptionSelect(option);
                      }}
                    >
                      Utiliser l'import classique
                    </Button>
                  )}
                </div>
              ) : (
                <Button 
                  size="sm" 
                  disabled 
                  className="w-full bg-gray-100 text-gray-400 cursor-not-allowed"
                >
                  Fonctionnalité en développement
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Help Section */}
      <div className="mt-8">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Guide d'utilisation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-700">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Import de données:</h4>
                <ul className="space-y-1 text-xs">
                  <li>• Téléchargez le template Excel pour chaque module</li>
                  <li>• Remplissez le fichier avec vos données</li>
                  <li>• Respectez le format des colonnes et types de données</li>
                  <li>• Importez le fichier et vérifiez les résultats</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Export de données:</h4>
                <ul className="space-y-1 text-xs">
                  <li>• Exportez vos données actuelles au format Excel</li>
                  <li>• Utilisez les exports pour les sauvegardes</li>
                  <li>• Partagez les données avec des systèmes externes</li>
                  <li>• Analysez vos données dans Excel ou autres outils</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import/Export Modal */}
      {selectedOption && (
        <ImportExportModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          type={selectedOption.type as any}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  );
}