import React from "react";
import { Users, Code, Stethoscope, Handshake } from "lucide-react";
import Image from "next/image";

const PartnershipSection: React.FC = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 rounded-full px-6 py-2 text-sm font-medium mb-6">
            <Handshake className="w-4 h-4" />
            <span>Partenariat Stratégique</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Une collaboration 
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              d'excellence
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Espace Iris est le fruit d'un partenariat stratégique entre cubix. 
            et Iris Medical Services pour révolutionner la gestion médicale en Tunisie.
          </p>
        </div>

        {/* Partnership Cards */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Cubix - Your Tech Company */}
          <div className="bg-white rounded-3xl p-8 border border-gray-200 hover:shadow-2xl transition-all duration-300 group">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 bg-gray-100 rounded-2xl group-hover:bg-gray-200 transition-colors">
                <Code className="w-12 h-12 text-gray-700" />
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-900">
                  <span className="bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">cubix</span>
                  <span className="text-blue-500">.</span>
                </h3>
                <p className="text-blue-600 font-semibold">Développement Technologique</p>
              </div>
            </div>
            
            <p className="text-gray-700 leading-relaxed mb-6">
              Société de développement logiciel spécialisée dans les solutions innovantes. 
              Fondée par un jeune ingénieur passionné par la transformation digitale et l'entrepreneuriat.
            </p>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">Développement Full-Stack</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-700">Solutions Cloud & DevOps</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Innovation & Startup Solutions</span>
              </div>
            </div>
          </div>

          {/* Iris Medical Services */}
          <div className="bg-white rounded-3xl p-8 border border-gray-200 hover:shadow-2xl transition-all duration-300 group">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-blue-100 transition-colors">
                <Image 
                  src="/logo_No_BG.png" 
                  alt="Iris Medical Services" 
                  width={48} 
                  height={48} 
                  className="w-12 h-12 object-contain" 
                />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Iris Medical Services</h3>
                <p className="text-purple-600 font-semibold">Expertise Médicale</p>
              </div>
            </div>
            
            <p className="text-gray-700 leading-relaxed mb-6">
              Partenaire médical avec une expertise approfondie du secteur de la santé tunisien. 
              Spécialisation dans les appareils respiratoires et la gestion des soins.
            </p>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">Expertise Médicale CPAP/VNI</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-700">Connaissance du marché tunisien</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Relations CNAM & Réglementation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Partnership Values */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white text-center">
          <h3 className="text-3xl font-bold mb-6">Notre Vision Commune</h3>
          <p className="text-xl text-blue-100 mb-8 max-w-4xl mx-auto">
            Transformer la gestion des appareils médicaux en Tunisie grâce à une solution 
            technologique de pointe, développée avec une expertise médicale approfondie.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Code className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Innovation Technologique</h4>
              <p className="text-blue-100 text-sm">Solutions de pointe développées avec les dernières technologies</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Expertise Médicale</h4>
              <p className="text-blue-100 text-sm">Connaissance approfondie des besoins du secteur médical</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Impact Local</h4>
              <p className="text-blue-100 text-sm">Solution adaptée au contexte et aux besoins tunisiens</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnershipSection;