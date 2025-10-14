import React from 'react';

interface Diagnostic {
  patient: string;
  telephone: string;
  resultat: 'Normal' | 'Anormal' | 'En attente';
  technicien: string;
  medecin: string;
  dateInstallation: string;
  dateFin: string;
  remarque?: string;
  appareille: boolean;
}

interface DiagnosticTableProps {
  diagnostics: Diagnostic[];
}

const DiagnosticTable: React.FC<DiagnosticTableProps> = ({ diagnostics }) => {
  const getResultatStyle = (resultat: 'Normal' | 'Anormal' | 'En attente') => {
    switch (resultat) {
      case 'Normal':
        return 'bg-green-100 text-green-800';
      case 'Anormal':
        return 'bg-red-100 text-red-800';
      case 'En attente':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAppareilleStyle = (appareille: boolean) => {
    return appareille ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Résultat</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technicien</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Médecin</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Installation</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Fin</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarque</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Appareillé</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {diagnostics.map((diagnostic, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{diagnostic.patient}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{diagnostic.telephone}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getResultatStyle(diagnostic.resultat)}`}>
                  {diagnostic.resultat}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{diagnostic.technicien}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{diagnostic.medecin}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{diagnostic.dateInstallation}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{diagnostic.dateFin}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{diagnostic.remarque || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getAppareilleStyle(diagnostic.appareille)}`}>
                  {diagnostic.appareille ? 'Oui' : 'Non'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DiagnosticTable;
