import React, { useState } from 'react';
import { PatientSelectorDialog, PatientDisplay } from './PatientSelectorDialog';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  name?: string;
  patientCode?: string;
  telephone?: string;
  governorate?: string;
  delegation?: string;
  cin?: string;
}

interface PatientSelectorProps {
  value?: string;
  onChange: (patientId: string) => void;
  placeholder?: string;
  className?: string;
  filterByAssignedTo?: boolean; // New prop to enable filtering
}

export function PatientSelector({
  value,
  onChange,
  placeholder = 'Sélectionner un patient',
  className,
  filterByAssignedTo = false
}: PatientSelectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: session } = useSession();

  // Determine if we should filter by assignedToMe based on user role
  const shouldFilterByAssignedTo = filterByAssignedTo || (session?.user as any)?.role === 'EMPLOYEE';

  // Fetch patients
  const { data: patientsData, isLoading } = useQuery({
    queryKey: ['patients', shouldFilterByAssignedTo ? 'assigned' : 'all'],
    queryFn: async () => {
      const url = shouldFilterByAssignedTo
        ? '/api/renseignements/patients?assignedToMe=true'
        : '/api/renseignements/patients';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch patients');
      return response.json();
    }
  });

  const patients: Patient[] = Array.isArray(patientsData)
    ? patientsData
    : (patientsData?.patients || []);

  const selectedPatient = value ? patients.find(p => p.id === value) : null;

  if (isLoading) {
    return (
      <div className="w-full px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-md">
        Chargement...
      </div>
    );
  }

  return (
    <>
      <PatientDisplay
        patient={selectedPatient}
        onClick={() => setDialogOpen(true)}
        placeholder={placeholder}
        className={className}
      />

      <PatientSelectorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patients={patients}
        selectedPatientId={value}
        onSelectPatient={onChange}
      />
    </>
  );
}
