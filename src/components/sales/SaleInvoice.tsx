import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { PrinterIcon } from "lucide-react";

interface SaleInvoiceProps {
  sale: any;
}

const SaleInvoice: React.FC<SaleInvoiceProps> = ({ sale }) => {
  const printRef = useRef<HTMLDivElement>(null);
  
  if (!sale) return <div>Aucune donnée de vente disponible.</div>;
  
  // Process payment details if they exist in the legacy format or PaymentDetail table
  const processPaymentDetails = () => {
    if (!sale.payment) return [];
    
    // Check if we have normalized payment details from PaymentDetail table
    if (sale.payment.paymentDetails && Array.isArray(sale.payment.paymentDetails) && sale.payment.paymentDetails.length > 0) {
      return sale.payment.paymentDetails.map((detail: any) => ({
        method: detail.method,
        displayMethod: getDisplayMethod(detail.method),
        amount: detail.amount,
        classification: detail.classification,
        displayClassification: getDisplayClassification(detail.classification),
        reference: detail.reference,
        createdAt: detail.createdAt || sale.payment.createdAt
      }));
    }
    
    // Check if we have legacy payment details in the API response
    if (sale.payment.legacyPaymentDetails && Array.isArray(sale.payment.legacyPaymentDetails)) {
      console.log('Payment Detail [0]:', sale.payment.legacyPaymentDetails[0]);
      return sale.payment.legacyPaymentDetails.map((detail: any) => ({
        ...detail,
        displayClassification: getDisplayClassification(detail.classification)
      }));
    }
    
    // Return an array with just the main payment if no details
    return [{
      method: sale.payment.method,
      displayMethod: getDisplayMethod(sale.payment.method),
      amount: sale.payment.amount,
      classification: 'principale',
      displayClassification: 'Principal',
      createdAt: sale.payment.createdAt,
      reference: getPaymentReference(sale.payment)
    }];
  };
  
  // Helper function to get display method name
  const getDisplayMethod = (method: string) => {
    const methodMap: Record<string, string> = {
      'especes': 'Espèces',
      'CASH': 'Espèces',
      'cheque': 'Chèque',
      'CHEQUE': 'Chèque',
      'virement': 'Virement',
      'VIREMENT': 'Virement',
      'mandat': 'Mandat',
      'MANDAT': 'Mandat',
      'traite': 'Traite',
      'TRAITE': 'Traite',
      'cnam': 'CNAM',
      'CNAM': 'CNAM'
    };
    
    return methodMap[method] || method;
  };
  
  // Helper function to get display classification
  const getDisplayClassification = (classification?: string) => {
    if (!classification) return '';
    
    const classMap: Record<string, string> = {
      'principale': 'Principal',
      'principal': 'Principal',
      'garantie': 'Garantie',
      'complement': 'Complément',
      'complément': 'Complément'
    };
    
    return classMap[classification.toLowerCase()] || classification;
  };
  
  // Helper function to get payment reference based on method
  const getPaymentReference = (payment: any) => {
    // Return appropriate reference based on payment method
    switch(payment.method) {
      case 'CHEQUE':
        return payment.chequeNumber || sale.invoiceNumber;
      case 'VIREMENT':
      case 'MANDAT':
      case 'TRAITE':
        return payment.referenceNumber || sale.invoiceNumber;
      default:
        return sale.invoiceNumber;
    }
  };
  
  const paymentDetails = processPaymentDetails();

  const {
    invoiceNumber,
    saleDate,
    createdAt,
    status,
    totalAmount,
    patient,
    company,
    items = [], // Using items instead of products based on the schema
    payment,
    notes,
    // Add more fields as needed
  } = sale;

  // Handle print functionality using browser's native print
  const handlePrint = () => {
    // Apply print styles
    const style = document.createElement('style');
    style.innerHTML = `
      @page {
        size: A4;
        margin: 10mm;
      }
      @media print {
        body * {
          visibility: hidden;
        }
        #print-content,
        #print-content * {
          visibility: visible;
        }
        #print-content {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        .no-print {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    // Set the document title
    const originalTitle = document.title;
    document.title = `RECU_${invoiceNumber || sale.id}`;
    
    // Print
    window.print();
    
    // Clean up
    document.head.removeChild(style);
    document.title = originalTitle;
  };

  return (
    <div>
      {/* Print button */}
      <div className="flex justify-end mb-4">
        <Button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <PrinterIcon size={18} />
          Imprimer Recu
        </Button>
      </div>
      
      {/* Printable invoice */}
      <div id="print-content" ref={printRef} className="p-6 bg-white rounded-lg shadow-sm print-container">
        {/* Header with logo */}
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <div className="flex items-center">
            <div className="relative h-16 w-32 mr-4">
              <img 
                src="/logo_No_BG.png" 
                alt="Elite Medicale Services" 
                className="object-contain w-full h-auto"
              />
            </div>
            <div>
              <div className="text-xl font-bold text-blue-800">Elite Medicale Services</div>
              <div className="text-sm text-gray-600">Matériel et Services Médicaux</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-800">RECU</div>
            <div className="text-sm text-gray-600">Date: {new Date(saleDate || createdAt).toLocaleDateString('fr-TN')}</div>
            <div className="text-sm text-gray-600">N° Recu: {invoiceNumber || sale.id}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="border p-4 rounded-md bg-gray-50">
            <div className="font-medium text-gray-700 mb-2">Client :</div>
            <div className="text-gray-800">
              {patient ? (
                <>
                  <div className="font-semibold">{patient.firstName} {patient.lastName}</div>
                  {patient.phone && <div>{patient.phone}</div>}
                  {patient.email && <div className="text-sm text-gray-600">{patient.email}</div>}
                  {patient.address && <div className="text-sm text-gray-600">{patient.address}</div>}
                </>
              ) : company ? (
                <>
                  <div className="font-semibold">{company.companyName}</div>
                  {company.phone && <div>{company.phone}</div>}
                  {company.email && <div className="text-sm text-gray-600">{company.email}</div>}
                  {company.address && <div className="text-sm text-gray-600">{company.address}</div>}
                </>
              ) : (
                'Client non spécifié'
              )}
            </div>
          </div>
          <div className="border p-4 rounded-md bg-gray-50">
            <div className="font-medium text-gray-700 mb-1">Détails du Recu :</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-gray-600">N° Recu:</div>
              <div className="text-sm font-medium">{invoiceNumber || sale.id}</div>
              
              <div className="text-sm text-gray-600">Date:</div>
              <div className="text-sm font-medium">{saleDate ? new Date(saleDate).toLocaleDateString('fr-TN') : createdAt ? new Date(createdAt).toLocaleDateString('fr-TN') : '-'}</div>
              
              <div className="text-sm text-gray-600">Statut:</div>
              <div className="text-sm font-medium">
                <span className={`px-2 py-1 rounded-full text-xs ${status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                  {status === 'COMPLETED' ? 'Complété' : status}
                </span>
              </div>
              
              <div className="text-sm text-gray-600">Montant Total:</div>
              <div className="text-sm font-medium">
                {payment ? (
                  <span className="font-bold">{typeof payment.amount === 'number' ? payment.amount.toFixed(3) : parseFloat(String(payment.amount || 0)).toFixed(3)} DT</span>
                ) : (
                  <span>-</span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="font-medium text-gray-700 mb-2">Produits :</div>
          {Array.isArray(items) && items.length > 0 ? (
            <table className="w-full border mt-2">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 text-left font-semibold">Nom</th>
                  <th className="p-3 text-left font-semibold">Quantité</th>
                  <th className="p-3 text-right font-semibold">Prix Unitaire</th>
                  <th className="p-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, idx: number) => (
                  <tr key={idx} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="p-3">{item.product?.name || item.medicalDevice?.name || 'Produit'}</td>
                    <td className="p-3">{item.quantity || 1}</td>
                    <td className="p-3 text-right">{typeof item.unitPrice === 'number' ? item.unitPrice.toFixed(3) : parseFloat(String(item.unitPrice || 0)).toFixed(3)} DT</td>
                    <td className="p-3 text-right font-medium">{typeof item.itemTotal === 'number' ? item.itemTotal.toFixed(3) : parseFloat(String(item.itemTotal || 0)).toFixed(3)} DT</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={2} className="p-3"></td>
                  <td className="p-3 text-right font-semibold">Total:</td>
                  <td className="p-3 text-right font-bold">
                    {payment ? (
                      <span>{typeof payment.amount === 'number' ? payment.amount.toFixed(3) : parseFloat(String(payment.amount || 0)).toFixed(3)} DT</span>
                    ) : (
                      items.reduce((sum, item) => sum + parseFloat(String(item.itemTotal || 0)), 0).toFixed(3) + ' DT'
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="text-gray-500 p-4 border rounded">Aucun produit</div>
          )}
        </div>
        
        <div className="mb-6">
          <div className="font-medium text-gray-700 mb-2">Paiements :</div>
          {payment ? (
            <table className="w-full border mt-2">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 text-left font-semibold">Méthode</th>
                  <th className="p-3 text-left font-semibold">Classification</th>
                  <th className="p-3 text-right font-semibold">Montant</th>
                  <th className="p-3 text-left font-semibold">Date</th>
                  <th className="p-3 text-left font-semibold">Référence</th>
                </tr>
              </thead>
              <tbody>
                {paymentDetails.map((detail: any, idx: number) => (
                  <tr key={idx} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="p-3">{detail.displayMethod || detail.method || '-'}</td>
                    <td className="p-3">{detail.displayClassification || detail.classification || '-'}</td>
                    <td className="p-3 text-right">{typeof detail.amount === 'number' ? detail.amount.toFixed(3) : parseFloat(String(detail.amount || 0)).toFixed(3)} DT</td>
                    <td className="p-3">{detail.createdAt ? new Date(detail.createdAt).toLocaleDateString('fr-TN') : payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('fr-TN') : '-'}</td>
                    <td className="p-3">{detail.reference || sale.invoiceNumber || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-gray-500 p-4 border rounded">Aucun paiement enregistré</div>
          )}
        </div>
        
        {notes && (
          <div className="mb-6">
            <div className="font-medium text-gray-700 mb-2">Notes :</div>
            <div className="text-gray-600 p-3 bg-gray-50 border rounded">
              {typeof notes === 'string' ? notes : JSON.stringify(notes)}
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
          <div className="font-medium mb-1">Elite Médicale Services</div>
          <div>Matériel et Services Médicaux</div>
          <div className="mt-2">Tél: +216 55 820 000 | Email: contact@elitemedicalservices.tn</div>
          <div className="mt-4 text-xs">Recu générée le {new Date().toLocaleDateString('fr-TN')} à {new Date().toLocaleTimeString('fr-TN')}</div>
        </div>
      </div>
    </div>
  );
};

export default SaleInvoice;
