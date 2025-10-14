import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  Stethoscope, 
  ShoppingCart, 
  Package, 
  Settings, 
  FileText,
  ChevronRight 
} from 'lucide-react';

export default function QuickStartGuide() {
  const quickStartSteps = [
    {
      id: 1,
      title: "Configuration Initiale",
      description: "Configurez votre compte et les paramètres de base",
      icon: <Settings className="h-6 w-6" />,
      time: "5 min",
      status: "essential",
      steps: [
        "Créer votre profil administrateur",
        "Configurer les paramètres d'entreprise",
        "Définir les rôles et permissions",
        "Configurer les notifications"
      ]
    },
    {
      id: 2,
      title: "Gestion des Utilisateurs",
      description: "Ajoutez vos employés et définissez leurs rôles",
      icon: <Users className="h-6 w-6" />,
      time: "10 min",
      status: "essential",
      steps: [
        "Créer des comptes employés",
        "Assigner les rôles (Admin, Employé, Manager, Docteur)",
        "Configurer les permissions d'accès",
        "Former vos équipes aux bonnes pratiques"
      ]
    },
    {
      id: 3,
      title: "Ajout des Patients",
      description: "Enregistrez vos patients dans le système",
      icon: <FileText className="h-6 w-6" />,
      time: "15 min",
      status: "essential",
      steps: [
        "Créer les fiches patients",
        "Remplir les informations médicales",
        "Configurer les informations CNAM",
        "Uploader les documents nécessaires"
      ]
    },
    {
      id: 4,
      title: "Gestion du Stock",
      description: "Configurez votre inventaire d'appareils médicaux",
      icon: <Package className="h-6 w-6" />,
      time: "20 min",
      status: "important",
      steps: [
        "Ajouter vos appareils médicaux",
        "Configurer les appareils de diagnostic",
        "Gérer les accessoires et pièces détachées",
        "Définir les emplacements de stock"
      ]
    },
    {
      id: 5,
      title: "Premier Rendez-vous",
      description: "Planifiez votre premier rendez-vous patient",
      icon: <Calendar className="h-6 w-6" />,
      time: "5 min",
      status: "important",
      steps: [
        "Sélectionner un patient",
        "Choisir le type de rendez-vous",
        "Définir la date et l'heure",
        "Confirmer et notifier"
      ]
    },
    {
      id: 6,
      title: "Premier Diagnostic",
      description: "Réalisez votre premier diagnostic médical",
      icon: <Stethoscope className="h-6 w-6" />,
      time: "10 min",
      status: "workflow",
      steps: [
        "Sélectionner le patient et l'appareil",
        "Configurer les paramètres de diagnostic",
        "Enregistrer les résultats",
        "Générer et envoyer le rapport"
      ]
    },
    {
      id: 7,
      title: "Première Vente",
      description: "Effectuez votre première transaction",
      icon: <ShoppingCart className="h-6 w-6" />,
      time: "8 min",
      status: "workflow",
      steps: [
        "Choisir le client (patient ou société)",
        "Sélectionner les produits",
        "Configurer le paiement",
        "Finaliser la vente et imprimer la facture"
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'essential':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'important':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'workflow':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'essential':
        return 'Essentiel';
      case 'important':
        return 'Important';
      case 'workflow':
        return 'Flux de travail';
      default:
        return 'Optionnel';
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-blue-800 flex items-center gap-2">
          🚀 Guide de Démarrage Rapide
        </CardTitle>
        <p className="text-gray-600">
          Suivez ces étapes pour configurer et utiliser efficacement votre plateforme Espace Iris 
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {quickStartSteps.map((step) => (
            <Card key={step.id} className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      {step.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                          {step.id}
                        </span>
                        <Badge variant="outline" className={getStatusColor(step.status)}>
                          {getStatusLabel(step.status)}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-blue-900">{step.title}</h3>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {step.time}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{step.description}</p>
                <div className="space-y-2">
                  {step.steps.map((stepItem, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <ChevronRight className="h-3 w-3 text-blue-500" />
                      <span className="text-gray-700">{stepItem}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-4 w-full text-blue-600 border-blue-200 hover:bg-blue-50">
                  Voir le guide détaillé
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold text-green-800 mb-2">✅ Félicitations !</h3>
          <p className="text-green-700 mb-4">
            Une fois ces étapes terminées, vous serez prêt à utiliser toutes les fonctionnalités d'Espace Iris .
          </p>
          <div className="flex gap-3">
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
              Accéder au tableau de bord
            </Button>
            <Button variant="outline" size="sm" className="border-green-600 text-green-600 hover:bg-green-50">
              Télécharger le guide PDF
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}