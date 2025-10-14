import React from 'react';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import DoctorNavbar from './DoctorNavbar';
import DoctorSidebar from './DoctorSidebar';

const DoctorLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { data: session } = useSession();

  const handleSignOut = () => {
    signOut().then(() => router.push('/welcome'));
  };

  return (
    <div className="flex h-screen bg-gray-100 doctor-theme">
      {/* Sidebar */}
      <DoctorSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <DoctorNavbar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-red-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DoctorLayout;