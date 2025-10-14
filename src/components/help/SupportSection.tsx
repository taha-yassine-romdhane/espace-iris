import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { 
  Phone, 
  Mail, 
  MessageCircle, 
  Headphones, 
  Clock, 
  ExternalLink,
  Send,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react';

export default function SupportSection() {
  const [contactForm, setContactForm] = useState({
    subject: '',
    priority: 'medium',
    category: '',
    message: '',
    email: '',
    phone: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const supportChannels = [
    {
      icon: <Phone className="h-6 w-6" />,
      title: "Support Téléphonique",
      description: "Assistance technique immédiate pour les urgences",
      contact: "+216 71 123 456",
      available: "Lun-Ven, 8h-19h | Sam, 9h-13h",
      responseTime: "Immédiat",
      priority: "high",
      features: ["Support en direct", "Résolution immédiate", "Assistance technique", "Urgences"]
    },
    {
      icon: <Mail className="h-6 w-6" />,
      title: "Support par Email",
      description: "Pour les questions détaillées et non-urgentes",
      contact: "support@espace-elite.tn",
      available: "24/7",
      responseTime: "< 4 heures",
      priority: "medium",
      features: ["Support détaillé", "Suivi de ticket", "Documentation", "Captures d'écran"]
    },
    {
      icon: <MessageCircle className="h-6 w-6" />,
      title: "Chat en Direct",
      description: "Assistance rapide pour questions courantes",
      contact: "Chat disponible dans l'application",
      available: "Lun-Ven, 9h-18h",
      responseTime: "< 5 minutes",
      priority: "medium",
      features: ["Réponse rapide", "Questions simples", "Guidage", "Liens utiles"]
    },
    {
      icon: <Headphones className="h-6 w-6" />,
      title: "Support Dédié Premium",
      description: "Conseiller technique personnel pour les clients premium",
      contact: "Contactez votre conseiller attitré",
      available: "Sur rendez-vous",
      responseTime: "< 2 heures",
      priority: "high",
      features: ["Conseiller dédié", "Formation personnalisée", "Optimisation", "Priorité absolue"]
    }
  ];

  const supportCategories = [
    { value: 'technical', label: 'Problème technique' },
    { value: 'account', label: 'Gestion de compte' },
    { value: 'billing', label: 'Facturation' },
    { value: 'feature', label: 'Demande de fonctionnalité' },
    { value: 'training', label: 'Formation' },
    { value: 'integration', label: 'Intégration' },
    { value: 'bug', label: 'Signalement de bug' },
    { value: 'other', label: 'Autre' }
  ];

  const priorityLevels = [
    { value: 'low', label: 'Faible', description: 'Question générale', color: 'bg-green-100 text-green-800' },
    { value: 'medium', label: 'Normale', description: 'Problème modéré', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'Élevée', description: 'Problème important', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgente', description: 'Problème critique', color: 'bg-red-100 text-red-800' }
  ];

  const handleInputChange = (field: string, value: string) => {
    setContactForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitContactForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactForm.subject || !contactForm.message || !contactForm.category) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Message envoyé avec succès !",
        description: "Notre équipe vous répondra dans les plus brefs délais",
      });

      // Reset form
      setContactForm({
        subject: '',
        priority: 'medium',
        category: '',
        message: '',
        email: '',
        phone: ''
      });
    } catch (error) {
      toast({
        title: "Erreur lors de l'envoi",
        description: "Veuillez réessayer ou nous contacter directement",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    const level = priorityLevels.find(p => p.value === priority);
    return level?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-8">
      {/* Support Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-blue-800">
            📞 Canaux de Support
          </CardTitle>
          <p className="text-gray-600">
            Plusieurs moyens de nous contacter selon vos besoins
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {supportChannels.map((channel, index) => (
              <Card key={index} className={`border-l-4 hover:shadow-lg transition-all ${
                channel.priority === 'high' 
                  ? 'border-l-red-500 bg-red-50' 
                  : 'border-l-blue-500 bg-blue-50'
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${
                        channel.priority === 'high' ? 'bg-red-600' : 'bg-blue-600'
                      } text-white`}>
                        {channel.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-900">{channel.title}</h3>
                        <Badge className={channel.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                          {channel.responseTime}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mt-2">{channel.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-700">{channel.contact}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">{channel.available}</span>
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Idéal pour :</h4>
                      <div className="flex flex-wrap gap-1">
                        {channel.features.map((feature, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-4 border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      {channel.title === "Support Téléphonique" ? "Appeler maintenant" :
                       channel.title === "Support par Email" ? "Envoyer un email" :
                       channel.title === "Chat en Direct" ? "Démarrer le chat" :
                       "Prendre rendez-vous"}
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-blue-800">
            ✉️ Formulaire de Contact
          </CardTitle>
          <p className="text-gray-600">
            Décrivez votre problème en détail et nous vous répondrons rapidement
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitContactForm} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium text-gray-700">
                  Sujet <span className="text-red-500">*</span>
                </label>
                <Input
                  id="subject"
                  placeholder="Résumé du problème ou de la question"
                  value={contactForm.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  className="border-blue-200 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-medium text-gray-700">
                  Catégorie <span className="text-red-500">*</span>
                </label>
                <Select value={contactForm.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger className="border-blue-200 focus:border-blue-500">
                    <SelectValue placeholder="Sélectionnez une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="priority" className="text-sm font-medium text-gray-700">
                Priorité
              </label>
              <Select value={contactForm.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                <SelectTrigger className="border-blue-200 focus:border-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-2">
                        <Badge className={level.color}>
                          {level.label}
                        </Badge>
                        <span className="text-gray-600">- {level.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 mt-1">
                <Info className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-gray-500">
                  La priorité détermine le temps de réponse de notre équipe
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email de contact
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre.email@exemple.com"
                  value={contactForm.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="border-blue-200 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  Téléphone (optionnel)
                </label>
                <Input
                  id="phone"
                  placeholder="+216 XX XXX XXX"
                  value={contactForm.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="border-blue-200 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium text-gray-700">
                Description détaillée <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                rows={6}
                placeholder="Décrivez votre problème ou votre question en détail. Plus vous donnez d'informations, plus nous pourrons vous aider efficacement."
                value={contactForm.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                className="w-full rounded-md border border-blue-200 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="flex items-center gap-2 mt-1">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-xs text-gray-500">
                  Incluez les étapes pour reproduire le problème, messages d'erreur, et captures d'écran si possible
                </span>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Temps de réponse estimé</h4>
                  <p className="text-sm text-blue-700">
                    Selon la priorité sélectionnée ({priorityLevels.find(p => p.value === contactForm.priority)?.label}), 
                    nous vous répondrons dans les{' '}
                    {contactForm.priority === 'urgent' ? '1 heure' :
                     contactForm.priority === 'high' ? '2 heures' :
                     contactForm.priority === 'medium' ? '4 heures' : '24 heures'}.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer le message
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Support Tips */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-green-800">
            💡 Conseils pour un support efficace
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-green-800">Avant de nous contacter :</h4>
              <ul className="space-y-1 text-sm text-green-700">
                <li>• Consultez d'abord la FAQ et la documentation</li>
                <li>• Vérifiez votre connexion internet</li>
                <li>• Notez les messages d'erreur exacts</li>
                <li>• Préparez les captures d'écran si nécessaire</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-green-800">Pour une réponse rapide :</h4>
              <ul className="space-y-1 text-sm text-green-700">
                <li>• Soyez précis dans votre description</li>
                <li>• Mentionnez votre rôle et permissions</li>
                <li>• Indiquez les étapes pour reproduire le problème</li>
                <li>• Choisissez la bonne priorité</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}