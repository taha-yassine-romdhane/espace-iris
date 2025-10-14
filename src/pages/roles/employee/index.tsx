import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users,
  LayoutDashboard,
  Clipboard,
  Box,
  SquareActivity,
  Bell,
  ShoppingCart,
  CalendarClock,
  MessageCircle,
  User,
  FileText,
  ArrowRight
} from 'lucide-react';
import EmployeeLayout from './EmployeeLayout';

export default function EmployeeDashboard() {
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
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Quick access actions
  const quickActions = [
    {
      title: "Tableau de Bord",
      description: "Gérer vos opérations quotidiennes",
      icon: <LayoutDashboard className="h-8 w-8" />,
      path: "/roles/employee/dashboard",
      color: "bg-green-500",
      hoverColor: "hover:bg-green-600"
    },
    {
      title: "Diagnostique",
      description: "Commencer un nouveau diagnostic",
      icon: <SquareActivity className="h-8 w-8" />,
      path: "/roles/employee/diagnostics",
      color: "bg-purple-500",
      hoverColor: "hover:bg-purple-600"
    },
    {
      title: "Tâches",
      description: "Voir et gérer vos tâches",
      icon: <Clipboard className="h-8 w-8" />,
      path: "/roles/employee/tasks/modern",
      color: "bg-green-500",
      hoverColor: "hover:bg-green-600"
    },
    {
      title: "Patients",
      description: "Gérer vos patients assignés",
      icon: <Users className="h-8 w-8" />,
      path: "/roles/employee/renseignement",
      color: "bg-orange-500",
      hoverColor: "hover:bg-orange-600"
    },
    {
      title: "Stock",
      description: "Gérer votre inventaire",
      icon: <Box className="h-8 w-8" />,
      path: "/roles/employee/stock",
      color: "bg-indigo-500",
      hoverColor: "hover:bg-indigo-600"
    },
    {
      title: "Messages",
      description: "Consulter vos messages",
      icon: <MessageCircle className="h-8 w-8" />,
      path: "/roles/employee/chat",
      color: "bg-pink-500",
      hoverColor: "hover:bg-pink-600"
    }
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Espace Employé</h1>
          <p className="text-gray-600 mt-1">
            Bienvenue, <span className="font-semibold text-green-600">{session?.user?.name || 'Employé'}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/roles/employee/notifications')}
            className="relative p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Bell className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={() => router.push('/roles/employee/profile')}
            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <User className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>


      {/* Quick Access Buttons */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Accès Rapide</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <Card
              key={index}
              onClick={() => router.push(action.path)}
              className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer group border-2 border-transparent hover:border-green-500"
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform`}>
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <Card className="bg-white rounded-xl shadow-sm max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-lg text-center">Actions Rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/roles/employee/dashboard')}
              className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
            >
              <div className="p-3 bg-green-500 text-white rounded-lg group-hover:scale-110 transition-transform">
                <SquareActivity className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-gray-700 mt-2">Nouveau Diagnostic</span>
            </button>

            <button
              onClick={() => router.push('/roles/employee/sales')}
              className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
            >
              <div className="p-3 bg-green-600 text-white rounded-lg group-hover:scale-110 transition-transform">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-gray-700 mt-2">Nouvelle Vente</span>
            </button>

            <button
              onClick={() => router.push('/roles/employee/rentals')}
              className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
            >
              <div className="p-3 bg-green-700 text-white rounded-lg group-hover:scale-110 transition-transform">
                <CalendarClock className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-gray-700 mt-2">Nouvelle Location</span>
            </button>

            <button
              onClick={() => router.push('/roles/employee/tasks/modern')}
              className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
            >
              <div className="p-3 bg-green-800 text-white rounded-lg group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-gray-700 mt-2">Voir Tâches</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Define a getLayout function to use the EmployeeLayout
EmployeeDashboard.getLayout = function getLayout(page: React.ReactElement) {
  return <EmployeeLayout>{page}</EmployeeLayout>;
};