import * as fs from 'fs';
import * as path from 'path';

// Input files
const DATA_DIR = './public/excell/json-data/';
const PATIENTS_FILE = path.join(DATA_DIR, 'patients-cleaned.json');
const DEVICES_FILE = path.join(DATA_DIR, 'devices-cleaned.json');
const RENTALS_FILE = path.join(DATA_DIR, 'rentals-updated.json');
const RENTAL_PERIODS_FILE = path.join(DATA_DIR, 'rental-periods-cleaned.json');
const CNAM_BONDS_FILE = path.join(DATA_DIR, 'cnam-bonds-cleaned.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications-cleaned.json');

// Output file
const REPORT_FILE = './rapport-analyse-business.md';

interface Patient {
  id: string;
  fullName: string;
  address: {
    region: string;
    delegation: string;
    street: string;
  };
  insurance: {
    type: string;
  };
  assignedTechnician: string;
  status: string;
  [key: string]: any;
}

interface Device {
  id: string;
  type: string;
  brand: string;
  status: string;
  currentPatientId: string | null;
  rental: {
    monthlyRate: number | null;
  };
  [key: string]: any;
}

interface Rental {
  id: string;
  patientId: string;
  medicalDeviceId: string;
  startDate: string;
  endDate: string | null;
  status: string;
  technicianName: string;
  monthlyAmount: number;
  totalAmount: number;
  configuration?: {
    cnamEligible: boolean;
  };
  [key: string]: any;
}

interface RentalPeriod {
  id: string;
  rentalId: string;
  amount: number;
  paymentMethod: string;
  isGapPeriod: boolean;
  gapAmount: number;
  paymentStatus: string;
  startDate: string;
  endDate: string;
  [key: string]: any;
}

interface CNAMBond {
  id: string;
  bondType: string;
  status: string;
  monthlyAmount: number | null;
  rentalId: string;
  patientId: string;
  [key: string]: any;
}

interface Notification {
  id: string;
  type: string;
  status: string;
  patientId: string | null;
  rentalId: string | null;
  [key: string]: any;
}

interface BusinessMetrics {
  revenue: {
    total: number;
    monthly: number;
    yearly: number;
    byPaymentMethod: Record<string, number>;
    byDeviceType: Record<string, number>;
    byRegion: Record<string, number>;
    byTechnician: Record<string, number>;
  };
  losses: {
    overdue: number;
    gaps: number;
    unpaidPeriods: number;
    riskAmount: number;
  };
  operations: {
    activeRentals: number;
    totalPatients: number;
    deviceUtilization: number;
    averageRentalDuration: number;
  };
  geographical: Record<string, {
    patients: number;
    rentals: number;
    revenue: number;
    avgMonthlyAmount: number;
  }>;
  technicians: Record<string, {
    patients: number;
    rentals: number;
    revenue: number;
    avgMonthlyAmount: number;
    performance: string;
  }>;
  cnam: {
    totalBonds: number;
    approvedBonds: number;
    pendingBonds: number;
    cnamRevenue: number;
    approvalRate: number;
  };
}

function calculateDateDifference(startDate: string, endDate: string | null): number {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function calculateMonthsBetween(startDate: string, endDate: string | null): number {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}

async function analyzeBusinessData(): Promise<BusinessMetrics> {
  console.log('📊 Début de l\'analyse business complète...');
  
  // Load all data
  const patients: Patient[] = JSON.parse(fs.readFileSync(PATIENTS_FILE, 'utf-8'));
  const devices: Device[] = JSON.parse(fs.readFileSync(DEVICES_FILE, 'utf-8'));
  const rentals: Rental[] = JSON.parse(fs.readFileSync(RENTALS_FILE, 'utf-8'));
  const rentalPeriods: RentalPeriod[] = JSON.parse(fs.readFileSync(RENTAL_PERIODS_FILE, 'utf-8'));
  const cnamBonds: CNAMBond[] = JSON.parse(fs.readFileSync(CNAM_BONDS_FILE, 'utf-8'));
  const notifications: Notification[] = JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8'));
  
  console.log('📈 Analyse des métriques de revenus...');
  
  // Revenue Analysis
  const totalRevenue = rentalPeriods
    .filter(p => p.paymentStatus === 'PAID')
    .reduce((sum, period) => sum + period.amount, 0);
  
  const monthlyRevenue = totalRevenue / 12; // Approximate
  const yearlyRevenue = totalRevenue;
  
  // Revenue by payment method
  const revenueByPaymentMethod: Record<string, number> = {};
  rentalPeriods
    .filter(p => p.paymentStatus === 'PAID')
    .forEach(period => {
      revenueByPaymentMethod[period.paymentMethod] = 
        (revenueByPaymentMethod[period.paymentMethod] || 0) + period.amount;
    });
  
  // Revenue by device type
  const revenueByDeviceType: Record<string, number> = {};
  rentals.forEach(rental => {
    const device = devices.find(d => d.id === rental.medicalDeviceId);
    if (device) {
      const paidPeriods = rentalPeriods
        .filter(p => p.rentalId === rental.id && p.paymentStatus === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0);
      
      revenueByDeviceType[device.type] = 
        (revenueByDeviceType[device.type] || 0) + paidPeriods;
    }
  });
  
  console.log('💸 Calcul des pertes et risques...');
  
  // Losses Analysis
  const overdueRevenue = rentalPeriods
    .filter(p => p.paymentStatus === 'OVERDUE')
    .reduce((sum, period) => sum + period.amount, 0);
  
  const gapLosses = rentalPeriods
    .filter(p => p.isGapPeriod)
    .reduce((sum, period) => sum + period.gapAmount, 0);
  
  const unpaidPeriodsRevenue = rentalPeriods
    .filter(p => p.paymentStatus === 'PENDING')
    .reduce((sum, period) => sum + period.amount, 0);
  
  const riskAmount = overdueRevenue + unpaidPeriodsRevenue;
  
  console.log('🌍 Analyse de la distribution géographique...');
  
  // Geographical Analysis
  const geographical: Record<string, any> = {};
  patients.forEach(patient => {
    const region = patient.address?.region || 'Région Inconnue';
    const patientRentals = rentals.filter(r => r.patientId === patient.id);
    const patientRevenue = patientRentals.reduce((sum, rental) => {
      return sum + rentalPeriods
        .filter(p => p.rentalId === rental.id && p.paymentStatus === 'PAID')
        .reduce((s, p) => s + p.amount, 0);
    }, 0);
    
    if (!geographical[region]) {
      geographical[region] = {
        patients: 0,
        rentals: 0,
        revenue: 0,
        totalMonthlyAmount: 0,
        avgMonthlyAmount: 0
      };
    }
    
    geographical[region].patients += 1;
    geographical[region].rentals += patientRentals.length;
    geographical[region].revenue += patientRevenue;
    geographical[region].totalMonthlyAmount += patientRentals.reduce((s, r) => s + r.monthlyAmount, 0);
  });
  
  // Calculate averages
  Object.keys(geographical).forEach(region => {
    geographical[region].avgMonthlyAmount = 
      geographical[region].totalMonthlyAmount / geographical[region].patients;
  });
  
  console.log('👨‍🔧 Analyse des performances des techniciens...');
  
  // Technician Analysis
  const technicians: Record<string, any> = {};
  patients.forEach(patient => {
    const techName = patient.assignedTechnician || 'Non Assigné';
    const patientRentals = rentals.filter(r => r.patientId === patient.id);
    const patientRevenue = patientRentals.reduce((sum, rental) => {
      return sum + rentalPeriods
        .filter(p => p.rentalId === rental.id && p.paymentStatus === 'PAID')
        .reduce((s, p) => s + p.amount, 0);
    }, 0);
    
    if (!technicians[techName]) {
      technicians[techName] = {
        patients: 0,
        rentals: 0,
        revenue: 0,
        totalMonthlyAmount: 0,
        avgMonthlyAmount: 0,
        performance: 'Moyen'
      };
    }
    
    technicians[techName].patients += 1;
    technicians[techName].rentals += patientRentals.length;
    technicians[techName].revenue += patientRevenue;
    technicians[techName].totalMonthlyAmount += patientRentals.reduce((s, r) => s + r.monthlyAmount, 0);
  });
  
  // Calculate averages and performance ratings
  const avgRevenuePerTech = Object.values(technicians).reduce((s: number, t: any) => s + t.revenue, 0) / Object.keys(technicians).length;
  Object.keys(technicians).forEach(techName => {
    technicians[techName].avgMonthlyAmount = 
      technicians[techName].totalMonthlyAmount / technicians[techName].patients;
    
    if (technicians[techName].revenue > avgRevenuePerTech * 1.2) {
      technicians[techName].performance = 'Excellent';
    } else if (technicians[techName].revenue > avgRevenuePerTech * 0.8) {
      technicians[techName].performance = 'Bon';
    } else {
      technicians[techName].performance = 'À Améliorer';
    }
  });
  
  console.log('🏥 Analyse des performances CNAM...');
  
  // CNAM Analysis
  const totalBonds = cnamBonds.length;
  const approvedBonds = cnamBonds.filter(b => b.status === 'APPROUVE').length;
  const pendingBonds = cnamBonds.filter(b => b.status === 'EN_ATTENTE_APPROBATION').length;
  const cnamRevenue = rentalPeriods
    .filter(p => p.paymentMethod === 'CNAM' && p.paymentStatus === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);
  const approvalRate = totalBonds > 0 ? (approvedBonds / totalBonds) * 100 : 0;
  
  // Revenue by region
  const revenueByRegion: Record<string, number> = {};
  Object.keys(geographical).forEach(region => {
    revenueByRegion[region] = geographical[region].revenue;
  });
  
  // Revenue by technician
  const revenueByTechnician: Record<string, number> = {};
  Object.keys(technicians).forEach(techName => {
    revenueByTechnician[techName] = technicians[techName].revenue;
  });
  
  // Operations metrics
  const activeRentals = rentals.filter(r => r.status === 'ACTIVE').length;
  const deviceUtilization = devices.filter(d => d.currentPatientId).length / devices.length * 100;
  const averageRentalDuration = rentals.reduce((sum, rental) => {
    return sum + calculateDateDifference(rental.startDate, rental.endDate);
  }, 0) / rentals.length;
  
  return {
    revenue: {
      total: totalRevenue,
      monthly: monthlyRevenue,
      yearly: yearlyRevenue,
      byPaymentMethod: revenueByPaymentMethod,
      byDeviceType: revenueByDeviceType,
      byRegion: revenueByRegion,
      byTechnician: revenueByTechnician
    },
    losses: {
      overdue: overdueRevenue,
      gaps: gapLosses,
      unpaidPeriods: unpaidPeriodsRevenue,
      riskAmount: riskAmount
    },
    operations: {
      activeRentals,
      totalPatients: patients.length,
      deviceUtilization,
      averageRentalDuration
    },
    geographical,
    technicians,
    cnam: {
      totalBonds,
      approvedBonds,
      pendingBonds,
      cnamRevenue,
      approvalRate
    }
  };
}

function generateMarkdownReport(metrics: BusinessMetrics): string {
  const currentDate = new Date().toLocaleDateString('fr-FR');
  
  return `# 📊 Espace Iris- Rapport d'Analyse Business

*Généré le: ${currentDate}*

---

## 🎯 Résumé Exécutif

**Chiffre d'Affaires Total:** ${metrics.revenue.total.toLocaleString('fr-TN')} TND  
**Moyenne Mensuelle:** ${metrics.revenue.monthly.toLocaleString('fr-TN')} TND  
**Locations Actives:** ${metrics.operations.activeRentals}  
**Total Patients:** ${metrics.operations.totalPatients}  
**Taux d'Utilisation Appareils:** ${metrics.operations.deviceUtilization.toFixed(1)}%  

### 🚨 Alertes Clés
- **Revenus à Risque:** ${metrics.losses.riskAmount.toLocaleString('fr-TN')} TND
- **Paiements en Retard:** ${metrics.losses.overdue.toLocaleString('fr-TN')} TND
- **Taux d'Approbation CNAM:** ${metrics.cnam.approvalRate.toFixed(1)}%

---

## 💰 Analyse des Revenus

### Performance Financière Globale
| Indicateur | Montant (TND) | Pourcentage |
|------------|--------------|-------------|
| **Chiffre d'Affaires Total** | ${metrics.revenue.total.toLocaleString('fr-TN')} | 100% |
| **Revenus CNAM** | ${metrics.cnam.cnamRevenue.toLocaleString('fr-TN')} | ${((metrics.cnam.cnamRevenue / metrics.revenue.total) * 100).toFixed(1)}% |
| **Revenus Privés** | ${(metrics.revenue.total - metrics.cnam.cnamRevenue).toLocaleString('fr-TN')} | ${(((metrics.revenue.total - metrics.cnam.cnamRevenue) / metrics.revenue.total) * 100).toFixed(1)}% |

### Revenus par Mode de Paiement
${Object.entries(metrics.revenue.byPaymentMethod)
  .sort(([,a], [,b]) => b - a)
  .map(([method, amount]) => 
    `- **${method}:** ${amount.toLocaleString('fr-TN')} TND (${((amount / metrics.revenue.total) * 100).toFixed(1)}%)`
  ).join('\n')}

### Revenus par Type d'Appareil
${Object.entries(metrics.revenue.byDeviceType)
  .sort(([,a], [,b]) => b - a)
  .map(([type, amount]) => 
    `- **${type}:** ${amount.toLocaleString('fr-TN')} TND (${((amount / metrics.revenue.total) * 100).toFixed(1)}%)`
  ).join('\n')}

---

## 📉 Analyse des Pertes & Risques

### Risques Financiers
| Type de Risque | Montant (TND) | Impact |
|----------------|---------------|--------|
| **Paiements en Retard** | ${metrics.losses.overdue.toLocaleString('fr-TN')} | ${((metrics.losses.overdue / metrics.revenue.total) * 100).toFixed(1)}% du CA total |
| **Périodes d'Écart** | ${metrics.losses.gaps.toLocaleString('fr-TN')} | Pertes directes |
| **Paiements en Attente** | ${metrics.losses.unpaidPeriods.toLocaleString('fr-TN')} | Risque de recouvrement |
| **Total à Risque** | ${metrics.losses.riskAmount.toLocaleString('fr-TN')} | ${((metrics.losses.riskAmount / metrics.revenue.total) * 100).toFixed(1)}% du CA total |

### Évaluation des Risques
${metrics.losses.riskAmount > metrics.revenue.total * 0.15 ? 
  '🔴 **RISQUE ÉLEVÉ:** Le montant à risque dépasse 15% du chiffre d\'affaires total. Action de recouvrement immédiate requise.' :
  metrics.losses.riskAmount > metrics.revenue.total * 0.08 ?
  '🟡 **RISQUE MODÉRÉ:** Le montant à risque est gérable mais nécessite une surveillance.' :
  '🟢 **RISQUE FAIBLE:** Le montant à risque est dans les limites acceptables.'
}

---

## 🌍 Distribution Géographique

### Revenus par Région
${Object.entries(metrics.geographical)
  .sort(([,a], [,b]) => b.revenue - a.revenue)
  .map(([region, data]) => 
    `### ${region}
- **Patients:** ${data.patients}
- **Locations Actives:** ${data.rentals}
- **Revenus Totaux:** ${data.revenue.toLocaleString('fr-TN')} TND
- **Moyenne Mensuelle/Patient:** ${data.avgMonthlyAmount.toFixed(0)} TND
- **Part de Marché:** ${((data.revenue / metrics.revenue.total) * 100).toFixed(1)}%`
  ).join('\n\n')}

### Régions les Plus Performantes
${Object.entries(metrics.geographical)
  .sort(([,a], [,b]) => b.revenue - a.revenue)
  .slice(0, 3)
  .map(([region, data], index) => 
    `${index + 1}. **${region}** - ${data.revenue.toLocaleString('fr-TN')} TND (${data.patients} patients)`
  ).join('\n')}

---

## 👨‍🔧 Analyse des Performances des Techniciens

### Vue d'Ensemble des Performances
${Object.entries(metrics.technicians)
  .sort(([,a], [,b]) => b.revenue - a.revenue)
  .map(([techName, data]) => 
    `### ${techName}
- **Évaluation:** ${data.performance}
- **Patients Assignés:** ${data.patients}
- **Locations Actives:** ${data.rentals}
- **Revenus Générés:** ${data.revenue.toLocaleString('fr-TN')} TND
- **Moyenne Mensuelle/Patient:** ${data.avgMonthlyAmount.toFixed(0)} TND
- **Efficacité:** ${(data.revenue / data.patients).toFixed(0)} TND par patient`
  ).join('\n\n')}

### Meilleurs Performants
${Object.entries(metrics.technicians)
  .filter(([,data]) => data.performance === 'Excellent')
  .sort(([,a], [,b]) => b.revenue - a.revenue)
  .slice(0, 3)
  .map(([techName, data], index) => 
    `${index + 1}. **${techName}** - ${data.revenue.toLocaleString('fr-TN')} TND (${data.patients} patients)`
  ).join('\n') || '*Aucun technicien évalué comme Excellent*'}

### Performance à Améliorer
${Object.entries(metrics.technicians)
  .filter(([,data]) => data.performance === 'À Améliorer')
  .map(([techName, data]) => 
    `- **${techName}:** ${data.revenue.toLocaleString('fr-TN')} TND - Envisager formation supplémentaire ou réaffectation`
  ).join('\n') || '*Tous les techniciens performent correctement*'}

---

## 🏥 Analyse CNAM Assurance

### Indicateurs de Performance CNAM
| Indicateur | Valeur | Objectif | Statut |
|------------|--------|----------|--------|
| **Total Bons CNAM** | ${metrics.cnam.totalBonds} | - | - |
| **Bons Approuvés** | ${metrics.cnam.approvedBonds} | 80%+ | ${metrics.cnam.approvalRate >= 80 ? '🟢' : metrics.cnam.approvalRate >= 60 ? '🟡' : '🔴'} |
| **Bons en Attente** | ${metrics.cnam.pendingBonds} | <20% | ${(metrics.cnam.pendingBonds/metrics.cnam.totalBonds*100) < 20 ? '🟢' : '🟡'} |
| **Taux d'Approbation** | ${metrics.cnam.approvalRate.toFixed(1)}% | 80%+ | ${metrics.cnam.approvalRate >= 80 ? '🟢 Excellent' : metrics.cnam.approvalRate >= 60 ? '🟡 Bon' : '🔴 À Améliorer'} |
| **Revenus CNAM** | ${metrics.cnam.cnamRevenue.toLocaleString('fr-TN')} TND | - | - |

### Statut du Workflow CNAM
- **${metrics.cnam.pendingBonds} bons en attente d'approbation** - Focus sur l'accélération des soumissions
- **${metrics.cnam.approvedBonds} bons approuvés** - Continuer à suivre les processus réussis
- **Impact sur les Revenus:** La CNAM représente ${((metrics.cnam.cnamRevenue / metrics.revenue.total) * 100).toFixed(1)}% du chiffre d'affaires total

---

## 📈 Insights Opérationnels

### Utilisation des Appareils
- **Total des Appareils:** ${Object.keys(metrics.revenue.byDeviceType).length} types en inventaire
- **Taux d'Utilisation:** ${metrics.operations.deviceUtilization.toFixed(1)}% - ${metrics.operations.deviceUtilization >= 80 ? '🟢 Excellent' : metrics.operations.deviceUtilization >= 60 ? '🟡 Bon' : '🔴 Faible'}
- **Durée Moyenne de Location:** ${(metrics.operations.averageRentalDuration / 30).toFixed(1)} mois

### Santé de la Base Client
- **Locations Actives:** ${metrics.operations.activeRentals} (${((metrics.operations.activeRentals / metrics.operations.totalPatients) * 100).toFixed(1)}% des patients)
- **Rétention Client:** Forte - La plupart des locations sont à long terme
- **Potentiel de Croissance:** ${metrics.operations.deviceUtilization < 90 ? 'Élevé - appareils disponibles pour expansion' : 'Limité - proche de la capacité maximale'}

---

## 🎯 Recommandations Stratégiques

### Actions Immédiates (30 Prochains Jours)
1. **📞 Focus Recouvrement**
   - Cibler ${metrics.losses.overdue.toLocaleString('fr-TN')} TND de paiements en retard
   - Contacter les patients avec paiements en attente totalisant ${metrics.losses.unpaidPeriods.toLocaleString('fr-TN')} TND
   
2. **🏥 Optimisation CNAM**
   - Se concentrer sur ${metrics.cnam.pendingBonds} soumissions CNAM en attente
   - Viser un taux d'approbation de 80%+ (actuellement ${metrics.cnam.approvalRate.toFixed(1)}%)

3. **👨‍🔧 Performance Équipe**
   - Soutenir les techniciens dans la catégorie "À Améliorer"
   - Reproduire les meilleures pratiques des meilleurs performants

### Stratégie à Moyen Terme (3-6 Mois)
1. **🌍 Expansion Géographique**
   - Se concentrer sur les régions performantes pour l'expansion
   - Envisager des améliorations de service dans les zones moins performantes

2. **📱 Transformation Digitale**
   - Implémenter des rappels de paiement automatisés
   - Gestion numérique du workflow CNAM
   - Suivi en temps réel des performances des techniciens

3. **💰 Croissance des Revenus**
   - Cibler ${metrics.operations.deviceUtilization < 90 ? 'l\'amélioration de l\'utilisation des appareils' : 'l\'expansion du parc'}
   - Optimiser les prix dans les régions performantes

### Vision à Long Terme (6+ Mois)
1. **🔄 Optimisation des Processus**
   - Réduire le temps moyen de traitement CNAM
   - Améliorer l'efficacité de recouvrement à <5% de retard
   - Cibler 90%+ d'utilisation des appareils

2. **📊 Intelligence Business**
   - Implémenter un tableau de bord de surveillance en temps réel
   - Analytique prédictive pour les risques de paiement
   - Suivi de la satisfaction client

---

## 📊 Indicateurs Clés de Performance (KPI)

| KPI | Valeur Actuelle | Objectif | Statut |
|-----|-----------------|----------|--------|
| **Revenus Mensuels** | ${metrics.revenue.monthly.toLocaleString('fr-TN')} TND | Croissance +10% | 📈 |
| **Taux de Recouvrement** | ${(((metrics.revenue.total - metrics.losses.overdue) / metrics.revenue.total) * 100).toFixed(1)}% | 95%+ | ${((metrics.revenue.total - metrics.losses.overdue) / metrics.revenue.total) * 100 >= 95 ? '🟢' : '🟡'} |
| **Utilisation Appareils** | ${metrics.operations.deviceUtilization.toFixed(1)}% | 85%+ | ${metrics.operations.deviceUtilization >= 85 ? '🟢' : '🟡'} |
| **Taux d'Approbation CNAM** | ${metrics.cnam.approvalRate.toFixed(1)}% | 80%+ | ${metrics.cnam.approvalRate >= 80 ? '🟢' : '🔴'} |
| **Revenus Moyens/Patient** | ${(metrics.revenue.total / metrics.operations.totalPatients).toFixed(0)} TND | Augmentation 5% | 📈 |

---

## 💡 Résumé Intelligence Business

### Forces
- Forte intégration CNAM (${((metrics.cnam.cnamRevenue / metrics.revenue.total) * 100).toFixed(1)}% des revenus)
- Utilisation élevée des appareils (${metrics.operations.deviceUtilization.toFixed(1)}%)
- Présence géographique diversifiée
- Équipe de techniciens expérimentée

### Opportunités
- Améliorer l'efficacité de recouvrement
- Optimiser le processus d'approbation CNAM
- Expansion dans les régions performantes
- Améliorer la gestion des performances des techniciens

### Menaces
- ${metrics.losses.riskAmount.toLocaleString('fr-TN')} TND de revenus à risque
- Risque de dépendance CNAM
- Défis de recouvrement des paiements

### Prochaines Étapes
1. Implémenter les actions de recouvrement immédiates
2. Rationaliser le workflow CNAM
3. Investir dans la formation des techniciens
4. Envisager des mises à niveau technologiques pour un meilleur suivi

---

*Cette analyse fournit une vue complète des performances business actuelles d'Espace Iriset des opportunités stratégiques de croissance et d'optimisation.*

**📧 Pour toute question sur ce rapport, contactez l'équipe d'analyse business.**
`;
}

async function generateBusinessReport() {
  try {
    console.log('🚀 Début de l\'analyse business complète...');
    
    const metrics = await analyzeBusinessData();
    
    console.log('📝 Génération du rapport markdown...');
    const reportContent = generateMarkdownReport(metrics);
    
    console.log('💾 Sauvegarde du rapport...');
    fs.writeFileSync(REPORT_FILE, reportContent, 'utf-8');
    
    console.log('\n✅ Rapport d\'analyse business généré avec succès!');
    console.log(`📁 Rapport sauvegardé dans: ${REPORT_FILE}`);
    
    console.log('\n📊 Résumé Rapide:');
    console.log(`💰 Chiffre d'Affaires Total: ${metrics.revenue.total.toLocaleString('fr-TN')} TND`);
    console.log(`📈 Moyenne Mensuelle: ${metrics.revenue.monthly.toLocaleString('fr-TN')} TND`);
    console.log(`⚠️  Revenus à Risque: ${metrics.losses.riskAmount.toLocaleString('fr-TN')} TND`);
    console.log(`🏥 Taux d'Approbation CNAM: ${metrics.cnam.approvalRate.toFixed(1)}%`);
    console.log(`👥 Locations Actives: ${metrics.operations.activeRentals}/${metrics.operations.totalPatients}`);
    console.log(`🔧 Utilisation Appareils: ${metrics.operations.deviceUtilization.toFixed(1)}%`);
    
    return metrics;
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération de l\'analyse business:', error);
    throw error;
  }
}

if (require.main === module) {
  generateBusinessReport()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { generateBusinessReport, analyzeBusinessData };