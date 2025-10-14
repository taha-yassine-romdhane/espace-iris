import React from 'react';

interface Location {
  patient: string;
  numero: string;
  medecin: string;
  appareil: string;
  joursLoues: number;
  joursNonPayes: number;
  dateInstallation: string;
  paiement: string;
  montantRest: number;
  dateEcheance: string;
  coutRevient: number;
  technicien: string;
}

interface LocationTableProps {
  locations: Location[];
}

const LocationTable: React.FC<LocationTableProps> = ({ locations }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Numéro</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Médecin</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Appareil</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jours Loués</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jours Non Payés</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Installation</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paiement</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant Rest.</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Echéance</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coût Revient</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technicien</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {locations.map((location, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{location.patient}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{location.numero}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{location.medecin}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{location.appareil}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  {location.joursLoues} jours
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                  {location.joursNonPayes} jours
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{location.dateInstallation}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{location.paiement}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{location.montantRest} DT</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{location.dateEcheance}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{location.coutRevient} DT</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{location.technicien}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LocationTable;
