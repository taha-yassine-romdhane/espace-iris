import React from "react";
import { Rocket, ArrowRight, Sparkles, Zap } from "lucide-react";
import Link from "next/link";

const CTASection: React.FC = () => {
  return (
    <section className="relative py-24 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-20 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-20 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-0 left-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3 text-white/90 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>Démarrez votre transformation digitale</span>
          </div>

          {/* Main Heading */}
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight">
            Prêt à révolutionner
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              votre gestion médicale ?
            </span>
          </h2>

          {/* Description */}
          <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed">
            Rejoignez les 500+ professionnels qui font confiance à Espace Iris pour 
            optimiser leur pratique et offrir des soins d'exception à leurs patients.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
            <Link
              href="/auth/signin"
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-2xl hover:shadow-blue-500/25 transform hover:-translate-y-1"
            >
              <Rocket className="w-6 h-6 mr-3 group-hover:animate-pulse" />
              Se connecter maintenant
              <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
              
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 blur opacity-30 group-hover:opacity-50 transition-opacity -z-10"></div>
            </Link>

            <Link
              href="#contact"
              className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border-2 border-white/30 rounded-2xl hover:border-white/50 hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
            >
              <Zap className="w-6 h-6 mr-3" />
              Demander une démo
              <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="group">
              <div className="text-3xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">30 jours</div>
              <div className="text-white/70 text-sm">Essai gratuit</div>
            </div>
            <div className="group">
              <div className="text-3xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">24h</div>
              <div className="text-white/70 text-sm">Installation</div>
            </div>
            <div className="group">
              <div className="text-3xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">24/7</div>
              <div className="text-white/70 text-sm">Support inclus</div>
            </div>
            <div className="group">
              <div className="text-3xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">0 DT</div>
              <div className="text-white/70 text-sm">Frais installation</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    </section>
  );
};

export default CTASection;
