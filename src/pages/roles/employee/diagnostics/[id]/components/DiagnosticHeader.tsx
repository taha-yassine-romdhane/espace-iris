import React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, Clock, AlertCircle, CheckCircle, User } from "lucide-react";

interface DiagnosticHeaderProps {
  diagnostic?: any;
}

export function DiagnosticHeader({ diagnostic }: DiagnosticHeaderProps) {
  // Format dates
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "PPP", { locale: fr });
  };

  // Check if result is overdue
  const isResultOverdue = () => {
    if (!diagnostic || !diagnostic.resultDueDate) return false;
    return new Date() > new Date(diagnostic.resultDueDate);
  };

  // Get status badge
  const getStatusBadge = () => {
    if (!diagnostic || !diagnostic.status) return null;
    switch (diagnostic.status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-sm">
            En attente
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-sm">
            Complété
          </Badge>
        );
      case "CANCELED":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200 text-sm">
            Annulé
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 text-sm">
            {diagnostic.status}
          </Badge>
        );
    }
  };

  if (!diagnostic) {
    return (
      <div className="border-b pb-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="text-gray-500">Diagnostic non chargé</div>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-blue-100 bg-blue-50/50">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Diagnostic #{diagnostic.id?.slice(-8)}
            </h1>
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <User className="h-4 w-4" />
              <span>
                Patient: <span className="font-medium">{diagnostic.patient?.firstName} {diagnostic.patient?.lastName}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>
                Créé par: <span className="font-medium">{diagnostic.performedBy ? `${diagnostic.performedBy.firstName} ${diagnostic.performedBy.lastName}` : 'Utilisateur inconnu'}</span>
              </span>
            </div>
          </div>

          <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end">
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge()}
              {diagnostic.followUpRequired && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 text-sm">
                  Suivi requis
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-gray-600">
              <CalendarIcon className="h-4 w-4" />
              <span>
                Résultats attendus: 
                <span className={isResultOverdue() ? "text-red-600 font-medium ml-1" : "font-medium ml-1"}>
                  {formatDate(diagnostic.resultDueDate)}
                </span>
              </span>
            </div>
            
            {isResultOverdue() && (
              <div className="flex items-center text-red-600 mt-1">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span className="text-sm">Résultats en retard</span>
              </div>
            )}
            
            {diagnostic.status === "COMPLETED" && (
              <div className="flex items-center text-green-600 mt-1">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span className="text-sm">Résultats complétés le {formatDate(diagnostic.completedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DiagnosticHeader;
