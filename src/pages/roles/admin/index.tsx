import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useEffect } from 'react';
import AdminLayout from './AdminLayout';
import {
  Users,
  Package,
  Bell,
  ShoppingCart,
  Settings,
  ClipboardList,
  Activity,
  Home,
  Stethoscope,
  FileText,
  AlertCircle,
  Shield,
  Clock,
  ClipboardCheck
} from 'lucide-react';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);


  // Loading state
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
          <p className="text-slate-600 font-medium">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  const quickLinks = [
    { 
      icon: <Home size={24} />, 
      title: 'Tableau de Bord Principal', 
      description: 'Accès au tableau de bord principal', 
      bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600', 
      path: '/roles/admin/dashboard',
      category: 'Tableau de Bord'
    },
    { 
      icon: <Users size={24} />, 
      title: 'Techniciens & Utilisateurs', 
      description: 'Gestion des comptes techniciens et utilisateurs', 
      bgColor: 'bg-gradient-to-br from-blue-500 to-blue-600', 
      path: '/roles/admin/users',
      category: 'Gestion Utilisateurs'
    },
    { 
      icon: <Package size={24} />, 
      title: 'Inventaire Médical', 
      description: 'Stocks équipements oxygénothérapie', 
      bgColor: 'bg-gradient-to-br from-emerald-500 to-emerald-600', 
      path: '/roles/admin/stock',
      category: 'Inventaire'
    },
    { 
      icon: <ShoppingCart size={24} />, 
      title: 'Équipements oxygénothérapie', 
      description: 'Catalogue dispositifs médicaux', 
      bgColor: 'bg-gradient-to-br from-purple-500 to-purple-600', 
      path: '/roles/admin/appareils',
      category: 'Équipements'
    },
    { 
      icon: <Bell size={24} />, 
      title: 'Alertes Système', 
      description: 'Notifications critiques et maintenance', 
      bgColor: 'bg-gradient-to-br from-amber-500 to-orange-500', 
      path: '/roles/admin/notifications',
      category: 'Surveillance'
    },
    { 
      icon: <Settings size={24} />, 
      title: 'Configuration et paramètres', 
      description: 'Paramètres système et sécurité', 
      bgColor: 'bg-gradient-to-br from-slate-600 to-slate-700', 
      path: '/roles/admin/settings',
      category: 'Administration'
    },
    { 
      icon: <ClipboardList size={24} />, 
      title: 'Planification et tâches', 
      description: 'Gestion des interventions et tâches', 
      bgColor: 'bg-gradient-to-br from-indigo-500 to-indigo-600', 
      path: '/roles/admin/tasks',
      category: 'Planification'
    },
    { 
      icon: <Stethoscope size={24} />, 
      title: 'Reparateurs', 
      description: 'Équipe technique et réparateurs', 
      bgColor: 'bg-gradient-to-br from-teal-500 to-teal-600', 
      path: '/roles/admin/reparateur',
      category: 'Personnel'
    },
    {
      icon: <FileText size={24} />,
      title: 'Patients et Entreprises',
      description: 'Gestion des comptes patients et entreprises',
      bgColor: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
      path: '/roles/admin/renseignement',
      category: 'Gestion'
    },
    {
      icon: <ClipboardCheck size={24} />,
      title: 'Tâches Manuelles',
      description: 'Créer et assigner des tâches aux employés',
      bgColor: 'bg-gradient-to-br from-pink-500 to-pink-600',
      path: '/roles/admin/manual-tasks',
      category: 'Gestion des Tâches'
    },

  ];

  // Get current time for professional greeting
  const getCurrentTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  // TODO: Connect to real API for system stats
  // const getSystemStats = () => {
  //   return [
  //     { label: 'Patients Actifs', value: '847', trend: '+12', icon: <Users size={16} /> },
  //     { label: 'Équipements', value: '234', trend: '+3', icon: <Package size={16} /> },
  //     { label: 'Interventions', value: '45', trend: '+8', icon: <Activity size={16} /> },
  //     { label: 'Alertes', value: '3', trend: '-2', icon: <AlertCircle size={16} /> },
  //   ];
  // };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100">
      {/* Professional Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-6 lg:space-y-0">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-800">
                    {getCurrentTimeGreeting()}{session?.user?.name ? `, ${session.user.name}` : ''}
                  </h1>
                  <p className="text-slate-600 font-medium">Centre de Gestion Oxygénothérapie</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl shadow-lg">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span className="font-semibold">ADMINISTRATEUR</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500">Dernière connexion</div>
                <div className="font-semibold text-slate-700 flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {typeof window !== 'undefined' ? new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">


        {/* Quick Access Navigation */}
        <div className="space-y-6">
      

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickLinks.map((link, index) => (
              <Link href={link.path} key={index}>
                <div className="group bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-200 transition-all duration-200 cursor-pointer overflow-hidden">
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${link.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                        {link.icon}
                      </div>
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                        {link.category}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors duration-200">
                        {link.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {link.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-slate-800">Système Sécurisé</div>
                <div className="text-sm text-slate-600">Conforme aux normes médicales</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-slate-600">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Système Opérationnel</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Connexion Sécurisée</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Define a getLayout function to use the AdminLayout
AdminDashboard.getLayout = function getLayout(page: React.ReactElement) {
  return <AdminLayout>{page}</AdminLayout>;
};