import { PaymentData } from './PaymentFormsMain';
import EspecesForm from './EspecesForm';
import ChequeForm from './ChequeForm';
import VirementForm from './VirementForm';
import MondatForm from './MondatForm';
import TraiteForm from './TraiteForm';
import CNAMForm from './CNAMForm';
import { PaymentProvider, usePayment } from '../context/PaymentContext';
import PaymentDialog from '../components/PaymentDialog';

// Create a wrapper for CNAMForm to handle isRental prop
const CNAMFormWrapper = (props: any) => {
  return <CNAMForm {...props} />;
};

const PaymentForms = {
  especes: {
    label: 'Espèces',
    component: EspecesForm
  },
  cheque: {
    label: 'Chèque',
    component: ChequeForm
  },
  virement: {
    label: 'Virement',
    component: VirementForm
  },
  mandat: {
    label: 'Mandat',
    component: MondatForm
  },
  traite: {
    label: 'Traite',
    component: TraiteForm
  },
  cnam: {
    label: 'CNAM',
    component: CNAMFormWrapper
  }
};

// Export individual forms for direct use if needed
export {
  EspecesForm,
  ChequeForm,
  MondatForm,
  VirementForm,
  CNAMForm,
  TraiteForm,
  PaymentDialog,
  PaymentProvider,
  usePayment
};

// Export types
export type { PaymentData };

// Export the main PaymentForms component as default
export default PaymentForms;
