import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import useEmblaCarousel from 'embla-carousel-react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Monitor, 
  Users, 
  Package, 
  FileText, 
  Activity, 
  Settings, 
  Stethoscope,
  Calendar,
  Database,
  X
} from "lucide-react";

const features = [
  {
    id: 1,
    title: "Tableau de Bord Intuitif",
    description: "Vue d'ensemble complète de vos opérations avec analytics en temps réel et suivi des KPIs",
    image: "/project-images/Screenshot from 2025-07-26 15-06-00.png",
    icon: <Monitor className="w-6 h-6" />,
    color: "from-blue-500 to-blue-600",
    category: "Dashboard"
  },
  {
    id: 2,
    title: "Import/Export Patients",
    description: "Gestion simplifiée des données patients avec import/export Excel et templates prédéfinis",
    image: "/project-images/Screenshot from 2025-07-26 15-06-01.png",
    icon: <FileText className="w-6 h-6" />,
    color: "from-green-500 to-green-600",
    category: "Import/Export"
  },
  {
    id: 3,
    title: "Formulaire Patient Complet",
    description: "Formulaires détaillés avec suivi complet des informations médicales et biométriques",
    image: "/project-images/Screenshot from 2025-07-26 15-06-02.png",
    icon: <Users className="w-6 h-6" />,
    color: "from-purple-500 to-purple-600",
    category: "Patients"
  },
  {
    id: 4,
    title: "Gestion du Stock",
    description: "Inventaire intelligent avec suivi en temps réel des appareils médicaux et alertes de stock",
    image: "/project-images/Screenshot from 2025-07-26 15-06-03.png",
    icon: <Package className="w-6 h-6" />,
    color: "from-orange-500 to-orange-600",
    category: "Inventaire"
  },
  {
    id: 5,
    title: "Workflow Diagnostique",
    description: "Processus de diagnostic guidé avec sélection d'équipements et suivi des étapes",
    image: "/project-images/Screenshot from 2025-07-26 15-06-44.png",
    icon: <Stethoscope className="w-6 h-6" />,
    color: "from-red-500 to-red-600",
    category: "Diagnostic"
  },
  {
    id: 6,
    title: "Gestion des Appareils",
    description: "Catalogue complet des appareils médicaux avec statuts, locations et maintenance",
    image: "/project-images/Screenshot from 2025-07-26 15-07-12.png",
    icon: <Activity className="w-6 h-6" />,
    color: "from-indigo-500 to-indigo-600",
    category: "Appareils"
  },
  {
    id: 7,
    title: "Base de Données Centralisée",
    description: "Gestion centralisée de tous les renseignements avec filtres avancés et recherche",
    image: "/project-images/Screenshot from 2025-07-26 15-08-24.png",
    icon: <Database className="w-6 h-6" />,
    color: "from-teal-500 to-teal-600",
    category: "Base de Données"
  },
  {
    id: 8,
    title: "Sauvegarde & Restauration",
    description: "Système de backup automatisé avec restauration sélective et sécurité des données",
    image: "/project-images/Screenshot from 2025-07-26 15-10-41.png",
    icon: <Settings className="w-6 h-6" />,
    color: "from-gray-500 to-gray-600",
    category: "Sauvegarde"
  },
  {
    id: 9,
    title: "Planning & Tâches",
    description: "Calendrier intégré avec gestion des tâches, rendez-vous et suivi des diagnostics",
    image: "/project-images/Screenshot from 2025-07-26 15-12-02.png",
    icon: <Calendar className="w-6 h-6" />,
    color: "from-amber-500 to-amber-600",
    category: "Planning"
  }
];

const AnimatedFeaturesShowcase: React.FC = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    align: 'center',
    skipSnaps: false,
    dragFree: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
    setIsAutoplay(false);
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
    setIsAutoplay(false);
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
    setIsAutoplay(false);
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!isAutoplay || !emblaApi) return;

    const autoplay = () => {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      } else {
        emblaApi.scrollTo(0);
      }
    };

    const interval = setInterval(autoplay, 2000);

    return () => clearInterval(interval);
  }, [isAutoplay, emblaApi]);

  return (
    <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 rounded-full px-6 py-2 text-sm font-medium mb-6">
            <Monitor className="w-4 h-4" />
            <span>Fonctionnalités Avancées</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Une solution complète
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              pour votre pratique médicale
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez toutes les fonctionnalités qui font d'Espace Iris la solution 
            de référence pour la gestion des appareils médicaux en Tunisie.
          </p>
        </div>

        {/* Embla Carousel Showcase */}
        <div className="relative">
          {/* Carousel Container */}
          <div className="embla overflow-hidden" ref={emblaRef}>
            <div className="embla__container flex">
              {features.map((feature, index) => (
                <div key={feature.id} className="embla__slide flex-[0_0_100%] min-w-0">
                  <div className="mx-8">
                    {/* Browser Window */}
                    <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-4xl mx-auto">
                      {/* Chrome Header */}
                      <div className="bg-gray-100 px-3 py-2 flex items-center space-x-2 border-b border-gray-200">
                        {/* Traffic Lights */}
                        <div className="flex space-x-1.5">
                          <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                          <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>
                          <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                        </div>
                        
                        {/* Address Bar */}
                        <div className="flex-1 mx-3">
                          <div className="bg-white rounded-full px-3 py-1.5 flex items-center space-x-2 border border-gray-300">
                            <div className="w-3 h-3 text-gray-400 text-xs">🔒</div>
                            <span className="text-xs text-gray-600 font-mono truncate">
                              Espace-Iris.tn /{feature.category.toLowerCase()}
                            </span>
                          </div>
                        </div>
                        
                        {/* Category Badge */}
                        <div className={`px-2 py-1 rounded-full bg-gradient-to-r ${feature.color} text-white text-xs font-medium`}>
                          {feature.category}
                        </div>
                      </div>
                      
                      {/* Screen Content */}
                      <div className="relative bg-gray-50">
                        <Image
                          src={feature.image}
                          alt={feature.title}
                          width={800}
                          height={400}
                          className="w-full h-auto"
                          priority={index === selectedIndex}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Navigation Buttons */}
          <button
            onClick={scrollPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center text-gray-700 hover:text-blue-600 hover:bg-white hover:border-blue-300 transition-all duration-300 shadow-lg hover:shadow-xl z-10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button
            onClick={scrollNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center text-gray-700 hover:text-blue-600 hover:bg-white hover:border-blue-300 transition-all duration-300 shadow-lg hover:shadow-xl z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Feature Info */}
        <div className="text-center mb-12 mt-16">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${features[selectedIndex].color} flex items-center justify-center text-white`}>
              {React.cloneElement(features[selectedIndex].icon, { className: "w-8 h-8" })}
            </div>
            <div className="text-left">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{features[selectedIndex].title}</h3>
              <p className="text-gray-600 max-w-md">{features[selectedIndex].description}</p>
            </div>
          </div>
        </div>

        {/* Dots Navigation */}
        <div className="flex items-center justify-center space-x-2 mb-8">
          {features.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === selectedIndex
                  ? 'bg-blue-600 scale-125'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>


        {/* Autoplay indicator */}
        {isAutoplay && (
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 shadow-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Défilement automatique</span>
              <button
                onClick={() => setIsAutoplay(false)}
                className="text-gray-400 hover:text-gray-600 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Feature stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">9+</div>
            <div className="text-gray-600">Modules Intégrés</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">100%</div>
            <div className="text-gray-600">Interface Responsive</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">24/7</div>
            <div className="text-gray-600">Disponibilité</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">500+</div>
            <div className="text-gray-600">Utilisateurs Actifs</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AnimatedFeaturesShowcase;