import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import AdminLayout from '@/pages/roles/admin/AdminLayout';
import EmployeeLayout from '@/pages/roles/employee/EmployeeLayout';
import DoctorLayout from '@/pages/roles/doctor/DoctorLayout';
import LoadingOverlay from '@/components/ui/LoadingOverlay';

interface RoleBasedLayoutProps {
  children: React.ReactNode;
}

const RoleBasedLayout: React.FC<RoleBasedLayoutProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');

  // List of public paths that don't need authentication or sidebar
  const publicPaths = ['/welcome', '/auth/signin', '/'];

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

  // Show loading while session is loading
  if (status === 'loading') {
    return <LoadingOverlay isLoading={true} />;
  }

  // If we're on public pages, don't use any layout
  if (publicPaths.includes(router.pathname)) {
    return <div>{children}</div>;
  }

  // If no session and not on public pages, show nothing (redirect will happen)
  if (!session) {
    return <div>{children}</div>;
  }

  // Add global loading overlay
  const layoutChildren = (
    <>
      <LoadingOverlay isLoading={isLoading} />
      {children}
    </>
  );

  // Determine the correct layout based on path first, then role
  const path = router.pathname;
  
  // Admin paths - use the existing AdminLayout which has its own logic
  if (path.startsWith('/roles/admin/')) {
    // For admin paths, use AdminLayout directly since it has its own routing logic
    return <AdminLayout>{children}</AdminLayout>;
  }
  
  // Employee paths
  if (path.startsWith('/roles/employee/')) {
    return <EmployeeLayout>{layoutChildren}</EmployeeLayout>;
  }
  
  // Doctor paths
  if (path.startsWith('/roles/doctor/')) {
    return <DoctorLayout>{layoutChildren}</DoctorLayout>;
  }

  // Fallback based on user role
  switch (session.user.role) {
    case 'ADMIN':
      return <AdminLayout>{children}</AdminLayout>;
    case 'EMPLOYEE':
    case 'MANAGER':
      return <EmployeeLayout>{layoutChildren}</EmployeeLayout>;
    case 'DOCTOR':
      return <DoctorLayout>{layoutChildren}</DoctorLayout>;
    default:
      // Default to admin layout
      return <AdminLayout>{children}</AdminLayout>;
  }
};

export default RoleBasedLayout;