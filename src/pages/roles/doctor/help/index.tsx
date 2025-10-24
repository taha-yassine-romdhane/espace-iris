import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    HelpCircle,
    Phone,
    Mail,
    MessageCircle,
    FileText,
    Video,
    Book,
    ExternalLink,
    Clock,
    Users,
    Calendar
} from 'lucide-react';

const DoctorHelp: React.FC = () => {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'loading') return;
        
        if (!session?.user || session.user.role !== 'DOCTOR') {
            router.push('/auth/signin');
            return;
        }
    }, [session, status, router]);

    if (status === 'loading') {
        return (
            <div className="p-6 flex items-center justify-center min-h-screen">
                <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    <span className="text-red-700">Chargement...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-red-700 flex items-center">
                    <HelpCircle className="h-6 w-6 mr-2" />
                    Aide & Support
                </h1>
                <p className="text-gray-600 mt-1">
                    Trouvez l'aide dont vous avez besoin pour utiliser la plateforme
                </p>
            </div>

            {/* Quick Support */}
            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="text-red-700 flex items-center">
                        <Phone className="h-5 w-5 mr-2" />
                        Support Urgent
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                        <div>
                            <h3 className="font-medium text-red-900">Support Équipe Dev</h3>
                            <p className="text-sm text-red-700">Assistance technique pour les problèmes</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button className="bg-red-600 hover:bg-red-700">
                                <Phone className="h-4 w-4 mr-2" />
                                95 45 88 11
                            </Button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-3 p-3 border border-red-200 rounded-lg">
                            <Mail className="h-8 w-8 text-red-600" />
                            <div>
                                <h4 className="font-medium text-gray-900">Email Support</h4>
                                <p className="text-sm text-gray-600">hedi.baaziz@outlook.tn</p>
                                <p className="text-xs text-gray-500">Réponse sous 24h</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 p-3 border border-red-200 rounded-lg">
                            <MessageCircle className="h-8 w-8 text-red-600" />
                            <div>
                                <h4 className="font-medium text-gray-900">Chat en direct</h4>
                                <p className="text-sm text-gray-600">Assistance immédiate</p>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => router.push('/roles/doctor/chat')}
                                    className="mt-2 border-red-200 text-red-700 hover:bg-red-50"
                                >
                                    Ouvrir le chat
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Help Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-red-200 hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6 text-center">
                        <Book className="h-12 w-12 text-red-600 mx-auto mb-4" />
                        <h3 className="font-semibold text-gray-900 mb-2">Guide d'utilisation</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Apprenez à utiliser toutes les fonctionnalités de la plateforme
                        </p>
                        <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                            <FileText className="h-4 w-4 mr-2" />
                            Consulter le guide
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-red-200 hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6 text-center">
                        <Video className="h-12 w-12 text-red-600 mx-auto mb-4" />
                        <h3 className="font-semibold text-gray-900 mb-2">Tutoriels vidéo</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Regardez des tutoriels step-by-step
                        </p>
                        <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Voir les vidéos
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-red-200 hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6 text-center">
                        <Users className="h-12 w-12 text-red-600 mx-auto mb-4" />
                        <h3 className="font-semibold text-gray-900 mb-2">Formation</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Demandez une formation personnalisée
                        </p>
                        <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                            <Calendar className="h-4 w-4 mr-2" />
                            Planifier
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* FAQ */}
            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="text-red-700">Questions Fréquentes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="border-b border-red-100 pb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Comment assigner un appareil médical à un patient ?</h4>
                        <p className="text-sm text-gray-600">
                            Rendez-vous dans la section "Appareils Médicaux", cliquez sur "Assigner un appareil" et suivez les étapes pour sélectionner le patient et l'appareil.
                        </p>
                    </div>

                    <div className="border-b border-red-100 pb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Comment créer un diagnostic ?</h4>
                        <p className="text-sm text-gray-600">
                            Allez dans "Diagnostics", cliquez sur "Nouveau Diagnostic", sélectionnez le patient et l'appareil concerné, puis complétez les informations demandées.
                        </p>
                    </div>

                    <div className="border-b border-red-100 pb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Comment programmer un rendez-vous ?</h4>
                        <p className="text-sm text-gray-600">
                            Dans la section "Rendez-vous", cliquez sur "Nouveau RDV", sélectionnez le patient, la date, l'heure et le type de consultation.
                        </p>
                    </div>

                    <div className="pb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Comment contacter l'administration ?</h4>
                        <p className="text-sm text-gray-600">
                            Utilisez la fonction "Messages" dans le menu principal pour envoyer des messages directement à l'équipe administrative.
                        </p>
                    </div>

                    <Button 
                        variant="outline" 
                        className="w-full border-red-200 text-red-700 hover:bg-red-50"
                    >
                        Voir toutes les questions
                        <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                </CardContent>
            </Card>

            {/* Status */}
            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="text-red-700 flex items-center">
                        <Clock className="h-5 w-5 mr-2" />
                        Statut du système
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-3">
                        <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-green-700">Tous les services sont opérationnels</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Dernière mise à jour: {new Date().toLocaleString('fr-FR')}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default DoctorHelp;