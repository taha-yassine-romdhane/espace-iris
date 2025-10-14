import { useEffect } from 'react';
import { useRouter } from 'next/router';

const DoctorIndex = () => {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to dashboard
    router.replace('/roles/doctor/dashboard');
  }, [router]);

  return null;
};

export default DoctorIndex;