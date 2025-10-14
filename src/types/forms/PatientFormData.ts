import { BeneficiaryType } from '@prisma/client';
import { CaisseAffiliation } from '../renseignement';
import { File as FileModel } from '../models/File';

/**
 * Define a type for file uploads that works with the FileManager component
 */
export interface ExistingFile {
  url: string;
  type: string;
  name?: string;
  id?: string;
}

/**
 * Base interface for all form values in the application
 * This ensures a common foundation for all form types
 */
export interface BaseFormValues {
  [key: string]: unknown;
}

/**
 * Interface for the FileManager component's form values
 */
export interface FileManagerFormValues extends BaseFormValues {
  id?: string | number;
  existingFiles?: ExistingFile[];
  files?: File[] | FileModel[] | unknown[];
}

/**
 * Interface for the PersonalInfoBlock component's form values
 */
export interface PersonalInfoFormValues extends BaseFormValues {
  nomComplet: string;
  telephonePrincipale: string;
  telephoneSecondaire?: string;
  governorate?: string;
  delegation?: string;
  detailedAddress?: string;
  longitude?: number;
  latitude?: number;
  addressCoordinates?: string | null;
  cin?: string;
  dateNaissance?: string;
  antecedant?: string;
  generalNote?: string;
}

/**
 * Shared form data structure for patient forms
 * Used by PatientForm and PersonalInfoBlock components
 * This combines all the form values needed by child components
 */
export interface PatientFormData extends PersonalInfoFormValues, FileManagerFormValues {
  cnam?: boolean;
  identifiantCNAM?: string;
  beneficiaire?: BeneficiaryType | string;
  caisseAffiliation?: CaisseAffiliation | string;
  medecin?: string;
  technicienResponsable?: string;
  taille?: string;
  poids?: string;
}
