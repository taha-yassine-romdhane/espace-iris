import { useQuery } from '@tanstack/react-query';
import { columns, Diagnostic } from './columns';
import { DataTable } from './data-table';

async function getEmployeeDiagnostics(): Promise<Diagnostic[]> {
  const res = await fetch('/api/role/employee/diagnostics');
  if (!res.ok) {
    throw new Error('Failed to fetch employee diagnostics');
  }
  return res.json();
}

export const EmployeeDiagnosticTable = () => {
  const { data, isLoading, error } = useQuery<Diagnostic[]>({ 
    queryKey: ['employeeDiagnostics'], 
    queryFn: getEmployeeDiagnostics 
  });

  if (isLoading) return <p>Chargement des diagnostics...</p>;
  if (error) return <p>Erreur de chargement des diagnostics.</p>;

  return <DataTable columns={columns} data={data || []} />;
};

export default EmployeeDiagnosticTable;
