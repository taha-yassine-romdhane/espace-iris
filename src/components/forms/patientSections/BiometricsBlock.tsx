import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import UnitInput from '../components/UnitInput';
import FormSection from '../components/FormSection';

interface BiometricsBlockProps {
   
  form: UseFormReturn<any>;
   
  onInputChange: (e: any) => void;
}

export default function BiometricsBlock({ form, onInputChange }: BiometricsBlockProps) {
  const [useCustomHeight, setUseCustomHeight] = useState(false);
  const [useCustomWeight, setUseCustomWeight] = useState(false);

  // Preset height options (in cm)
  const heightOptions = [
    { value: '', label: 'Sélectionner la taille' },
    { value: '150', label: '150 cm' },
    { value: '155', label: '155 cm' },
    { value: '160', label: '160 cm' },
    { value: '165', label: '165 cm' },
    { value: '170', label: '170 cm' },
    { value: '175', label: '175 cm' },
    { value: '180', label: '180 cm' },
    { value: '185', label: '185 cm' },
    { value: '190', label: '190 cm' },
    { value: '195', label: '195 cm' },
    { value: 'custom', label: 'Autre (saisie manuelle)' },
  ];

  // Preset weight options (in kg)
  const weightOptions = [
    { value: '', label: 'Sélectionner le poids' },
    { value: '40', label: '40 kg' },
    { value: '45', label: '45 kg' },
    { value: '50', label: '50 kg' },
    { value: '55', label: '55 kg' },
    { value: '60', label: '60 kg' },
    { value: '65', label: '65 kg' },
    { value: '70', label: '70 kg' },
    { value: '75', label: '75 kg' },
    { value: '80', label: '80 kg' },
    { value: '85', label: '85 kg' },
    { value: '90', label: '90 kg' },
    { value: '95', label: '95 kg' },
    { value: '100', label: '100 kg' },
    { value: '110', label: '110 kg' },
    { value: '120', label: '120 kg' },
    { value: 'custom', label: 'Autre (saisie manuelle)' },
  ];

  // Calculate BMI when both height and weight are available
  const calculateIMC = () => {
    const taille = form.watch('taille');
    const poids = form.watch('poids');
    
    if (typeof taille === 'string' && typeof poids === 'string' && taille && poids) {
      const imc = (parseFloat(poids) / Math.pow(parseFloat(taille) / 100, 2)).toFixed(1);
      return imc;
    }
    return null;
  };

  // Get BMI category and color
  const getIMCCategory = (imc: string) => {
    const imcValue = parseFloat(imc);
    if (imcValue < 18.5) return { category: 'Insuffisance pondérale', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (imcValue < 25) return { category: 'Poids normal', color: 'text-green-600', bg: 'bg-green-50' };
    if (imcValue < 30) return { category: 'Surpoids', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { category: 'Obésité', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const handleHeightChange = (value: string) => {
    if (value === 'custom') {
      setUseCustomHeight(true);
      form.setValue('taille', '');
    } else {
      setUseCustomHeight(false);
      form.setValue('taille', value);
      onInputChange({ target: { name: 'taille', value } });
    }
  };

  const handleWeightChange = (value: string) => {
    if (value === 'custom') {
      setUseCustomWeight(true);
      form.setValue('poids', '');
    } else {
      setUseCustomWeight(false);
      form.setValue('poids', value);
      onInputChange({ target: { name: 'poids', value } });
    }
  };

  const currentHeight = form.watch('taille');
  const currentWeight = form.watch('poids');
  const imc = calculateIMC();

  return (
    <FormSection title="Biométrie" defaultOpen={true}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Height Section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Taille</label>
            
            {!useCustomHeight ? (
              <select
                value={currentHeight || ''}
                onChange={(e) => handleHeightChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {heightOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-2">
                <UnitInput
                  name="taille"
                  label=""
                  form={form}
                  unit="cm"
                  min={50}
                  max={250}
                  step="1"
                  placeholder="Taille en cm"
                  onParentChange={onInputChange}
                />
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomHeight(false);
                    form.setValue('taille', '');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  ← Retour aux options prédéfinies
                </button>
              </div>
            )}
          </div>

          {/* Weight Section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Poids</label>
            
            {!useCustomWeight ? (
              <select
                value={currentWeight || ''}
                onChange={(e) => handleWeightChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {weightOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-2">
                <UnitInput
                  name="poids"
                  label=""
                  form={form}
                  unit="kg"
                  min={10}
                  max={500}
                  step="0.1"
                  placeholder="Poids en kg"
                  onParentChange={onInputChange}
                />
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomWeight(false);
                    form.setValue('poids', '');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  ← Retour aux options prédéfinies
                </button>
              </div>
            )}
          </div>
        </div>

        {/* IMC Calculation */}
        {imc && (
          <div className="mt-6">
            <div className={`p-4 rounded-lg border ${getIMCCategory(imc).bg}`}>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Indice de Masse Corporelle (IMC)</label>
                  <div className={`text-2xl font-bold ${getIMCCategory(imc).color}`}>
                    {imc}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${getIMCCategory(imc).color}`}>
                    {getIMCCategory(imc).category}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Taille: {currentHeight}cm, Poids: {currentWeight}kg
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </FormSection>
  );
}
