import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import SearchSelect from '../components/SearchSelect';
import FormSection from '../components/FormSection';

interface ResponsiblePersonBlockProps {
   
  form: UseFormReturn<any>;
  doctors: any[]; // API returns { id, name, speciality }
  technicians: any[]; // API returns { id, name, role }
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

export default function ResponsiblePersonBlock({ 
  form, 
  doctors, 
  technicians, 
  onInputChange
}: ResponsiblePersonBlockProps) {
  
  return (
    <FormSection title="Responsables" defaultOpen={true}>
      <div className="space-y-4">
        <SearchSelect
          name="medecin"
          label="Médecin"
          form={form}
          options={doctors.map(d => ({ id: d.id, name: d.name || 'Unknown Doctor' }))}
          emptyOptionLabel="Sélectionnez un médecin"
          onParentChange={onInputChange}
        />

        <SearchSelect
          name="technicienResponsable"
          label="Technicien Responsable"
          form={form}
          options={technicians.map(t => ({ id: t.id, name: t.name || 'Unknown Technician' }))}
          emptyOptionLabel="Sélectionnez un technicien"
          onParentChange={onInputChange}
        />

        <SearchSelect
          name="superviseur"
          label="Superviseur (Technicien Régional)"
          form={form}
          options={technicians.map(t => ({ id: t.id, name: t.name || 'Unknown Technician' }))}
          emptyOptionLabel="Sélectionnez un superviseur"
          onParentChange={onInputChange}
        />
      </div>
    </FormSection>
  );
}