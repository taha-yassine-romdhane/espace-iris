import { AlertCircle, AlertTriangle, Shield, Database } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function WarningAlert() {
  return (
    <>
      <Separator className="my-6" />
      
      <div className="space-y-4">
        {/* Critical Warning */}
        <div className="bg-red-50 p-4 rounded-md flex items-start gap-3 border border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">⚠️ ATTENTION CRITIQUE</h3>
            <p className="text-red-700 text-sm mt-1">
              La restauration d'une sauvegarde <strong>REMPLACERA DÉFINITIVEMENT</strong> toutes 
              les données actuelles de la base de données. Cette action est <strong>IRRÉVERSIBLE</strong>.
            </p>
          </div>
        </div>

        {/* Security Recommendations */}
        <div className="bg-orange-50 p-4 rounded-md flex items-start gap-3 border border-orange-200">
          <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-orange-800">Recommandations de sécurité</h3>
            <ul className="text-orange-700 text-sm mt-2 ml-4 list-disc space-y-1">
              <li>Créez toujours une sauvegarde avant de restaurer</li>
              <li>Vérifiez que le fichier de sauvegarde est fiable et récent</li>
              <li>Informez tous les utilisateurs avant la restauration</li>
              <li>Testez la restauration sur un environnement de test d'abord</li>
            </ul>
          </div>
        </div>

        {/* Data Information */}
        <div className="bg-blue-50 p-4 rounded-md flex items-start gap-3 border border-blue-200">
          <Database className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">Données concernées par la restauration</h3>
            <div className="text-blue-700 text-sm mt-2">
              • <strong>Patients</strong> et leurs informations médicales<br/>
              • <strong>Sociétés</strong> et contacts professionnels<br/>
              • <strong>Appareils médicaux</strong> et paramètres associés<br/>
              • <strong>Paramètres système</strong> et configuration globale
            </div>
          </div>
        </div>
      </div>
    </>
  );
}