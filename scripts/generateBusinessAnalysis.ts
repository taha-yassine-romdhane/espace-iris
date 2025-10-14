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
  console.log('📊 Starting comprehensive business analysis...');
  
  // Load all data
  const patients: Patient[] = JSON.parse(fs.readFileSync(PATIENTS_FILE, 'utf-8'));
  const devices: Device[] = JSON.parse(fs.readFileSync(DEVICES_FILE, 'utf-8'));
  const rentals: Rental[] = JSON.parse(fs.readFileSync(RENTALS_FILE, 'utf-8'));
  const rentalPeriods: RentalPeriod[] = JSON.parse(fs.readFileSync(RENTAL_PERIODS_FILE, 'utf-8'));
  const cnamBonds: CNAMBond[] = JSON.parse(fs.readFileSync(CNAM_BONDS_FILE, 'utf-8'));
  const notifications: Notification[] = JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8'));
  
  console.log('📈 Analyzing revenue metrics...');
  
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
  
  console.log('💸 Calculating losses and risks...');
  
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
  
  console.log('🌍 Analyzing geographical distribution...');
  
  // Geographical Analysis
  const geographical: Record<string, any> = {};
  patients.forEach(patient => {
    const region = patient.address?.region || 'Unknown';
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
  
  console.log('👨‍🔧 Analyzing technician performance...');
  
  // Technician Analysis
  const technicians: Record<string, any> = {};
  patients.forEach(patient => {
    const techName = patient.assignedTechnician || 'Unassigned';
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
        performance: 'Average'
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
      technicians[techName].performance = 'Good';
    } else {
      technicians[techName].performance = 'Needs Improvement';
    }
  });
  
  console.log('🏥 Analyzing CNAM performance...');
  
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

## 🌍 Geographical Distribution

### Revenue by Region
${Object.entries(metrics.geographical)
  .sort(([,a], [,b]) => b.revenue - a.revenue)
  .map(([region, data]) => 
    `### ${region}
- **Patients:** ${data.patients}
- **Active Rentals:** ${data.rentals}
- **Total Revenue:** ${data.revenue.toLocaleString('fr-TN')} TND
- **Avg Monthly/Patient:** ${data.avgMonthlyAmount.toFixed(0)} TND
- **Market Share:** ${((data.revenue / metrics.revenue.total) * 100).toFixed(1)}%`
  ).join('\n\n')}

### Top Performing Regions
${Object.entries(metrics.geographical)
  .sort(([,a], [,b]) => b.revenue - a.revenue)
  .slice(0, 3)
  .map(([region, data], index) => 
    `${index + 1}. **${region}** - ${data.revenue.toLocaleString('fr-TN')} TND (${data.patients} patients)`
  ).join('\n')}

---

## 👨‍🔧 Technician Performance Analysis

### Performance Overview
${Object.entries(metrics.technicians)
  .sort(([,a], [,b]) => b.revenue - a.revenue)
  .map(([techName, data]) => 
    `### ${techName}
- **Performance Rating:** ${data.performance}
- **Assigned Patients:** ${data.patients}
- **Active Rentals:** ${data.rentals}
- **Generated Revenue:** ${data.revenue.toLocaleString('fr-TN')} TND
- **Avg Monthly/Patient:** ${data.avgMonthlyAmount.toFixed(0)} TND
- **Efficiency:** ${(data.revenue / data.patients).toFixed(0)} TND per patient`
  ).join('\n\n')}

### Top Performers
${Object.entries(metrics.technicians)
  .filter(([,data]) => data.performance === 'Excellent')
  .sort(([,a], [,b]) => b.revenue - a.revenue)
  .slice(0, 3)
  .map(([techName, data], index) => 
    `${index + 1}. **${techName}** - ${data.revenue.toLocaleString('fr-TN')} TND (${data.patients} patients)`
  ).join('\n') || '*No technicians rated as Excellent*'}

### Performance Improvement Needed
${Object.entries(metrics.technicians)
  .filter(([,data]) => data.performance === 'Needs Improvement')
  .map(([techName, data]) => 
    `- **${techName}:** ${data.revenue.toLocaleString('fr-TN')} TND - Consider additional training or reassignment`
  ).join('\n') || '*All technicians performing adequately*'}

---

## 🏥 CNAM Insurance Analysis

### CNAM Performance Metrics
| Metric | Value | Target | Status |
|--------|-------|---------|---------|
| **Total CNAM Bonds** | ${metrics.cnam.totalBonds} | - | - |
| **Approved Bonds** | ${metrics.cnam.approvedBonds} | 80%+ | ${metrics.cnam.approvalRate >= 80 ? '🟢' : metrics.cnam.approvalRate >= 60 ? '🟡' : '🔴'} |
| **Pending Bonds** | ${metrics.cnam.pendingBonds} | <20% | ${(metrics.cnam.pendingBonds/metrics.cnam.totalBonds*100) < 20 ? '🟢' : '🟡'} |
| **Approval Rate** | ${metrics.cnam.approvalRate.toFixed(1)}% | 80%+ | ${metrics.cnam.approvalRate >= 80 ? '🟢 Excellent' : metrics.cnam.approvalRate >= 60 ? '🟡 Good' : '🔴 Needs Improvement'} |
| **CNAM Revenue** | ${metrics.cnam.cnamRevenue.toLocaleString('fr-TN')} TND | - | - |

### CNAM Workflow Status
- **${metrics.cnam.pendingBonds} bonds pending approval** - Focus on expediting submissions
- **${metrics.cnam.approvedBonds} bonds approved** - Continue following successful processes
- **Revenue Impact:** CNAM represents ${((metrics.cnam.cnamRevenue / metrics.revenue.total) * 100).toFixed(1)}% of total revenue

---

## 📈 Operational Insights

### Device Utilization
- **Total Devices:** ${Object.keys(metrics.revenue.byDeviceType).length} types in inventory
- **Utilization Rate:** ${metrics.operations.deviceUtilization.toFixed(1)}% - ${metrics.operations.deviceUtilization >= 80 ? '🟢 Excellent' : metrics.operations.deviceUtilization >= 60 ? '🟡 Good' : '🔴 Low'}
- **Average Rental Duration:** ${(metrics.operations.averageRentalDuration / 30).toFixed(1)} months

### Customer Base Health
- **Active Rentals:** ${metrics.operations.activeRentals} (${((metrics.operations.activeRentals / metrics.operations.totalPatients) * 100).toFixed(1)}% of patients)
- **Customer Retention:** Strong - Most rentals are long-term
- **Growth Potential:** ${metrics.operations.deviceUtilization < 90 ? 'High - devices available for expansion' : 'Limited - near capacity'}

---

## 🎯 Strategic Recommendations

### Immediate Actions (Next 30 Days)
1. **📞 Collections Focus**
   - Target ${metrics.losses.overdue.toLocaleString('fr-TN')} TND in overdue payments
   - Contact patients with pending payments totaling ${metrics.losses.unpaidPeriods.toLocaleString('fr-TN')} TND
   
2. **🏥 CNAM Optimization**
   - Focus on ${metrics.cnam.pendingBonds} pending CNAM submissions
   - Target 80%+ approval rate (currently ${metrics.cnam.approvalRate.toFixed(1)}%)

3. **👨‍🔧 Team Performance**
   - Support technicians in "Needs Improvement" category
   - Replicate best practices from top performers

### Medium-Term Strategy (3-6 Months)
1. **🌍 Geographic Expansion**
   - Focus on high-performing regions for expansion
   - Consider service improvements in underperforming areas

2. **📱 Digital Transformation**
   - Implement automated payment reminders
   - Digital CNAM workflow management
   - Real-time technician performance tracking

3. **💰 Revenue Growth**
   - Target ${metrics.operations.deviceUtilization < 90 ? 'device utilization improvement' : 'fleet expansion'}
   - Optimize pricing in high-performing regions

### Long-Term Vision (6+ Months)
1. **🔄 Process Optimization**
   - Reduce average CNAM processing time
   - Improve collection efficiency to <5% overdue rate
   - Target 90%+ device utilization

2. **📊 Business Intelligence**
   - Implement real-time dashboard monitoring
   - Predictive analytics for payment risks
   - Customer satisfaction tracking

---

## 📊 Key Performance Indicators (KPIs)

| KPI | Current Value | Target | Status |
|-----|---------------|---------|---------|
| **Monthly Revenue** | ${metrics.revenue.monthly.toLocaleString('fr-TN')} TND | Growth +10% | 📈 |
| **Collection Rate** | ${(((metrics.revenue.total - metrics.losses.overdue) / metrics.revenue.total) * 100).toFixed(1)}% | 95%+ | ${((metrics.revenue.total - metrics.losses.overdue) / metrics.revenue.total) * 100 >= 95 ? '🟢' : '🟡'} |
| **Device Utilization** | ${metrics.operations.deviceUtilization.toFixed(1)}% | 85%+ | ${metrics.operations.deviceUtilization >= 85 ? '🟢' : '🟡'} |
| **CNAM Approval Rate** | ${metrics.cnam.approvalRate.toFixed(1)}% | 80%+ | ${metrics.cnam.approvalRate >= 80 ? '🟢' : '🔴'} |
| **Average Revenue/Patient** | ${(metrics.revenue.total / metrics.operations.totalPatients).toFixed(0)} TND | Increase 5% | 📈 |

---

## 💡 Business Intelligence Summary

### Strengths
- Strong CNAM integration (${((metrics.cnam.cnamRevenue / metrics.revenue.total) * 100).toFixed(1)}% of revenue)
- High device utilization (${metrics.operations.deviceUtilization.toFixed(1)}%)
- Diverse geographical presence
- Experienced technician team

### Opportunities  
- Improve collection efficiency
- Optimize CNAM approval process
- Expand in high-performing regions
- Enhance technician performance management

### Threats
- ${metrics.losses.riskAmount.toLocaleString('fr-TN')} TND at-risk revenue
- CNAM dependency risk
- Payment collection challenges

### Next Steps
1. Implement immediate collection actions
2. Streamline CNAM workflow
3. Invest in technician training
4. Consider technology upgrades for better tracking

---

*This analysis provides a comprehensive view of Espace Iris 's current business performance and strategic opportunities for growth and optimization.*

**📧 For questions about this report, contact the business analysis team.**
`;
}

async function generateBusinessReport() {
  try {
    console.log('🚀 Starting comprehensive business analysis...');
    
    const metrics = await analyzeBusinessData();
    
    console.log('📝 Generating markdown report...');
    const reportContent = generateMarkdownReport(metrics);
    
    console.log('💾 Saving report...');
    fs.writeFileSync(REPORT_FILE, reportContent, 'utf-8');
    
    console.log('\n✅ Business analysis report generated successfully!');
    console.log(`📁 Report saved to: ${REPORT_FILE}`);
    
    console.log('\n📊 Quick Summary:');
    console.log(`💰 Total Revenue: ${metrics.revenue.total.toLocaleString('fr-TN')} TND`);
    console.log(`📈 Monthly Average: ${metrics.revenue.monthly.toLocaleString('fr-TN')} TND`);
    console.log(`⚠️  At-Risk Revenue: ${metrics.losses.riskAmount.toLocaleString('fr-TN')} TND`);
    console.log(`🏥 CNAM Approval Rate: ${metrics.cnam.approvalRate.toFixed(1)}%`);
    console.log(`👥 Active Rentals: ${metrics.operations.activeRentals}/${metrics.operations.totalPatients}`);
    console.log(`🔧 Device Utilization: ${metrics.operations.deviceUtilization.toFixed(1)}%`);
    
    return metrics;
    
  } catch (error) {
    console.error('❌ Error generating business analysis:', error);
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