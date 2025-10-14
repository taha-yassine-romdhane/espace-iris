// Redirect to modern tasks page
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function TasksPageRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/roles/admin/tasks/modern');
  }, [router]);
  
  return null;
}