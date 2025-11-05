import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminLayout from '../AdminLayout';

// Import all help components
import HelpHeroSection from '@/components/help/HelpHeroSection';
import QuickStartGuide from '@/components/help/QuickStartGuide';
import FeatureDocumentation from '@/components/help/FeatureDocumentation';
import FAQSection from '@/components/help/FAQSection';
import SupportSection from '@/components/help/SupportSection';

// Icons for tabs
import { 
  BookOpen, 
  HelpCircle, 
  Headphones, 
  Rocket
} from 'lucide-react';

function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('quickstart');

  const helpSections = [
    {
      id: 'quickstart',
      title: 'Démarrage Rapide',
      icon: <Rocket className="h-4 w-4" />,
      description: 'Guide étape par étape pour commencer'
    },
    {
      id: 'documentation',
      title: 'Documentation',
      icon: <BookOpen className="h-4 w-4" />,
      description: 'Guides détaillés de chaque fonctionnalité'
    },
    {
      id: 'faq',
      title: 'FAQ',
      icon: <HelpCircle className="h-4 w-4" />,
      description: 'Questions fréquemment posées'
    },
    {
      id: 'support',
      title: 'Support',
      icon: <Headphones className="h-4 w-4" />,
      description: 'Contactez notre équipe technique'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <HelpHeroSection 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="mb-8">
            <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-white border border-blue-200">
              {helpSections.map(section => (
                <TabsTrigger 
                  key={section.id}
                  value={section.id} 
                  className="flex flex-col items-center gap-2 py-4 px-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  <div className="flex items-center gap-2">
                    {section.icon}
                    <span className="font-medium">{section.title}</span>
                  </div>
                  <span className="text-xs opacity-75 text-center">
                    {section.description}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="space-y-8">
            <TabsContent value="quickstart" className="mt-0">
              <QuickStartGuide />
              
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  className="p-6 bg-white rounded-lg border border-blue-200 cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => setActiveTab('documentation')}
                >
                  <BookOpen className="h-8 w-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold text-blue-900 mb-2">Documentation Complète</h3>
                  <p className="text-gray-600 text-sm">
                    Guides détaillés pour maîtriser chaque fonctionnalité
                  </p>
                </div>

                <div 
                  className="p-6 bg-white rounded-lg border border-blue-200 cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => setActiveTab('faq')}
                >
                  <HelpCircle className="h-8 w-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold text-blue-900 mb-2">Questions Fréquentes</h3>
                  <p className="text-gray-600 text-sm">
                    Réponses aux questions les plus courantes
                  </p>
                </div>

                <div 
                  className="p-6 bg-white rounded-lg border border-blue-200 cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => setActiveTab('support')}
                >
                  <Headphones className="h-8 w-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold text-blue-900 mb-2">Support Technique</h3>
                  <p className="text-gray-600 text-sm">
                    Contactez notre équipe pour une assistance personnalisée
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="documentation" className="mt-0">
              <FeatureDocumentation searchQuery={searchQuery} />
            </TabsContent>

            <TabsContent value="faq" className="mt-0">
              <FAQSection searchQuery={searchQuery} />
            </TabsContent>

            <TabsContent value="support" className="mt-0">
              <SupportSection />
            </TabsContent>
          </div>
        </Tabs>

        <div className="mt-12 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-6 text-center">📊 Statistiques d&apos;Aide</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">150+</div>
              <div className="text-blue-100 text-sm">Articles de documentation</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">45+</div>
              <div className="text-blue-100 text-sm">Questions fréquentes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">&lt; 2h</div>
              <div className="text-blue-100 text-sm">Temps de réponse moyen</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">98%</div>
              <div className="text-blue-100 text-sm">Satisfaction client</div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-gray-600">
          <p className="mb-4">
            Vous ne trouvez pas ce que vous cherchez ?
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => setActiveTab('support')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Contactez le support
            </button>
            <span className="text-gray-400">•</span>
            <a href="mailto:support@espace-elite.tn" className="text-blue-600 hover:text-blue-800 underline">
              support@espace-elite.tn
            </a>
            <span className="text-gray-400">•</span>
            <a href="tel:+21671123456" className="text-blue-600 hover:text-blue-800 underline">
              +216 71 123 456
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

HelpPage.getLayout = function getLayout(page: React.ReactElement) {
  return <AdminLayout>{page}</AdminLayout>;
};

export default HelpPage;