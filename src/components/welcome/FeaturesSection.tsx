import React from "react";
import { 
  Users, 
  Stethoscope, 
  CreditCard, 
  Bell, 
  ShieldCheck, 
  BarChart2,
  Workflow,
  Database,
  Clock,
  TrendingUp,
  FileText,
  Settings
} from "lucide-react";

const mainFeatures = [
  {
    icon: <Users className="h-8 w-8" />, 
    title: "Gestion Patients & Sociétés",
    desc: "Dossiers complets, historique médical, contacts et suivi personnalisé pour patients et entreprises.",
    category: "Médical",
    gradient: "from-blue-500 to-blue-600"
  },
  {
    icon: <Stethoscope className="h-8 w-8" />, 
    title: "Appareils CPAP/VNI",
    desc: "Gestion complète des appareils médicaux, maintenance, configuration et suivi d'utilisation.",
    category: "Médical", 
    gradient: "from-green-500 to-green-600"
  },
  {
    icon: <CreditCard className="h-8 w-8" />, 
    title: "Système de Paiement Avancé",
    desc: "Paiements multi-méthodes, suivi CNAM complet avec workflow 10 étapes, facturation automatisée.",
    category: "Commercial",
    gradient: "from-purple-500 to-purple-600"
  },
  {
    icon: <Workflow className="h-8 w-8" />, 
    title: "Workflow CNAM Intégré",
    desc: "Suivi complet du processus CNAM de l'approbation à la livraison avec historique détaillé.",
    category: "Commercial",
    gradient: "from-orange-500 to-orange-600"
  },
  {
    icon: <BarChart2 className="h-8 w-8" />, 
    title: "Analytics & Reporting",
    desc: "Tableaux de bord temps réel, KPIs métier, rapports d'activité et analyses prédictives.",
    category: "Analytics",
    gradient: "from-indigo-500 to-indigo-600"
  },
  {
    icon: <ShieldCheck className="h-8 w-8" />, 
    title: "Sécurité Enterprise",
    desc: "Chiffrement end-to-end, audit trail, conformité RGPD, sauvegarde automatique et accès par rôles.",
    category: "Sécurité",
    gradient: "from-red-500 to-red-600"
  },
];

const additionalFeatures = [
  {
    icon: <Bell className="h-5 w-5" />,
    title: "Notifications Intelligentes",
    desc: "Alertes automatiques et rappels personnalisés"
  },
  {
    icon: <Database className="h-5 w-5" />,
    title: "Import/Export de Données",
    desc: "Migration facile et sauvegarde automatique"
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Suivi Temps Réel",
    desc: "Monitoring en direct de l'activité"
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Tableaux de Bord",
    desc: "Visualisations avancées et métriques"
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Génération de Documents",
    desc: "Factures, rapports et contrats automatisés"
  },
  {
    icon: <Settings className="h-5 w-5" />,
    title: "Configuration Flexible",
    desc: "Paramétrage selon vos besoins"
  },
];

const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="relative py-24 bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 rounded-full px-6 py-2 text-sm font-medium mb-6">
            <Stethoscope className="w-4 h-4" />
            <span>Fonctionnalités Avancées</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Une suite complète pour
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              la gestion médicale moderne
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Espace Iris intègre tous les outils nécessaires pour optimiser votre pratique médicale, 
            de la gestion des patients au suivi commercial en passant par l'analyse de performance.
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-8 mb-20">
          {mainFeatures.map((feature, idx) => (
            <div
              key={idx}
              className="group bg-white rounded-2xl p-8 border border-gray-100 hover:border-gray-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
            >
              <div className="relative">
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                <div className="absolute -top-2 -right-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {feature.category}
                  </span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Additional Features */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Et bien plus encore...</h3>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Découvrez toutes les fonctionnalités qui font d'Espace Iris la solution de référence
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {additionalFeatures.map((feature, idx) => (
              <div key={idx} className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-1">{feature.title}</h4>
                  <p className="text-blue-100 text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integration Section */}
        <div className="mt-20 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-6">
            Intégration et Compatibilité
          </h3>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Espace Iris s'intègre parfaitement avec vos outils existants et respecte 
            les standards médicaux tunisiens et internationaux.
          </p>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">RGPD Compliant</h4>
              <p className="text-sm text-gray-600">Conforme aux réglementations européennes</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">API Ouverte</h4>
              <p className="text-sm text-gray-600">Intégration avec vos systèmes existants</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Temps Réel</h4>
              <p className="text-sm text-gray-600">Synchronisation instantanée</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Settings className="w-6 h-6 text-orange-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Personnalisable</h4>
              <p className="text-sm text-gray-600">Adapté à vos workflows</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
