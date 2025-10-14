import React from 'react';
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';

interface HelpHeroSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function HelpHeroSection({ searchQuery, onSearchChange }: HelpHeroSectionProps) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-8 mb-10 text-white">
      <h1 className="text-4xl font-bold mb-4">Centre d&apos;Aide Espace Iris </h1>
      <p className="text-blue-100 mb-6 max-w-3xl text-lg">
        Documentation complète pour maîtriser votre plateforme de gestion médicale. 
        Trouvez rapidement des réponses à vos questions et accédez à notre support technique.
      </p>
      
      {/* Search Bar */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-300" size={20} />
        <Input 
          type="text" 
          placeholder="Rechercher dans la documentation..." 
          className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus:bg-white/20 h-12"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}