import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MedicalDevice, Patient, Company } from '@prisma/client';
import { toast } from '@/components/ui/use-toast';

// Fetcher functions
const fetchPatients = async () => {
  const res = await fetch('/api/patients');
  if (!res.ok) throw new Error('Failed to fetch patients');
  return res.json();
};

const fetchCompanies = async () => {
  const res = await fetch('/api/companies');
  if (!res.ok) throw new Error('Failed to fetch companies');
  return res.json();
};

interface AssignDeviceDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  device: MedicalDevice;
  onSuccess: () => void;
}

export const AssignDeviceDialog: React.FC<AssignDeviceDialogProps> = ({ isOpen, onOpenChange, device, onSuccess }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('patient');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const { data: patients = [], isLoading: isLoadingPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
  });

  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
  });

  const assignMutation = useMutation({
    mutationFn: (data: { assigneeId: string; assigneeType: 'PATIENT' | 'COMPANY' }) =>
      fetch(`/api/medical-devices/${device.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: async () => {
        toast({
          variant: 'default',
          title: 'Appareil assigné avec succès!',
        });
        await queryClient.invalidateQueries({ queryKey: ['medicalDevice', device.id] });
        onSuccess();
        onOpenChange(false);
      },
      onError: () => {
        toast({
          variant: 'destructive',
          title: "Échec de l'assignation de l'appareil.",
        });
      },
    }
  );

  const handleAssign = () => {
    if (activeTab === 'patient' && selectedPatient) {
      assignMutation.mutate({ assigneeId: selectedPatient.id, assigneeType: 'PATIENT' });
    } else if (activeTab === 'company' && selectedCompany) {
      assignMutation.mutate({ assigneeId: selectedCompany.id, assigneeType: 'COMPANY' });
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setSelectedPatient(null);
      setSelectedCompany(null);
    }
  }, [isOpen]);

  const renderCombobox = <T extends { id: string; firstName?: string; lastName?: string; companyName?: string }>(
    items: T[],
    selectedValue: T | null,
    onSelect: (value: T | null) => void,
    isLoading: boolean,
    type: 'patient' | 'company'
  ) => {
    const [open, setOpen] = useState(false);
    const getDisplayName = (item: T) => type === 'patient' ? `${item.firstName} ${item.lastName}` : item.companyName || '';

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
            {selectedValue ? getDisplayName(selectedValue) : `Sélectionner un ${type}...`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder={`Rechercher un ${type}...`} />
            <CommandEmpty>{isLoading ? 'Chargement...' : 'Aucun résultat.'}</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-y-auto">
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={getDisplayName(item)}
                  onSelect={() => {
                    onSelect(item.id === selectedValue?.id ? null : item);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', selectedValue?.id === item.id ? 'opacity-100' : 'opacity-0')} />
                  {getDisplayName(item)}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assigner l'appareil: {device.name}</DialogTitle>
          <DialogDescription>Sélectionnez un patient ou une entreprise à qui assigner cet appareil.</DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="patient">Patient</TabsTrigger>
            <TabsTrigger value="company">Entreprise</TabsTrigger>
          </TabsList>
          <TabsContent value="patient" className="mt-4">
            {renderCombobox(patients, selectedPatient, setSelectedPatient, isLoadingPatients, 'patient')}
          </TabsContent>
          <TabsContent value="company" className="mt-4">
            {renderCombobox(companies, selectedCompany, setSelectedCompany, isLoadingCompanies, 'company')}
          </TabsContent>
        </Tabs>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleAssign} disabled={assignMutation.isPending || (activeTab === 'patient' ? !selectedPatient : !selectedCompany)}>
            {assignMutation.isPending ? 'Assignation...' : 'Assigner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignDeviceDialog;
