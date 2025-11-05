import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, User, Phone, MapPin, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface PatientSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: Patient[];
  selectedPatientId?: string;
  onSelectPatient: (patientId: string) => void;
  title?: string;
}

export function PatientSelectorDialog({
  open,
  onOpenChange,
  patients,
  selectedPatientId,
  onSelectPatient,
  title = 'Sélectionner un patient'
}: PatientSelectorDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Filter patients based on search term
  const filteredPatients = useMemo(() => {
    if (!searchTerm) return patients;

    const search = searchTerm.toLowerCase().trim();
    return patients.filter(patient => {
      const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.toLowerCase();
      const patientName = patient.name?.toLowerCase() || '';
      const code = patient.patientCode?.toLowerCase() || '';
      const phone = patient.telephone?.toLowerCase() || '';
      const cin = patient.cin?.toLowerCase() || '';
      const governorate = patient.governorate?.toLowerCase() || '';
      const delegation = patient.delegation?.toLowerCase() || '';

      return (
        fullName.includes(search) ||
        patientName.includes(search) ||
        code.includes(search) ||
        phone.includes(search) ||
        cin.includes(search) ||
        governorate.includes(search) ||
        delegation.includes(search)
      );
    });
  }, [patients, searchTerm]);

  const handleSelect = (patientId: string) => {
    onSelectPatient(patientId);
    onOpenChange(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    setSearchTerm('');
  };

  const getPatientDisplayName = (patient: Patient) => {
    return patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient sans nom';
  };

  const getPatientLocation = (patient: Patient) => {
    const parts = [];
    if (patient.delegation) parts.push(patient.delegation);
    if (patient.governorate) parts.push(patient.governorate);
    return parts.join(', ') || 'Non spécifié';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom, code, téléphone, CIN, gouvernorat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search Stats */}
          <div className="mt-2 text-sm text-gray-600">
            {filteredPatients.length} patient(s) trouvé(s)
            {searchTerm && ` sur ${patients.length}`}
          </div>
        </div>

        {/* Patients List */}
        <div className="h-[400px] overflow-y-auto px-6 py-4">
          {filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <User className="h-12 w-12 mb-3 text-gray-300" />
              <p className="text-lg font-medium">Aucun patient trouvé</p>
              <p className="text-sm mt-1">
                {searchTerm
                  ? 'Essayez un autre terme de recherche'
                  : 'Aucun patient disponible'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPatients.map((patient) => {
                const isSelected = selectedPatientId === patient.id;
                const isHovered = hoveredId === patient.id;

                return (
                  <div
                    key={patient.id}
                    onClick={() => handleSelect(patient.id)}
                    onMouseEnter={() => setHoveredId(patient.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={cn(
                      'p-4 rounded-lg border-2 cursor-pointer transition-all duration-200',
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : isHovered
                        ? 'border-blue-300 bg-blue-50/50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Patient Name and Code */}
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {getPatientDisplayName(patient)}
                          </h3>
                          {patient.patientCode && (
                            <Badge
                              variant="outline"
                              className="text-xs font-mono shrink-0 bg-white"
                            >
                              {patient.patientCode}
                            </Badge>
                          )}
                        </div>

                        {/* Patient Details */}
                        <div className="space-y-1">
                          {patient.telephone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-3.5 w-3.5 text-gray-400" />
                              <span>{patient.telephone}</span>
                            </div>
                          )}

                          {(patient.governorate || patient.delegation) && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-3.5 w-3.5 text-gray-400" />
                              <span>{getPatientLocation(patient)}</span>
                            </div>
                          )}

                          {patient.cin && (
                            <div className="text-sm text-gray-500">
                              CIN: {patient.cin}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="ml-4 shrink-0">
                          <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedPatientId ? (
              <span className="font-medium text-blue-600">
                Patient sélectionné
              </span>
            ) : (
              <span>Sélectionnez un patient</span>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSearchTerm('');
            }}
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact Patient Display Component for use in forms
interface PatientDisplayProps {
  patient?: Patient | null;
  onClick?: () => void;
  className?: string;
  placeholder?: string;
}

export function PatientDisplay({
  patient,
  onClick,
  className,
  placeholder = 'Sélectionner un patient'
}: PatientDisplayProps) {
  if (!patient) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'w-full px-2 py-1.5 text-left border border-gray-300 rounded-md',
          'hover:border-gray-400 transition-colors text-xs text-gray-500',
          'flex items-center min-h-[32px]',
          className
        )}
      >
        {placeholder}
      </button>
    );
  }

  const patientName = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim();

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-2 py-1.5 text-left border border-blue-300 rounded-md',
        'hover:border-blue-400 transition-colors bg-blue-50',
        'flex items-center gap-2 min-h-[32px]',
        className
      )}
    >
      <User className="h-3.5 w-3.5 text-blue-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-900 truncate leading-tight">
          {patientName}
        </div>
        {patient.telephone && (
          <div className="text-[10px] text-gray-600 leading-tight mt-0.5">
            {patient.telephone}
          </div>
        )}
      </div>
      {patient.patientCode && (
        <Badge variant="outline" className="text-[10px] font-mono shrink-0 py-0 px-1.5 h-4">
          {patient.patientCode}
        </Badge>
      )}
    </button>
  );
}
