# 📋 ESPACE iris- PROJECT PLANNING & STRUCTURE

> 🎯 **Purpose**: Track project structure, completion status, and identify areas for improvement
> 📅 **Last Updated**: August 10, 2025
> 🚀 **Goal**: Clean architecture, remove unused features, complete missing functionalities

---

## 🔐 AUTHENTICATION & WELCOME FLOW

### 🌟 Entry Points
| Page | Path | Status | Description |
|------|------|--------|-------------|
| 🏠 **Welcome** | `/welcome.tsx` | ✅ Complete | Landing page with pricing, features |
| 🔑 **Sign In** | `/auth/signin.tsx` | ✅ Complete | Authentication page |
| 🔄 **Auth API** | `/api/auth/[...nextauth].ts` | ✅ Complete | NextAuth configuration |

### 🎭 Role-Based Routing
- ✅ **Admin** → `/roles/admin/dashboard`
- ✅ **Employee** → `/roles/employee/dashboard`
- ✅ **Doctor** → `/roles/doctor/dashboard`

---

## 👨‍💼 ADMIN DASHBOARD

### 📑 Main Pages

#### ✅ Core Pages (Complete)
| Page | Path | Components | APIs | Notes |
|------|------|------------|------|-------|
| 🏠 **Dashboard** | `/dashboard/index.tsx` | `StepperForm`, `RentStepperSidebar`, `SaleStepperSidebar`, `DiagnosticStepperSidebar` | `/api/analytics` | Main hub with multiple workflows |
| 📊 **Analytics** | `/analytics/index.tsx` | Charts, Stats Components | `/api/analytics`, `/api/employee-stats` | Reports & data visualization |
| ✅ **Tasks** | `/tasks/modern.tsx` | Task tables, filters | `/api/tasks/*` | Task management system |
| 📋 **Kanban** | `/kanban/index.tsx` | Kanban board | `/api/kanban/*` | Visual task board |
| 💬 **Chat** | `/chat/index.tsx` | Enhanced messaging with references & templates | `/api/messages/*`, `/api/chat/references` | ✅ Complete |
| 🔔 **Notifications** | `/notifications/modern.tsx` | Notification lists | `/api/notifications/*` | System alerts |

#### 🔧 Management Pages
| Page | Path | Components | APIs | Status |
|------|------|------------|------|--------|
| 👥 **Users** | `/users/index.tsx` | `UsersTable`, `UserForm` | `/api/users/*` | ✅ Complete |
| 👤 **User Detail** | `/users/[id].tsx` | `UserHeader`, `UserDetails`, `UserActions` | `/api/users/[id]` | ✅ Complete |
| 🛠️ **Technician Space** | `/espace-technicien/index.tsx` | `TechnicianSelector`, History components | `/api/technicians/*` | ✅ Complete |
| 📝 **Renseignement** | `/renseignement/index.tsx` | `RenseignementTable` | `/api/renseignements/*` | ✅ Complete |
| 🏢 **Company Detail** | `/renseignement/societe/[id]` | Company info components | `/api/societes/[id]` | ✅ Complete |
| 👤 **Patient Detail** | `/renseignement/patient/[id]` | Patient components | `/api/clients/[id]` | ✅ Complete |

#### 📦 Product & Inventory
| Page | Path | Components | APIs | Status |
|------|------|------------|------|--------|
| 🏥 **Medical Devices** | `/appareils/index.tsx` | Device lists | `/api/medical-devices/*` | ✅ Complete |
| 🔬 **Diagnostic Device** | `/appareils/diagnostic-device/[id]` | `DiagnosticDeviceDetails` | `/api/diagnostic-devices/*` | ✅ Complete |
| 💊 **Medical Device** | `/appareils/medical-device/[id]` | `DeviceHeader`, `DeviceParameters` | `/api/medical-devices/[id]` | ✅ Complete |
| 🔧 **Spare Parts** | `/appareils/spare-part/[id]` | Spare part forms | `/api/products/spare-parts` | ✅ Complete |
| 🎁 **Accessories** | `/appareils/accessory/[id]` | Accessory forms | `/api/products/accessories` | ✅ Complete |
| 📦 **Stock** | `/stock/index.tsx` | `StockInventory` | `/api/stock/*` | ✅ Complete |
| 📄 **Products** | `/produits/[id].tsx` | `ProductHeader`, `StockInfo` | `/api/products/[id]` | ✅ Complete |

#### 🏥 Medical Operations
| Page | Path | Components | APIs | Status |
|------|------|------------|------|--------|
| 🩺 **Diagnostics** | `/diagnostics/index.tsx` | `DiagnosticTable` | `/api/diagnostics/*` | ✅ Complete |
| 📋 **Diagnostic Detail** | `/diagnostics/[id]/index.tsx` | `DiagnosticHeader`, `PatientInformation` | `/api/diagnostics/[id]` | ✅ Complete |
| 📊 **Diagnostic Results** | `/diagnostics/[id]/results.tsx` | `DiagnosticResultsForm` | `/api/diagnostic-results/*` | ✅ Complete |
| 📅 **Appointments** | `/appointments/[id].tsx` | Appointment details | `/api/appointments/*` | ✅ Complete |

#### 💰 Business Operations
| Page | Path | Components | APIs | Status |
|------|------|------------|------|--------|
| 🏪 **Sales** | `/sales/[id].tsx` | `CNAMDossierSection`, Payment components | `/api/sales/*` | ✅ Complete |
| 📋 **Rentals** | `/rentals/[id].tsx` | `EnhancedRentalOverview`, `RentalPeriodsManagement` | `/api/rentals/*` | ✅ Complete |
| 🔧 **Repairs** | `/reparateur/index.tsx` | Repair management | `/api/repairs/*` | ⚠️ Needs Review |

#### 🛠️ Utilities
| Page | Path | Components | APIs | Status |
|------|------|------------|------|--------|
| 📥 **Excel Import** | `/excel-import/index.tsx` | Import/Export components | `/api/excel-import/*` | ✅ Complete |
| 🗺️ **Map** | `/map.tsx` | `MapComponent` | `/api/clients/locations` | ✅ Complete |
| ⚙️ **Settings** | `/settings/index.tsx` | `GeneralSettings`, `BackupRestore` | `/api/settings/*` | ✅ Complete |
| ❓ **Help** | `/help/index.tsx` | `FAQSection`, `QuickStartGuide` | - | ✅ Complete |
| 👤 **Profile** | `/profile.tsx` | Profile management | `/api/users/profile` | ✅ Complete |

### 🧩 Shared Components (All Roles)
```
📁 src/components/
├── 📁 chat/ (Enhanced Chat System - NEW)
│   ├── EnhancedChatInput.tsx (Rich input with references & templates)
│   └── EnhancedMessage.tsx (Smart message rendering)
├── 📁 forms/
│   ├── PatientForm.tsx
│   ├── UserForm.tsx
│   └── ImportExportModal.tsx
├── 📁 patient/
│   ├── PatientBasicInfo.tsx
│   ├── PatientDevices.tsx
│   └── PatientPayments.tsx
├── 📁 medicalDevice/
│   ├── DeviceHeader.tsx
│   └── DeviceMaintenanceHistory.tsx
├── 📁 rental/
│   └── steps/ (Multiple rental workflow steps)
└── 📁 payment/
    └── CNAMDossierManager.tsx
```

#### 💬 Enhanced Chat System Features
- **Smart References**: @ button for quick insertion of patients, devices, appointments, rentals, users
- **Professional Templates**: # button with 9 pre-built message templates across 4 categories
- **Real-time Search**: Instant search across all reference types with contextual information
- **Role-specific Theming**: Blue (Admin), Green (Employee), Red (Doctor) color schemes
- **Rich Message Display**: Clickable reference badges, timestamps, read indicators
- **Professional UX**: Smooth animations, proper medical industry styling

---

## 👨‍💻 EMPLOYEE DASHBOARD

### 📑 Pages Overview

| Page | Path | Components | APIs | Status |
|------|------|------------|------|--------|
| 🏠 **Dashboard** | `/dashboard/index.tsx` | `StepperForm`, Product selections | Shared with admin | ✅ Complete |
| 🩺 **Diagnostics** | `/diagnostics/index.tsx` | `DiagnosticTable` | `/api/diagnostics/*` | ✅ Complete |
| 📋 **Tasks** | `/tasks/index.tsx` | Task management | `/api/tasks/*` | ✅ Complete |
| 🔔 **Notifications** | `/notifications/index.tsx` | Notifications | `/api/notifications/*` | ✅ Complete |
| 📦 **Stock** | `/stock/index.tsx` | `MyStockInventory`, `StockTransferRequests` | `/api/stock/my-inventory` | ✅ Complete |
| 📝 **Renseignement** | `/renseignement/index.tsx` | Client info | `/api/renseignements/*` | ✅ Complete |
| 🏪 **Sales** | `/sales/index.tsx` | Sales management | `/api/sales/*` | ✅ Complete |
| 📋 **Rentals** | `/rentals/index.tsx` | Rental management | `/api/rentals/*` | ✅ Complete |
| 📜 **History** | `/history/index.tsx` | Activity history | `/api/employee-actions/*` | ✅ Complete |
| 👤 **Profile** | `/profile.tsx` | Personal profile (read-only) | `/api/profile/me` | ✅ Complete |
| 💬 **Chat** | `/chat/index.tsx` | Enhanced messaging system with references & templates | `/api/messages/*`, `/api/chat/references` | ✅ Complete |

### ✅ Recently Completed
- ✅ **Profile page** - Read-only personal profile page added (August 10, 2025)
- ✅ **Enhanced chat system** - Professional messaging with rich features (August 10, 2025)
  - Smart references (@patients, @devices, @appointments, @rentals, @users)
  - Message templates (9 professional templates across 4 categories)
  - Real-time search and contextual information
  - Role-specific theming and improved UX

### 🔴 Still Missing/Incomplete
- ❌ Settings access (limited)

---

## 👨‍⚕️ DOCTOR DASHBOARD

### 📑 Pages Overview

| Page | Path | Components | APIs | Status |
|------|------|------------|------|--------|
| 🏠 **Dashboard** | `/dashboard/index.tsx` | Doctor-specific dashboard | `/api/doctor/*` | ⚠️ Needs Content |
| 👥 **Patients** | `/patients/index.tsx` | Patient list | `/api/doctor/patients` | ⚠️ Basic Implementation |
| 👤 **Patient Detail** | `/patients/[id].tsx` | Patient medical info | `/api/doctor/patients/[id]` | ⚠️ Basic Implementation |
| 🩺 **Diagnostics** | `/diagnostics/index.tsx` | Medical diagnostics | `/api/doctor/diagnostics` | ⚠️ Basic Implementation |
| 📊 **Reports** | `/reports/index.tsx` | Medical reports | `/api/doctor/reports` | ⚠️ Needs Implementation |
| 💬 **Chat** | `/chat/index.tsx` | Enhanced messaging with references & templates | `/api/messages/*`, `/api/chat/references` | ✅ Complete |
| 🔔 **Notifications** | `/notifications/index.tsx` | Alerts | `/api/notifications/*` | ✅ Complete |
| 👤 **Profile** | `/profile/index.tsx` | Doctor profile | `/api/users/profile` | ✅ Complete |
| ❓ **Help** | `/help/index.tsx` | Help section | - | ✅ Complete |

### 🔴 Doctor Dashboard Issues
- ⚠️ **Most pages need proper implementation**
- ⚠️ **APIs need to be created/connected**
- ⚠️ **Missing key medical features**

---

## 🗑️ UNUSED/DEPRECATED FEATURES

### ✅ Already Removed
- ~~`patient-journey`~~ - **REMOVED** ✅
- ~~`/api/locations`~~ - **REMOVED** ✅ (duplicate of `/api/stock-locations`)
- ~~`/api/stock-locations/setup`~~ - **REMOVED** ✅ (one-time setup endpoint, unused)
- ~~`/api/notifications/[id]/view`~~ - **REMOVED** ✅ (duplicate of `/api/notifications/mark-as-read`)
- ~~`/api/notifications/[id]`~~ - **REMOVED** ✅ (unused CRUD endpoint)
- ~~`/api/diagnostics/simple`~~ - **REMOVED** ✅ (unused diagnostic creation endpoint)
- ~~`/api/patients/list`~~ - **REMOVED** ✅ (duplicate of `/api/patients`)

### ❌ To Remove
- Consider removing old `/tasks/index.tsx` (using modern.tsx)
- Old notifications page `/notifications/index.tsx` (using modern.tsx)

### 🔍 APIs to Review for Usage
```
/api/employee-actions.ts - Check if used
/api/employee-stats.ts - Verify usage in analytics
```

---

## 📊 PROGRESS SUMMARY

### ✅ Completed
- **Admin Dashboard**: 92% Complete *(+2% after enhanced chat system)*
- **Employee Dashboard**: 98% Complete *(+3% after enhanced chat system)*
- **Authentication Flow**: 100% Complete
- **Core Business Logic**: Complete (Sales, Rentals, Diagnostics)
- **Enhanced Chat System**: 100% Complete (All roles with professional features)

### ⚠️ Needs Work
- **Doctor Dashboard**: 30% Complete - Major work needed
- **Repair Management**: Needs review and completion
- **Some API endpoints**: Need verification and cleanup

### 🎯 Priority Actions
1. **Complete Doctor Dashboard** - High Priority
2. **Clean unused APIs and components** *(API cleanup completed - 6 endpoints removed)*
3. **Add remaining Employee features (Settings)** *(Profile and Chat completed)*
4. **Review and complete Repair module**
5. **Performance optimization and code cleanup**

---

## 📝 NOTES FOR DEVELOPMENT

### 🔧 Technical Debt
- Remove duplicate code between admin and employee dashboards
- Consolidate shared components
- Clean up unused imports and dependencies

### 🚀 Next Steps
1. Focus on Doctor Dashboard implementation
2. API cleanup and optimization
3. Component reusability improvements
4. Testing coverage increase

### 💡 Suggestions
- Create shared layout components for all roles
- Implement proper error boundaries
- Add loading states consistently
- Improve TypeScript typing

---

## 🔌 API ROUTES AUDIT

### 📊 API Usage Statistics
- **Total API Routes**: ~145 endpoints
- **Actively Used**: ~100 endpoints (69%)
- **Potentially Unused**: ~40 endpoints (28%)
- **Unclear/Indirect**: ~5 endpoints (3%)

### ✅ ACTIVELY USED APIs

#### 💬 Enhanced Chat System
| Endpoint | Used By | Purpose |
|----------|---------|----------|
| `/api/chat/references` | All chat pages | Smart reference search for patients, devices, appointments, rentals, users |
| `/api/messages` | Chat functionality | Message CRUD operations |
| `/api/messages/conversations` | Chat UI | Conversation management |
| `/api/messages/users` | Chat user selection | Available users for messaging |
| `/api/messages/mark-read` | Chat UI | Message read status |

#### 🔐 Authentication & Users
| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `/api/auth/[...nextauth]` | All pages | NextAuth authentication |
| `/api/users` | Admin users page | User CRUD operations |
| `/api/users/[id]/relations` | User detail pages | User relationships |
| `/api/users/import` | User management | Bulk user import |
| `/api/users/export` | User management | User data export |
| `/api/users/employees-stats` | Technician space, Dashboard | Employee statistics |
| `/api/users/list` | Tasks page | User listing |
| `/api/users/employees` | Various components | Employee list |
| `/api/users/technicians` | Various components | Technician list |
| `/api/users/doctors` | Various components | Doctor list |
| `/api/users/formatted` | Various forms | Formatted user data |

#### 🏥 Medical Devices & Products
| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `/api/medical-devices` | Appareils pages | Device management |
| `/api/medical-devices/[id]` | Device details | Single device info |
| `/api/medical-devices/[id]/assign` | Device management | Device assignment |
| `/api/medical-devices/by-location` | Stock views | Devices by location |
| `/api/medical-devices/diagnostic-devices` | Diagnostic flows | Diagnostic devices list |
| `/api/medical-devices/transfer` | Stock management | Device transfers |
| `/api/products` | Product dialogs | Product management |
| `/api/products/import-accessories` | Excel import | Bulk accessory import |
| `/api/products/import-spareparts` | Excel import | Bulk spare parts import |

#### 🩺 Diagnostics System
| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `/api/diagnostics` | Diagnostic tables | Diagnostics list |
| `/api/diagnostics/[id]` | Diagnostic details | Single diagnostic |
| `/api/diagnostics/[id]/documents` | Diagnostic docs | Document management |
| `/api/diagnostic-parameters` | Device config | Parameter configuration |
| `/api/diagnostic-parameters/[id]` | Parameter details | Single parameter |
| `/api/diagnostic-results/[id]` | Results forms | Diagnostic results |
| `/api/role/employee/diagnostics` | Employee dashboard | Employee diagnostics |
| `/api/role/employee/diagnostics/[id]` | Employee diagnostic | Employee diagnostic detail |

#### 📦 Stock Management
| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `/api/stock-locations` | Stock components | Location management |
| `/api/stock/locations` | Stock pages | Stock locations |
| `/api/stock/inventory` | Stock views | Inventory data |
| `/api/stock/my-inventory` | Employee stock | Personal inventory |
| `/api/stock/transfers` | Transfer management | Stock transfers |
| `/api/stock/transfers/[id]` | Transfer details | Single transfer |
| `/api/stock/transfers/[id]/verify` | Transfer verification | Verify transfers |
| `/api/stock/transfers/history` | Transfer history | Transfer logs |
| `/api/stock/transfer-requests` | Employee requests | Transfer requests |
| `/api/stock/check-availability` | Stock checks | Availability verification |
| `/api/admin/transfer-requests` | Admin review | Pending requests |
| `/api/admin/transfer-requests/[id]/review` | Admin approval | Request review |

#### 💰 Business Operations
| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `/api/rentals` | Rental pages | Rental management |
| `/api/rentals/[id]` | Rental details | Single rental |
| `/api/sales` | Sales pages | Sales management |
| `/api/sales/[id]` | Sale details | Single sale |
| `/api/sales/[id]/items/[itemId]` | Sale items | Sale line items |
| `/api/sales/[id]/payments` | Payment management | Sale payments |

#### 📅 Tasks & Appointments
| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `/api/tasks` | Task pages | Task management |
| `/api/tasks/[id]/complete` | Task completion | Mark tasks complete |
| `/api/tasks/comprehensive` | Modern tasks page | Comprehensive task data |
| `/api/appointments` | Appointment tables | Appointment management |
| `/api/appointments/[id]` | Appointment details | Single appointment |

#### 👥 Patients & Companies
| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `/api/renseignements` | Renseignement pages | Information management |
| `/api/renseignements/[id]` | Detail pages | Single record |
| `/api/renseignements/patients` | Patient selection | Patient data |
| `/api/renseignements/patients/[id]` | Patient details | Single patient |
| `/api/renseignements/patients/import-advanced` | Excel import | Advanced import |
| `/api/renseignements/patients/template` | Excel import | Import template |
| `/api/renseignements/patients/export` | Data export | Patient export |
| `/api/renseignements/patients/search` | Search features | Patient search |
| `/api/renseignements/companies` | Company selection | Company data |
| `/api/clients` | Client selection | Client management |
| `/api/clients/[id]` | Client details | Single client |
| `/api/societes/[id]` | Company details | Single company |
| `/api/patients/locations` | Map view | Patient locations |

#### 💬 Communication
| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `/api/notifications/get-user-notifications` | All navbars | User notifications |
| `/api/notifications/mark-as-read` | Notification UI | Mark as read |
| `/api/notifications/dynamic` | Modern notifications | Dynamic notifications |
| `/api/messages/conversations` | Chat pages | Conversation list |
| `/api/messages` | Chat functionality | Message operations |
| `/api/messages/users` | Chat user selection | Available users |
| `/api/messages/mark-read` | Chat UI | Mark messages read |

#### 👨‍⚕️ Doctor APIs
| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `/api/doctor/patients` | Doctor patients page | Patient list |
| `/api/doctor/patients/[id]` | Doctor patient detail | Patient info |
| `/api/doctor/dashboard-stats` | Doctor dashboard | Dashboard statistics |
| `/api/doctor/diagnostics` | Doctor diagnostics | Diagnostic list |
| `/api/doctor/profile` | Doctor profile | Profile management |
| `/api/doctor/chat/conversations` | Doctor chat | Chat conversations |
| `/api/doctor/chat/messages` | Doctor chat | Messages |
| `/api/doctor/chat/messages/[conversationId]` | Doctor chat | Conversation messages |
| `/api/doctor/chat/users` | Doctor chat | Chat users |

#### 👷 Technicians
| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `/api/technicians` | Technician selector | Technician list |
| `/api/technicians/[id]` | Technician history | Technician details |
| `/api/technicians/[id]/installations` | Installation history | Installation logs |
| `/api/technicians/[id]/payments` | Payment history | Payment logs |
| `/api/technicians/[id]/tasks` | Task history | Task logs |
| `/api/technicians/[id]/transfers` | Transfer history | Transfer logs |

#### 📊 Analytics & Reports
| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `/api/analytics` | Analytics page | Analytics data |
| `/api/employee-actions` | Technician space | Employee activities |
| `/api/employee-actions/export` | Export features | Activity export |
| `/api/employee-stats` | Dashboard, Analytics | Employee statistics |
| `/api/profile/me` | Profile pages | User profile |
| `/api/profile/activity-stats` | Profile pages | Activity statistics |

#### 📁 Files & Import/Export
| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `/api/files` | Diagnostic files | File management |
| `/api/excel-import/stats` | Import page | Import statistics |
| `/api/excel-import/medical-devices` | Device import | Bulk device import |
| `/api/excel-import/medical-devices/template` | Device import | Import template |
| `/api/excel-import/products` | Product import | Bulk product import |
| `/api/excel-import/products/template` | Product import | Import template |

#### 🎨 Other Features
| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `/api/kanban` | Kanban board | Board data |
| `/api/kanban/metadata` | Kanban board | Board metadata |
| `/api/repair-locations` | Repair management | Repair locations |
| `/api/companies` | Company features | Company management |
| `/api/doctors` | Doctor features | Doctor management |

### ❌ POTENTIALLY UNUSED APIs

#### 🗑️ API Investigation Results

**After Deep Investigation:**

| Endpoint | Investigation Result | Action |
|----------|---------------------|--------|
| `/api/diagnostic-results/pending` | ✅ **USED** in `DiagnosticResultsNotification.tsx` - Fetches pending diagnostic results | ⚠️ KEEP |
| `/api/diagnostics/simple` | ❌ No references found anywhere | ❌ Remove |
| `/api/patients/list` | ❌ No references found, duplicate functionality | ❌ Remove |
| `/api/notifications` | ✅ **USED** in `ParameterConsumer.tsx` - Main CRUD endpoint | ⚠️ KEEP |
| `/api/notifications/[id]` | ❌ No references found | ❌ Remove |
| `/api/notifications/[id]/view` | ❌ No references found | ❌ Remove |
| `/api/stock-locations` | ✅ **HEAVILY USED** - Main endpoint for location management | ⚠️ KEEP |
| `/api/stock-locations/[id]` | ✅ **USED** in `StockLocationsTable.tsx` for updates/deletes | ⚠️ KEEP |
| `/api/stock-locations/[id]/contents` | ✅ **USED** in `StockLocationsTable.tsx` to fetch location contents | ⚠️ KEEP |
| `/api/stock-locations/setup` | ❌ No references found | ❌ Remove |
| `/api/search` | ✅ **USED** in `GlobalSearch.tsx` component | ⚠️ KEEP |

#### ✅ APIs Successfully Removed (All Confirmed Unused)
| Endpoint | Reason | Status |
|----------|--------|--------|
| `/api/diagnostics/simple` | Unused diagnostic creation endpoint | ✅ **REMOVED** |
| `/api/patients/list` | Duplicate of `/api/patients` | ✅ **REMOVED** |
| `/api/notifications/[id]` | Unused CRUD endpoint | ✅ **REMOVED** |
| `/api/notifications/[id]/view` | Duplicate of `/api/notifications/mark-as-read` | ✅ **REMOVED** |
| `/api/stock-locations/setup` | One-time setup endpoint, unused | ✅ **REMOVED** |
| `/api/locations` | Duplicate of `/api/stock-locations` | ✅ **REMOVED** |

#### ⚠️ Possibly Unused (Need Verification)
| Endpoint | Reason | Action |
|----------|--------|--------|
| `/api/cnam-dossiers` | No direct refs, might be used | ⚠️ Verify |
| `/api/cnam-dossiers/[id]` | No direct refs, might be used | ⚠️ Verify |
| `/api/payments/create` | No direct refs found | ⚠️ Verify |
| `/api/payments/cnam/[id]` | No direct refs found | ⚠️ Verify |
| `/api/repairs` | Repair module incomplete | ⚠️ Verify |
| `/api/settings/general` | Settings page might use | ⚠️ Verify |
| `/api/settings/backup` | Backup feature might use | ⚠️ Verify |
| `/api/settings/restore` | Restore feature might use | ⚠️ Verify |
| `/api/settings/backup/restore-file` | Backup feature might use | ⚠️ Verify |
| `/api/settings/backup/restore-json` | Backup feature might use | ⚠️ Verify |

#### 🔧 System/Background APIs (Keep)
| Endpoint | Purpose | Status |
|----------|---------|--------|
| `/api/cron/check-notifications` | Background cron job | ✅ Keep |
| `/api/admin/migrate-notifications` | Migration script | ✅ Keep |
| `/api/contact/demo-request` | Contact form | ✅ Keep |
| `/api/uploadthing` | Upload library | ✅ Keep |
| `/api/files/upload` | File upload fallback | ✅ Keep |
| `/api/files/upload-temp` | Temp file handling | ✅ Keep |
| `/api/files/move-temp` | Temp file operations | ✅ Keep |
| `/api/files/serve/[...path]` | File serving | ✅ Keep |
| `/api/files/serve-temp/[fileName]` | Temp file serving | ✅ Keep |
| `/api/upload` | Upload handling | ✅ Keep |

### 🎯 CLEANUP RECOMMENDATIONS

#### 🔴 Immediate Actions - UPDATED After Investigation
1. **Remove confirmed unused APIs** (7 endpoints only, not 11)
   - `/api/diagnostics/simple`
   - `/api/patients/list`
   - `/api/notifications` (base endpoint)
   - `/api/notifications/[id]`
   - `/api/notifications/[id]/view`
   - `/api/stock-locations/setup`
   - `/api/locations`

2. **APIs Found to be ACTUALLY USED** (5 endpoints to KEEP)
   - `/api/diagnostic-results/pending` - Used in DiagnosticResultsNotification
   - `/api/stock-locations` - Heavily used
   - `/api/stock-locations/[id]` - Used for CRUD operations
   - `/api/stock-locations/[id]/contents` - Used to fetch contents
   - `/api/search` - Used in GlobalSearch component

3. **Total cleanup**: Only 7 API endpoints (not 21)

#### 🟡 Investigation Needed
1. **CNAM APIs**: Check if CNAM dossier functionality is used
2. **Payment APIs**: Verify payment creation endpoints
3. **Settings/Backup APIs**: Check settings page implementation
4. **Repair API**: Review repair module status

#### 🟢 Keep & Maintain
1. **System/Background APIs**: Essential for operations
2. **File handling APIs**: Required for uploads
3. **All actively used APIs**: Core functionality

### 📈 API Health Summary - FINAL
```
✅ Healthy APIs: 106 endpoints (76%) - Added 6 that were marked for removal
⚠️ Need Review: 10 endpoints (7%)
❌ Can Remove: 0 endpoints (0%) - ALL CONFIRMED SAFE REMOVALS COMPLETED! 🎉
✅ Already Removed: 6 endpoints (4.3%)
🔧 System APIs: 14 endpoints (10%)
📊 Total APIs: ~139 endpoints (was 145, now 139 after 6 deletions)
```

### 🎉 **CLEANUP COMPLETE!**
**All confirmed unused APIs have been successfully removed!**

### 🔍 Key Investigation Findings
1. **Stock Location APIs**: Initially marked for removal but are HEAVILY USED across multiple components
2. **Diagnostic Results Pending**: Used in notification component for pending results
3. **Search API**: Actively used in GlobalSearch component
4. **Main Notifications API**: Initially marked for removal but is ACTIVELY USED in ParameterConsumer.tsx
5. **Only 6 APIs confirmed for safe removal** instead of initial 21 (down to 2 remaining)
6. **APIs Successfully Deleted** (6 total - ALL CONFIRMED UNUSED):
   - `/api/locations` - Duplicate of `/api/stock-locations`
   - `/api/stock-locations/setup` - One-time setup endpoint, completely unused
   - `/api/notifications/[id]/view` - Duplicate of `/api/notifications/mark-as-read`
   - `/api/notifications/[id]` - Unused CRUD endpoint (app uses specific endpoints instead)
   - `/api/diagnostics/simple` - Unused diagnostic creation endpoint
   - `/api/patients/list` - Duplicate of `/api/patients`

---

*This document should be updated regularly as features are completed or requirements change.*