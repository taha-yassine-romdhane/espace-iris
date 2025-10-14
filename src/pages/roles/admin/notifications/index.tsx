// Redirect to modern notifications page
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function NotificationsPageRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/roles/admin/notifications/modern');
  }, [router]);
  
  return null;
}