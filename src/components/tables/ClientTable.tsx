import React from 'react';

interface Client {
  nom: string;
  numero: string;
  medecin: string;
  appareil: string;
  accessoires: string;
  pieces: string;
  paiement: string;
  montantRest: number;
  dateEcheance: string;
  coutRevient: number;
  dateVente: string;
  technicien: string;
}

interface ClientTableProps {
  clients: Client[];
}

const ClientTable: React.FC<ClientTableProps> = ({ clients }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Numéro</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Médecin</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Appareil (Qté)</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accessoires (Qté)</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pièces (Qté)</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paiement</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant Rest.</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Echéance</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coût Revient</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Vente</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technicien</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {clients.map((client, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.nom}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.numero}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.medecin}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.appareil}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.accessoires}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.pieces}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.paiement}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.montantRest} DT</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.dateEcheance}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.coutRevient} DT</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.dateVente}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.technicien}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClientTable;
