import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BookOpen,
  CheckCircle,
  AlertCircle,
  Calendar,
  CreditCard,
  Shield,
  FileText,
  Users,
  Package,
  Clock,
  TrendingUp,
  Info
} from 'lucide-react';

export function RentalWorkflowGuideDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BookOpen className="h-4 w-4" />
          Guide de Location
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-6 w-6 text-blue-600" />
            Guide Complet de Gestion des Locations
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="workflow" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="workflow">Flux de Travail</TabsTrigger>
            <TabsTrigger value="example">Exemple Pratique</TabsTrigger>
            <TabsTrigger value="cnam">Gestion CNAM</TabsTrigger>
            <TabsTrigger value="tips">Conseils</TabsTrigger>
          </TabsList>

          {/* WORKFLOW TAB */}
          <TabsContent value="workflow" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(90vh-180px)] pr-4">
              <div className="space-y-6">
                {/* Introduction */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">Vue d'ensemble</h3>
                      <p className="text-sm text-blue-700">
                        Ce guide vous explique le processus complet de création d'une location avec paiements mixtes (CNAM + Espèces).
                        Le système gère automatiquement les périodes de location et les paiements associés.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 1 */}
                <div className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Package className="h-5 w-5 text-green-600" />
                        Créer la Location
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">Démarrer une nouvelle location avec toutes les informations de base</p>
                    </div>
                  </div>

                  <div className="ml-11 space-y-3">
                    <div className="bg-slate-50 rounded p-3 text-sm space-y-2">
                      <div className="font-medium text-slate-700">Informations Requises:</div>
                      <ul className="space-y-1 text-slate-600">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span><strong>Client:</strong> Sélectionner le patient depuis la base de données</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span><strong>Appareil Médical:</strong> Choisir le type d'équipement (ex: Concentrateur d'Oxygène)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span><strong>Dates:</strong> Date début et date fin de la location</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span><strong>Périodes de Paiement:</strong> Définir toutes les périodes (y compris les périodes gap)</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                        <div>
                          <strong className="text-red-900">⚠️ Périodes Gap (Jours de Retard CNAM):</strong>
                          <p className="text-red-800 mt-1">
                            <strong>Définition:</strong> Quand un bon CNAM expire et le patient présente le nouveau bon en retard. L'appareil RESTE avec le patient mais il paie <strong>plein tarif (300 TND/mois)</strong> pour les jours gap car la CNAM ne couvre plus.
                          </p>
                          <p className="text-red-700 mt-2 text-xs">
                            <strong>Exemple:</strong> Bon #1 expire le 31 Mars. Patient présente Bon #2 le 30 Avril → 30 jours gap à 300 TND. Cochez "isGapPeriod = true", indiquez "gapDays = 30" et raison "Retard présentation CNAM Bon #2".
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div>
                          <strong className="text-amber-900">Rappels de Renouvellement:</strong>
                          <p className="text-amber-700 mt-1">
                            Configurez les rappels (30 jours avant expiration recommandé) pour éviter que les patients présentent leurs bons CNAM en retard et paient plein tarif.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div>
                          <strong className="text-blue-900">Important:</strong>
                          <p className="text-blue-700 mt-1">
                            La location doit être créée en PREMIER, avant le bon CNAM. Le système génère automatiquement un code de location (ex: LOC-2025-0123).
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        Créer le Bon CNAM
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">Ajouter le bon CNAM et le lier à la location créée</p>
                    </div>
                  </div>

                  <div className="ml-11 space-y-3">
                    <div className="bg-slate-50 rounded p-3 text-sm space-y-2">
                      <div className="font-medium text-slate-700">Champs à Remplir:</div>
                      <ul className="space-y-1 text-slate-600">
                        <li><strong>Numéro BL:</strong> Auto-généré (ex: BL-2025-0042)</li>
                        <li><strong>Numéro Dossier:</strong> Manuel (ex: DOSS-LOC-0042)</li>
                        <li><strong>Patient:</strong> Sélectionner le même patient</li>
                        <li><strong>Location:</strong> 🔴 <strong className="text-red-600">Sélectionner la location créée (LOC-2025-0123)</strong></li>
                        <li><strong>Type:</strong> Type d'appareil (ex: CONCENTRATEUR_OXYGENE)</li>
                        <li><strong>Dates:</strong> Période couverte par la CNAM (ex: 3 mois)</li>
                        <li><strong>Tarifs:</strong> Tarif CNAM/mois (190 TND) + Tarif appareil/mois (300 TND)</li>
                      </ul>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <div className="text-xs text-green-700 font-medium mb-1">Montant Bon CNAM</div>
                        <div className="text-lg font-bold text-green-800">570 TND</div>
                        <div className="text-xs text-green-600">190 TND × 3 mois</div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <div className="text-xs text-blue-700 font-medium mb-1">Prix Total Appareil</div>
                        <div className="text-lg font-bold text-blue-800">900 TND</div>
                        <div className="text-xs text-blue-600">300 TND × 3 mois</div>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded p-3">
                        <div className="text-xs text-orange-700 font-medium mb-1">Complément Patient</div>
                        <div className="text-lg font-bold text-orange-800">330 TND</div>
                        <div className="text-xs text-orange-600">110 TND × 3 mois</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                      3
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-purple-600" />
                        Lier le Bon aux Périodes
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">Associer le bon CNAM aux 3 premières périodes</p>
                    </div>
                  </div>

                  <div className="ml-11 space-y-3">
                    <div className="bg-slate-50 rounded p-3 text-sm">
                      <p className="text-slate-700 mb-2">Dans l'onglet <Badge variant="outline">Périodes</Badge>, éditer chaque période:</p>
                      <ul className="space-y-1 text-slate-600">
                        <li><strong>Période 1-3:</strong> Sélectionner le bon CNAM (BL-2025-0042)</li>
                        <li><strong>CNAM Attendu:</strong> 190 TND</li>
                        <li><strong>Patient Attendu:</strong> 110 TND (complément)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">
                      4
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-indigo-600" />
                        Enregistrer les Paiements
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">Créer les enregistrements de paiement pour chaque période</p>
                    </div>
                  </div>

                  <div className="ml-11 space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <div className="font-medium text-green-900 mb-2">Mois 1-3: Paiements Bon CNAM #1</div>
                      <div className="space-y-2 text-sm text-green-800">
                        <div className="flex justify-between">
                          <span>1. Paiement Complément Patient:</span>
                          <strong>110 TND (Espèces)</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>2. Paiement CNAM:</span>
                          <strong>190 TND (CNAM)</strong>
                        </div>
                        <div className="flex justify-between border-t border-green-300 pt-2 mt-2">
                          <span>Total par mois:</span>
                          <strong>300 TND</strong>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded p-3">
                      <div className="font-medium text-amber-900 mb-2">Mois 4: Période Gap</div>
                      <div className="text-sm text-amber-800">
                        <AlertCircle className="h-4 w-4 inline mr-2" />
                        Patient hospitalisé - Aucun paiement requis
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <div className="font-medium text-green-900 mb-2">Mois 5-7: Paiements Bon CNAM #2</div>
                      <div className="space-y-2 text-sm text-green-800">
                        <div className="flex justify-between">
                          <span>1. Paiement Complément Patient:</span>
                          <strong>110 TND (Espèces)</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>2. Paiement CNAM:</span>
                          <strong>190 TND (CNAM)</strong>
                        </div>
                        <div className="flex justify-between border-t border-green-300 pt-2 mt-2">
                          <span>Total par mois:</span>
                          <strong>300 TND</strong>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <div className="font-medium text-blue-900 mb-2">Mois 8: Paiement Patient Complet</div>
                      <div className="space-y-2 text-sm text-blue-800">
                        <div className="flex justify-between">
                          <span>Paiement Patient Intégral:</span>
                          <strong>300 TND (Espèces)</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
                      5
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                        Finaliser la Location
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">Mettre à jour le statut et vérifier la complétion</p>
                    </div>
                  </div>

                  <div className="ml-11 space-y-3">
                    <div className="bg-slate-50 rounded p-3 text-sm space-y-2">
                      <div className="font-medium text-slate-700">Actions Finales:</div>
                      <ul className="space-y-1 text-slate-600">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Mettre à jour le statut des bons CNAM #1 et #2 à <Badge>TERMINE</Badge></span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Vérifier que toutes les 7 périodes payées sont complètes</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Confirmer la période gap (Mois 4) avec isGapPeriod = true</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Confirmer le total: 2,100 TND (7 mois × 300 TND)</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Résumé du Flux de Travail
                  </h3>
                  <div className="grid grid-cols-5 gap-2 text-xs">
                    <div className="bg-white rounded p-2 text-center">
                      <div className="font-bold text-green-700">1</div>
                      <div className="text-slate-600">Créer Location</div>
                    </div>
                    <div className="bg-white rounded p-2 text-center">
                      <div className="font-bold text-blue-700">2</div>
                      <div className="text-slate-600">Créer Bon CNAM</div>
                    </div>
                    <div className="bg-white rounded p-2 text-center">
                      <div className="font-bold text-purple-700">3</div>
                      <div className="text-slate-600">Lier Périodes</div>
                    </div>
                    <div className="bg-white rounded p-2 text-center">
                      <div className="font-bold text-indigo-700">4</div>
                      <div className="text-slate-600">Paiements</div>
                    </div>
                    <div className="bg-white rounded p-2 text-center">
                      <div className="font-bold text-emerald-700">5</div>
                      <div className="text-slate-600">Finaliser</div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* EXAMPLE TAB */}
          <TabsContent value="example" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(90vh-180px)] pr-4">
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Cas Pratique: M. Mohamed Ben Ali
                  </h3>
                  <p className="text-sm text-blue-700">
                    Patient tunisien ayant besoin d'un concentrateur d'oxygène pour 8 mois. CNAM couvre 6 mois sur 2 bons (3 mois chacun). Le patient a présenté le 2ème bon avec 1 mois de retard → 1 mois gap facturé plein tarif (appareil reste avec le patient) + 1 mois final patient.
                  </p>
                </div>

                {/* Scenario Details */}
                <div className="border rounded-lg p-4 bg-white">
                  <h4 className="font-semibold mb-3">Détails de la Location</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Patient:</span>
                        <strong>Mohamed Ben Ali</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Appareil:</span>
                        <strong>Concentrateur O₂</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Durée Totale:</span>
                        <strong>8 mois (1 mois gap plein tarif)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Période:</span>
                        <strong>Jan - Août 2025</strong>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tarif/mois:</span>
                        <strong>300 TND</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">CNAM (Bon 1):</span>
                        <strong>3 mois (190 TND/mois)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">CNAM (Bon 2):</span>
                        <strong>3 mois (190 TND/mois)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total location:</span>
                        <strong className="text-lg text-blue-600">2,400 TND</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Month by Month Breakdown */}
                <div className="border rounded-lg p-4 bg-white">
                  <h4 className="font-semibold mb-3">Détail Mensuel des Paiements</h4>
                  <div className="space-y-3">
                    {/* Month 1-3: CNAM Bon 1 */}
                    {[1, 2, 3].map((month) => (
                      <div key={month} className="bg-green-50 border border-green-200 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-green-900">
                            Mois {month} (Jan-Mars) - Bon CNAM #1
                          </div>
                          <Badge variant="outline" className="bg-green-100 text-green-700">
                            CNAM + Patient
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <div className="text-xs text-slate-600">CNAM</div>
                            <div className="font-semibold text-green-700">190 TND</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-600">Patient</div>
                            <div className="font-semibold text-orange-700">110 TND</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-600">Total</div>
                            <div className="font-bold text-slate-900">300 TND</div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Month 4: Gap Period */}
                    <div className="bg-red-50 border-2 border-red-300 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-red-900">
                          Mois 4 (Avril) - Période Gap ⚠️
                        </div>
                        <Badge variant="outline" className="bg-red-100 text-red-700">
                          Plein Tarif
                        </Badge>
                      </div>
                      <div className="text-sm text-red-800 space-y-1">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span><strong>Raison:</strong> Bon CNAM #1 expiré le 31 Mars - Patient a présenté Bon #2 avec 30 jours de retard</span>
                        </div>
                        <div className="ml-6 text-xs bg-red-100 border border-red-200 rounded p-2 mt-2">
                          <strong>⚠️ IMPORTANT:</strong> L'appareil reste AVEC le patient mais la CNAM ne couvre plus. Le patient doit payer le plein tarif (300 TND) pour ce mois de retard. C'est pourquoi les rappels de renouvellement sont essentiels!
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-xs text-slate-600">CNAM</div>
                          <div className="font-semibold text-red-600">0 TND</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-600">Patient</div>
                          <div className="font-semibold text-red-700">300 TND</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-600">Total</div>
                          <div className="font-bold text-red-900">300 TND</div>
                        </div>
                      </div>
                    </div>

                    {/* Month 5-7: CNAM Bon 2 */}
                    {[5, 6, 7].map((month) => (
                      <div key={month} className="bg-green-50 border border-green-200 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-green-900">
                            Mois {month} ({month === 5 ? 'Mai' : month === 6 ? 'Juin' : 'Juillet'}) - Bon CNAM #2
                          </div>
                          <Badge variant="outline" className="bg-green-100 text-green-700">
                            CNAM + Patient
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <div className="text-xs text-slate-600">CNAM</div>
                            <div className="font-semibold text-green-700">190 TND</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-600">Patient</div>
                            <div className="font-semibold text-orange-700">110 TND</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-600">Total</div>
                            <div className="font-bold text-slate-900">300 TND</div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Month 8: Patient Only */}
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-blue-900">
                          Mois 8 (Août) - Sans CNAM
                        </div>
                        <Badge variant="outline" className="bg-blue-100 text-blue-700">
                          Patient Seulement
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-xs text-slate-600">CNAM</div>
                          <div className="font-semibold text-slate-400">0 TND</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-600">Patient</div>
                          <div className="font-semibold text-blue-700">300 TND</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-600">Total</div>
                          <div className="font-bold text-slate-900">300 TND</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-lg p-4">
                  <h4 className="font-semibold text-emerald-900 mb-3">Récapitulatif Financier</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-700">CNAM Bon #1 (3 mois × 190):</span>
                      <strong className="text-green-700">570 TND</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">Patient Complément Bon #1 (3 mois × 110):</span>
                      <strong className="text-orange-700">330 TND</strong>
                    </div>
                    <div className="flex justify-between bg-red-50 border border-red-200 rounded px-2 py-1">
                      <span className="text-slate-700">⚠️ Gap Mois 4 - Retard Bon #2 (1 mois × 300):</span>
                      <strong className="text-red-700">300 TND</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">CNAM Bon #2 (3 mois × 190):</span>
                      <strong className="text-green-700">570 TND</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">Patient Complément Bon #2 (3 mois × 110):</span>
                      <strong className="text-orange-700">330 TND</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">Patient Intégral Mois 8 (1 mois × 300):</span>
                      <strong className="text-blue-700">300 TND</strong>
                    </div>
                    <div className="flex justify-between border-t-2 border-emerald-300 pt-2 mt-2">
                      <span className="text-lg font-semibold text-emerald-900">TOTAL LOCATION (8 mois):</span>
                      <strong className="text-2xl text-emerald-700">2,400 TND</strong>
                    </div>
                    <div className="text-xs text-slate-600 mt-2">
                      Total CNAM: 1,140 TND (6 mois) | Total Patient: 1,260 TND (dont 300 TND gap)
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* CNAM TAB */}
          <TabsContent value="cnam" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(90vh-180px)] pr-4">
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Comprendre les Bons CNAM en Tunisie
                  </h3>
                  <p className="text-sm text-blue-700">
                    La CNAM (Caisse Nationale d'Assurance Maladie) prend en charge une partie des frais de location d'équipements médicaux selon une nomenclature établie.
                  </p>
                </div>

                {/* CNAM Coverage */}
                <div className="border rounded-lg p-4 bg-white">
                  <h4 className="font-semibold mb-3">Tarifs CNAM Courants (2025)</h4>
                  <div className="space-y-2">
                    {[
                      { device: 'Concentrateur d\'Oxygène', rate: '190 TND', real: '300 TND', complement: '110 TND' },
                      { device: 'Matelas Anti-Escarres', rate: '150 TND', real: '250 TND', complement: '100 TND' },
                      { device: 'Appareil à Pression Positive', rate: '180 TND', real: '280 TND', complement: '100 TND' },
                    ].map((item, idx) => (
                      <div key={idx} className="bg-slate-50 rounded p-3 text-sm">
                        <div className="font-medium text-slate-900 mb-2">{item.device}</div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <div className="text-slate-600">Tarif CNAM</div>
                            <div className="font-semibold text-green-700">{item.rate}/mois</div>
                          </div>
                          <div>
                            <div className="text-slate-600">Tarif Réel</div>
                            <div className="font-semibold text-blue-700">{item.real}/mois</div>
                          </div>
                          <div>
                            <div className="text-slate-600">Complément Patient</div>
                            <div className="font-semibold text-orange-700">{item.complement}/mois</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progression Steps */}
                <div className="border rounded-lg p-4 bg-white">
                  <h4 className="font-semibold mb-3">Étapes de Progression du Bon CNAM</h4>
                  <div className="space-y-2">
                    {[
                      { step: 1, title: 'En attente', desc: 'Bon créé, attente de documents' },
                      { step: 2, title: 'Accord patient', desc: 'Patient accepte les conditions' },
                      { step: 3, title: 'Documents CNAM', desc: 'Documents envoyés à la CNAM' },
                      { step: 4, title: 'Préparation', desc: 'Préparation de l\'équipement' },
                      { step: 5, title: 'Livraison tech', desc: 'Livraison par technicien' },
                      { step: 6, title: 'Signature médecin', desc: 'Validation médicale' },
                      { step: 7, title: 'Livraison finale', desc: 'Installation complète' },
                    ].map((item) => (
                      <div key={item.step} className="flex items-center gap-3 bg-slate-50 rounded p-2 text-sm">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                          {item.step}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{item.title}</div>
                          <div className="text-xs text-slate-600">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Important Notes */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Points Importants CNAM
                  </h4>
                  <ul className="space-y-2 text-sm text-amber-800">
                    <li className="flex items-start gap-2">
                      <span className="font-bold">•</span>
                      <span>La CNAM couvre généralement 1 à 3 mois renouvelables selon la pathologie</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">•</span>
                      <span>Le patient doit payer le complément (différence entre tarif CNAM et tarif réel)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">•</span>
                      <span>Documents requis: Ordonnance médicale, Carte CNAM, Certificat médical</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">•</span>
                      <span>Délai de traitement CNAM: 7 à 15 jours ouvrables</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">•</span>
                      <span>Renouvellement: Demander 30 jours avant expiration</span>
                    </li>
                  </ul>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TIPS TAB */}
          <TabsContent value="tips" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(90vh-180px)] pr-4">
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Conseils et Bonnes Pratiques
                  </h3>
                  <p className="text-sm text-purple-700">
                    Optimisez votre gestion des locations avec ces recommandations professionnelles.
                  </p>
                </div>

                {/* Best Practices */}
                <div className="border rounded-lg p-4 bg-white">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Bonnes Pratiques
                  </h4>
                  <div className="space-y-3">
                    {[
                      {
                        title: 'Toujours créer la location AVANT le bon CNAM',
                        desc: 'Le système nécessite une location existante pour lier le bon CNAM',
                        icon: Package
                      },
                      {
                        title: 'Vérifier les dates de couverture CNAM',
                        desc: 'S\'assurer que les périodes CNAM correspondent aux mois couverts par le bon',
                        icon: Calendar
                      },
                      {
                        title: 'Documenter tous les paiements',
                        desc: 'Enregistrer immédiatement chaque paiement reçu pour un suivi précis',
                        icon: CreditCard
                      },
                      {
                        title: 'Suivre la progression du bon CNAM',
                        desc: 'Mettre à jour régulièrement l\'étape de progression (1-7)',
                        icon: TrendingUp
                      },
                      {
                        title: 'Planifier les rappels de renouvellement',
                        desc: 'Configurer les rappels 30 jours avant expiration du bon CNAM',
                        icon: Clock
                      },
                    ].map((tip, idx) => (
                      <div key={idx} className="flex items-start gap-3 bg-green-50 border border-green-200 rounded p-3">
                        <tip.icon className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <div className="font-medium text-green-900">{tip.title}</div>
                          <div className="text-sm text-green-700 mt-1">{tip.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Common Mistakes */}
                <div className="border rounded-lg p-4 bg-white">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    Erreurs Courantes à Éviter
                  </h4>
                  <div className="space-y-3">
                    {[
                      'Créer le bon CNAM avant la location - impossible à lier ensuite',
                      'Oublier de lier le bon aux périodes correspondantes',
                      'Ne pas enregistrer le complément patient pour les mois CNAM',
                      'Mélanger les périodes CNAM et non-CNAM dans les paiements',
                      'Ne pas mettre à jour le statut du bon à la fin',
                    ].map((mistake, idx) => (
                      <div key={idx} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded p-3">
                        <div className="text-red-600 font-bold">✕</div>
                        <div className="text-sm text-red-700">{mistake}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Checklist */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3">Liste de Vérification Rapide</h4>
                  <div className="space-y-2 text-sm">
                    {[
                      'Location créée avec toutes les périodes (8 périodes)',
                      'Bon CNAM #1 créé et lié à la location (Mois 1-3)',
                      'Bon CNAM #2 créé et lié à la location (Mois 5-7)',
                      'Bons CNAM associés aux périodes concernées',
                      '⚠️ Période Gap (Mois 4) configurée: isGapPeriod = true, gapDays = 30, appareil RESTE avec patient',
                      'Paiements CNAM enregistrés (6 × 190 TND = 1,140 TND)',
                      'Compléments patient enregistrés (6 × 110 TND = 660 TND)',
                      'Paiement Gap Mois 4 enregistré (300 TND plein tarif)',
                      'Paiement patient Mois 8 enregistré (300 TND)',
                      'Total vérifié: 2,400 TND (8 mois, dont 1 mois gap)',
                      'Rappels de renouvellement configurés (30 jours avant expiration)',
                      'Statut bons CNAM mis à jour',
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-blue-800">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Support Info */}
                <div className="bg-slate-100 border border-slate-300 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-2">Besoin d'Aide ?</h4>
                  <p className="text-sm text-slate-700">
                    Pour toute question sur la gestion des locations et bons CNAM, contactez l'équipe administrative ou consultez la documentation complète dans les paramètres système.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
