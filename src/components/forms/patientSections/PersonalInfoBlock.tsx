import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { AlertCircle, Check, MapPin } from 'lucide-react';
import SmartInput from '../components/SmartInput';
import FormSection from '../components/FormSection';
import axios from 'axios';
import { debounce } from 'lodash';
import { Patient } from '@/types';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import AddressSelector from '../components/AddressSelector';


interface PersonalInfoBlockProps {
  // Use a more flexible form type
   
  form: UseFormReturn<any>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  validationErrors?: Record<string, string>;
   
  onPatientSelect?: (patient: any) => void;
}

export default function PersonalInfoBlock({
  form,
  onInputChange,
  validationErrors = {},
  onPatientSelect
}: PersonalInfoBlockProps) {
  const [matchingPatients, setMatchingPatients] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [mapSelectedLocation, setMapSelectedLocation] = useState(false);
  
  // Debug form values
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'governorate' || name === 'delegation') {
        console.log(`Form value changed - ${name}:`, value[name]);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);
  
  // Debug current form values
  const governorateValue = form.watch('governorate');
  const delegationValue = form.watch('delegation');
  React.useEffect(() => {
    console.log('Current form values - governorate:', governorateValue, 'delegation:', delegationValue);
  }, [governorateValue, delegationValue]);

  // Debounced search function
  const searchPatients = debounce(async (name: string) => {
    if (!name || name.length < 3) {
      setMatchingPatients([]);
      setShowPatientSelector(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get(`/api/renseignements/patients/search?query=${encodeURIComponent(name)}`);
      const patients = response.data;
      console.log('Patients found:', patients);
      setMatchingPatients(patients);
      setShowPatientSelector(patients.length > 0);
    } catch (error) {
      console.error('Error searching for patients:', error);
    } finally {
      setIsSearching(false);
    }
  }, 500);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    form.setValue('nomComplet', name);
    onInputChange(e);

    // Only search if we don't have a selected patient already
    if (!selectedPatient) {
      searchPatients(name);
    }
  };

  const selectPatient = (patient: Patient | null) => {
    if (!patient) {
      console.warn('No patient selected');
      return;
    }


    console.log('Selecting patient:', patient);
    setSelectedPatient(patient);
    setShowPatientSelector(false);

    // Populate the form with the selected patient's data
    // Start with basic fields
    form.setValue('nomComplet', `${patient.firstName || ''} ${patient.lastName || ''}`);
    form.setValue('telephonePrincipale', patient.telephone || '');
    form.setValue('telephoneSecondaire', patient.telephoneTwo || '');
    form.setValue('governorate', (patient as any).governorate || '');
    form.setValue('delegation', (patient as any).delegation || '');
    form.setValue('detailedAddress', (patient as any).detailedAddress || '');

    if (patient.addressCoordinates) {
      setCoordinates(patient.addressCoordinates);
      // Serialize the coordinates to JSON string to prevent [object Object] in form submission
      form.setValue('addressCoordinates', JSON.stringify(patient.addressCoordinates));
      // Extract longitude and latitude
      if (patient.addressCoordinates.lng !== undefined) {
        form.setValue('longitude', patient.addressCoordinates.lng);
      }
      if (patient.addressCoordinates.lat !== undefined) {
        form.setValue('latitude', patient.addressCoordinates.lat);
      }
    } else {
      setCoordinates(null);
      form.setValue('addressCoordinates', null);
      form.setValue('longitude', undefined);
      form.setValue('latitude', undefined);
    }

    form.setValue('cin', patient.cin || '');
    form.setValue('dateNaissance', patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : '');
    form.setValue('antecedant', patient.antecedant || '');
    form.setValue('taille', patient.height ? patient.height.toString() : '');
    form.setValue('poids', patient.weight ? patient.weight.toString() : '');

    // General note
    form.setValue('generalNote', patient.generalNote || '');

    // Handle insurance fields
    form.setValue('cnam', !!patient.cnamId);
    form.setValue('identifiantCNAM', patient.cnamId || '');
    form.setValue('beneficiaire', patient.beneficiaryType || undefined);
    form.setValue('caisseAffiliation', patient.affiliation || 'CNSS');

    // Handle doctor, technician, and supervisor
    form.setValue('medecin', patient.doctorId || '');
    form.setValue('technicienResponsable', patient.technicianId || '');
    form.setValue('superviseur', (patient as any).supervisorId || '');

    // Convert synthetic events to update parent component state
    Object.entries(patient).forEach(([key, value]) => {
      if (value !== null && value !== undefined && key !== 'id' && key !== 'existingFiles') {
        const syntheticEvent = {
          target: {
            name: key,
            value: value
          }
        };
        onInputChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
      }
    });

    // If we have existing files, update them separately
    if (patient.files && patient.files.length > 0) {
      console.log('Setting existing files:', patient.files);
      form.setValue('existingFiles', patient.files);

      // Notify parent about existing files
      const syntheticEvent = {
        target: {
          name: 'existingFiles',
          value: patient.files
        }
      };
      onInputChange(syntheticEvent as unknown as React.ChangeEvent<HTMLInputElement>);
    }

    // Call the optional callback if provided
    if (onPatientSelect) {
      onPatientSelect(patient);
    }
  };

  const resetPatientSelection = () => {
    setSelectedPatient(null);
    // Keep the current name but clear other fields
    const currentName = form.getValues('nomComplet');
    form.reset({ nomComplet: currentName });
  };

  return (
    <FormSection title="Information personnelle" defaultOpen={true}>
      <div className="space-y-4">
        <div className="relative">
          <SmartInput
            name="nomComplet"
            label="Nom complet"
            form={form}
            placeholder="Nom complet"
            onParentChange={handleNameChange}
            required
          />

          {selectedPatient && (
            <div className="mt-2 flex items-center gap-2 rounded-md bg-green-50 p-2 text-sm text-green-700">
              <Check size={16} className="text-green-500" />
              <span>
                Patient existant sélectionné: {selectedPatient?.firstName || ''} {selectedPatient?.lastName || ''}
                {selectedPatient?.cin ? ` - CIN: ${selectedPatient.cin}` : ''}
                {selectedPatient?.telephone ? ` - Tél: ${selectedPatient.telephone}` : ''}
              </span>
              <button
                onClick={resetPatientSelection}
                className="ml-auto rounded bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                Réinitialiser
              </button>
            </div>
          )}

          {showPatientSelector && !selectedPatient && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
              <div className="p-2 text-sm text-orange-700 bg-orange-50 rounded-t-md flex items-center gap-2">
                <AlertCircle size={16} />
                <span>Patients existants avec des noms similaires:</span>
              </div>
              <ul className="max-h-60 overflow-auto">
                {/* Log matchingPatients for debugging */}
                {(() => { console.log('matchingPatients:', matchingPatients); return null; })()}
                {matchingPatients.filter(p => p && p.firstName && p.lastName).map((patient) => (
                  <li
                    key={patient.id}
                    onClick={() => selectPatient(patient)}
                    className="border-t border-gray-100 p-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="font-medium">{`${patient.firstName} ${patient.lastName}`}</div>
                    {patient.telephone && <div className="text-sm text-gray-600">Tél: {patient.telephone}</div>}
                    {patient.cin && <div className="text-sm text-gray-600">CIN: {patient.cin}</div>}
                    {patient.dateOfBirth && <div className="text-sm text-gray-600">Né(e) le: {new Date(patient.dateOfBirth).toLocaleDateString()}</div>}
                  </li>
                ))}
                <li className="border-t border-gray-100 p-2 bg-gray-50">
                  <button
                    onClick={() => setShowPatientSelector(false)}
                    className="w-full rounded bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 border border-gray-200"
                  >
                    Continuer avec un nouveau patient
                  </button>
                </li>
              </ul>
            </div>
          )}

          {isSearching && (
            <div className="absolute top-0 right-2 h-full flex items-center">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          )}
        </div>

        <div className="relative">
          <SmartInput
            name="telephonePrincipale"
            label="Num Téléphone principale"
            form={form}
            type="tel"
            placeholder="Numéro de téléphone"
            pattern={{ value: /\D/g, replace: '', maxLength: 8 }}
            onParentChange={onInputChange}
            required
          />
          {validationErrors.telephonePrincipale && (
            <div className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle size={14} />
              <span>{validationErrors.telephonePrincipale}</span>
            </div>
          )}
        </div>

        <SmartInput
          name="telephoneSecondaire"
          label="Num Téléphone secondaire"
          form={form}
          type="tel"
          placeholder="Numéro de téléphone secondaire"
          pattern={{ value: /\D/g, replace: '', maxLength: 8 }}
          onParentChange={onInputChange}
        />

        {/* Tunisia Address Fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Governorate Input */}
            <SmartInput
              name="governorate"
              label="Gouvernorat"
              form={form}
              placeholder="Sélectionner sur la carte"
              onParentChange={onInputChange}
              readOnly={mapSelectedLocation}
              value={governorateValue}
            />

            {/* Delegation Input */}
            <SmartInput
              name="delegation"
              label="Délégation"
              form={form}
              placeholder="Sélectionner sur la carte"
              onParentChange={onInputChange}
              readOnly={mapSelectedLocation}
              value={delegationValue}
            />
          </div>

          {/* Map selection notification */}
          {mapSelectedLocation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-blue-900">Localisation sélectionnée depuis la carte</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Les champs sont verrouillés. Pour modifier, cliquez sur le bouton ci-contre.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMapSelectedLocation(false);
                    form.setValue('governorate', '');
                    form.setValue('delegation', '');
                    form.setValue('longitude', undefined);
                    form.setValue('latitude', undefined);
                    const syntheticEvent = {
                      target: { name: 'governorate', value: '' }
                    };
                    onInputChange(syntheticEvent as any);
                  }}
                  className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                >
                  ×
                </Button>
              </div>
            </div>
          )}


          {/* Detailed Address */}
          <div className="space-y-2">
            <SmartInput
              name="detailedAddress"
              label="Adresse détaillée"
              form={form}
              placeholder="Numéro, rue, quartier, etc."
              onParentChange={onInputChange}
            />
          </div>

          {/* Map-based Address Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Sélection précise de l'adresse
            </label>
            <AddressSelector
              value={form.watch('addressCoordinates') ? 
                JSON.parse(form.watch('addressCoordinates') || '{}') : 
                undefined
              }
              onChange={(coordinates) => {
                console.log('📍 Map onChange received coordinates:', coordinates);
                setCoordinates(coordinates);
                form.setValue('addressCoordinates', JSON.stringify(coordinates));
                
                // Set longitude and latitude
                if (coordinates.lng !== undefined) {
                  form.setValue('longitude', coordinates.lng);
                  const lngEvent = {
                    target: { name: 'longitude', value: coordinates.lng }
                  };
                  onInputChange(lngEvent as any);
                }
                
                if (coordinates.lat !== undefined) {
                  form.setValue('latitude', coordinates.lat);
                  const latEvent = {
                    target: { name: 'latitude', value: coordinates.lat }
                  };
                  onInputChange(latEvent as any);
                }
                
                // Always set map selected location when coordinates change
                setMapSelectedLocation(true);
                
                // Set governorate and delegation from map
                if (coordinates.governorate) {
                  console.log('🏛️ Setting governorate to:', coordinates.governorate);
                  form.setValue('governorate', coordinates.governorate);
                  const governorateEvent = {
                    target: { name: 'governorate', value: coordinates.governorate }
                  };
                  onInputChange(governorateEvent as any);
                } else {
                  console.log('⚠️ No governorate in coordinates');
                  form.setValue('governorate', '');
                  onInputChange({ target: { name: 'governorate', value: '' }} as any);
                }
                
                if (coordinates.delegation) {
                  console.log('🏢 Setting delegation to:', coordinates.delegation);
                  form.setValue('delegation', coordinates.delegation);
                  const delegationEvent = {
                    target: { name: 'delegation', value: coordinates.delegation }
                  };
                  onInputChange(delegationEvent as any);
                } else {
                  console.log('⚠️ No delegation in coordinates');
                  form.setValue('delegation', '');
                  onInputChange({ target: { name: 'delegation', value: '' }} as any);
                }
                
                // Notify parent component
                const syntheticEvent = {
                  target: { name: 'addressCoordinates', value: JSON.stringify(coordinates) }
                };
                onInputChange(syntheticEvent as any);
              }}
            />
            <p className="text-xs text-gray-500">
              Utilisez votre position actuelle ou sélectionnez sur la carte pour une localisation précise
            </p>
          </div>
        </div>

        <div className="relative">
          <SmartInput
            name="cin"
            label="CIN"
            form={form}
            placeholder="Numéro CIN (8 chiffres)"
            pattern={{ value: /\D/g, replace: '', maxLength: 8 }}
            onParentChange={onInputChange}
            maxLength={8}
          />
          {validationErrors.cin && (
            <div className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle size={14} />
              <span>{validationErrors.cin}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="dateNaissance" className="text-sm font-medium text-gray-700">
            Date de naissance
          </label>
          <DatePicker
            value={form.watch('dateNaissance') ? new Date(form.watch('dateNaissance')) : undefined}
            onChange={(date) => {
              const dateString = date ? date.toISOString().split('T')[0] : '';
              form.setValue('dateNaissance', dateString);
              const syntheticEvent = {
                target: { name: 'dateNaissance', value: dateString }
              };
              onInputChange(syntheticEvent as any);
            }}
            placeholder="Sélectionner une date"
            className="w-full"
            id="dateNaissance"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Antécédents médicaux</label>
          <textarea
            name="antecedant"
            value={form.watch('antecedant') || ''}
            onChange={(e) => {
              form.setValue('antecedant', e.target.value);
              onInputChange(e);
            }}
            placeholder="Antécédants médicaux"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            rows={3}
          />
        </div>
      </div>
    </FormSection>
  );
}
