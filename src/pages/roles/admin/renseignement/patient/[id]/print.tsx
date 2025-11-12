import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { NextPageWithLayout } from '@/pages/_app';

const PatientPrintPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id, type, images, history } = router.query;

  // Translation helpers
  const translateStatus = (status: string) => {
    const translations: Record<string, string> = {
      'ACTIVE': 'Actif',
      'PENDING': 'En attente',
      'COMPLETED': 'Terminé',
      'CANCELLED': 'Annulé',
      'RETURNED': 'Retourné',
      'OVERDUE': 'En retard',
      'APPROUVE': 'Approuvé',
      'EN_ATTENTE': 'En attente',
      'REFUSE': 'Refusé'
    };
    return translations[status] || status;
  };

  const translateBonType = (type: string) => {
    const translations: Record<string, string> = {
      'VNI': 'VNI',
      'CONCENTRATEUR_OXYGENE': 'Concentrateur Oxygène',
      'CPAP': 'CPAP',
      'BIPAP': 'BiPAP',
      'AUTRE': 'Autre'
    };
    return translations[type] || type;
  };

  const translateCategory = (category: string) => {
    const translations: Record<string, string> = {
      'PREMIERE_INSTALLATION': 'Première Installation',
      'RENOUVELLEMENT': 'Renouvellement',
      'REMPLACEMENT': 'Remplacement'
    };
    return translations[category] || category;
  };

  const translateBillingCycle = (cycle: string) => {
    const translations: Record<string, string> = {
      'DAILY': 'Journalier',
      'WEEKLY': 'Hebdomadaire',
      'MONTHLY': 'Mensuel',
      'YEARLY': 'Annuel'
    };
    return translations[cycle] || cycle;
  };

  const translatePaymentMethod = (method: string) => {
    const translations: Record<string, string> = {
      'CASH': 'Espèces',
      'CHECK': 'Chèque',
      'BANK_TRANSFER': 'Virement Bancaire',
      'CARD': 'Carte Bancaire',
      'CNAM': 'CNAM'
    };
    return translations[method] || method;
  };

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient-print', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/renseignements/${id}`);
      if (!response.ok) throw new Error('Failed to fetch patient');
      return response.json();
    },
    enabled: !!id
  });

  // Don't auto-trigger print - let user decide when to print
  // useEffect(() => {
  //   if (patient && !isLoading) {
  //     setTimeout(() => {
  //       window.print();
  //     }, 1000);
  //   }
  // }, [patient, isLoading]);

  if (isLoading || !patient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du rapport...</p>
        </div>
      </div>
    );
  }

  const renderCompleteReport = () => (
    <div className="space-y-6">
      {/* Patient Info */}
      <section>
        <h2 className="text-xl font-bold mb-4 border-b-2 border-blue-500 pb-2">Informations Patient</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><strong>Nom Complet:</strong> {patient.nom}</div>
          {patient.patientCode && <div><strong>Code Patient:</strong> {patient.patientCode}</div>}
          {patient.cin && <div><strong>CIN:</strong> {patient.cin}</div>}
          {patient.dateNaissance && <div><strong>Date de Naissance:</strong> {format(new Date(patient.dateNaissance), 'dd/MM/yyyy', { locale: fr })}</div>}
          {patient.telephone && <div><strong>Téléphone:</strong> {patient.telephone}</div>}
          {patient.telephoneSecondaire && <div><strong>Téléphone Secondaire:</strong> {patient.telephoneSecondaire}</div>}
          {patient.adresse && <div className="col-span-2"><strong>Adresse:</strong> {patient.adresse}</div>}
        </div>
      </section>

      {/* Medical Info */}
      <section>
        <h2 className="text-xl font-bold mb-4 border-b-2 border-blue-500 pb-2">Informations Médicales</h2>
        <div className="grid grid-cols-2 gap-4">
          {patient.doctorName && <div><strong>Médecin:</strong> {patient.doctorName}</div>}
          {patient.technicianName && <div><strong>Technicien:</strong> {patient.technicianName}</div>}
          {patient.taille && <div><strong>Taille:</strong> {patient.taille} cm</div>}
          {patient.poids && <div><strong>Poids:</strong> {patient.poids} kg</div>}
          {patient.antecedant && <div className="col-span-2"><strong>Antécédents:</strong> {patient.antecedant}</div>}
        </div>
      </section>

      {/* Medical Devices from Rentals */}
      {patient.rentals && patient.rentals.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 border-b-2 border-blue-500 pb-2">Appareils Médicaux</h2>
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Code Appareil</th>
                <th className="border p-2 text-left">Nom de l'Appareil</th>
                <th className="border p-2 text-left">Numéro de Série</th>
                <th className="border p-2 text-left">Type</th>
                <th className="border p-2 text-left">Location Active</th>
              </tr>
            </thead>
            <tbody>
              {patient.rentals
                .filter((rental: any) => rental.medicalDevice)
                .map((rental: any) => (
                  <tr key={rental.id}>
                    <td className="border p-2 font-mono">{rental.medicalDevice.deviceCode || '-'}</td>
                    <td className="border p-2 font-semibold">{rental.medicalDevice.name}</td>
                    <td className="border p-2 font-mono">{rental.medicalDevice.serialNumber || '-'}</td>
                    <td className="border p-2">{rental.medicalDevice.type || '-'}</td>
                    <td className="border p-2">
                      {rental.status === 'ACTIVE' ? (
                        <span className="text-green-600 font-semibold">Oui</span>
                      ) : (
                        <span className="text-gray-500">Non</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Diagnostics */}
      {patient.diagnostics && patient.diagnostics.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 border-b-2 border-blue-500 pb-2">Diagnostics ({patient.diagnostics.length})</h2>
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Date</th>
                <th className="border p-2 text-left">Appareil</th>
                <th className="border p-2 text-left">Résultat</th>
                <th className="border p-2 text-left">Effectué par</th>
              </tr>
            </thead>
            <tbody>
              {patient.diagnostics.map((diag: any) => (
                <tr key={diag.id}>
                  <td className="border p-2">{format(new Date(diag.diagnosticDate), 'dd/MM/yyyy', { locale: fr })}</td>
                  <td className="border p-2">{diag.medicalDevice?.name || 'N/A'}</td>
                  <td className="border p-2">
                    {diag.result ? `IAH: ${diag.result.iah || 'N/A'}, ID: ${diag.result.idValue || 'N/A'}` : 'En attente'}
                  </td>
                  <td className="border p-2">{diag.performedBy ? `${diag.performedBy.firstName} ${diag.performedBy.lastName}` : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Rentals */}
      {patient.rentals && patient.rentals.length > 0 && (
        <section className="page-break-before">
          <h2 className="text-xl font-bold mb-4 border-b-2 border-blue-500 pb-2">Locations ({patient.rentals.length})</h2>
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Code</th>
                <th className="border p-2 text-left">Appareil</th>
                <th className="border p-2 text-left">Début</th>
                <th className="border p-2 text-left">Fin</th>
                <th className="border p-2 text-left">Statut</th>
              </tr>
            </thead>
            <tbody>
              {patient.rentals.map((rental: any) => (
                <tr key={rental.id}>
                  <td className="border p-2">{rental.rentalCode}</td>
                  <td className="border p-2">{rental.medicalDevice?.name}</td>
                  <td className="border p-2">{format(new Date(rental.startDate), 'dd/MM/yyyy', { locale: fr })}</td>
                  <td className="border p-2">{rental.endDate ? format(new Date(rental.endDate), 'dd/MM/yyyy', { locale: fr }) : 'En cours'}</td>
                  <td className="border p-2">{translateStatus(rental.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Sales */}
      {patient.sales && patient.sales.length > 0 && (
        <section className="page-break-before">
          <h2 className="text-xl font-bold mb-4 border-b-2 border-blue-500 pb-2">Ventes ({patient.sales.length})</h2>
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Code</th>
                <th className="border p-2 text-left">Date</th>
                <th className="border p-2 text-left">Montant</th>
                <th className="border p-2 text-left">Articles</th>
              </tr>
            </thead>
            <tbody>
              {patient.sales.map((sale: any) => (
                <tr key={sale.id}>
                  <td className="border p-2">{sale.saleCode || 'N/A'}</td>
                  <td className="border p-2">{format(new Date(sale.saleDate), 'dd/MM/yyyy', { locale: fr })}</td>
                  <td className="border p-2">{Number(sale.totalAmount).toFixed(2)} TND</td>
                  <td className="border p-2">{sale.items?.length || 0} article(s)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Payments */}
      {patient.payments && patient.payments.length > 0 && (
        <section className="page-break-before">
          <h2 className="text-xl font-bold mb-4 border-b-2 border-blue-500 pb-2">Paiements ({patient.payments.length})</h2>
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Code</th>
                <th className="border p-2 text-left">Date</th>
                <th className="border p-2 text-left">Montant</th>
                <th className="border p-2 text-left">Méthode</th>
                <th className="border p-2 text-left">Statut</th>
              </tr>
            </thead>
            <tbody>
              {patient.payments.map((payment: any) => (
                <tr key={payment.id}>
                  <td className="border p-2">{payment.paymentCode}</td>
                  <td className="border p-2">{format(new Date(payment.paymentDate), 'dd/MM/yyyy', { locale: fr })}</td>
                  <td className="border p-2">{Number(payment.amount).toFixed(2)} TND</td>
                  <td className="border p-2">{translatePaymentMethod(payment.method)}</td>
                  <td className="border p-2">{translateStatus(payment.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* CNAM Bonds - Comprehensive Section */}
      {patient.rentals && patient.rentals.some((r: any) => r.cnamBons && r.cnamBons.length > 0) && (
        <section className="page-break-before">
          <h2 className="text-xl font-bold mb-4 border-b-2 border-blue-500 pb-2">Bons CNAM</h2>
          {patient.rentals.map((rental: any) =>
            rental.cnamBons && rental.cnamBons.length > 0 ? (
              <div key={rental.id} className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-blue-600">
                  Location: {rental.rentalCode} - {rental.medicalDevice?.name}
                </h3>

                {rental.cnamBons.map((bond: any) => (
                  <div key={bond.id} className="border rounded p-4 mb-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="col-span-2">
                        <h4 className="font-bold text-md mb-2">Informations du Bon</h4>
                      </div>
                      {bond.bonNumber && <div><strong>Numéro de Bon:</strong> {bond.bonNumber}</div>}
                      {bond.dossierNumber && <div><strong>Numéro de Dossier:</strong> {bond.dossierNumber}</div>}
                      <div><strong>Type:</strong> {translateBonType(bond.bonType)}</div>
                      <div><strong>Catégorie:</strong> {translateCategory(bond.category)}</div>
                      <div><strong>Statut:</strong> {translateStatus(bond.status)}</div>
                      {bond.currentStep && <div><strong>Étape Actuelle:</strong> {bond.currentStep}</div>}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3 border-t pt-3">
                      <div className="col-span-2">
                        <h4 className="font-bold text-md mb-2">Dates</h4>
                      </div>
                      <div><strong>Date de Début:</strong> {bond.startDate ? format(new Date(bond.startDate), 'dd/MM/yyyy', { locale: fr }) : '-'}</div>
                      <div><strong>Date de Fin:</strong> {bond.endDate ? format(new Date(bond.endDate), 'dd/MM/yyyy', { locale: fr }) : '-'}</div>
                      {bond.createdAt && <div><strong>Date de Création:</strong> {format(new Date(bond.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</div>}
                      {bond.coveredMonths && <div><strong>Mois Couverts:</strong> {bond.coveredMonths}</div>}
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t pt-3">
                      <div className="col-span-2">
                        <h4 className="font-bold text-md mb-2">Montants (TND)</h4>
                      </div>
                      {bond.bonAmount && (
                        <div><strong>Montant du Bon:</strong> <span className="font-bold text-green-600">{Number(bond.bonAmount).toFixed(2)} TND</span></div>
                      )}
                      {bond.devicePrice && (
                        <div><strong>Prix de l'Appareil:</strong> {Number(bond.devicePrice).toFixed(2)} TND</div>
                      )}
                      {bond.complementAmount && (
                        <div><strong>Montant Complémentaire:</strong> {Number(bond.complementAmount).toFixed(2)} TND</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : null
          )}
        </section>
      )}
    </div>
  );

  const renderMedicalReport = () => (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-bold mb-4 border-b-2 border-green-500 pb-2">Rapport Médical</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div><strong>Patient:</strong> {patient.nom}</div>
          {patient.patientCode && <div><strong>Code:</strong> {patient.patientCode}</div>}
          {patient.doctorName && <div><strong>Médecin:</strong> {patient.doctorName}</div>}
          {patient.technicianName && <div><strong>Technicien:</strong> {patient.technicianName}</div>}
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {patient.taille && <div><strong>Taille:</strong> {patient.taille} cm</div>}
          {patient.poids && <div><strong>Poids:</strong> {patient.poids} kg</div>}
          {patient.antecedant && <div className="col-span-2"><strong>Antécédents:</strong> {patient.antecedant}</div>}
        </div>
      </section>

      {/* Medical Devices from Rentals */}
      {patient.rentals && patient.rentals.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-3">Appareils Médicaux</h3>
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Code Appareil</th>
                <th className="border p-2 text-left">Nom de l'Appareil</th>
                <th className="border p-2 text-left">Numéro de Série</th>
                <th className="border p-2 text-left">Type</th>
                <th className="border p-2 text-left">Statut</th>
              </tr>
            </thead>
            <tbody>
              {patient.rentals
                .filter((rental: any) => rental.medicalDevice)
                .map((rental: any) => (
                  <tr key={rental.id}>
                    <td className="border p-2 font-mono">{rental.medicalDevice.deviceCode || '-'}</td>
                    <td className="border p-2 font-semibold">{rental.medicalDevice.name}</td>
                    <td className="border p-2 font-mono">{rental.medicalDevice.serialNumber || '-'}</td>
                    <td className="border p-2">{rental.medicalDevice.type || '-'}</td>
                    <td className="border p-2">
                      {rental.status === 'ACTIVE' ? (
                        <span className="text-green-600 font-semibold">Actif</span>
                      ) : (
                        <span className="text-gray-500">{translateStatus(rental.status)}</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      )}

      {patient.diagnostics && patient.diagnostics.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-3">Historique des Diagnostics</h3>
          {patient.diagnostics.map((diag: any) => (
            <div key={diag.id} className="border p-4 mb-4 rounded">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Date:</strong> {format(new Date(diag.diagnosticDate), 'dd/MM/yyyy HH:mm', { locale: fr })}</div>
                <div><strong>Appareil:</strong> {diag.medicalDevice?.name || 'N/A'}</div>
                {diag.result && (
                  <>
                    <div><strong>IAH:</strong> {diag.result.iah || 'N/A'}</div>
                    <div><strong>ID:</strong> {diag.result.idValue || 'N/A'}</div>
                    <div className="col-span-2"><strong>Remarque:</strong> {diag.result.remarque || 'Aucune'}</div>
                  </>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {patient.devices && patient.devices.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-3">Appareils Médicaux</h3>
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Nom</th>
                <th className="border p-2 text-left">S/N</th>
                <th className="border p-2 text-left">Type</th>
                <th className="border p-2 text-left">Source</th>
              </tr>
            </thead>
            <tbody>
              {patient.devices.map((device: any, idx: number) => (
                <tr key={idx}>
                  <td className="border p-2">{device.name}</td>
                  <td className="border p-2">{device.serialNumber || 'N/A'}</td>
                  <td className="border p-2">{device.type || 'N/A'}</td>
                  <td className="border p-2">{device.source === 'rental' ? 'Location' : 'Vente'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );

  const renderFinancialReport = () => (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-bold mb-4 border-b-2 border-yellow-500 pb-2">Rapport Financier</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div><strong>Patient:</strong> {patient.nom}</div>
          {patient.patientCode && <div><strong>Code:</strong> {patient.patientCode}</div>}
        </div>
      </section>

      {/* Summary */}
      <section className="bg-gray-50 p-4 rounded">
        <h3 className="text-lg font-bold mb-3">Résumé Financier</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {patient.sales?.reduce((sum: number, s: any) => sum + Number(s.totalAmount || 0), 0).toFixed(2)} TND
            </div>
            <div className="text-sm text-gray-600">Total Ventes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {patient.payments?.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0).toFixed(2)} TND
            </div>
            <div className="text-sm text-gray-600">Total Paiements</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {patient.rentals?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Locations Actives</div>
          </div>
        </div>
      </section>

      {patient.sales && patient.sales.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-3">Ventes</h3>
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Code</th>
                <th className="border p-2 text-left">Date</th>
                <th className="border p-2 text-left">Montant</th>
                <th className="border p-2 text-left">Statut Paiement</th>
              </tr>
            </thead>
            <tbody>
              {patient.sales.map((sale: any) => (
                <tr key={sale.id}>
                  <td className="border p-2">{sale.saleCode}</td>
                  <td className="border p-2">{format(new Date(sale.saleDate), 'dd/MM/yyyy', { locale: fr })}</td>
                  <td className="border p-2 font-bold">{Number(sale.totalAmount).toFixed(2)} TND</td>
                  <td className="border p-2">{sale.payment?.status || 'En attente'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {patient.payments && patient.payments.length > 0 && (
        <section className="page-break-before">
          <h3 className="text-lg font-bold mb-3">Paiements</h3>
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Code</th>
                <th className="border p-2 text-left">Date</th>
                <th className="border p-2 text-left">Montant</th>
                <th className="border p-2 text-left">Méthode</th>
                <th className="border p-2 text-left">Statut</th>
              </tr>
            </thead>
            <tbody>
              {patient.payments.map((payment: any) => (
                <tr key={payment.id}>
                  <td className="border p-2">{payment.paymentCode}</td>
                  <td className="border p-2">{format(new Date(payment.paymentDate), 'dd/MM/yyyy', { locale: fr })}</td>
                  <td className="border p-2 font-bold">{Number(payment.amount).toFixed(2)} TND</td>
                  <td className="border p-2">{payment.method}</td>
                  <td className="border p-2">{payment.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );

  const renderReport = () => {
    switch (type) {
      case 'complete':
        return renderCompleteReport();
      case 'medical':
        return renderMedicalReport();
      case 'financial':
        return renderFinancialReport();
      case 'rentals':
      case 'sales':
      case 'diagnostics':
      case 'cnam':
      case 'history':
        return renderCompleteReport(); // Fallback for now
      default:
        return renderCompleteReport();
    }
  };

  return (
    <div className="print-container">
      <style jsx global>{`
        @media print {
          /* A4 page setup */
          @page {
            size: A4;
            margin: 1cm 1.5cm;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            font-size: 9pt;
            line-height: 1.3;
          }

          .page-break-before { page-break-before: always; }

          /* Hide sidebar and navigation elements */
          nav, aside, header, .sidebar, [role="navigation"], [class*="sidebar"], [class*="Sidebar"] {
            display: none !important;
          }

          /* Make main content full width */
          main, .main-content, [role="main"] {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Compact print container */
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Smaller headings */
          h1 { font-size: 18pt !important; margin-bottom: 6pt !important; }
          h2 { font-size: 13pt !important; margin-bottom: 5pt !important; margin-top: 8pt !important; padding-bottom: 3pt !important; }
          h3 { font-size: 11pt !important; margin-bottom: 4pt !important; margin-top: 6pt !important; }

          /* Compact sections */
          section {
            margin-bottom: 10pt !important;
          }

          /* Smaller grid spacing */
          .grid {
            gap: 6pt !important;
          }

          /* Compact grid items */
          .grid > div {
            font-size: 8.5pt !important;
            line-height: 1.2 !important;
          }

          /* Smaller tables */
          table {
            font-size: 8pt !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }

          th, td {
            padding: 3pt 5pt !important;
            border: 0.5pt solid #ddd !important;
            line-height: 1.2 !important;
          }

          th {
            font-size: 8.5pt !important;
            font-weight: 600 !important;
            background-color: #f3f4f6 !important;
          }

          /* Compact summary boxes */
          .bg-gray-50, .bg-blue-50, .bg-yellow-50 {
            padding: 6pt !important;
            margin-bottom: 8pt !important;
          }

          .text-2xl {
            font-size: 14pt !important;
          }

          .text-xl {
            font-size: 12pt !important;
          }

          .text-lg {
            font-size: 10pt !important;
          }

          .text-sm {
            font-size: 7.5pt !important;
          }

          /* Compact borders */
          .border-b-4 {
            border-bottom-width: 2pt !important;
            padding-bottom: 4pt !important;
            margin-bottom: 8pt !important;
          }

          .border-b-2 {
            border-bottom-width: 1pt !important;
            padding-bottom: 3pt !important;
          }

          /* Compact spacing utilities */
          .mb-8 { margin-bottom: 8pt !important; }
          .mb-6 { margin-bottom: 6pt !important; }
          .mb-4 { margin-bottom: 4pt !important; }
          .mb-3 { margin-bottom: 3pt !important; }
          .mb-2 { margin-bottom: 2pt !important; }
          .mt-8 { margin-top: 8pt !important; }
          .mt-6 { margin-top: 6pt !important; }
          .mt-4 { margin-top: 4pt !important; }
          .pt-4 { padding-top: 4pt !important; }
          .pb-4 { padding-bottom: 4pt !important; }
          .p-4 { padding: 4pt !important; }

          /* Compact strong/bold text */
          strong {
            font-weight: 600 !important;
          }

          /* Footer */
          .text-center.text-sm {
            font-size: 7pt !important;
            margin-top: 8pt !important;
            padding-top: 4pt !important;
          }
        }

        @media screen {
          .print-container { max-width: 1200px; margin: 0 auto; padding: 2rem; background: white; }
        }

        /* Global styles */
        body {
          font-family: Arial, sans-serif;
        }
      `}</style>

      {/* Header */}
      <div className="mb-8 pb-4 border-b-4 border-blue-500">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-blue-600 mb-2">Elite Médicale Services</h1>
            <p className="text-gray-600">Rapport Patient</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <div>Date d'impression: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}</div>
            <div>Type: {type === 'complete' ? 'Complet' : type === 'medical' ? 'Médical' : type === 'financial' ? 'Financier' : 'Standard'}</div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {renderReport()}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
        <p>Document confidentiel - Elite Médicale Services © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
};

// Disable layout for this page
PatientPrintPage.getLayout = (page) => page;

export default PatientPrintPage;
