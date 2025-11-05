import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Send,
  Smile,
  AtSign,
  User,
  Stethoscope,
  Calendar,
  Building2,
  Users,
  Hash,
  Search,
  X
} from 'lucide-react';
import { cn } from "@/lib/utils";
import axios from 'axios';

interface Reference {
  id: string;
  type: 'patient' | 'device' | 'appointment' | 'rental' | 'user';
  title: string;
  subtitle: string;
  metadata: any;
}

interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: 'common' | 'medical' | 'technical' | 'admin';
}

interface Props {
  message: string;
  onChange: (message: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  colorScheme?: 'blue' | 'green' | 'red';
}

const messageTemplates: MessageTemplate[] = [
  // Common templates
  { id: '1', title: 'Demande de disponibilité', content: 'Bonjour, pourriez-vous vérifier la disponibilité de [équipement] pour [patient] ?', category: 'common' },
  { id: '2', title: 'Confirmation rendez-vous', content: 'Le rendez-vous avec [patient] est confirmé pour [date] à [heure].', category: 'common' },
  { id: '3', title: 'Suivi installation', content: 'L\'installation de [équipement] chez [patient] s\'est bien déroulée. Prochaine visite prévue le [date].', category: 'common' },
  
  // Medical templates
  { id: '4', title: 'Paramètres diagnostic', content: 'Les paramètres du diagnostic pour [patient] ont été ajustés. Nouvelle configuration : [détails].', category: 'medical' },
  { id: '5', title: 'Résultats analyse', content: 'Les résultats de l\'analyse de [patient] sont disponibles. Recommandation : [action].', category: 'medical' },
  
  // Technical templates
  { id: '6', title: 'Maintenance équipement', content: 'Maintenance programmée pour [équipement] le [date]. Durée estimée : [durée].', category: 'technical' },
  { id: '7', title: 'Problème technique', content: 'Problème signalé sur [équipement] - [description]. Intervention requise.', category: 'technical' },
  
  // Admin templates
  { id: '8', title: 'Nouvelle location', content: 'Nouvelle location créée pour [patient] - [équipement]. Début : [date], Fin : [date].', category: 'admin' },
  { id: '9', title: 'Facturation', content: 'Facture générée pour [patient] - Montant : [montant]€. Échéance : [date].', category: 'admin' }
];

export const EnhancedChatInput: React.FC<Props> = ({
  message,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Tapez votre message...",
  colorScheme = 'blue'
}) => {
  const [showReferences, setShowReferences] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [referenceType, setReferenceType] = useState<'patient' | 'device' | 'appointment' | 'rental' | 'user'>('patient');
  const [references, setReferences] = useState<Reference[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const colors = {
    blue: {
      primary: 'border-blue-200 focus:border-blue-500',
      button: 'bg-blue-600 hover:bg-blue-700',
      accent: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200'
    },
    green: {
      primary: 'border-green-200 focus:border-green-500',
      button: 'bg-green-600 hover:bg-green-700',
      accent: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200'
    },
    red: {
      primary: 'border-red-200 focus:border-red-500',
      button: 'bg-red-600 hover:bg-red-700',
      accent: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200'
    }
  };

  const currentColors = colors[colorScheme];

  const referenceIcons = {
    patient: User,
    device: Stethoscope,
    appointment: Calendar,
    rental: Building2,
    user: Users
  };

  const referenceLabels = {
    patient: 'Patients',
    device: 'Équipements',
    appointment: 'Rendez-vous',
    rental: 'Locations',
    user: 'Utilisateurs'
  };

  useEffect(() => {
    if (showReferences && referenceType) {
      fetchReferences();
    }
  }, [showReferences, referenceType, searchTerm]);

  const fetchReferences = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/chat/references?type=${referenceType}s&search=${encodeURIComponent(searchTerm)}`);
      setReferences(response.data.references || []);
    } catch (error) {
      console.error('Error fetching references:', error);
      setReferences([]);
    } finally {
      setIsLoading(false);
    }
  };

  const insertReference = (reference: Reference) => {
    // Wrap title in quotes to preserve spaces/special characters in mentions
    const safeTitle = reference.title.replace(/"/g, '\\"');
    const safeSubtitle = (reference.subtitle || '').replace(/"/g, '\\"');
    // Include optional structured info block for richer rendering later (id and subtitle)
    const infoParts = [`id:\"${reference.id}\"`];
    if (reference.subtitle) infoParts.push(`sub:\"${safeSubtitle}\"`);
    const infoBlock = `{${infoParts.join(',')}}`;
    const referenceText = `@${reference.type}:"${safeTitle}"${infoBlock}`;
    const cursorPosition = inputRef.current?.selectionStart || message.length;
    const newMessage = message.slice(0, cursorPosition) + referenceText + message.slice(cursorPosition);
    onChange(newMessage);
    setShowReferences(false);
    inputRef.current?.focus();
  };

  const insertTemplate = (template: MessageTemplate) => {
    onChange(template.content);
    setShowTemplates(false);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medical': return <Stethoscope className="h-4 w-4" />;
      case 'technical': return <Building2 className="h-4 w-4" />;
      case 'admin': return <Users className="h-4 w-4" />;
      default: return <Hash className="h-4 w-4" />;
    }
  };

  return (
    <div className="relative">
      {/* References Panel */}
      {showReferences && (
        <div className={cn("absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border max-h-80 overflow-hidden", currentColors.border)}>
          <div className={cn("p-3 border-b", currentColors.border, currentColors.bg)}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Insérer une référence</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReferences(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex space-x-1 mb-3">
              {(Object.keys(referenceIcons) as Array<keyof typeof referenceIcons>).map((type) => {
                const Icon = referenceIcons[type];
                return (
                  <button
                    key={type}
                    onClick={() => setReferenceType(type)}
                    className={cn(
                      "flex items-center px-2 py-1 rounded-md text-xs font-medium transition-colors",
                      referenceType === type 
                        ? `${currentColors.button} text-white` 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {referenceLabels[type]}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={`Rechercher ${referenceLabels[referenceType].toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Recherche en cours...
              </div>
            ) : references.length > 0 ? (
              references.map((ref) => (
                <button
                  key={ref.id}
                  onClick={() => insertReference(ref)}
                  className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="text-sm font-medium text-gray-900">{ref.title}</div>
                  <div className="text-xs text-gray-500 mt-1">{ref.subtitle}</div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                Aucun résultat trouvé
              </div>
            )}
          </div>
        </div>
      )}

      {/* Templates Panel */}
      {showTemplates && (
        <div className={cn("absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border max-h-80 overflow-hidden", currentColors.border)}>
          <div className={cn("p-3 border-b", currentColors.border, currentColors.bg)}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Modèles de messages</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {messageTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => insertTemplate(template)}
                className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900">{template.title}</div>
                  <div className={cn("flex items-center text-xs px-1.5 py-0.5 rounded", currentColors.bg, currentColors.accent)}>
                    {getCategoryIcon(template.category)}
                    <span className="ml-1 capitalize">{template.category}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1 line-clamp-2">{template.content}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className={cn("flex items-center space-x-2 p-3 bg-white rounded-lg border", currentColors.border)}>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowReferences(!showReferences);
              setShowTemplates(false);
            }}
            className={cn("h-8 w-8 p-0", currentColors.accent)}
            disabled={disabled}
          >
            <AtSign className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowTemplates(!showTemplates);
              setShowReferences(false);
            }}
            className={cn("h-8 w-8 p-0", currentColors.accent)}
            disabled={disabled}
          >
            <Hash className="h-4 w-4" />
          </Button>
        </div>

        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={message}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          className={cn("flex-1", currentColors.primary)}
          disabled={disabled}
        />

        <Button
          onClick={onSend}
          disabled={!message.trim() || disabled}
          className={currentColors.button}
          size="sm"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};