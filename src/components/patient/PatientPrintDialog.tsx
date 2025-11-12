import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FileText,
  Printer,
  Download,
  ClipboardList,
  Receipt,
  Calendar,
  Activity,
  Package,
  CreditCard,
  Shield
} from 'lucide-react';
import { useRouter } from 'next/router';

interface PatientPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
}

type ReportType =
  | 'complete'
  | 'medical'
  | 'financial'
  | 'rentals'
  | 'sales'
  | 'diagnostics'
  | 'cnam'
  | 'history';

interface ReportOption {
  id: ReportType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const reportOptions: ReportOption[] = [
  {
    id: 'complete',
    label: 'Rapport Complet',
    description: 'Toutes les informations du patient (CV complet)',
    icon: <FileText className="h-5 w-5" />
  },
  {
    id: 'medical',
    label: 'Rapport Médical',
    description: 'Informations médicales, diagnostics et dispositifs',
    icon: <Activity className="h-5 w-5" />
  },
  {
    id: 'financial',
    label: 'Rapport Financier',
    description: 'Ventes, paiements, factures et soldes',
    icon: <CreditCard className="h-5 w-5" />
  },
  {
    id: 'rentals',
    label: 'Rapport des Locations',
    description: 'Historique complet des locations et périodes',
    icon: <Package className="h-5 w-5" />
  },
  {
    id: 'sales',
    label: 'Rapport des Ventes',
    description: 'Historique des ventes et articles achetés',
    icon: <Receipt className="h-5 w-5" />
  },
  {
    id: 'diagnostics',
    label: 'Rapport des Diagnostics',
    description: 'Tous les diagnostics et résultats',
    icon: <ClipboardList className="h-5 w-5" />
  },
  {
    id: 'cnam',
    label: 'Rapport CNAM',
    description: 'Bons CNAM, remboursements et dossiers',
    icon: <Shield className="h-5 w-5" />
  },
  {
    id: 'history',
    label: 'Historique des Modifications',
    description: 'Journal des changements et actions',
    icon: <Calendar className="h-5 w-5" />
  }
];

export const PatientPrintDialog: React.FC<PatientPrintDialogProps> = ({
  open,
  onOpenChange,
  patientId,
  patientName
}) => {
  const router = useRouter();
  const [selectedReport, setSelectedReport] = useState<ReportType>('complete');
  const [includeImages, setIncludeImages] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePrint = async () => {
    setIsGenerating(true);
    try {
      // Navigate to print page with query parameters
      const printUrl = `/roles/admin/renseignement/patient/${patientId}/print?type=${selectedReport}&images=${includeImages}&history=${includeHistory}`;

      // Open in new window for printing
      const printWindow = window.open(printUrl, '_blank');

      if (printWindow) {
        // Wait for the page to load then trigger print
        printWindow.addEventListener('load', () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
      onOpenChange(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      // Call API to generate PDF
      const response = await fetch(`/api/patients/${patientId}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: selectedReport,
          includeImages,
          includeHistory
        })
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${patientName.replace(/\s+/g, '_')}_${selectedReport}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setIsGenerating(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Imprimer le Rapport du Patient
          </DialogTitle>
          <DialogDescription>
            Sélectionnez le type de rapport à générer pour <strong>{patientName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Report Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Type de Rapport</Label>
            <RadioGroup value={selectedReport} onValueChange={(value) => setSelectedReport(value as ReportType)}>
              <div className="space-y-2">
                {reportOptions.map((option) => (
                  <div
                    key={option.id}
                    className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors cursor-pointer hover:bg-gray-50 ${
                      selectedReport === option.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedReport(option.id)}
                  >
                    <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                    <div className="flex-1">
                      <Label
                        htmlFor={option.id}
                        className="flex items-center gap-2 font-semibold cursor-pointer"
                      >
                        {option.icon}
                        {option.label}
                      </Label>
                      <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base font-semibold">Options d'Impression</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-images"
                checked={includeImages}
                onCheckedChange={(checked) => setIncludeImages(checked as boolean)}
              />
              <Label
                htmlFor="include-images"
                className="text-sm font-normal cursor-pointer"
              >
                Inclure les images et logos
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-history"
                checked={includeHistory}
                onCheckedChange={(checked) => setIncludeHistory(checked as boolean)}
              />
              <Label
                htmlFor="include-history"
                className="text-sm font-normal cursor-pointer"
              >
                Inclure l'historique des modifications
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Annuler
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isGenerating ? 'Génération...' : 'Télécharger PDF'}
          </Button>
          <Button
            onClick={handlePrint}
            disabled={isGenerating}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            {isGenerating ? 'Génération...' : 'Imprimer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
