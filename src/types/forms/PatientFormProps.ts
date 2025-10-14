// src/types/forms/PatientFormProps.ts
import { CaisseAffiliation } from '@/types/renseignement';
import { BeneficiaryType } from '@prisma/client';

export interface PatientFormProps {
  formData: {
    nomComplet?: string;
    telephonePrincipale?: string;
    telephoneSecondaire?: string;
    adresseComplete?: string;
    cin?: string;
    identifiantCNAM?: string;
    technicienResponsable?: string;
    antecedant?: string;
    taille?: string;
    poids?: string;
    medecin?: string;
    dateNaissance?: string;
    beneficiaire?: BeneficiaryType;
    caisseAffiliation?: CaisseAffiliation;
    cnam?: boolean;
    descriptionNom?: string;
    descriptionTelephone?: string;
    descriptionAdresse?: string;
    adresseCoordinates?: { lat: number; lng: number };
    files?: File[];
    existingFiles?: { url: string; type: string }[];
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onFileChange: (files: File[]) => void;
  onBack: () => void;
  onNext: () => void;
  onError?: (error: Error) => void;
}