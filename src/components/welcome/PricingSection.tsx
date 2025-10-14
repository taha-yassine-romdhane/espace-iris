import React, { useState } from "react";
import { Check, Star, ArrowRight, Zap, Heart, Stethoscope, Building2, Phone } from "lucide-react";
import Link from "next/link";

const PricingSection: React.FC = () => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  const plans = [
    {
      name: "Starter",
      description: "Parfait pour les petites cliniques (1-5 docteurs)",
      setupFee: 3000,
      price: { monthly: 80, quarterly: 216, yearly: 768 },
      originalPrice: { monthly: 100, quarterly: 270, yearly: 960 },
      features: [
        "Gestion patients de base",
        "Prise de rendez-vous simple",
        "2 rôles utilisateurs (Admin + Docteur)",
        "5GB de stockage",
        "Support par email",
        "Hébergement cloud inclus",
        "Mises à jour automatiques",
        "Formation initiale (4 heures)",
        "Sauvegarde quotidienne"
      ],
      isPopular: false,
      ctaText: "Commencer",
      gradient: "from-blue-500 to-blue-600"
    },
    {
      name: "Professional",
      description: "Pour les cliniques établies (5-15 docteurs)",
      setupFee: 4500,
      price: { monthly: 150, quarterly: 405, yearly: 1440 },
      originalPrice: { monthly: 200, quarterly: 540, yearly: 1920 },
      features: [
        "Toutes les fonctionnalités actuelles",
        "Système de rôles complet",
        "Intégration CNAM complète",
        "Import/Export Excel",
        "Rapports et analytics avancés",
        "50GB de stockage",
        "Support téléphone + email",
        "Gestion multi-équipes",
        "Formation complète (16 heures)",
        "Support prioritaire"
      ],
      isPopular: true,
      ctaText: "Démarrer maintenant",
      gradient: "from-purple-500 to-purple-600"
    },
    {
      name: "Enterprise",
      description: "Grandes structures médicales (15+ docteurs)",
      setupFee: 8000,
      price: { monthly: 300, quarterly: 810, yearly: 2880 },
      originalPrice: { monthly: 400, quarterly: 1080, yearly: 3840 },
      features: [
        "Tout du plan Professional",
        "Gestion multi-sites",
        "Analytics avancées",
        "Intégrations API personnalisées",
        "Workflows sur mesure",
        "Stockage illimité",
        "Support prioritaire + visites sur site",
        "Gestionnaire de compte dédié",
        "Formation continue illimitée",
        "SLA 99.9% garanti",
        "Sauvegarde géo-redondante"
      ],
      isPopular: false,
      ctaText: "Demander un devis",
      gradient: "from-gray-700 to-gray-800"
    },
    {
      name: "Contact Us",
      description: "Solutions sur mesure et besoins spéciaux",
      setupFee: null,
      price: { monthly: null, quarterly: null, yearly: null },
      originalPrice: { monthly: null, quarterly: null, yearly: null },
      features: [
        "Contrats gouvernementaux",
        "Réseaux multi-hôpitaux",
        "Intégrations personnalisées",
        "Solutions white-label",
        "Développements spécifiques",
        "Conformité réglementaire avancée",
        "Support 24/7 dédié",
        "Architecture haute disponibilité",
        "Audit sécurité personnalisé",
        "Formation sur site illimitée"
      ],
      isPopular: false,
      ctaText: "Nous contacter",
      gradient: "from-indigo-600 to-indigo-700"
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-purple-100 text-purple-700 rounded-full px-6 py-2 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            <span>Tarification Simple et Transparente</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Choisissez votre plan
            <span className="block bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              et démarrez immédiatement
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Des tarifs adaptés à la taille de votre structure. Essai gratuit de 30 jours, 
            sans engagement et avec support inclus.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white rounded-full p-1 border border-gray-200 shadow-sm">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingPeriod('quarterly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all relative ${
                billingPeriod === 'quarterly'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Trimestriel
              <span className="absolute -top-2 -right-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                -16%
              </span>
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all relative ${
                billingPeriod === 'yearly'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annuel
              <span className="absolute -top-2 -right-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                -25%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards - Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-16">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`relative bg-white rounded-2xl border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 min-h-[600px] flex flex-col ${
                plan.isPopular 
                  ? 'border-purple-500 shadow-xl scale-105 xl:scale-105' 
                  : plan.name === 'Contact Us'
                  ? 'border-indigo-300 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-semibold flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-current" />
                    <span>Plus Populaire</span>
                  </div>
                </div>
              )}

              <div className="p-6 flex flex-col h-full">
                {/* Plan Header */}
                <div className="text-center mb-6">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${
                    plan.isPopular 
                      ? 'bg-purple-100 text-purple-600' 
                      : plan.name === 'Contact Us'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {plan.name === 'Starter' ? <Heart className="w-6 h-6" /> : 
                     plan.name === 'Professional' ? <Stethoscope className="w-6 h-6" /> :
                     plan.name === 'Enterprise' ? <Building2 className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">{plan.description}</p>
                  
                  {plan.price.monthly ? (
                    <div className="space-y-3">
                      {/* Setup Fee - Compact */}
                      {plan.setupFee && (
                        <div className="bg-gray-50 rounded-lg p-2 mb-3">
                          <div className="text-xs text-gray-600">Installation</div>
                          <div className="text-lg font-bold text-gray-900">{plan.setupFee} DT</div>
                        </div>
                      )}
                      
                      {/* Recurring Price - Compact */}
                      <div className="flex items-end justify-center space-x-1">
                        <span className="text-3xl font-bold text-gray-900">
                          {billingPeriod === 'monthly' ? plan.price.monthly : 
                           billingPeriod === 'quarterly' ? Math.round(plan.price.quarterly! / 3) :
                           Math.round(plan.price.yearly! / 12)}
                        </span>
                        <span className="text-sm text-gray-600 mb-1">DT/mois</span>
                      </div>
                      <div className="flex items-center justify-center space-x-1 text-xs">
                        <span className="line-through text-gray-400">
                          {billingPeriod === 'monthly' ? plan.originalPrice.monthly : 
                           billingPeriod === 'quarterly' ? Math.round(plan.originalPrice.quarterly! / 3) :
                           Math.round(plan.originalPrice.yearly! / 12)} DT
                        </span>
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                          -{Math.round(((billingPeriod === 'monthly' ? plan.originalPrice.monthly! - plan.price.monthly! : 
                               billingPeriod === 'quarterly' ? Math.round(plan.originalPrice.quarterly! / 3) - Math.round(plan.price.quarterly! / 3) :
                               Math.round(plan.originalPrice.yearly! / 12) - Math.round(plan.price.yearly! / 12)) / 
                               (billingPeriod === 'monthly' ? plan.originalPrice.monthly! : 
                                billingPeriod === 'quarterly' ? Math.round(plan.originalPrice.quarterly! / 3) :
                                Math.round(plan.originalPrice.yearly! / 12))) * 100)}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900 mb-2">
                        {plan.name === 'Contact Us' ? 'Sur devis' : 'Sur mesure'}
                      </div>
                      <p className="text-gray-600">
                        {plan.name === 'Contact Us' ? 'Tarification personnalisée' : 'Tarification adaptée'}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">Installation et support inclus</p>
                    </div>
                  )}
                </div>

                {/* Features List - Compact */}
                <div className="flex-grow">
                  <div className="space-y-2 mb-6">
                    {plan.features.slice(0, 6).map((feature, featureIdx) => (
                      <div key={featureIdx} className="flex items-start space-x-2">
                        <div className="flex-shrink-0 w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                          <Check className="w-2.5 h-2.5 text-green-600" />
                        </div>
                        <span className="text-sm text-gray-700 leading-relaxed">{feature}</span>
                      </div>
                    ))}
                    {plan.features.length > 6 && (
                      <div className="text-center pt-2">
                        <span className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                          +{plan.features.length - 6} autres fonctionnalités
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CTA Button */}
                <div className="mt-auto">
                  <Link
                    href={plan.name === 'Enterprise' || plan.name === 'Contact Us' ? '#contact' : '#contact'}
                    className={`w-full inline-flex items-center justify-center px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-300 ${
                      plan.isPopular
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                        : plan.name === 'Contact Us'
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                        : 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                    }`}
                  >
                    {plan.ctaText}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Setup Fee Information */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 mb-12 border border-blue-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
            Frais d'installation uniques
          </h3>
          <p className="text-lg text-gray-600 text-center mb-6">
            L'installation comprend la configuration complète, la migration des données, et la formation de votre équipe
          </p>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-6 text-center shadow-sm">
              <div className="text-3xl font-bold text-blue-600 mb-2">3 000 DT</div>
              <div className="text-gray-600 font-medium">Plan Starter</div>
              <div className="text-sm text-gray-500 mt-2">Installation en 3 jours</div>
            </div>
            <div className="bg-white rounded-xl p-6 text-center shadow-sm border-2 border-purple-200">
              <div className="text-3xl font-bold text-purple-600 mb-2">4 500 DT</div>
              <div className="text-gray-600 font-medium">Plan Professional</div>
              <div className="text-sm text-gray-500 mt-2">Installation en 5 jours</div>
            </div>
            <div className="bg-white rounded-xl p-6 text-center shadow-sm">
              <div className="text-3xl font-bold text-gray-600 mb-2">8 000 DT</div>
              <div className="text-gray-600 font-medium">Plan Enterprise</div>
              <div className="text-sm text-gray-500 mt-2">Installation en 7 jours</div>
            </div>
            <div className="bg-white rounded-xl p-6 text-center shadow-sm">
              <div className="text-3xl font-bold text-indigo-600 mb-2">Sur devis</div>
              <div className="text-gray-600 font-medium">Contact Us</div>
              <div className="text-sm text-gray-500 mt-2">Installation personnalisée</div>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="text-center bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">30 jours</div>
              <div className="text-gray-600">Garantie satisfait</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">99.9%</div>
              <div className="text-gray-600">Disponibilité garantie</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">24/7</div>
              <div className="text-gray-600">Support et maintenance</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">ISO 27001</div>
              <div className="text-gray-600">Sécurité certifiée</div>
            </div>
          </div>
        </div>

        {/* FAQ Teaser */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Des questions sur nos tarifs ?
          </h3>
          <p className="text-lg text-gray-600 mb-6">
            Notre équipe commerciale est là pour vous aider à choisir le plan le plus adapté.
          </p>
          <Link
            href="#contact"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
          >
            Contactez-nous pour un devis personnalisé
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;