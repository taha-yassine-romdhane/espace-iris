import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    FileText,
    Download,
    Calendar,
    BarChart3,
    TrendingUp,
    Users
} from 'lucide-react';

const DoctorReports: React.FC = () => {
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
                    <FileText className="h-6 w-6 mr-2" />
                    Rapports et Statistiques
                </h1>
                <p className="text-gray-600 mt-1">
                    Consultez vos rapports d'activité et statistiques
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-red-200 hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6 text-center">
                        <Users className="h-12 w-12 text-red-600 mx-auto mb-4" />
                        <h3 className="font-semibold text-gray-900 mb-2">Rapport Patients</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Statistiques sur vos patients et leur évolution
                        </p>
                        <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                            <Download className="h-4 w-4 mr-2" />
                            Générer
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-red-200 hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6 text-center">
                        <BarChart3 className="h-12 w-12 text-red-600 mx-auto mb-4" />
                        <h3 className="font-semibold text-gray-900 mb-2">Analyses Diagnostiques</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Résultats et tendances des diagnostics
                        </p>
                        <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                            <Download className="h-4 w-4 mr-2" />
                            Générer
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-red-200 hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6 text-center">
                        <Calendar className="h-12 w-12 text-red-600 mx-auto mb-4" />
                        <h3 className="font-semibold text-gray-900 mb-2">Activité Mensuelle</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Rapport d'activité du mois en cours
                        </p>
                        <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                            <Download className="h-4 w-4 mr-2" />
                            Générer
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-red-200 hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6 text-center">
                        <TrendingUp className="h-12 w-12 text-red-600 mx-auto mb-4" />
                        <h3 className="font-semibold text-gray-900 mb-2">Évolution Trimestrielle</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Tendances et évolutions sur 3 mois
                        </p>
                        <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                            <Download className="h-4 w-4 mr-2" />
                            Générer
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-red-200">
                <CardContent className="p-8 text-center">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Rapports Personnalisés
                    </h3>
                    <p className="text-gray-600 mb-4">
                        Cette fonctionnalité sera bientôt disponible. Vous pourrez générer des rapports personnalisés selon vos critères.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default DoctorReports;