import React, { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Users, Package, Calendar, Activity, Stethoscope, ShoppingCart, Settings, AlertCircle } from 'lucide-react';

interface FAQSectionProps {
  searchQuery: string;
}

interface FAQ {
  question: string;
  answer: string;
  category: string;
  importance?: 'high' | 'medium' | 'low';
  tags?: string[];
}

export default function FAQSection({ searchQuery }: FAQSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const faqCategories = [
    { id: 'general', name: 'Général', icon: <HelpCircle className="h-4 w-4" /> },
    { id: 'setup', name: 'Configuration', icon: <Settings className="h-4 w-4" /> },
    { id: 'patients', name: 'Patients', icon: <Users className="h-4 w-4" /> },
    { id: 'products', name: 'Produits', icon: <Package className="h-4 w-4" /> },
    { id: 'diagnostics', name: 'Diagnostics', icon: <Stethoscope className="h-4 w-4" /> },
    { id: 'sales', name: 'Ventes', icon: <ShoppingCart className="h-4 w-4" /> },
    { id: 'rentals', name: 'Locations', icon: <Calendar className="h-4 w-4" /> },
    { id: 'monitoring', name: 'Monitoring', icon: <Activity className="h-4 w-4" /> },
    { id: 'troubleshooting', name: 'Dépannage', icon: <AlertCircle className="h-4 w-4" /> }
  ];

  const faqs: FAQ[] = [
    // Configuration & Setup
    {
      question: "Comment configurer mon compte administrateur lors de la première connexion ?",
      answer: "Lors de votre première connexion, accédez à 'Profil' dans le menu, remplissez vos informations personnelles, configurez les paramètres d'entreprise dans 'Paramètres', puis créez les comptes de vos employés dans la section 'Utilisateurs'.",
      category: "setup",
      importance: "high",
      tags: ["première connexion", "configuration", "profil"]
    },
    {
      question: "Comment ajouter de nouveaux utilisateurs et définir leurs rôles ?",
      answer: "Accédez à 'Utilisateurs' > 'Ajouter un utilisateur'. Remplissez les informations requises et sélectionnez le rôle approprié : Admin (accès complet), Manager (gestion d'équipe), Employé (opérations courantes), ou Docteur (focus médical). Chaque rôle a des permissions spécifiques.",
      category: "setup",
      importance: "high",
      tags: ["utilisateurs", "rôles", "permissions"]
    },
    {
      question: "Comment configurer les notifications du système ?",
      answer: "Dans 'Paramètres' > 'Notifications', vous pouvez activer/désactiver les notifications par email, SMS ou dans l'application pour différents événements : nouveaux rendez-vous, rappels de maintenance, alertes de stock, etc.",
      category: "setup",
      importance: "medium",
      tags: ["notifications", "paramètres", "alertes"]
    },

    // Patients
    {
      question: "Comment créer un nouveau dossier patient ?",
      answer: "Accédez à 'Renseignements' > 'Ajouter un Patient'. Remplissez les informations personnelles (nom, téléphone, adresse), les données médicales (taille, poids, antécédents), les informations d'assurance (CNAM si applicable), et uploadez les documents nécessaires.",
      category: "patients",
      importance: "high",
      tags: ["nouveau patient", "dossier", "création"]
    },
    {
      question: "Comment gérer les informations CNAM d'un patient ?",
      answer: "Dans le formulaire patient, cochez 'CNAM' si le patient est couvert. Sélectionnez la caisse d'affiliation (CNSS ou CNRPS), le type de bénéficiaire (Assuré social, Conjoint, Enfant, Ascendant), et saisissez l'identifiant CNAM (12 caractères maximum).",
      category: "patients",
      importance: "high",
      tags: ["CNAM", "assurance", "facturation"]
    },
    {
      question: "Comment rechercher rapidement un patient ?",
      answer: "Utilisez la barre de recherche en haut de la liste des patients. Vous pouvez rechercher par nom, numéro de téléphone, ou CIN. La recherche est instantanée et affiche les résultats correspondants en temps réel.",
      category: "patients",
      importance: "medium",
      tags: ["recherche", "patient", "trouver"]
    },
    {
      question: "Comment modifier les informations d'un patient existant ?",
      answer: "Dans la liste des patients, cliquez sur l'icône d'édition (crayon) à côté du patient concerné. Modifiez les informations nécessaires et cliquez sur 'Sauvegarder'. Les modifications sont immédiatement appliquées.",
      category: "patients",
      importance: "medium",
      tags: ["modification", "patient", "édition"]
    },

    // Rendez-vous
    {
      question: "Comment planifier un nouveau rendez-vous ?",
      answer: "Depuis le tableau de bord, cliquez sur 'RDV'. Suivez les 4 étapes : 1) Sélectionnez le patient, 2) Choisissez le type de rendez-vous, 3) Définissez la date et l'heure, 4) Confirmez les informations. Le RDV apparaîtra dans votre planning.",
      category: "rentals",
      importance: "high",
      tags: ["rendez-vous", "planification", "RDV"]
    },
    {
      question: "Comment annuler ou reprogrammer un rendez-vous ?",
      answer: "Dans le tableau des rendez-vous, trouvez le RDV concerné et cliquez sur l'icône de suppression pour l'annuler. Pour reprogrammer, créez un nouveau RDV avec les nouvelles informations.",
      category: "rentals",
      importance: "medium",
      tags: ["annulation", "reprogrammation", "RDV"]
    },

    // Diagnostics
    {
      question: "Comment réaliser un diagnostic médical ?",
      answer: "Cliquez sur 'Diagnostic' dans le tableau de bord. Sélectionnez le patient et l'appareil de diagnostic. Configurez les paramètres spécifiques à l'examen. Réalisez l'examen et saisissez les résultats. Générez ensuite le rapport PDF à envoyer au patient.",
      category: "diagnostics",
      importance: "high",
      tags: ["diagnostic", "examen", "appareil médical"]
    },
    {
      question: "Comment configurer les paramètres d'un appareil de diagnostic ?",
      answer: "Lors de la création d'un diagnostic, après avoir sélectionné l'appareil, cliquez sur 'Configurer les paramètres'. Ajustez les valeurs selon le type d'examen (tension, fréquence, durée, etc.). Sauvegardez la configuration pour la réutiliser.",
      category: "diagnostics",
      importance: "medium",
      tags: ["paramètres", "configuration", "appareil"]
    },
    {
      question: "Comment générer et envoyer un rapport de diagnostic ?",
      answer: "Une fois le diagnostic terminé et les résultats saisis, cliquez sur 'Générer le rapport'. Le système crée automatiquement un PDF avec les informations du patient, les paramètres utilisés et les résultats. Vous pouvez l'imprimer ou l'envoyer par email.",
      category: "diagnostics",
      importance: "high",
      tags: ["rapport", "PDF", "résultats"]
    },

    // Ventes
    {
      question: "Comment effectuer une vente à un patient ?",
      answer: "Cliquez sur 'Vente' dans le tableau de bord. Sélectionnez 'Patient' puis choisissez le patient dans la liste. Ajoutez les produits en utilisant la recherche ou les codes-barres. Configurez le paiement (espèces, chèque, CNAM) et validez la vente.",
      category: "sales",
      importance: "high",
      tags: ["vente", "patient", "facturation"]
    },
    {
      question: "Comment gérer une vente avec paiement CNAM ?",
      answer: "Lors d'une vente à un patient CNAM, le système détecte automatiquement sa couverture. Sélectionnez les produits éligibles CNAM, remplissez les informations du dossier CNAM (numéro de bon, dates), et le système calcule automatiquement la part CNAM et la part patient.",
      category: "sales",
      importance: "high",
      tags: ["CNAM", "paiement", "facturation"]
    },
    {
      question: "Comment vendre à une société/entreprise ?",
      answer: "Dans la section vente, sélectionnez 'Société' au lieu de 'Patient'. Choisissez la société dans la liste ou créez-en une nouvelle. Ajoutez les produits, configurez les conditions de paiement (souvent à crédit pour les entreprises) et générez la facture.",
      category: "sales",
      importance: "medium",
      tags: ["société", "entreprise", "B2B"]
    },

    // Gestion des produits
    {
      question: "Comment ajouter un nouveau produit au catalogue ?",
      answer: "Accédez à 'Gestion des Appareils' > 'Ajouter un Produit'. Choisissez le type (Appareil médical, Appareil de diagnostic, Accessoire, Pièce détachée), remplissez les détails (nom, prix, description, fournisseur) et définissez le stock initial.",
      category: "products",
      importance: "high",
      tags: ["nouveau produit", "catalogue", "inventaire"]
    },
    {
      question: "Comment gérer les niveaux de stock et les alertes ?",
      answer: "Dans 'Gestion du Stock', vous pouvez voir les niveaux actuels de tous vos produits. Configurez des seuils d'alerte dans les paramètres de chaque produit. Le système vous notifiera automatiquement quand un stock devient faible.",
      category: "products",
      importance: "medium",
      tags: ["stock", "inventaire", "alertes"]
    },
    {
      question: "Comment effectuer un transfert de stock entre emplacements ?",
      answer: "Dans 'Gestion du Stock' > 'Transferts', cliquez sur 'Nouveau transfert'. Sélectionnez l'emplacement source et destination, choisissez les produits et quantités à transférer. Le transfert doit être vérifié par un responsable.",
      category: "products",
      importance: "medium",
      tags: ["transfert", "emplacement", "stock"]
    },

    // Locations
    {
      question: "Comment louer un appareil médical à un patient ?",
      answer: "Cliquez sur 'Location' dans le tableau de bord. Sélectionnez le patient et l'appareil disponible. Définissez la durée de location, les conditions (tarif, caution), et les modalités de paiement. Le contrat de location est automatiquement généré.",
      category: "rentals",
      importance: "high",
      tags: ["location", "appareil médical", "contrat"]
    },
    {
      question: "Comment gérer les retours d'appareils loués ?",
      answer: "Dans la liste des locations actives, trouvez la location concernée et cliquez sur 'Marquer comme retourné'. Vérifiez l'état de l'appareil, notez d'éventuels dommages, et finalisez le retour. L'appareil redevient disponible pour de nouvelles locations.",
      category: "rentals",
      importance: "medium",
      tags: ["retour", "location", "état appareil"]
    },

    // Monitoring
    {
      question: "Comment surveiller l'activité de mes employés ?",
      answer: "Accédez à 'Espace Technicien' pour voir un tableau de bord complet de l'activité de vos employés. Vous pouvez filtrer par employé, période, et type d'action pour analyser les performances et identifier les besoins de formation.",
      category: "monitoring",
      importance: "medium",
      tags: ["employés", "surveillance", "performance"]
    },
    {
      question: "Comment exporter les données d'activité ?",
      answer: "Dans l'espace de monitoring, utilisez les filtres pour sélectionner les données souhaitées, puis cliquez sur 'Exporter les données'. Vous pouvez télécharger un fichier CSV contenant toutes les informations d'activité pour vos analyses.",
      category: "monitoring",
      importance: "low",
      tags: ["export", "données", "CSV"]
    },

    // Dépannage
    {
      question: "Que faire si je ne vois pas les patients dans la sélection RDV ?",
      answer: "Vérifiez d'abord que vous avez créé des patients dans 'Renseignements'. Si les patients existent mais n'apparaissent pas, actualisez la page. Si le problème persiste, vérifiez vos permissions utilisateur ou contactez le support.",
      category: "troubleshooting",
      importance: "high",
      tags: ["RDV", "patients", "sélection", "bug"]
    },
    {
      question: "Comment résoudre les erreurs de sauvegarde de formulaire ?",
      answer: "Si un formulaire ne se sauvegarde pas, vérifiez que tous les champs obligatoires sont remplis (marqués d'un astérisque rouge). Vérifiez votre connexion internet. Si l'erreur persiste, copiez vos données, actualisez la page et ressaisissez.",
      category: "troubleshooting",
      importance: "medium",
      tags: ["sauvegarde", "erreur", "formulaire"]
    },
    {
      question: "Que faire en cas de problème de connexion ?",
      answer: "Vérifiez votre connexion internet. Essayez de vous déconnecter et reconnecter. Videz le cache de votre navigateur. Si vous avez oublié votre mot de passe, utilisez la fonction 'Mot de passe oublié' sur la page de connexion.",
      category: "troubleshooting",
      importance: "medium",
      tags: ["connexion", "mot de passe", "cache"]
    },

    // Général
    {
      question: "Comment naviguer efficacement dans l'interface ?",
      answer: "Utilisez le menu latéral pour accéder aux différentes sections. Le tableau de bord est votre point central avec des raccourcis vers les actions principales. La barre de recherche globale en haut vous permet de trouver rapidement patients ou produits.",
      category: "general",
      importance: "medium",
      tags: ["navigation", "interface", "menu"]
    },
    {
      question: "Comment personnaliser mon tableau de bord ?",
      answer: "Actuellement, le tableau de bord affiche les informations essentielles par défaut. Les options de personnalisation peuvent être configurées dans 'Paramètres' > 'Préférences d'affichage' pour ajuster les widgets et les informations affichées.",
      category: "general",
      importance: "low",
      tags: ["personnalisation", "tableau de bord", "widgets"]
    }
  ];

  const filterFaqs = (faqs: FAQ[], query: string, category = '') => {
    return faqs.filter(faq => {
      const matchesQuery = query === '' || 
        faq.question.toLowerCase().includes(query.toLowerCase()) || 
        faq.answer.toLowerCase().includes(query.toLowerCase()) ||
        faq.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
      
      const matchesCategory = category === '' || faq.category === category;
      
      return matchesQuery && matchesCategory;
    });
  };

  const getImportanceColor = (importance?: string) => {
    switch (importance) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getImportanceLabel = (importance?: string) => {
    switch (importance) {
      case 'high':
        return 'Important';
      case 'medium':
        return 'Utile';
      case 'low':
        return 'Info';
      default:
        return '';
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-blue-800">
          ❓ Questions Fréquemment Posées (FAQ)
        </CardTitle>
        <p className="text-gray-600">
          Trouvez rapidement des réponses aux questions les plus courantes
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="mb-6 flex flex-wrap h-auto gap-2 bg-blue-50">
            <TabsTrigger value="" className="flex items-center gap-1">
              Toutes les catégories
            </TabsTrigger>
            {faqCategories.map(category => (
              <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-1">
                {category.icon}
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {['', ...faqCategories.map(c => c.id)].map(categoryId => (
            <TabsContent key={categoryId || 'all'} value={categoryId} className="mt-0">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-600">
                    {filterFaqs(faqs, searchQuery, categoryId).length} question(s) trouvée(s)
                  </span>
                  {categoryId && (
                    <Badge variant="outline" className="text-blue-600">
                      {faqCategories.find(c => c.id === categoryId)?.name}
                    </Badge>
                  )}
                </div>
              </div>

              <Accordion type="multiple" className="w-full space-y-2">
                {filterFaqs(faqs, searchQuery, categoryId).map((faq: FAQ, index: number) => (
                  <AccordionItem 
                    key={`${categoryId}-${index}`} 
                    value={`item-${categoryId}-${index}`}
                    className="border border-blue-100 rounded-lg px-4"
                  >
                    <AccordionTrigger className="text-left font-medium text-blue-900 hover:text-blue-700 py-4">
                      <div className="flex items-start gap-3 w-full">
                        <div className="flex-1">
                          {faq.question}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {faq.importance && (
                            <Badge className={`text-xs ${getImportanceColor(faq.importance)}`}>
                              {getImportanceLabel(faq.importance)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 pb-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="leading-relaxed">{faq.answer}</p>
                        {faq.tags && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {faq.tags.map((tag, tagIndex) => (
                              <Badge key={tagIndex} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              
              {filterFaqs(faqs, searchQuery, categoryId).length === 0 && (
                <div className="text-center py-12">
                  <HelpCircle className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune question trouvée</h3>
                  <p className="text-gray-600">
                    Aucune question ne correspond à votre recherche dans cette catégorie
                  </p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}