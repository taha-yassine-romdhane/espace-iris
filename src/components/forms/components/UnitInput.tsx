import React from 'react';
import { UseFormReturn } from 'react-hook-form';

interface UnitInputProps {
  name: string;
  label: string;
   
  form: UseFormReturn<any>;
  unit: string;
  min?: number;
  max?: number;
  step?: string;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
   
  onParentChange?: (e: any) => void;
  className?: string;
}

export default function UnitInput({
  name,
  label,
  form,
  unit,
  min,
  max,
  step = "1",
  placeholder,
  onChange,
  onParentChange,
  className,
}: UnitInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Only allow valid values within range if min and max are provided
    if (!value || !min || !max || (parseFloat(value) >= min && parseFloat(value) <= max)) {
      form.setValue(name, value);
      
      // Call custom onChange if provided
      if (onChange) {
        onChange(e);
      }
      
      // Update parent component if needed
      if (onParentChange) {
        onParentChange(e);
      }
    }
  };
  
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          type="number"
          name={name}
          value={form.watch(name) || ''}
          onChange={handleChange}
          placeholder={placeholder}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 pr-12 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          min={min}
          max={max}
          step={step}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <span className="text-gray-500 sm:text-sm">{unit}</span>
        </div>
      </div>
      {form.formState.errors[name] && (
        <span className="text-sm text-red-500">
          {form.formState.errors[name]?.message as string}
        </span>
      )}
    </div>
  );
}
