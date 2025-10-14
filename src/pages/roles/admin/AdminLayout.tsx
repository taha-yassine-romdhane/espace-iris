import React, { useState, useEffect } from 'react';
import Sidebar from './AdminSidebar';
import Navbar from './AdminNavbar';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import LoadingOverlay from '@/components/ui/LoadingOverlay';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');

  // List of public paths that don't need authentication or sidebar
  const publicPaths = ['/welcome', '/auth/signin'];

  // Handle page transition loading states
  useEffect(() => {
    let loadingTimeout: NodeJS.Timeout;
    
    const handleStart = (url: string) => {
      // Clear any existing timeout
      if (loadingTimeout) clearTimeout(loadingTimeout);
      
      // Only show loading if we're changing pages
      if (currentPath && url !== currentPath) {
        setIsLoading(true);
        
        // Safety timeout - force reset loading state after 5 seconds
        // This prevents the loading overlay from getting stuck
        loadingTimeout = setTimeout(() => {
          setIsLoading(false);
        }, 5000);
      }
    };

    const handleComplete = (url: string) => {
      if (loadingTimeout) clearTimeout(loadingTimeout);
      setIsLoading(false);
      setCurrentPath(url);
    };

    const handleError = () => {
      if (loadingTimeout) clearTimeout(loadingTimeout);
      setIsLoading(false);
    };

    // Set current path on initial load
    if (router.pathname && !currentPath) {
      setCurrentPath(router.pathname);
    }

    // Subscribe to router events
    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleError);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleError);
      if (loadingTimeout) clearTimeout(loadingTimeout);
    };
  }, [router, currentPath]);

  // Handle authentication and routing
  useEffect(() => {
    if (status === 'unauthenticated' && !publicPaths.includes(router.pathname)) {
      router.push('/auth/signin');
    }
  }, [status, router, router.pathname]);

  // Render layout based on path
  if (publicPaths.includes(router.pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Global loading overlay */}
      <LoadingOverlay isLoading={isLoading} />
      
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto ">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;