import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Calendar, 
  Stethoscope, 
  ShoppingCart, 
  Package, 
  Settings, 
  FileText,
  Activity,
  Wrench,
  BarChart3,
  Shield,
  Archive,
  ExternalLink,
  Video,
  BookOpen
} from 'lucide-react';

interface FeatureDocumentationProps {
  searchQuery: string;
}

export default function FeatureDocumentation({ searchQuery }: FeatureDocumentationProps) {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const features = [
    {
      id: 'dashboard',
      title: 'Tableau de Bord',
      icon: <BarChart3 className="h-6 w-6" />,
      description: 'Vue d\'ensemble de votre activité avec statistiques en temps réel',
      category: 'Interface',
      complexity: 'Facile',
      documentation: {
        overview: 'Le tableau de bord est votre centre de contrôle principal. Il affiche toutes les métriques importantes de votre activité.',
        features: [
          'Statistiques en temps réel',
          'Raccourcis vers les actions principales',
          'Notifications importantes',
          'Graphiques de performance'
        ],
        howTo: [
          'Connectez-vous à votre compte',
          'Le tableau de bord s\'affiche automatiquement',
          'Utilisez les boutons d\'action rapide : RDV, Diagnostic, Vente, Location',
          'Consultez les tableaux pour voir l\'activité récente'
        ],
        tips: [
          'Vérifiez le tableau de bord chaque matin pour un aperçu de votre journée',
          'Utilisez les filtres pour personnaliser l\'affichage',
          'Cliquez sur les graphiques pour plus de détails'
        ]
      }
    },
    {
      id: 'patients',
      title: 'Gestion des Patients',
      icon: <Users className="h-6 w-6" />,
      description: 'Créez et gérez les dossiers patients avec historique médical complet',
      category: 'Gestion',
      complexity: 'Moyen',
      documentation: {
        overview: 'La gestion des patients vous permet de créer, modifier et suivre tous vos patients avec un historique médical complet.',
        features: [
          'Création de fiches patients complètes',
          'Gestion des informations CNAM',
          'Historique médical détaillé',
          'Upload de documents',
          'Recherche avancée',
          'Export des données'
        ],
        howTo: [
          'Accédez à "Renseignements" depuis le menu',
          'Cliquez sur "Ajouter un Patient"',
          'Remplissez le formulaire avec les informations personnelles',
          'Ajoutez les informations d\'assurance (CNAM si applicable)',
          'Uploadez les documents nécessaires',
          'Sauvegardez le dossier'
        ],
        tips: [
          'Utilisez la fonction de recherche pour retrouver rapidement un patient',
          'Mettez à jour régulièrement les informations médicales',
          'Vérifiez les informations CNAM pour éviter les erreurs de facturation'
        ]
      }
    },
    {
      id: 'appointments',
      title: 'Rendez-vous (RDV)',
      icon: <Calendar className="h-6 w-6" />,
      description: 'Planifiez et gérez les rendez-vous avec vos patients',
      category: 'Planification',
      complexity: 'Facile',
      documentation: {
        overview: 'Le système de rendez-vous vous permet de planifier, modifier et suivre tous vos rendez-vous patients.',
        features: [
          'Planification de rendez-vous',
          'Sélection de patients existants',
          'Types de rendez-vous personnalisables',
          'Calendrier intégré',
          'Notifications automatiques',
          'Gestion des statuts (Planifié, Confirmé, Terminé, Annulé)'
        ],
        howTo: [
          'Depuis le tableau de bord, cliquez sur "RDV"',
          'Sélectionnez le patient (étape 1)',
          'Choisissez le type de rendez-vous (étape 2)',
          'Définissez la date et l\'heure (étape 3)',
          'Vérifiez les informations et confirmez (étape 4)',
          'Le rendez-vous apparaît dans le tableau des RDV'
        ],
        tips: [
          'Planifiez les RDV à l\'avance pour une meilleure organisation',
          'Utilisez les types de RDV pour catégoriser vos consultations',
          'Confirmez les RDV avec les patients la veille'
        ]
      }
    },
    {
      id: 'diagnostics',
      title: 'Diagnostics Médicaux',
      icon: <Stethoscope className="h-6 w-6" />,
      description: 'Réalisez des diagnostics avec vos appareils médicaux',
      category: 'Médical',
      complexity: 'Avancé',
      documentation: {
        overview: 'Le module de diagnostics vous permet de réaliser des examens médicaux avec vos appareils et de générer des rapports.',
        features: [
          'Sélection d\'appareils de diagnostic',
          'Configuration des paramètres d\'examen',
          'Enregistrement des résultats',
          'Génération de rapports PDF',
          'Historique des diagnostics',
          'Gestion des tâches associées'
        ],
        howTo: [
          'Cliquez sur "Diagnostic" dans le tableau de bord',
          'Sélectionnez le patient',
          'Choisissez l\'appareil de diagnostic',
          'Configurez les paramètres spécifiques',
          'Réalisez l\'examen et saisissez les résultats',
          'Générez le rapport et envoyez-le au patient'
        ],
        tips: [
          'Vérifiez que l\'appareil est calibré avant l\'examen',
          'Sauvegardez régulièrement pendant la saisie',
          'Utilisez les modèles de rapports pour gagner du temps'
        ]
      }
    },
    {
      id: 'sales',
      title: 'Gestion des Ventes',
      icon: <ShoppingCart className="h-6 w-6" />,
      description: 'Vendez vos produits aux patients et sociétés',
      category: 'Commercial',
      complexity: 'Moyen',
      documentation: {
        overview: 'Le système de ventes vous permet de gérer toutes vos transactions commerciales avec patients et entreprises.',
        features: [
          'Vente aux patients et sociétés',
          'Gestion des produits et tarifs',
          'Facturation automatique',
          'Gestion des paiements CNAM',
          'Suivi des dossiers CNAM',
          'Historique des ventes'
        ],
        howTo: [
          'Cliquez sur "Vente" dans le tableau de bord',
          'Sélectionnez le type de client (Patient ou Société)',
          'Choisissez le client dans la liste',
          'Ajoutez les produits à la vente',
          'Configurez les informations de paiement',
          'Validez la vente et générez la facture'
        ],
        tips: [
          'Vérifiez les informations CNAM avant la facturation',
          'Utilisez les codes-barres pour ajouter rapidement les produits',
          'Sauvegardez les ventes en brouillon si nécessaire'
        ]
      }
    },
    {
      id: 'rentals',
      title: 'Locations d\'Appareils',
      icon: <Package className="h-6 w-6" />,
      description: 'Gérez la location de vos appareils médicaux',
      category: 'Commercial',
      complexity: 'Moyen',
      documentation: {
        overview: 'Le module de location vous permet de louer vos appareils médicaux aux patients avec suivi complet.',
        features: [
          'Location d\'appareils médicaux',
          'Gestion des durées de location',
          'Suivi des retours',
          'Facturation récurrente',
          'Gestion des cautions',
          'Maintenance des appareils loués'
        ],
        howTo: [
          'Cliquez sur "Location" dans le tableau de bord',
          'Sélectionnez le patient',
          'Choisissez l\'appareil à louer',
          'Définissez la durée et les conditions',
          'Configurez le paiement et la caution',
          'Validez le contrat de location'
        ],
        tips: [
          'Vérifiez l\'état de l\'appareil avant la location',
          'Expliquez le fonctionnement au patient',
          'Planifiez les visites de maintenance'
        ]
      }
    },
    {
      id: 'inventory',
      title: 'Gestion du Stock',
      icon: <Archive className="h-6 w-6" />,
      description: 'Gérez votre inventaire d\'appareils et de produits',
      category: 'Logistique',
      complexity: 'Avancé',
      documentation: {
        overview: 'La gestion du stock vous permet de suivre tous vos appareils, accessoires et pièces détachées.',
        features: [
          'Inventaire en temps réel',
          'Gestion des emplacements',
          'Transferts entre emplacements',
          'Suivi des mouvements',
          'Alertes de stock bas',
          'Rapports d\'inventaire'
        ],
        howTo: [
          'Accédez à "Gestion du Stock"',
          'Consultez l\'inventaire par catégorie',
          'Effectuez des transferts entre emplacements',
          'Vérifiez les niveaux de stock',
          'Générez des rapports d\'inventaire',
          'Configurez les alertes de stock'
        ],
        tips: [
          'Effectuez des vérifications d\'inventaire régulières',
          'Utilisez les codes QR pour un suivi précis',
          'Configurez des seuils d\'alerte appropriés'
        ]
      }
    },
    {
      id: 'monitoring',
      title: 'Monitoring des Employés',
      icon: <Activity className="h-6 w-6" />,
      description: 'Surveillez l\'activité et les performances de votre équipe',
      category: 'Management',
      complexity: 'Moyen',
      documentation: {
        overview: 'L\'espace technicien vous permet de surveiller l\'activité de vos employés et d\'analyser leurs performances.',
        features: [
          'Suivi des activités employés',
          'Statistiques de performance',
          'Historique des actions',
          'Filtrage par employé et période',
          'Export des données',
          'Tableaux de bord personnalisés'
        ],
        howTo: [
          'Accédez à "Espace Technicien"',
          'Sélectionnez l\'employé à surveiller',
          'Choisissez la période d\'analyse',
          'Filtrez par type d\'activité',
          'Consultez les détails des actions',
          'Exportez les rapports si nécessaire'
        ],
        tips: [
          'Utilisez les données pour identifier les formations nécessaires',
          'Analysez les tendances pour optimiser les processus',
          'Communiquez régulièrement avec vos équipes'
        ]
      }
    }
  ];

  const filteredFeatures = features.filter(feature =>
    searchQuery === '' ||
    feature.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    feature.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    feature.documentation.overview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Facile':
        return 'bg-green-100 text-green-800';
      case 'Moyen':
        return 'bg-yellow-100 text-yellow-800';
      case 'Avancé':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-blue-800">
          📚 Documentation des Fonctionnalités
        </CardTitle>
        <p className="text-gray-600">
          Guides détaillés pour chaque fonctionnalité de la plateforme
        </p>
      </CardHeader>
      <CardContent>
        {selectedFeature ? (
          <div>
            <Button 
              variant="outline" 
              onClick={() => setSelectedFeature(null)}
              className="mb-6"
            >
              ← Retour à la liste
            </Button>
            
            {(() => {
              const feature = features.find(f => f.id === selectedFeature);
              if (!feature) return null;
              
              return (
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                      {feature.icon}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-blue-900">{feature.title}</h2>
                      <p className="text-gray-600">{feature.description}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{feature.category}</Badge>
                        <Badge className={getComplexityColor(feature.complexity)}>
                          {feature.complexity}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                      <TabsTrigger value="howto">Comment faire</TabsTrigger>
                      <TabsTrigger value="features">Fonctionnalités</TabsTrigger>
                      <TabsTrigger value="tips">Conseils</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="overview" className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Vue d'ensemble</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-700 leading-relaxed">
                            {feature.documentation.overview}
                          </p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="howto" className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Guide étape par étape</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ol className="space-y-3">
                            {feature.documentation.howTo.map((step, index) => (
                              <li key={index} className="flex gap-3">
                                <span className="bg-blue-600 text-white text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                  {index + 1}
                                </span>
                                <span className="text-gray-700">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="features" className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Fonctionnalités principales</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {feature.documentation.features.map((featureItem, index) => (
                              <div key={index} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                <span className="text-gray-700">{featureItem}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="tips" className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Conseils et bonnes pratiques</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {feature.documentation.tips.map((tip, index) => (
                              <div key={index} className="flex gap-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                                <span className="text-yellow-600 font-bold">💡</span>
                                <span className="text-gray-700">{tip}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-8 flex gap-3">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Video className="w-4 h-4 mr-2" />
                      Voir la vidéo tutorial
                    </Button>
                    <Button variant="outline">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Télécharger le PDF
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFeatures.map((feature) => (
              <Card 
                key={feature.id} 
                className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-blue-500"
                onClick={() => setSelectedFeature(feature.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      {feature.icon}
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">
                        {feature.category}
                      </Badge>
                      <Badge className={`text-xs ${getComplexityColor(feature.complexity)}`}>
                        {feature.complexity}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-lg text-blue-900 mt-3">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4">
                    {feature.description}
                  </p>
                  <Button variant="ghost" size="sm" className="w-full text-blue-600 hover:bg-blue-50">
                    Lire la documentation
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredFeatures.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune documentation trouvée</h3>
            <p className="text-gray-600">
              Aucune fonctionnalité ne correspond à votre recherche
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}