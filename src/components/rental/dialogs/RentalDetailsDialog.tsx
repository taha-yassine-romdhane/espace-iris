import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar,
  User,
  Building2,
  Package,
  CreditCard,
  FileText,
  Clock,
  MapPin,
  Phone,
  Mail,
  Heart,
  Activity,
  Stethoscope,
} from "lucide-react";

interface RentalDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rental: any;
}

export function RentalDetailsDialog({ isOpen, onClose, rental }: RentalDetailsDialogProps) {
  if (!rental) return null;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      DRAFT: { label: "Brouillon", className: "bg-gray-100 text-gray-800" },
      ACTIVE: { label: "Active", className: "bg-green-100 text-green-800" },
      PENDING: { label: "En attente", className: "bg-yellow-100 text-yellow-800" },
      COMPLETED: { label: "Terminée", className: "bg-blue-100 text-blue-800" },
      CANCELLED: { label: "Annulée", className: "bg-red-100 text-red-800" },
    };
    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd MMMM yyyy", { locale: fr });
    } catch {
      return "-";
    }
  };

  const formatDateTime = (date: string | Date | null) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd/MM/yyyy à HH:mm", { locale: fr });
    } catch {
      return "-";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Détails de la Location #{rental.id?.slice(-8).toUpperCase()}
          </DialogTitle>
          <DialogDescription>
            Créée le {formatDateTime(rental.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status and Duration */}
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Statut:</span>
              {getStatusBadge(rental.status)}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Durée:</span> {rental.rentalDuration || "-"} mois
            </div>
          </div>

          {/* Client Information */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              {rental.patient ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
              Informations Client
            </h3>
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              {rental.patient ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Nom:</span>
                    <span>{rental.patient.firstName} {rental.patient.lastName}</span>
                  </div>
                  {rental.patient.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{rental.patient.phone}</span>
                    </div>
                  )}
                  {rental.patient.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{rental.patient.email}</span>
                    </div>
                  )}
                  {rental.patient.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{rental.patient.address}</span>
                    </div>
                  )}
                </>
              ) : rental.company ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Entreprise:</span>
                    <span>{rental.company.companyName}</span>
                  </div>
                  {rental.company.contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{rental.company.contactPhone}</span>
                    </div>
                  )}
                  {rental.company.contactEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{rental.company.contactEmail}</span>
                    </div>
                  )}
                </>
              ) : (
                <span className="text-gray-500">Aucune information client</span>
              )}
            </div>
          </div>

          <Separator />

          {/* Products */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produits Loués
            </h3>
            <div className="space-y-2">
              {rental.products && rental.products.length > 0 ? (
                rental.products.map((product: any, index: number) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {product.deviceType?.includes("CPAP") && <Activity className="h-4 w-4 text-blue-500" />}
                      {product.deviceType?.includes("VNI") && <Heart className="h-4 w-4 text-red-500" />}
                      {product.deviceType?.includes("CONCENTRATEUR") && <Stethoscope className="h-4 w-4 text-green-500" />}
                      <div>
                        <div className="font-medium">{product.name || product.deviceType || "Produit"}</div>
                        {product.serialNumber && (
                          <div className="text-xs text-gray-500">S/N: {product.serialNumber}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{product.rentalPrice || 0} TND</div>
                      <div className="text-xs text-gray-500">par mois</div>
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-gray-500">Aucun produit</span>
              )}
            </div>
          </div>

          <Separator />

          {/* Financial Information */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Informations Financières
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Montant Total</div>
                <div className="text-xl font-bold text-green-700">
                  {(() => {
                    // Calculate total from rental periods if available
                    const rentalPeriods = rental.rentalPeriods || [];
                    if (rentalPeriods.length > 0) {
                      const total = rentalPeriods.reduce((sum: number, period: any) => {
                        return sum + Number(period.amount || 0);
                      }, 0);
                      return total.toFixed(2);
                    }
                    // Fallback to configuration
                    return Number(rental.configuration?.totalPaymentAmount || 0).toFixed(2);
                  })()} TND
                </div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Dépôt de Garantie</div>
                <div className="text-xl font-bold text-orange-700">
                  {(() => {
                    // Check payment with deposit flag first
                    const payment = rental.payment;
                    if (payment && payment.isDepositPayment) {
                      return Number(payment.amount || 0).toFixed(2);
                    }
                    // Fallback to configuration
                    return Number(rental.configuration?.depositAmount || 0).toFixed(2);
                  })()} TND
                </div>
              </div>
            </div>
            
            {/* Payment Configuration */}
            {rental.configuration && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Mode de paiement:</span>
                  <span className="font-medium">{rental.configuration.paymentMode || "-"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Méthode de dépôt:</span>
                  <span className="font-medium">{rental.configuration.depositMethod || "-"}</span>
                </div>
                {rental.configuration.paymentPeriods && rental.configuration.paymentPeriods.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm text-gray-600 mb-1">Périodes de paiement:</div>
                    <div className="space-y-1">
                      {rental.configuration.paymentPeriods.map((period: any, index: number) => (
                        <div key={index} className="text-xs bg-gray-100 p-2 rounded flex justify-between">
                          <span>Période {index + 1}</span>
                          <span className="font-medium">{period.amount} TND</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Dates */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dates Importantes
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Date de début</div>
                <div className="font-medium">{formatDate(rental.startDate)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Date de fin prévue</div>
                <div className="font-medium">{formatDate(rental.endDate)}</div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {rental.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </h3>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm">{rental.notes}</p>
                </div>
              </div>
            </>
          )}

          {/* CNAM Information if exists */}
          {rental.cnamBonds && rental.cnamBonds.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Prises en Charge CNAM
                </h3>
                <div className="space-y-2">
                  {rental.cnamBonds.map((bond: any, index: number) => (
                    <div key={index} className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex justify-between">
                        <span className="font-medium">PEC #{bond.bondNumber}</span>
                        <Badge className="bg-blue-100 text-blue-800">
                          {bond.totalAmount} TND
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Du {formatDate(bond.startDate)} au {formatDate(bond.endDate)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}