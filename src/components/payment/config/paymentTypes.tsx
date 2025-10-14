import React from 'react';
import { Banknote, CreditCard, FileCheck, Building, FileText, FileSpreadsheet } from 'lucide-react';
import EspecesForm from '../paymentForms/EspecesForm';
import ChequeForm from '../paymentForms/ChequeForm';
import VirementForm from '../paymentForms/VirementForm';
import CNAMForm from '../paymentForms/CNAMForm';
import MandatForm from '../paymentForms/MondatForm';
import TraiteForm from '../paymentForms/TraiteForm';

/**
 * Payment type interface
 */
export interface PaymentType {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  component: React.ComponentType<any>;
}

/**
 * Available payment types
 */
export const PAYMENT_TYPES: PaymentType[] = [
  {
    id: 'especes',
    title: 'Paiement en Espèce',
    description: 'Paiement direct en espèces avec option d\'acompte',
    icon: Banknote,
    component: EspecesForm
  },
  {
    id: 'cheque',
    title: 'Paiement par Chèque',
    description: 'Paiement par chèque bancaire',
    icon: CreditCard,
    component: ChequeForm
  },
  {
    id: 'virement',
    title: 'Virement Bancaire',
    description: 'Paiement par virement bancaire',
    icon: Building,
    component: VirementForm
  },
  {
    id: 'cnam',
    title: 'CNAM',
    description: 'Paiement via assurance CNAM',
    icon: FileCheck,
    component: CNAMForm
  },
  {
    id: 'mandat',
    title: 'Mandat',
    description: 'Paiement par mandat postal',
    icon: FileText,
    component: MandatForm
  },
  {
    id: 'traite',
    title: 'Traite',
    description: 'Paiement par traite',
    icon: FileSpreadsheet,
    component: TraiteForm
  }
];

export default PAYMENT_TYPES;
