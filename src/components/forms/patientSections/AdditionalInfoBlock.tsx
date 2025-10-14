import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import FormSection from '../components/FormSection';

interface AdditionalInfoBlockProps {
   
  form: UseFormReturn<any>;
   
  onInputChange: (e: any) => void;
}

export default function AdditionalInfoBlock({ form, onInputChange }: AdditionalInfoBlockProps) {
  return (
    <FormSection title="Note générale" defaultOpen={true}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Note générale</label>
          <textarea
            name="generalNote"
            value={form.watch('generalNote') || ''}
            onChange={(e) => {
              form.setValue('generalNote', e.target.value);
              onInputChange(e);
            }}
            placeholder="Ajouter une note générale pour ce patient..."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            rows={4}
          />
        </div>
      </div>
    </FormSection>
  );
}
