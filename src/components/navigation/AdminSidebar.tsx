import React from 'react';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  Package,
  Users,
  Calendar,
  CreditCard,
  Settings,
  FileText,
  Shield,
  Building2,
  Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminSidebar() {
  const router = useRouter();
  
  const menuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      href: '/roles/admin/dashboard',
    },
    {
      title: 'Locations',
      icon: Package,
      href: '/roles/admin/rentals',
      badge: 'Nouveau',
    },
    {
      title: 'Ventes',
      icon: CreditCard,
      href: '/roles/admin/sales',
    },
    {
      title: 'Rendez-vous',
      icon: Calendar,
      href: '/roles/admin/appointments',
    },
    {
      title: 'Patients',
      icon: Users,
      href: '/roles/admin/patients',
    },
    {
      title: 'Sociétés',
      icon: Building2,
      href: '/roles/admin/companies',
    },
    {
      title: 'Appareils',
      icon: Wrench,
      href: '/roles/admin/devices',
    },
    {
      title: 'CNAM',
      icon: Shield,
      href: '/roles/admin/cnam',
    },
    {
      title: 'Rapports',
      icon: FileText,
      href: '/roles/admin/reports',
    },
    {
      title: 'Paramètres',
      icon: Settings,
      href: '/roles/admin/settings',
    },
  ];

  const isActive = (href: string) => {
    return router.pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          Administration
        </h2>
        
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Button
                key={item.href}
                variant={active ? 'secondary' : 'ghost'}
                className={`w-full justify-start ${
                  active ? 'bg-blue-50 text-blue-600' : ''
                }`}
                onClick={() => router.push(item.href)}
              >
                <Icon className="h-4 w-4 mr-3" />
                {item.title}
                {item.badge && (
                  <span className="ml-auto text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}