import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { BeneficiaryType } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { User, Users, Baby, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import SmartInput from '../components/SmartInput';
import FormSection from '../components/FormSection';

type CaisseAffiliation = 'CNSS' | 'CNRPS';

interface InsuranceDetailsBlockProps {
   
  form: UseFormReturn<any>;
   
  onInputChange: (e: any) => void;
}

export default function InsuranceDetailsBlock({ form, onInputChange }: InsuranceDetailsBlockProps) {
  const handleCnamChange = (value: boolean) => {
    form.setValue('cnam', value);
    
    // Clear CNAM-related fields when CNAM is set to false
    if (!value) {
      form.setValue('identifiantCNAM', '');
      form.setValue('caisseAffiliation', undefined);
      form.setValue('beneficiaire', undefined);
      
      // Clear these fields in the parent component too
      onInputChange({ target: { name: 'identifiantCNAM', value: '' } });
      onInputChange({ target: { name: 'caisseAffiliation', value: undefined } });
      onInputChange({ target: { name: 'beneficiaire', value: undefined } });
    }
    
    onInputChange({
      target: {
        name: 'cnam',
        value: value
      }
    });
  };

  const handleCaisseAffiliationChange = (value: CaisseAffiliation) => {
    form.setValue('caisseAffiliation', value);
    onInputChange({
      target: {
        name: 'caisseAffiliation',
        value: value
      }
    });
  };

  const handleBeneficiaireChange = (value: BeneficiaryType) => {
    form.setValue('beneficiaire', value);
    onInputChange({
      target: {
        name: 'beneficiaire',
        value: value
      }
    });
  };

  const beneficiaryOptions = [
    {
      value: BeneficiaryType.ASSURE_SOCIAL,
      label: 'Assuré Social',
      icon: User,
      description: 'Personne principale assurée'
    },
    {
      value: BeneficiaryType.CONJOINT,
      label: 'Conjoint',
      icon: Users,
      description: 'Époux ou épouse'
    },
    {
      value: BeneficiaryType.ENFANT,
      label: 'Enfant',
      icon: Baby,
      description: 'Enfant à charge'
    },
    {
      value: BeneficiaryType.ASSANDANT,
      label: 'Ascendant',
      icon: UserPlus,
      description: 'Parent à charge'
    }
  ];

  return (
    <FormSection title="Assurance" defaultOpen={true}>
      <Card className="border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium">Assurance CNAM</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Activez cette option si le patient bénéficie de la CNAM
              </p>
            </div>
            <Switch
              checked={form.watch('cnam') || false}
              onCheckedChange={handleCnamChange}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>
        </CardHeader>

        <AnimatePresence>
          {form.watch('cnam') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="px-0 space-y-6">
                {/* CNAM Identifier */}
                <div className="pt-4">
                  <SmartInput
                    name="identifiantCNAM"
                    label="Identifiant CNAM"
                    form={form}
                    placeholder="Entrez l'identifiant CNAM"
                    pattern={{ value: /[^0-9A-Z]/g, replace: '', maxLength: 12 }}
                    onParentChange={onInputChange}
                    maxLength={12}
                  />
                </div>

                {/* Caisse d'affiliation - Segmented Control Style */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Caisse d'affiliation
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg">
                    {['CNSS', 'CNRPS'].map((caisse) => (
                      <button
                        key={caisse}
                        type="button"
                        onClick={() => handleCaisseAffiliationChange(caisse as CaisseAffiliation)}
                        className={cn(
                          "py-2 px-4 rounded-md font-medium transition-all duration-200",
                          form.watch('caisseAffiliation') === caisse
                            ? "bg-white shadow-sm text-blue-600"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        {caisse}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bénéficiaire - Card Selection */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Type de bénéficiaire
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {beneficiaryOptions.map((option) => {
                      const Icon = option.icon;
                      const isSelected = form.watch('beneficiaire') === option.value;
                      
                      return (
                        <Card
                          key={option.value}
                          className={cn(
                            "cursor-pointer transition-all duration-200 hover:shadow-md",
                            isSelected
                              ? "border-blue-500 bg-blue-50 shadow-md"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                          onClick={() => handleBeneficiaireChange(option.value)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "p-2 rounded-lg",
                                isSelected ? "bg-blue-100" : "bg-gray-100"
                              )}>
                                <Icon className={cn(
                                  "h-5 w-5",
                                  isSelected ? "text-blue-600" : "text-gray-600"
                                )} />
                              </div>
                              <div className="flex-1">
                                <h4 className={cn(
                                  "font-medium text-sm",
                                  isSelected ? "text-blue-900" : "text-gray-900"
                                )}>
                                  {option.label}
                                </h4>
                                <p className={cn(
                                  "text-xs mt-0.5",
                                  isSelected ? "text-blue-700" : "text-gray-500"
                                )}>
                                  {option.description}
                                </p>
                              </div>
                              {isSelected && (
                                <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                                  <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </FormSection>
  );
}
