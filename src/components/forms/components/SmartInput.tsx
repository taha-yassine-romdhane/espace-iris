import React from 'react';
import { UseFormReturn } from 'react-hook-form';

interface SmartInputProps {
  name: string;
  label: string;
  form: UseFormReturn<any>;
  placeholder?: string;
  type?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onParentChange?: (e: any) => void;
  maxLength?: number;
  pattern?: {
    value: RegExp;
    replace: string;
    maxLength?: number;
  };
  suffix?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
  icon?: React.ReactNode;
  className?: string;
  readOnly?: boolean;
  value?: string;
}

export default function SmartInput({
  name,
  label,
  form,
  placeholder,
  type = 'text',
  onChange,
  onParentChange,
  maxLength,
  pattern,
  suffix,
  required = false,
  min,
  max,
  step,
  icon,
  className,
  readOnly = false,
  value,
}: SmartInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Apply pattern transformation if provided
    if (pattern) {
      value = value.replace(pattern.value, pattern.replace);
      if (pattern.maxLength) {
        value = value.slice(0, pattern.maxLength);
      }
    }
    
    // Update the form value
    form.setValue(name, value);
    
    // Call custom onChange if provided
    if (onChange) {
      onChange({
        ...e,
        target: {
          ...e.target,
          value
        }
      });
    }
    
    // Update parent component if needed
    if (onParentChange) {
      onParentChange({
        target: {
          name,
          value
        }
      });
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          name={name}
          value={value !== undefined ? value : form.watch(name) || ''}
          onChange={handleChange}
          placeholder={placeholder}
          className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 ${
            suffix ? 'pr-12' : ''
          } ${
            icon ? 'pl-10' : ''
          } ${
            readOnly ? 'bg-gray-50 cursor-not-allowed' : ''
          } focus:border-blue-500 focus:outline-none focus:ring-blue-500`}
          maxLength={maxLength}
          min={min}
          max={max}
          step={step}
          readOnly={readOnly}
        />
        {suffix && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <span className="text-gray-500 sm:text-sm">{suffix}</span>
          </div>
        )}
        {icon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            {icon}
          </div>
        )}
      </div>
      {form.formState.errors[name] && (
        <span className="text-sm text-red-500">
          {form.formState.errors[name]?.message as string}
        </span>
      )}
    </div>
  );
}
