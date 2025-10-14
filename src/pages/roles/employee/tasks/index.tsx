import { useEffect } from 'react';
import { useRouter } from 'next/router';
import EmployeeLayout from '../EmployeeLayout';

function TasksPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the modern tasks page
    router.replace('/roles/employee/tasks/modern');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Redirection vers la nouvelle interface...</p>
      </div>
    </div>
  );
}

// Use the employee layout for the tasks page
TasksPage.getLayout = function getLayout(page: React.ReactElement) {
  return <EmployeeLayout>{page}</EmployeeLayout>;
};

export default TasksPage;