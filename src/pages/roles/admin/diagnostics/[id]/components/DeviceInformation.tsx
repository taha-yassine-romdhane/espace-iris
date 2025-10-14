import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, Tag, Barcode, Calendar, MapPin, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface DeviceInformationProps {
  device: any;
}

export function DeviceInformation({ device }: DeviceInformationProps) {
  if (!device) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Information de l&apos;Appareil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 italic">Information appareil non disponible</div>
        </CardContent>
      </Card>
    );
  }

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "PPP", { locale: fr });
  };

  // Check if device is reserved
  const isReserved = device.reservedUntil && new Date(device.reservedUntil) > new Date();

  return (
    <Card>
      <CardHeader className="bg-gray-50 border-b border-gray-100">
        <CardTitle className="text-lg flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-blue-600" />
          Information de l&apos;Appareil
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {device.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {device.status === "ACTIVE" && (
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                  Actif
                </Badge>
              )}
              {device.status === "MAINTENANCE" && (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  En maintenance
                </Badge>
              )}
              {device.status === "INACTIVE" && (
                <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                  Inactif
                </Badge>
              )}
              
              {isReserved && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                  Réservé jusqu&apos;au {formatDate(device.reservedUntil)}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {(device.brand || device.model) && (
              <div className="flex items-start gap-2">
                <Tag className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Marque / Modèle</div>
                  <div className="font-medium">
                    {device.brand} {device.model}
                  </div>
                </div>
              </div>
            )}
            
            {device.serialNumber && (
              <div className="flex items-start gap-2">
                <Barcode className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Numéro de série</div>
                  <div className="font-medium">{device.serialNumber}</div>
                </div>
              </div>
            )}
            
            {device.purchaseDate && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Date d&apos;achat</div>
                  <div className="font-medium">{formatDate(device.purchaseDate)}</div>
                </div>
              </div>
            )}
            
            {device.location && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Emplacement</div>
                  <div className="font-medium">{device.location}</div>
                </div>
              </div>
            )}
          </div>

          {device.maintenanceInfo && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <h4 className="font-medium text-gray-900">Informations de maintenance</h4>
              </div>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{device.maintenanceInfo}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default DeviceInformation;
