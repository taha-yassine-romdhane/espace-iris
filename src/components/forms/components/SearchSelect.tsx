import React from 'react';
import { UseFormReturn } from 'react-hook-form';

interface Option {
  id: string;
  name: string;
  [key: string]: string;
}

interface SearchSelectProps {
  name: string;
  label: string;
  form: UseFormReturn<Option>;
  options: Option[];
  placeholder?: string;
  emptyOptionLabel?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onParentChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  className?: string;
}

export default function SearchSelect({
  name,
  label,
  form,
  options,
  placeholder = 'Sélectionner une option',
  emptyOptionLabel,
  onChange,
  onParentChange,
  required = false,
  className,
}: SearchSelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    form.setValue(name, e.target.value);
    
    // Call custom onChange if provided
    if (onChange) {
      onChange(e);
    }
    
    // Update parent component if needed
    if (onParentChange) {
      onParentChange(e);
    }
  };
  
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        name={name}
        value={form.watch(name) || ''}
        onChange={handleChange}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
      >
        <option value="">{emptyOptionLabel || placeholder}</option>
        {options.map(option => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {form.formState.errors[name] && (
        <span className="text-sm text-red-500">
          {form.formState.errors[name]?.message as string}
        </span>
      )}
    </div>
  );
}
