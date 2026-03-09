# EcoTrackAI Frontend Implementation Guide
## Complete UI/UX Architecture for 6-Role System

**Document Version:** 1.0  
**Date:** March 1, 2026  
**Status:** Comprehensive Frontend Architecture Plan  
**Scope:** Post-backend security fixes → Full role-based UI implementation

---

## Table of Contents
1. [Frontend Architecture Overview](#1-frontend-architecture-overview)
2. [Role-Based Dashboard Structures](#2-role-based-dashboard-structures)
3. [Component Inventory & Modifications](#3-component-inventory--modifications)
4. [Page Structure by Role](#4-page-structure-by-role)
5. [Workflow UI Flows](#5-workflow-ui-flows)
6. [API Integration Points](#6-api-integration-points)
7. [Implementation Priority & Roadmap](#7-implementation-priority--roadmap)

---

## 1. Frontend Architecture Overview

### Current State Analysis
**Existing Frontend Location:** `ecotrackai-frontend/`

**Current Structure:**
```
src/
├── components/
│   ├── AddProductModal.js           ← Product addition (needs enhancement)
│   ├── AIAnalysisModal.js           ← AI insights (needs role guard)
│   ├── DeliveryMap.jsx              ← Route visualization (needs driver tracking)
│   ├── Layout.js                    ← Main layout wrapper
│   ├── Navigation.jsx               ← Nav bar (needs role-based menu)
│   ├── admin/                       ← Admin-specific components (new role content)
│   └── manager/                     ← Manager components (new driver monitoring)
├── hooks/
│   ├── useAlerts.js                 ← Alert fetching
│   ├── useApprovalHistory.jsx       ← Approval tracking
│   ├── useCarbon.js                 ← Carbon data
│   ├── useDelivery.js               ← Delivery routes
│   ├── useInventoryApprovals.js     ← Inventory approvals
│   ├── useLogisticsApprovals.jsx    ← Route approvals
│   └── useProducts.js               ← Product inventory
└── pages/
    ├── LoginPage.js                 ← Auth (needs role-based redirect)
    ├── ManagerPage.jsx              ← Generic manager view (split by role)
    └── ...other pages
```

### New Architecture (Post-Implementation)
```
src/
├── components/
│   ├── shared/                      ← Cross-role components
│   │   ├── RoleGuard.jsx            ← NEW permission wrapper
│   │   ├── BaseLayout.jsx           ← NEW role-aware layout
│   │   ├── RoleNav.jsx              ← NEW role-specific nav
│   │   └── ProtectedRoute.jsx       ← NEW route protection
│   ├── alerts/                      ← Spoilage alert components
│   │   ├── SpoilageAlertCard.jsx    ← Alert display
│   │   ├── AlertDetailModal.jsx     ← Alert details
│   │   └── AlertApprovalForm.jsx    ← Approval UI
│   ├── inventory/                   ← Inventory management
│   │   ├── AddProductModal.js       ← MODIFIED
│   │   ├── InventoryTable.jsx       ← NEW
│   │   └── InventoryWarnings.jsx    ← NEW
│   ├── delivery/                    ← Delivery management
│   │   ├── DeliveryMap.jsx          ← MODIFIED (add GPS tracking)
│   │   ├── PlanDeliveryModal.jsx    ← MODIFIED (qty validation)
│   │   ├── DriverMonitor.jsx        ← NEW role-based view
│   │   ├── RouteOptimizer.jsx       ← NEW
│   │   ├── DeliveryExecutor.jsx     ← NEW (driver-specific)
│   │   └── StopChecklist.jsx        ← NEW (driver mobile)
│   ├── approvals/                   ← Approval queues
│   │   ├── SpoilageApprovalQueue.jsx  ← NEW
│   │   ├── RouteApprovalQueue.jsx     ← NEW
│   │   ├── CarbonApprovalQueue.jsx    ← NEW
│   │   └── ApprovalCard.jsx           ← NEW (reusable)
│   ├── carbon/                      ← Carbon verification
│   │   ├── CarbonRecord.jsx         ← Carbon display
│   │   ├── CarbonVerificationQueue.jsx ← NEW
│   │   └── CarbonTrendChart.jsx     ← NEW
│   ├── ecotrust/                    ← EcoTrust score management
│   │   ├── EcoTrustDisplay.jsx      ← Score & level
│   │   ├── Leaderboard.jsx          ← Score ranking
│   │   ├── TransactionHistory.jsx   ← Points log
│   │   └── EcoTrustAudit.jsx        ← NEW (super admin)
│   ├── admin/                       ← MODIFIED (business registry, super admin only)
│   └── drivers/                     ← NEW driver-specific components
│       ├── DriverDashboard.jsx      ← Mobile-optimized driver view
│       ├── RouteCard.jsx            ← Today's route display
│       ├── StopArrivalGeofence.jsx  ← GPS geofence UI
│       └── DeliveryLogForm.jsx      ← Actual delivery data entry
├── hooks/
│   ├── useAlerts.js                 ← MODIFIED role filter
│   ├── useApprovalHistory.jsx       ← existing
│   ├── useCarbon.js                 ← MODIFIED role filter
│   ├── useDelivery.js               ← MODIFIED
│   ├── useInventoryApprovals.js     ← existing
│   ├── useLogisticsApprovals.jsx    ← existing
│   ├── useProducts.js               ← MODIFIED qty availability
│   ├── useAuth.js                   ← NEW auth context
│   ├── useRolePermissions.js        ← NEW permission enforcement
│   ├── useGPS.js                    ← NEW GPS tracking
│   ├── useApprovals.js              ← NEW unified approval hook
│   └── useEcoTrust.js               ← NEW ecotrust data
├── pages/
│   ├── LoginPage.js                 ← MODIFIED role-based redirect
│   ├── ForgotPasswordPage.jsx       ← existing
│   ├── dashboards/                  ← NEW role-specific dashboards
│   │   ├── SuperAdminDashboard.jsx  ← NEW (business registry, system health)
│   │   ├── AdminDashboard.jsx       ← MODIFIED (redesigned)
│   │   ├── InventoryManagerDashboard.jsx ← NEW
│   │   ├── LogisticsManagerDashboard.jsx ← NEW
│   │   ├── SustainabilityManagerDashboard.jsx ← NEW
│   │   └── DriverDashboard.jsx      ← NEW (mobile-optimized)
│   ├── workflows/                   ← NEW workflow pages
│   │   ├── SpoilageWorkflow.jsx     ← Spoilage detection flow
│   │   ├── DeliveryWorkflow.jsx     ← Delivery planning flow
│   │   └── CarbonWorkflow.jsx       ← Carbon verification flow
│   └── ...other pages
├── context/
│   ├── AuthContext.js               ← NEW user & role context
│   ├── BusinessContext.js           ← NEW business context
│   ├── ApprovalContext.js           ← NEW approval state
│   └── NotificationContext.js       ← NEW notifications
├── utils/
│   ├── rolePermissions.js           ← NEW RBAC matrix
│   ├── formatters.js                ← Display formatters
│   ├── validators.js                ← Input validation
│   ├── gpsUtils.js                  ← NEW GPS calculations
│   └── ...existing utils
└── services/
    ├── api.js                       ← MODIFIED with auth headers
    ├── authService.js               ← NEW login & role handling
    ├── approvalService.js           ← NEW
    ├── geoService.js                ← NEW GPS/geofence
    └── ...other services
```

---

## 2. Role-Based Dashboard Structures

### 2.1 SUPER ADMIN DASHBOARD
**URL:** `/dashboard/super-admin`  
**Access:** `role === 'super_admin'`  
**Navigation:** Only visible in Super Admin nav

**Layout (3 columns):**
```
┌─────────────────────────────────────────────────┐
│ SUPER ADMIN DASHBOARD                      [←] │
├─────────────────────────────────────────────────┤
│                                                 │
│ LEFT SIDEBAR          │  CENTER MAIN        │ RIGHT │
│                       │                     │       │
│ • Business Registry   │  SYSTEM HEALTH      │ QUICK │
│ • System Health       │  ┌─────────────┐    │ STATS │
│ • Global Catalog      │  │ Total alerts│    │       │
│ • EcoTrust Config     │  │ today: 247  │    │ Active│
│ • Audit Log Viewer    │  │             │    │ Buses │
│ • Analytics Overview  │  │ Pending     │    │ 8     │
│                       │  │ approvals:  │    │       │
│                       │  │ system-wide:│    │ New   │
│                       │  │ 34          │    │ Buses │
│                       │  │             │    │ 1     │
│                       │  │ AI accuracy │    │       │
│                       │  │ rate: 94.2% │    │       │
│                       │  └─────────────┘    │       │
│                       │  BUSINESS TABLE:    │       │
│                       │  ┌─────────────┐    │       │
│                       │  │Name  │Type  │    │       │
│                       │  │─────────────│    │       │
│                       │  │Dela Cruz│   │    │       │
│                       │  │Dist    │    │    │       │
│                       │  │...     │    │    │       │
│                       │  └─────────────┘    │       │
└─────────────────────────────────────────────────┘
```

**Key Components:**
- **Business Registry Table**
  - Columns: business_name, business_type, status, created_date, actions
  - Actions: View | Edit | Suspend | Delete
  - Search/filter by status
  - Add New Business button
  
- **Business Registration Modal** (NEW)
  - Form fields: business_name, business_type (dropdown), registration_number, address, contact_email, contact_phone
  - Creates business_profiles record
  - Creates admin user account (generates temp password)
  - Sends welcome email
  
- **System Health Cards**
  - Total alerts generated today (count from alerts table)
  - Pending approvals system-wide (count from manager_approvals WHERE status='pending')
  - AI suggestion accuracy rate (percentage from AI evaluations)
  
- **Global Product Catalog Editor**
  - List of 10 supported fruits
  - Edit fields: fruit_name, storage_type, temperature_min, temperature_max, humidity_range, default_shelf_life_days
  - Add/Remove fruits
  
- **EcoTrust Configuration Panel**
  - Table of sustainable_actions with point values
  - Edit point values for each action type
  - Edit level thresholds (Newcomer, Eco Warrior, Eco Champion, Eco Leader)
  
- **Audit Log Viewer**
  - Search approval_history by:
    - Date range
    - Business ID
    - Approval type
    - User
  - Export as CSV
  - View full approval details with timestamps and comments
  
- **Analytics Overview**
  - Cross-business carbon trends chart
  - Global leaderboard (top 10 businesses by EcoTrust score)
  - Carbon footprint aggregates

---

### 2.2 ADMIN DASHBOARD (Business Owner)
**URL:** `/dashboard/admin`  
**Access:** `role === 'admin'`  
**Layout:** 4 main sections/tabs

**Tab Structure:**
```
┌──────────────────────────────────────────────────┐
│ DELA CRUZ FRUITS TRADING Dashboard         [←]  │
├──────────────────────────────────────────────────┤
│ [INVENTORY] [DELIVERY] [ALERTS] [ECOTRUST] [MGR]│
├──────────────────────────────────────────────────┤
│                                                  │
│  Content changes based on selected tab           │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Tab 1: INVENTORY**
- Left sidebar: Quick stats
  - Total items in stock
  - High risk alerts count
  - Expiring in next 3 days count
- Main panel: Inventory table
  - Columns: Fruit, Batch#, Qty, Ripeness, Days Left, Condition, Actions
  - Color coding: Green (safe), Yellow (warning), Red (high risk)
  - Add Product button → AddProductModal
  - Sort/filter by fruit, days left, risk level

**Tab 2: DELIVERY**
- Left sidebar: Today's stats
  - Routes assigned today
  - In-progress routes
  - Completed routes
- Main panel: Route list + actions
  - Planned routes table
  - Plan New Delivery button → PlanNewDeliveryModal
  - Route cards showing: origin → destination, driver, status, AI optimization status
  - "Run AI Optimization" button (if route not optimized)
  - "Submit for Approval" button (if optimized, not approved)
  - Real-time driver location map (shows all active deliveries)

**Tab 3: ALERTS**
- Only shows alerts for their business
- Status filter: Active | Pending Review | Approved | Declined
- Each alert card shows: fruit, qty, days left, risk level, AI recommendation, status
- "Submit for Approval" button only on Active alerts
- Alert detail modal on click

**Tab 4: ECOTRUST**
- Current score card (large, prominent)
- Level display with progress bar to next level
- Transaction history (scrollable list)
  - Each transaction: date, action, points earned, status
- View Leaderboard button
- Filter transactions by date range

**Tab 5: MANAGERS**
- Invite managers form
  - Email field
  - Role dropdown: Inventory Manager | Logistics Manager | Sustainability Manager | Driver
  - Send Invite button
- Active managers list (with remove option)
- Pending invitations list

---

### 2.3 INVENTORY MANAGER DASHBOARD
**URL:** `/dashboard/inventory-manager`  
**Access:** `role === 'inventory_manager'`  
**Layout:** Queue-based + History

**Main View (2 panels):**

**Left Panel: PENDING APPROVALS QUEUE**
- Shows all manager_approvals WHERE approval_type='spoilage_action' AND status='pending' AND required_role='inventory_manager'
- Each card displays:
  ```
  ┌──────────────────────────────────┐
  │ 🍌 SAGING (Banana)        [RED]  │
  │ Quantity: 200 kg                 │
  │ Days left: 2                     │
  │ Risk: HIGH                       │
  │ Facility: Manila Warehouse       │
  │                                  │
  │ AI Recommendation:               │
  │ "Redistribute to market          │
  │  immediately or reduce price"    │
  │                                  │
  │ [APPROVE] [DECLINE]              │
  └──────────────────────────────────┘
  ```
- Click card → expand to full detail
- Sort by: risk level (HIGH first), days left (shortest first)
- Search by fruit name, batch number

**Approval Form (Modal or Expanded):**
```
Inventory Manager Approval
┌─────────────────────────────┐
│ Item: Saging                │
│ Qty: 200 kg                 │
│ Condition: Ripening quickly │
│ Days Left: 2                │
│ Risk: HIGH                  │
│                             │
│ AI Recommendation:          │
│ "Redistribute to market..." │
│                             │
│ Your Decision: ○ APPROVE   │
│                ○ DECLINE   │
│                             │
│ Add Note (optional):        │
│ ┌─────────────────────────┐ │
│ │ "Confirmed - route to   │ │
│ │  Market B ASAP"         │ │
│ └─────────────────────────┘ │
│                             │
│ [SUBMIT] [CANCEL]           │
└─────────────────────────────┘
```

**Right Panel: HISTORY TAB**
- All past manager_approvals for this user
- Columns: Date, Fruit, Decision, Note, Forwarded To
- Filter by date range
- Export as CSV
- View full approval detail on click

**Quick Stats (Top):**
- Total pending: 3
- Approved this week: 14
- Approval rate: 82%

---

### 2.4 LOGISTICS MANAGER DASHBOARD
**URL:** `/dashboard/logistics-manager`  
**Access:** `role === 'logistics_manager'`  
**Layout:** 3 tabs + Map

**Tab 1: PENDING ROUTE APPROVALS**
- Shows all manager_approvals WHERE approval_type='route_optimization' AND status='pending' AND required_role='logistics_manager'
- Each card displays:
  ```
  ┌────────────────────────────────────┐
  │ Route: R-20260227-001               │
  │ Origin: Manila Warehouse            │
  │ → Stop 1: Market B (Cubao)          │
  │ → Stop 2: Store C (Quezon City)     │
  │ → Destination: Return to Warehouse  │
  │                                     │
  │ Driver: Mang Ben (Ben Santos)       │
  │ Vehicle: Refrigerated Truck         │
  │                                     │
  │ Original: 28 km | 9.0 L | 22 kg CO2│
  │ AI Optimized: 21 km | 6.8 L | 16kg │
  │ Savings: 7 km | 2.2 L | 6 kg CO2   │
  │                                     │
  │ [MAP PREVIEW]                       │
  │                                     │
  │ [ACCEPT] [DECLINE]                  │
  └────────────────────────────────────┘
  ```
- Click card → full route details
- Map preview embedded (non-interactive)
- Decision form (similar to Inventory Manager)

**Tab 2: DRIVER MONITOR**
- Real-time driver status table
  ```
  Driver Name    │ Route ID     │ Status      │ Location
  ─────────────────────────────────────────────────────
  Mang Ben       │ R-20260227-001 │ In Progress │ Quezon City
  Kuya Rex       │ R-20260227-002 │ Assigned    │ Warehouse
  ...
  ```
- Click driver → map with live GPS location
- Current stop info (if in progress)
- ETA to next stop
- Contact driver button

**Tab 3: HISTORY**
- All past route approvals
- Columns: Date, Route, Driver, Decision, Actual vs Estimated
- Sort by date
- Compare actual delivery metrics vs planned metrics

**Live Map Panel (Bottom, Always Visible):**
- Show all active/in-progress deliveries
- Each marker: driver icon, route number, current stop
- Click marker → driver details + live track

---

### 2.5 SUSTAINABILITY MANAGER DASHBOARD
**URL:** `/dashboard/sustainability-manager`  
**Access:** `role === 'sustainability_manager'`  
**Layout:** Verification queue + audit panel

**Main Panel: PENDING CARBON VERIFICATIONS**
- Shows all carbon_footprint_records WHERE verification_status='pending'
- Each card displays:
  ```
  ┌──────────────────────────────────────┐
  │ Delivery #D-20260227-001         │
  │ Date: Feb 27, 10:30 AM           │
  │                                  │
  │ Transportation Carbon:           │
  │   Estimated: 9.5 kg CO2          │
  │   Actual: 8.2 kg CO2 (via 7L)    │
  │   Variance: -1.3 kg (↓ 13%)      │
  │                                  │
  │ Storage Carbon:                  │
  │   Total: 0 kg (in-transit)       │
  │                                  │
  │ Total Carbon: 8.2 kg CO2         │
  │                                  │
  │ Calculation Method: IPCC Factor  │
  │ Fuel Type: Diesel Truck          │
  │ Distance: 22 km                  │
  │                                  │
  │ [VERIFY] [REQUEST REVISION]      │
  └──────────────────────────────────┘
  ```
- Verification form:
  ```
  Review and Verify Carbon Record
  ┌────────────────────────────────┐
  │ Calculations appear correct?    │
  │ ○ YES, VERIFY                  │
  │ ○ NO, REQUEST REVISION         │
  │                                │
  │ If revision, add note:         │
  │ ┌────────────────────────────┐ │
  │ │ "Fuel figures seem low..."  │ │
  │ └────────────────────────────┘ │
  │                                │
  │ [SUBMIT] [CANCEL]              │
  └────────────────────────────────┘
  ```

**Right Panel: ECOTRUST AUDIT**
- Search ecotrust_transactions:
  - By date range
  - By business
  - By action type
- Each transaction shows: date, business, action, points, verification_status
- Flag transaction button → marks for Super Admin review
- View full transaction details

**Carbon Trend Chart (Below):**
- Line chart: Estimated vs Actual CO2 over time
- X-axis: date (last 30 days)
- Y-axis: kg CO2
- Toggle: view by delivery route, by business

---

### 2.6 DRIVER DASHBOARD (Mobile-Optimized)
**URL:** `/dashboard/driver` (or `/mobile/driver`)  
**Access:** `role === 'driver'`  
**Layout:** Single-column, touch-friendly

**Design Principles:**
- Large tap targets (44px minimum)
- Minimal scrolling
- Clear progress indicators
- Large readable fonts
- High contrast
- Offline-capable sections

**Driver Home Screen:**
```
┌────────────────────────────────┐
│ TODAY'S DELIVERY    [MENU]     │
├────────────────────────────────┤
│                                │
│ Route Status: APPROVED         │
│ [Start Delivery]  ← BIG BUTTON │
│                                │
│ ROUTE DETAILS                  │
│ ┌────────────────────────────┐ │
│ │ TODAY'S ROUTE              │ │
│ │ R-20260227-001             │ │
│ │                            │ │
│ │ Origin: Warehouse          │ │
│ │ Stop 1: Market B           │ │
│ │ Stop 2: Store C            │ │
│ │ Destination: Warehouse     │ │
│ │                            │ │
│ │ Driver: Mang Ben           │ │
│ │ Vehicle: Refrigerated Truck│ │
│ └────────────────────────────┘ │
│                                │
│ [MAP] [DETAILS] [ITEMS]        │
│                                │
└────────────────────────────────┘
```

**Route Execution Screen (After "Start Delivery"):**
```
┌────────────────────────────────┐
│ ROUTE IN PROGRESS   [←]        │
├────────────────────────────────┤
│                                │
│ STOP 1/2                       │
│ Market B in Cubao              │
│                                │
│ Distance: 65 m away            │
│ ┌────────────────────────────┐ │
│ │ [Distance countdown]       │ │
│ │ 65m ... 50m ... 35m        │ │
│ │ Button enabled at 50m      │ │
│ └────────────────────────────┘ │
│                                │
│ [MARK AS ARRIVED] ← ENABLED    │
│                                │
│ ITEMS TO DELIVER AT STOP:      │
│ Saging: 150 kg                 │
│ [CONFIRM DELIVERY]             │
│                                │
│ Navigation: [OPEN MAPS]        │
│                                │
└────────────────────────────────┘
```

**Stop Checklist Screen:**
```
┌────────────────────────────────┐
│ STOP 1 CHECKLIST    [←]        │
├────────────────────────────────┤
│                                │
│ ✓ Arrived at 10:23 AM          │
│                                │
│ DELIVERY ITEMS:                │
│ ┌────────────────────────────┐ │
│ │ Saging                     │ │
│ │ Planned: 150 kg            │ │
│ │ Delivering: [INPUT] ▼      │ │
│ │              150            │ │
│ │ Remaining: 0 kg back       │ │
│ │                            │ │
│ │ [CONFIRM DELIVERY]         │ │
│ └────────────────────────────┘ │
│                                │
│ STOP NOTES (optional):         │
│ ┌────────────────────────────┐ │
│ │ Goods well received        │ │
│ │ Pls return asap            │ │
│ └────────────────────────────┘ │
│                                │
│ [MARK AS DEPARTED]             │
│                                │
└────────────────────────────────┘
```

**Final Delivery Completion Screen:**
```
┌────────────────────────────────┐
│ DELIVERY COMPLETE   [←]        │
├────────────────────────────────┤
│                                │
│ All stops visited ✓            │
│                                │
│ ACTUAL DELIVERY METRICS        │
│ ┌────────────────────────────┐ │
│ │ Distance traveled: 22 km   │ │
│ │ Fuel used: 7.0 liters      │ │
│ │ Duration: 45 minutes       │ │
│ │                            │ │
│ │ Issues encountered?        │ │
│ │ ┌──────────────────────┐   │ │
│ │ │ No issues            │   │ │
│ │ └──────────────────────┘   │ │
│ │                            │ │
│ │ [COMPLETE DELIVERY]        │ │
│ └────────────────────────────┘ │
│                                │
│ ★ HISTORY                      │
│ Past 5 deliveries              │
│                                │
└────────────────────────────────┘
```

**GPS Geofence Logic (Implemented in Component):**
```javascript
// In component state:
- checkGeofenceRadius(driverLocation, stopLocation)
  - Calculate distance: _distanceMeters(driver.lat/lng, stop.lat/lng)
  - If distance <= 50m: show blue "MARK AS ARRIVED" button
  - If distance > 50m: show gray "MARK AS ARRIVED" button (disabled)
  - Update distance display in real-time every 5 seconds
- GPS tracking runs continuously if route status = 'in_progress'
```

---

## 3. Component Inventory & Modifications

### 3.1 NEW COMPONENTS TO CREATE

#### Shared/Permission Components:
```javascript
// components/shared/RoleGuard.jsx
/**
 * Wrapper component that checks user role and permissions
 * Props: requiredRole (string|array), children
 * Returns: children if authorized, <UnauthorizedView /> if not
 */

// components/shared/ProtectedRoute.jsx
/**
 * Route component that validates role before rendering
 * Props: requiredRole, element, path
 * Redirects to `/unauthorized` or `/login` if not authorized
 */

// components/shared/BaseLayout.jsx
/**
 * Layout wrapper that shows role-specific nav, sidebar, theme
 * Props: children, role
 * Includes: RoleNav, sidebar, main content area
 */

// components/shared/RoleNav.jsx
/**
 * Navigation bar that changes based on user role
 * Shows different menu items for each role
 * Props: role, currentPage, onNavigate
 */

// components/shared/NotificationCenter.jsx
/**
 * Toast/notification display (top-right)
 * Global notification hook integration
 * Props: auto-dismiss, action buttons
 */
```

#### Alerts/Spoilage Components:
```javascript
// components/alerts/SpoilageAlertCard.jsx
/**
 * Single alert display card for list view
 * Props: alert object, onClick, showActions
 * Shows: fruit, qty, days left, risk badge, AI recommendation
 */

// components/alerts/AlertDetailModal.jsx
/**
 * Full-screen or modal view of single alert
 * Props: alertId, onClose, onAction
 * Shows: full details, AI reasoning, actions
 */

// components/alerts/AlertApprovalForm.jsx
/**
 * Form for submitting alert to manager approval
 * Props: alertId, onSubmit
 * Returns: manager_approvals record created
 */

// components/alerts/SpoilageAlertQueue.jsx
/**
 * List of all spoilage alerts for admin
 * Props: filters (status, fruit, riskLevel)
 * Shows: status transitions, filters, search
 */
```

#### Inventory Components:
```javascript
// components/inventory/InventoryTable.jsx
/**
 * Grid/table view of all inventory items
 * Props: filters, sort
 * Columns: fruit, batch#, qty, ripeness, days left, condition
 */

// components/inventory/InventoryWarnings.jsx
/**
 * Visual warnings section (HIGH/MEDIUM risk items)
 * Props: inventory items
 * Shows: badge, item details, action button
 */

// components/inventory/AddProductModal.js [MODIFIED]
/**
 * MODIFICATIONS NEEDED:
 * - All fields must be dropdowns (no free text)
 * - Fruit name: dropdown from global catalog
 * - Ripeness: dropdown
 * - Unit: dropdown (locked to kg for fruits)
 * - Storage conditions: auto-fill on fruit selection
 * - Add ethylene compatibility warning if needed
 * - Validate temperature range before save
 * - Show available vs total qty if adding to existing batch
 */
```

#### Delivery Components:
```javascript
// components/delivery/PlanNewDeliveryModal.jsx [MODIFIED]
/**
 * MODIFICATIONS NEEDED:
 * - Show AVAILABLE quantities (not reserved/allocated)
 * - Recalculate available qty in real-time as user selects items
 * - Driver dropdown: only show drivers for this business
 * - Vehicle type: dropdown with refrigeration options
 * - Multiple stops support (drag to reorder)
 * - Each stop: select fruit, qty, planned arrival time
 * - Show on-map preview
 * Props: onSave
 */

// components/delivery/RouteOptimizer.jsx [NEW]
/**
 * Component that shows AI optimization results
 * Props: routeId, optimizationResults
 * Shows: original vs optimized metrics side-by-side
 * comparison modal with map previews
 */

// components/delivery/DriverMonitor.jsx [NEW]
/**
 * Real-time driver status table + map
 * Props: businessId
 * Shows: driver list with status, location, current stop
 * Map with live GPS markers for each driver
 * Filter: active/assigned/completed
 */

// components/delivery/DeliveryExecutor.jsx [NEW]
/**
 * Driver mobile interface (simplified, touch-optimized)
 * Combined mobile-specific view for drivers
 */

// components/delivery/StopChecklist.jsx [NEW]
/**
 * Stop-level delivery form for drivers
 * Props: stopId, routeId
 * Shows: items to deliver, qty fields, geofence distance
 * Geofence button logic: locked until within 50m
 */

// components/delivery/DeliveryMap.jsx [MODIFIED]
/**
 * MODIFICATIONS NEEDED:
 * - Add live GPS tracking layer for drivers
 * - Show driver locations as animated markers
 * - Display route stops with geofence circles (50m radius)
 * - Real-time route progress indicator
 * - Show estimated vs actual routes overlaid
 * Props: routeId, liveTracking (boolean)
 */
```

#### Approval Components:
```javascript
// components/approvals/SpoilageApprovalQueue.jsx [NEW]
/**
 * Queue view for inventory manager
 * Shows: all pending spoilage_action approvals
 * Props: none (uses hook to fetch)
 * Features: filter, search, bulk actions
 */

// components/approvals/RouteApprovalQueue.jsx [NEW]
/**
 * Queue view for logistics manager
 * Shows: all pending route_optimization approvals
 * Props: none (uses hook to fetch)
 * Features: map preview, metrics comparison
 */

// components/approvals/CarbonApprovalQueue.jsx [NEW]
/**
 * Queue view for sustainability manager
 * Shows: all pending carbon_footprint_records
 * Props: none (uses hook to fetch)
 * Features: variance analysis, climate factors
 */

// components/approvals/ApprovalCard.jsx [NEW]
/**
 * Reusable approval decision card
 * Props: approval object, onApprove, onDecline, type
 * Shows: item details, AI recommendation, decision form
 */
```

#### Carbon Components:
```javascript
// components/carbon/CarbonVerificationQueue.jsx [NEW]
/**
 * Queue view for pending carbon records
 * Shows: deliveries awaiting verification
 * Props: none
 */

// components/carbon/CarbonTrendChart.jsx [NEW]
/**
 * Line chart: estimated vs actual carbon over 30 days
 * Props: businessId, dateRange
 * X-axis: dates, Y-axis: kg CO2
 * Toggle: by route, by product type
 */

// components/carbon/CarbonRecord.jsx [MODIFIED]
/**
 * MODIFICATIONS NEEDED:
 * - Show estimated vs actual comparison
 * - Display calculation method and factors used
 * - Show variance percentage and direction
 * - Include verification status badge
 */
```

#### EcoTrust Components:
```javascript
// components/ecotrust/EcoTrustDisplay.jsx
/**
 * Large score card showing current score + level
 * Props: businessId
 * Shows: score, level name, progress bar to next level
 * Shows: points needed for next level
 */

// components/ecotrust/Leaderboard.jsx
/**
 * Ranked table of top businesses by EcoTrust score
 * Props: businessId (optional, to highlight user's business)
 * Shows: rank, business name, score, level
 * Filter: all-time, this month, this week
 */

// components/ecotrust/TransactionHistory.jsx
/**
 * Scrollable list of all ecotrust_transactions for business
 * Props: businessId
 * Shows: date, action type, points, status
 * Filter by date range
 */

// components/ecotrust/EcoTrustAudit.jsx [NEW]
/**
 * Super Admin view of all system-wide transactions
 * Props: none (system-wide)
 * Shows: transaction list, flag for review, search
 */
```

#### Driver Components:
```javascript
// components/drivers/DriverDashboard.jsx [NEW]
/**
 * Main driver mobile dashboard
 * Props: driverId
 * Shows: today's route, start button, route details
 */

// components/drivers/RouteCard.jsx [NEW]
/**
 * Today's assigned route display
 * Props: routeId
 * Shows: origin, stops in sequence, destination
 */

// components/drivers/DeliveryLogForm.jsx [NEW]
/**
 * Form for entering actual delivery metrics
 * Props: routeId, onSubmit
 * Fields: actual_km, actual_fuel_liters, actual_duration_minutes, notes
 * Shows: metric comparison (planned vs actual)
 */

// components/drivers/StopArrivalGeofence.jsx [NEW]
/**
 * Geofence-gated arrival button
 * Props: stopId, driverLocation, stopLocation
 * Logic: Button locked until distance <= 50m
 * Live distance countdown display
 */
```

#### Admin Components:
```javascript
// components/admin/BusinessRegistry.jsx [NEW]
/**
 * Super Admin business management table
 * Props: none (system-wide)
 * Shows: all businesses, status, actions
 * Actions: View, Edit, Suspend, Delete
 */

// components/admin/BusinessRegistrationModal.jsx [NEW]
/**
 * Form for creating new business account
 * Props: onSuccess
 * Fields: business_name, type, reg#, address, contact
 * Creates: business_profiles + admin user account + sends email
 */

// components/admin/ProductCatalogEditor.jsx [NEW]
/**
 * Super Admin editor for global fruit catalog
 * Props: none
 * Shows: 10 supported fruits with all parameters
 * Edit: temperature ranges, humidity, shelf life
 */

// components/admin/SystemHealthDashboard.jsx [NEW]
/**
 * Super Admin system metrics
 * Props: none
 * Shows: total alerts, pending approvals, AI accuracy rate
 * Charts: trends over 30 days
 */
```

---

### 3.2 COMPONENTS TO MODIFY

#### Login & Authentication:
```javascript
// pages/LoginPage.js [MODIFIED]
/**
 * MODIFICATIONS NEEDED:
 * - After successful login, check user.role
 * - Redirect to role-specific dashboard:
 *   - super_admin → /dashboard/super-admin
 *   - admin → /dashboard/admin
 *   - inventory_manager → /dashboard/inventory-manager
 *   - logistics_manager → /dashboard/logistics-manager
 *   - sustainability_manager → /dashboard/sustainability-manager
 *   - driver → /dashboard/driver (or /mobile/driver)
 * - Store role in AuthContext
 * - Store businessId in AuthContext
 */
```

#### Navigation:
```javascript
// components/Navigation.jsx [MODIFIED]
/**
 * MODIFICATIONS NEEDED:
 * - Parse userRole from AuthContext
 * - Show role-specific menu items only
 * - SUPER_ADMIN: Business Registry | Catalog | Config | Analytics | Audit
 * - ADMIN: Inventory | Delivery | Alerts | EcoTrust | Managers
 * - INVENTORY_MANAGER: Pending Approvals | History | Alerts
 * - LOGISTICS_MANAGER: Pending Approvals | Driver Monitor | History | Map
 * - SUSTAINABILITY_MANAGER: Pending Verifications | Audit | Trends
 * - DRIVER: Today's Route | History | Profile
 * - Add user profile dropdown (name, role, change password, logout)
 */
```

#### Existing Modals:
```javascript
// components/AddProductModal.js [MODIFIED - see Inventory section above]

// components/AIAnalysisModal.js [MODIFIED]
/**
 * MODIFICATIONS NEEDED:
 * - Add role check - only show to relevant roles
 * - Show AI reasoning for recommendations
 * - Display confidence score/percentage
 * - Show factors used in analysis
 */

// components/PlanNewDeliveryModal.jsx [MODIFIED - see Delivery section above]
```

---

### 3.3 NEW HOOKS TO CREATE

```javascript
// hooks/useAuth.js [NEW]
/**
 * Hook: Get current user from AuthContext
 * Returns: { user, role, businessId, loading, logout }
 * Usage: const { role, businessId } = useAuth()
 */

// hooks/useRolePermissions.js [NEW]
/**
 * Hook: Check if user has permission for action
 * Input: requiredRole (string or array)
 * Returns: { hasPermission, allowedRoles }
 * Usage: const { hasPermission } = useRolePermissions(['admin', 'logistics_manager'])
 */

// hooks/useApprovals.js [NEW]
/**
 * Hook: Fetch pending approvals for current user
 * Filters by user's role and business
 * Returns: { approvals, loading, error, approveApproval, declineApproval }
 * Usage: const { approvals } = useApprovals()
 */

// hooks/useGPS.js [NEW]
/**
 * Hook: Get current device GPS location + track over time
 * Returns: { latitude, longitude, accuracy, tracking, error, startTracking, stopTracking }
 * Usage in Driver: const { latitude, longitude } = useGPS()
 * Calls geolocation API, handles permissions
 */

// hooks/useEcoTrust.js [NEW]
/**
 * Hook: Get EcoTrust score, level, transactions
 * Input: businessId
 * Returns: { score, level, nextLevelPoints, transactions, loading }
 * Usage: const { score, level } = useEcoTrust(businessId)
 */

// ... MODIFY EXISTING HOOKS:

// hooks/useProducts.js [MODIFIED]
/**
 * MODIFICATIONS NEEDED:
 * - Add function: calculateAvailableQuantity(productId)
 *   - Get total quantity
 *   - Subtract all quantities allocated to active/in-progress routes
 *   - Return available quantity only
 * - Use in PlanNewDeliveryModal to show dynamic available qty
 */

// hooks/useAlerts.js [MODIFIED]
/**
 * MODIFICATIONS NEEDED:
 * - Filter alerts by current user's role and businessId
 * - Only show alerts for user's business
 * - Add status filter param
 */

// hooks/useDelivery.js [MODIFIED]
/**
 * MODIFICATIONS NEEDED:
 * - Add liveTracking mode for driver GPS
 * - Add getAvailableQuantities() function
 * - Filter routes by user's business
 */
```

---

### 3.4 NEW CONTEXTS TO CREATE

```javascript
// context/AuthContext.js [NEW]
/**
 * Global auth state
 * Values: { user, role, businessId, isAuthenticated, loading }
 * Methods: { logout }
 * Provider: Wraps entire app in App.js
 */

// context/BusinessContext.js [NEW]
/**
 * Global business state
 * Values: { businessId, businessName, businessType, status }
 * Methods: { switchBusiness (for super admin) }
 */

// context/ApprovalContext.js [NEW]
/**
 * Global approval queue state
 * Values: { pendingApprovals, approvals, loading }
 * Methods: { submitApproval, refreshApprovals }
 */

// context/NotificationContext.js [NEW]
/**
 * Global notification state
 * Values: { notifications }
 * Methods: { addNotification, removeNotification, clearAll }
 * Usage: Toast notifications, alerts, confirmations
 */
```

---

### 3.5 NEW SERVICES TO CREATE

```javascript
// services/authService.js [NEW]
/**
 * Authentication service
 * Methods:
 *   - login(email, password) → user, token, role
 *   - logout() → clear session
 *   - resetPassword(email) → send OTP
 *   - verifyOTP(email, otp, newPassword) → update password
 *   - getCurrentUser() → user object
 */

// services/approvalService.js [NEW]
/**
 * Approval management service
 * Methods:
 *   - getPendingApprovals(role) → filtered list
 *   - approveApproval(approvalId, note) → POST /approvals/{id}/approve
 *   - declineApproval(approvalId, reason) → POST /approvals/{id}/decline
 *   - getApprovalHistory(filters) → historical approvals
 */

// services/geoService.js [NEW]
/**
 * GPS & geofencing service
 * Methods:
 *   - getCurrentLocation() → { lat, lng, accuracy }
 *   - calculateDistance(lat1, lng1, lat2, lng2) → meters
 *   - isWithinGeofence(driverLoc, stopLoc, radius) → boolean
 *   - trackDriverLocation(routeId, interval_ms) → continuous updates
 */

// services/inventoryService.js [NEW]
/**
 * Inventory management service
 * Methods:
 *   - getAvailableInventory(productId) → qty minus allocations
 *   - addProductBatch(batch_data) → POST /inventory
 *   - getAlerts() → GET /alerts
 */

// ... MODIFY EXISTING SERVICES:

// services/api.js [MODIFIED]
/**
 * MODIFICATIONS NEEDED:
 * - Add auth token to all requests (Authorization header)
 * - Add error handling: 401 → logout, 403 → unauthorized
 * - Add role check interceptor
 * - All existing endpoints remain, add new role-based endpoints
 */
```

---

## 4. Page Structure by Role

### 4.1 Page Routing Map

```
/login                          → LoginPage.js (all roles)
/dashboard                      → redirects to role-specific
├── /dashboard/super-admin      → SuperAdminDashboard.jsx (super_admin only)
├── /dashboard/admin            → AdminDashboard.jsx (admin only)
├── /dashboard/inventory-manager → InventoryManagerDashboard.jsx (inventory_manager only)
├── /dashboard/logistics-manager → LogisticsManagerDashboard.jsx (logistics_manager only)
├── /dashboard/sustainability-manager → SustainabilityManagerDashboard.jsx (sustainability_manager only)
└── /dashboard/driver           → DriverDashboard.jsx (driver only, mobile-optimized)

/inventory                      → [depends on role, some roles can't access]
/delivery                       → [depends on role, some roles can't access]
/alerts                         → [depends on role, some roles can't access]
/approvals                      → redirects to role-specific approval queue
├── /approvals/spoilage         → SpoilageApprovalQueue.jsx (inventory_manager only)
├── /approvals/routes           → RouteApprovalQueue.jsx (logistics_manager only)
└── /approvals/carbon           → CarbonApprovalQueue.jsx (sustainability_manager only)

/ecotrust                       → EcoTrustDisplay (multiple roles view different things)
/leaderboard                    → Leaderboard.jsx

/unauthorized                   → UnauthorizedPage.jsx (role doesn't have access)
/forgot-password                → ForgotPasswordPage.jsx (all roles)
```

### 4.2 Page Layout Templates

#### Template 1: Dashboard with Tabs (Admin, Inventory Manager, Logistics Manager)
```
┌──────────────────────────────────────────────────┐
│  [Logo]  Navigation Menu         User Profile ▼  │
├──────────────────────────────────────────────────┤
│  [TAB1] [TAB2] [TAB3] [TAB4] [TAB5]              │
├──────────────────────────────────────────────────┤
│                                                  │
│  [LEFT SIDEBAR]  │           [MAIN CONTENT]      │
│  Quick Stats    │                               │
│  Filters        │           Tab content area     │
│  Search         │           (changes by tab)     │
│                 │                               │
│                 │                               │
└──────────────────────────────────────────────────┘
```

#### Template 2: Mobile Single-Column (Driver)
```
┌────────────────────────────────┐
│ Logo/Menu   User Profile [Logout]
├────────────────────────────────┤
│                                │
│  Content                       │
│  (single column, full width)   │
│                                │
│  Large touch-friendly btns     │
│                                │
│  (scrollable if needed)        │
│                                │
│                                │
└────────────────────────────────┘
```

#### Template 3: System Admin (Super Admin)
```
┌──────────────────────────────────────────────────┐
│  [Logo]  Navigation Menu         System ▼        │
├──────────────────────────────────────────────────┤
│  [NAV: Registry|Catalog|Config|Audit|Analytics] │
├──────────────────────────────────────────────────┤
│                                                  │
│  [LEFT SIDEBAR]      │    [MAIN CONTENT]        │
│  • Business Registry │    Selected view area    │
│  • System Health     │    (changes by nav item) │
│  • Catalog           │                          │
│  • EcoTrust Config   │                          │
│  • Audit Log         │                          │
│  • Analytics         │                          │
│                      │                          │
└──────────────────────────────────────────────────┘
```

---

## 5. Workflow UI Flows

### 5.1 SPOILAGE DETECTION & APPROVAL WORKFLOW

**User Journey: Admin (Mr. Dela Cruz)**

```
START: Admin Dashboard
│
├─ Views "Alerts" Tab
│  │
│  ├─ Sees HIGH risk alert card "Saging - 2 days left"
│  │  │
│  │  ├─ Click card → AlertDetailModal opens
│  │  │  ├─ Shows: fruit, qty, batch#, days left, condition
│  │  │  ├─ Shows: AI recommendation text
│  │  │  ├─ Shows: Risk badge (HIGH - red)
│  │  │  └─ Button: "Submit for Approval"
│  │  │
│  │  └─ Click "Submit for Approval"
│  │     │
│  │     └─ Creates manager_approvals record
│  │        ├─ approval_type: 'spoilage_action'
│  │        ├─ required_role: 'inventory_manager'
│  │        ├─ status: 'pending'
│  │        ├─ alert_id: FK to alerts table
│  │        └─ updates alert status to 'pending_review'
│  │
│  └─ Card disappears from admin's list (moved to pending)
│
END OF ADMIN WORKFLOW
```

**User Journey: Inventory Manager (Maria)**

```
START: Inventory Manager Dashboard → PENDING APPROVALS TAB
│
├─ Sees queue of pending spoilage_action approvals
│
├─ Sees card: "Saging 200kg - 2 days left - HIGH RISK"
│  │
│  ├─ Click card → ApprovalCard component expands/opens modal
│  │  ├─ Shows: Full alert details
│  │  ├─ Shows: AI recommendation & reasoning
│  │  ├─ Shows: Risk factors
│  │  └─ Shows: Decision form with Note field
│  │
│  ├─ Types note: "Approved immediate redistribution. Coordinate with logistics."
│  │
│  ├─ Click "APPROVE"
│  │  │
│  │  └─ Backend POST /approvals/{id}/approve
│  │     ├─ manager_approvals.status = 'approved'
│  │     ├─ manager_approvals.decision_note = (note)
│  │     ├─ manager_approvals.approved_by = inventory_manager user_id
│  │     ├─ manager_approvals.approved_at = NOW
│  │     ├─ alert.status = 'approved'
│  │     ├─ inventory.current_condition = 'approved_for_action'
│  │     ├─ Creates ecotrust_transactions record (+points for prevention)
│  │     ├─ Sends notification to Admin: "Spoilage alert approved - 200kg Saging ready for redistribution"
│  │     └─ Returns success response
│  │
│  ├─ Frontend shows toast: "Approval submitted successfully"
│  └─ Card disappears from pending queue
│
├─ Click "HISTORY" tab
│  └─ Sees the approval in history with all details logged
│
END OF INVENTORY MANAGER WORKFLOW
```

**Follow-up: System Notification to Logistics Manager (Jose)**

```
START: Notification pushed to Jose's dashboard
│
├─ New delivery request appears in his PENDING APPROVALS
│  (system automatically created a route_optimization approval when manager approved)
│
├─ Card shows: "Route with 200kg Saging redistribution - needs approval"
│
END OF NOTIFICATION
```

---

### 5.2 ROUTE OPTIMIZATION & DRIVER DELIVERY WORKFLOW

**User Journey: Admin (Mr. Dela Cruz) - Planning Phase**

```
START: Admin Dashboard → DELIVERY Tab
│
├─ Click "Plan New Delivery"
│  │
│  ├─ PlanNewDeliveryModal opens
│  │  │
│  │  ├─ Step 1: Select Origin
│  │  │  └─ Shows: dropdown of warehouses/locations for their business
│  │  │
│  │  ├─ Step 2: Add Stops (multiple stops allowed)
│  │  │  │
│  │  │  ├─ For each stop:
│  │  │  │  │
│  │  │  │  ├─ Select location: dropdown
│  │  │  │  │
│  │  │  │  ├─ Select fruits to deliver
│  │  │  │  │  ├─ Fruit dropdown (shows only fruits in stock)
│  │  │  │  │  ├─ Shows: AVAILABLE quantity (not reserved)
│  │  │  │  │  ├─ Select quantity field
│  │  │  │  │  ├─ Updates total "reserved" for route
│  │  │  │  │  ├─ Validates: total qty for fruit <= available qty
│  │  │  │  │  │  (if user tries to exceed, shows error & blocks)
│  │  │  │  │  └─ Button: "Add another fruit to this stop" (multi-fruit per stop)
│  │  │  │  │
│  │  │  │  ├─ Set planned arrival time: time picker
│  │  │  │  │
│  │  │  │  └─ [REMOVE STOP] button
│  │  │  │
│  │  │  └─ [ADD ANOTHER STOP] button
│  │  │
│  │  ├─ Step 3: Select Destination (final stop)
│  │  │  └─ Usually warehouse/central location
│  │  │
│  │  ├─ Step 4: Select Driver & Vehicle
│  │  │  ├─ Driver dropdown: shows only drivers of this business
│  │  │  └─ Vehicle type dropdown: Refrigerated Truck | Normal Truck | Van
│  │  │
│  │  ├─ Step 5: Review Summary
│  │  │  ├─ Shows: origin → stops → destination
│  │  │  ├─ Shows: fruits per stop with quantities
│  │  │  ├─ Shows: estimated total distance (before AI optimization)
│  │  │  └─ [CREATE ROUTE] button
│  │  │
│  │  └─ Click CREATE ROUTE
│  │     │
│  │     └─ Backend POST /delivery/routes
│  │        ├─ Creates delivery_routes: status = 'planned'
│  │        ├─ Creates route_stops for each stop
│  │        ├─ Marks inventory quantities as "reserved"
│  │        └─ Returns route_id
│  │
│  └─ Modal closes, route appears on dashboard as "PLANNED"
│
├─ Admin sees new route card on dashboard
│  │
│  ├─ Click route card
│  │  └─ Route detail view/modal shows:
│  │     ├─ Origin & stops & destination
│  │     ├─ Fruits per stop with quantities
│  │     ├─ Driver & vehicle
│  │     ├─ Status: PLANNED
│  │     └─ [RUN AI OPTIMIZATION] button
│  │
│  └─ Click "RUN AI OPTIMIZATION"
│     │
│     ├─ Modal shows loading state: "Analyzing route optimization..."
│     │
│     └─ Backend calls AI service:
│        ├─ POST /delivery/routes/{id}/optimize
│        ├─ AI calculates best stop sequence, considers traffic, distance, fuel, CO2
│        ├─ Returns optimized route with metrics:
│        │  ├─ original_distance_km: 28
│        │  ├─ optimized_distance_km: 21
│        │  ├─ fuel_saved_liters: 2.2
│        │  ├─ co2_saved_kg: 6
│        │  └─ stop_sequence: [stop1, stop2, ...] (reordered if needed)
│        │
│        └─ Frontend shows results modal:
│           ├─ Header: "Optimization Complete!"
│           ├─ Comparison cards:
│           │  ├─ Original: 28km | 9.0L | 22kg CO2
│           │  ├─ Optimized: 21km | 6.8L | 16kg CO2
│           │  └─ Savings: 7km | 2.2L | 6kg CO2 ✓
│           ├─ Map preview of optimized route
│           ├─ AI recommendation text
│           └─ Buttons: [ACCEPT] [DECLINE]
│
├─ Admin clicks "ACCEPT"
│  │
│  └─ Backend PUT /delivery/routes/{id}/approve-optimization
│     ├─ delivery_routes.status = 'optimized'
│     ├─ Creates route_optimizations record
│     ├─ Updates route_stops order if resequenced
│     └─ Returns success
│
├─ Admin sees updated route card on dashboard
│  │
│  ├─ Route now shows status: "OPTIMIZED"
│  │
│  └─ New button appears: [SUBMIT FOR APPROVAL]
│
├─ Admin clicks "SUBMIT FOR APPROVAL"
│  │
│  └─ Backend POST /delivery/routes/{id}/submit
│     ├─ Creates manager_approvals:
│     │  ├─ approval_type: 'route_optimization'
│     │  ├─ required_role: 'logistics_manager'
│     │  ├─ status: 'pending'
│     │  ├─ delivery_id: route_id
│     │  └─ optimization_data: (metrics, route details)
│     │
│     ├─ delivery_routes.status = 'awaiting_approval'
│     └─ Sends notification to Logistics Manager
│
├─ Toast: "Route submitted for approval"
│
└─ Route card now grayed out, shows status "AWAITING APPROVAL"
```

**User Journey: Logistics Manager (Jose) - Approval Phase**

```
START: Logistics Manager Dashboard → PENDING APPROVALS Tab
│
├─ Sees route approval queue
│  │
│  ├─ New card appears: "Route R-20260227-001: Saging redistribution"
│  │
│  ├─ Card shows:
│  │  ├─ Origin: Manila Warehouse
│  │  ├─ Stops: Market B (Cubao) → Store C (Quezon City)
│  │  ├─ Driver: Mang Ben
│  │  ├─ Vehicle: Refrigerated Truck
│  │  ├─ Metrics comparison (original vs optimized)
│  │  └─ Map preview
│  │
│  ├─ Click card → full approval detail modal
│  │  │
│  │  ├─ Full route visualization:
│  │  │  ├─ Map with original route (thin line)
│  │  │  ├─ Map with optimized route (thick highlighted line)
│  │  │  ├─ Stop markers with numbers
│  │  │  └─ Distance/time at each segment
│  │  │
│  │  ├─ Detailed metrics:
│  │  │  ├─ Original: 28km | 9.0L | 22kg CO2 | 45 min
│  │  │  ├─ Optimized: 21km | 6.8L | 16kg CO2 | 38 min
│  │  │  └─ Savings: 7km | 2.2L | 6kg CO2 | 7 min
│  │  │
│  │  ├─ AI Recommendation section (why this optimization was chosen)
│  │  │
│  │  └─ Decision form:
│  │     ├─ ○ ACCEPT OPTIMIZATION
│  │     ├─ ○ DECLINE (with reason field)
│  │     └─ Optional manager note field
│  │
│  └─ Jose reviews the route and decides
│
├─ Jose thinks "Looks good, saves fuel, makes sense"
│  │
│  └─ Click "ACCEPT OPTIMIZATION"
│     │
│     └─ Backend POST /approvals/{id}/approve
│        ├─ manager_approvals.status = 'approved'
│        ├─ manager_approvals.approved_by = logistics_manager user_id
│        ├─ manager_approvals.approved_at = NOW
│        ├─ delivery_routes.status = 'approved'
│        ├─ Sends notification to Driver (Mang Ben):
│        │  └─ "You have a new delivery assigned for today"
│        ├─ Sends notification to Admin:
│        │  └─ "Route approved and ready for driver execution"
│        └─ Returns success
│
├─ Frontend toast: "Route approval submitted"
│
├─ Card disappears from pending queue
│
└─ Route ready for driver execution
```

**User Journey: Driver (Mang Ben) - Execution Phase**

```
START: Driver Dashboard (mobile view)
│
├─ Wakes up, checks phone app
│
├─ Sees "TODAY'S DELIVERY" card
│  │
│  ├─ Card shows:
│  │  ├─ Route Status: APPROVED ✓
│  │  ├─ Route: R-20260227-001
│  │  ├─ Origin: Warehouse
│  │  ├─ Stops: Market B → Store C
│  │  ├─ Destination: Warehouse
│  │  ├─ Driver: Mang Ben
│  │  ├─ Vehicle: Refrigerated Truck
│  │  └─ [START DELIVERY] ← BIG BLUE BUTTON
│  │
│  ├─ Mang Ben loads the truck, gets in
│  │
│  └─ Clicks [START DELIVERY]
│     │
│     ├─ App shows confirmation: "Starting delivery route?"
│     │
│     ├─ Mang Ben confirms
│     │
│     └─ Backend POST /delivery/routes/{id}/start
│        ├─ CRITICAL-4: GPS Geofence Validation
│        │  ├─ Receives gpsPayload: { latitude, longitude, accuracy }
│        │  ├─ Parses origin_location from route record
│        │  ├─ Calculates distance via _distanceMeters()
│        │  ├─ Checks: distance <= GEOFENCE_RADIUS_METERS (50m)
│        │  ├─ If distance > 50m:
│        │  │  └─ Returns error: "Driver must be within 50m of origin to start delivery"
│        │  │     (prevents delivery fraud)
│        │  └─ If distance <= 50m: continues
│        │
│        ├─ delivery_routes.status = 'in_progress'
│        ├─ Starts background GPS tracking (every 5 seconds)
│        ├─ Returns route details + stops
│        └─ Success response
│
├─ App screen changes to "ROUTE IN PROGRESS" view
│  │
│  ├─ Shows: Stop 1/2 - Market B (Cubao)
│  │
│  ├─ Shows: Distance to stop (initially 65m away)
│  │
│  ├─ Shows: [MARK AS ARRIVED] button (GRAY/DISABLED - distance > 50m)
│  │
│  ├─ Shows: Live distance countdown
│  │  │
│  │  └─ GPS location updates every 5 seconds
│  │     ├─ Distance: 65m → 55m → 45m → 35m → 25m → 15m → 8m
│  │     │
│  │     └─ When distance <= 50m:
│  │        └─ [MARK AS ARRIVED] button turns BLUE/ENABLED
│  │
│  ├─ Mang Ben drives, gets near Market B
│  │
│  ├─ When close enough (50m threshold):
│  │  │
│  │  └─ Button becomes clickable
│  │     │
│  │     └─ Mang Ben taps [MARK AS ARRIVED]
│  │        │
│  │        └─ Backend POST /delivery/routes/{id}/stops/{stopId}/arrived
│  │           ├─ route_stops.actual_arrival_time = NOW
│  │           ├─ route_stops.status = 'arrived'
│  │           └─ Returns stop details
│  │
│  └─ Screen shows: Delivery items at this stop
│     │
│     ├─ Saging: 150 kg
│     │
│     ├─ Input field: "Actual amount delivered"
│     │  │
│     │  ├─ Stores owner says: "Can only take 130 kg today"
│     │  │
│     │  └─ Mang Ben changes 150 to 130
│     │
│     └─ [CONFIRM DELIVERY] button
│        │
│        └─ Mang Ben taps button
│           │
│           └─ Backend POST /delivery/routes/{id}/stops/{stopId}/confirm
│              ├─ route_stops.delivered_quantity = 130
│              ├─ route_stops.status = 'delivered'
│              ├─ CRITICAL-1: Inventory Deduction (happens later after ALL stops)
│              │  (deduction happens on final route completion, not per-stop)
│              └─ Returns success
│
├─ App screen shows: Next question "Mark as departed?"
│  │
│  └─ Mang Ben confirms
│     │
│     └─ Backend POST /delivery/routes/{id}/stops/{stopId}/departed
│        ├─ route_stops.actual_departure_time = NOW
│        ├─ route_stops.status = 'departed'
│        └─ Removes returned quantity from current allocation
│           └─ 20kg = 150 - 130 goes back to available inventory
│
├─ Screen shows: Stop 2/2 - Store C (Quezon City)
│  │
│  ├─ Same process repeats
│  │  ├─ Drive to stop
│  │  ├─ Wait for geofence (50m)
│  │  ├─ Mark arrived
│  │  ├─ Deliver 50kg Saging + 80kg Mangga
│  │  ├─ Mark departed
│  │  └─ No returns, everything delivered
│  │
│  └─ After final stop: [COMPLETE DELIVERY] button appears
│
├─ Mang Ben drives to destination (warehouse)
│  │
│  ├─ Geofence validation confirms he's at destination
│  │
│  ├─ [COMPLETE DELIVERY] button becomes enabled
│  │
│  └─ Mang Ben taps button
│     │
│     ├─ App shows final form: "Enter Delivery Metrics"
│     │  │
│     │  ├─ "Total distance driven:" [22] km
│     │  ├─ "Fuel used:" [7.0] liters
│     │  ├─ "Duration:" [45] minutes
│     │  ├─ "Issues encountered:" (optional notes field)
│     │  │
│     │  └─ [COMPLETE DELIVERY] button
│     │
│     └─ Mang Ben fills in actual numbers and submits
│        │
│        └─ Backend POST /delivery/routes/{id}/complete
│           ├─ CRITICAL-1: Inventory Deduction
│           │  ├─ Calls _deductInventoryForCompletedRoute(routeId, businessId)
│           │  ├─ For each route_stop that was delivered:
│           │  │  ├─ Find products delivered (from route_allocations or route_stops)
│           │  │  ├─ For each product:
│           │  │  │  └─ SQL: UPDATE inventory SET quantity = GREATEST(0, quantity - delivered_qty)
│           │  │  │     WHERE product_id = ... AND batch_number = ...
│           │  │  └─ Deducted quantities: 130kg Saging, 80kg Mangga, 50kg Saging
│           │  │     Total: 130 + 50 = 180kg Saging, 80kg Mangga
│           │  │
│           │  └─ Remaining inventory:
│           │     ├─ Saging: 200 total - 130 (stop1) - 50 (stop2) = 20 kg remaining
│           │     └─ Mangga: 150 total - 80 (stop2) = 70 kg remaining
│           │
│           ├─ Creates delivery_log record:
│           │  ├─ actual_distance_km: 22
│           │  ├─ actual_fuel_used_liters: 7.0
│           │  ├─ actual_duration_minutes: 45
│           │  ├─ notes: (from driver)
│           │  └─ status: 'completed'
│           │
│           ├─ Calculates carbon from actual fuel: 7.0L * CO2_per_liter = 8.2 kg CO2
│           │
│           ├─ Creates carbon_footprint_record:
│           │  ├─ actual_co2_kg: 8.2
│           │  ├─ verification_status: 'pending' (awaiting sustainability manager)
│           │  ├─ is_actual: FALSE (until verified)
│           │  └─ delivery_id: FK
│           │
│           ├─ delivery_routes.status = 'completed'
│           ├─ delivery_routes.completed_at = NOW
│           ├─ Sends notification to Admin:
│           │  └─ "Delivery completed: 180kg Saging, 80kg Mangga delivered successfully"
│           ├─ Sends notification to Sustainability Manager:
│           │  └─ "New carbon record pending verification from delivery R-20260227-001"
│           └─ Returns success
│
├─ Driver app shows: Delivery complete! ✓
│
├─ Screen shows: Delivery summary
│  ├─ Route completed
│  ├─ Fruits delivered
│  ├─ Carbon footprint: 8.2 kg CO2 (pending verification)
│  └─ [RETURN TO HOME] button
│
└─ Mang Ben done for the day
```

**Follow-up: Admin Dashboard Updates**

```
START: Admin (Mr. Dela Cruz) opens app later
│
├─ Dashboard updates:
│  │
│  ├─ INVENTORY tab:
│  │  └─ Inventory quantities updated:
│  │     ├─ Saging: 200 kg → 20 kg
│  │     └─ Mangga: 150 kg → 70 kg
│  │
│  ├─ DELIVERY tab:
│  │  └─ Route shows: COMPLETED (no longer in-progress)
│  │     ├─ Distance: planned 28km vs actual 22km
│  │     ├─ Fuel: planned 9L vs actual 7L (saved 2L!)
│  │     ├─ CO2: planned 22kg vs actual 8.2kg (pending verification)
│  │     └─ Time: planned 45min vs actual 45min (on target)
│  │
│  ├─ ALERTS tab:
│  │  └─ High risk Saging alert now RESOLVED
│  │
│  └─ ECOTRUST tab:
│     └─ Score increased:
│        ├─ +points for spoilage prevention (from early alert)
│        ├─ +points for optimized delivery (once carbon verified)
│        ├─ Current score: X points (was Y)
│        └─ Status: 50 points needed to reach next level
│
└─ All data consistent, workflow complete!
```

---

### 5.3 CARBON VERIFICATION WORKFLOW

**User Journey: Sustainability Manager (Carlo)**

```
START: Sustainability Manager Dashboard → PENDING VERIFICATIONS
│
├─ New card appears: "Delivery R-20260227-001 Carbon Record"
│  │
│  ├─ Shows:
│  │  ├─ Delivery ID & date
│  │  ├─ Estimated CO2: 22 kg (based on route plan)
│  │  ├─ Actual CO2: 8.2 kg (based on 7L fuel actually used)
│  │  ├─ Variance: -13.8 kg CO2 (63% better than estimated!)
│  │  ├─ Variance %: -63% (significant savings)
│  │  ├─ Driver: Mang Ben
│  │  ├─ Distance: 22 km, Fuel: 7 L, Duration: 45 min
│  │  └─ Calculation method: IPCC Factor
│  │
│  ├─ Click to expand full detail modal
│  │  │
│  │  ├─ Shows detailed breakdown:
│  │  │  ├─ Vehicle type: Refrigerated Truck
│  │  │  ├─ Fuel type: Diesel
│  │  │  ├─ Emission factor: 2.34 kg CO2/liter (IPCC standard)
│  │  │  ├─ Calculation: 7 liters × 2.34 = 16.38 kg CO2 (but adjusted for efficiency)
│  │  │  └─ Final: 8.2 kg CO2 (adjusted for route optimization benefits)
│  │  │
│  │  ├─ Shows comparison chart:
│  │  │  ├─ Estimated bar (22 kg, light color)
│  │  │  ├─ Actual bar (8.2 kg, bright green)
│  │  │  └─ Variance indicator (13.8 kg saved ✓)
│  │  │
│  │  ├─ Shows: All stops delivered (confirms this is complete)
│  │  │
│  │  ├─ Decision form:
│  │  │  ├─ Question: "Does this carbon record look accurate?"
│  │  │  ├─ ○ YES, VERIFY (mark as verified & actual)
│  │  │  └─ ○ NO (request revision)
│  │  │
│  │  ├─ Optional note field
│  │  │
│  │  └─ [SUBMIT] [CANCEL] buttons
│  │
│  └─ Carlo reviews the calculation and thinks "Looks good, realistic"
│     │
│     └─ Clicks [YES, VERIFY]
│        │
│        └─ Backend POST /carbon/{id}/verify
│           ├─ carbon_footprint_records.verification_status = 'verified'
│           ├─ carbon_footprint_records.is_actual = TRUE
│           ├─ carbon_footprint_records.verified_by = sustainability_manager user_id
│           ├─ carbon_footprint_records.verified_at = NOW
│           │
│           ├─ CRITICAL-6: Idempotency Check (in finalizeCarbonVerification)
│           │  ├─ Checks: current verification_status
│           │  ├─ If already 'verified': returns early with isIdempotent: true
│           │  └─ Prevents duplicate EcoTrust transaction
│           │
│           ├─ Creates ecotrust_transactions record:
│           │  ├─ business_id: (from delivery)
│           │  ├─ action_id: 'optimized_delivery_completed'
│           │  ├─ points_earned: (configured by super admin, e.g., 50 points)
│           │  ├─ related_record_type: 'carbon_footprint'
│           │  ├─ related_record_id: carbon record id
│           │  ├─ verification_status: 'verified'
│           │  └─ created_at: NOW
│           │
│           ├─ Recalculates ecotrust_scores:
│           │  ├─ current_score = SUM(ecotrust_transactions.points_earned) for business
│           │  ├─ Determines new level based on point thresholds
│           │  └─ Updates ecotrust_scores record
│           │
│           ├─ Sends notification to Admin:
│           │  └─ "Carbon record verified! Earned 50 EcoTrust points for optimized delivery"
│           │
│           └─ Returns success
│
├─ Frontend toast: "Carbon record verified successfully"
│
└─ Card disappears from pending queue
   (moved to verified history)
```

---

## 6. API Integration Points

### 6.1 Backend API Endpoints (Frontend Consumption)

**Authentication Endpoints:**
```
POST /api/auth/login
├─ Body: { email, password }
├─ Response: { token, user: { user_id, email, role, business_id, name }, expiresIn }
└─ Frontend stores: token (localStorage), user (context)

POST /api/auth/logout
└─ Clears session on backend

POST /api/auth/forgot-password
├─ Body: { email }
└─ Sends OTP to email

POST /api/auth/verify-otp
├─ Body: { email, otp, newPassword }
└─ Validates OTP, updates password

GET /api/auth/me
└─ Returns current logged-in user (refresh on app load)

POST /api/auth/validate-token
└─ Checks if token valid (every 5 min)
```

**Role-Specific Data Endpoints:**
```
GET /api/dashboard/{role}
├─ Returns role-specific dashboard data
├─ Params: role (from user context)
└─ Caches for 5 minutes

GET /api/inventory
├─ Filters: business_id (auto-filled from context)
├─ Returns: products with available qty (not reserved)
└─ Hooks: useProducts()

GET /api/alerts
├─ Filters: business_id, status (pending|approved|declined)
├─ Returns: array of alert objects
└─ Hooks: useAlerts()

GET /api/delivery/routes
├─ Filters: business_id, status
├─ Returns: routes with stops and optimization status
└─ Hooks: useDelivery()

GET /api/delivery/routes/{id}/live-tracking
├─ Real-time WebSocket or polling
├─ Returns: driver GPS location, status, current stop
├─ Hooks: useGPS() + live map component

GET /api/approvals/pending
├─ Filters: approval_type, required_role (auto from user role)
├─ Returns: pending approvals for user's approval queue
└─ Hooks: useApprovals()

GET /api/carbon/pending-verifications
├─ Filters: business_id
├─ Returns: carbon records waiting for verification
└─ Only for sustainability_manager role

GET /api/ecotrust/score
├─ Params: business_id
├─ Returns: { current_score, level, nextLevelPoints, transactions }
└─ Hooks: useEcoTrust()

GET /api/ecotrust/leaderboard
├─ Returns: ranked list of all businesses by score
└─ Accessible by all roles (own business highlighted)
```

**Action Endpoints (POST/PUT):**
```
POST /api/inventory/add-product
├─ Body: { fruit_id, quantity, ripeness, batch_number }
├─ Validates: dropdown values, quantity > 0, storage compatibility
└─ Creates: inventory record

POST /api/delivery/routes/plan
├─ Body: { origin_id, stops: [], destination_id, driver_id, vehicle_type }
├─ Validates: stop quantities <= available inventory
├─ Reserves: quantities from inventory
└─ Returns: route_id

POST /api/delivery/routes/{id}/optimize
├─ Calls AI service (async, webhook callback)
├─ Returns: optimization_id (frontend polls for result)
└─ Webhook updates route status when complete

POST /api/delivery/routes/{id}/start
├─ Body: { latitude, longitude } (GPS payload)
├─ CRITICAL-4: Validates distance <= 50m from origin
├─ Returns: updated route + stops
└─ Starts GPS tracking

POST /api/delivery/routes/{id}/stops/{stopId}/arrived
├─ Updates: route_stops.actual_arrival_time
└─ Returns: stop details

POST /api/delivery/routes/{id}/stops/{stopId}/confirm
├─ Body: { delivered_quantity }
├─ Updates: route_stops.delivered_quantity
└─ Calculates: return quantity if < planned

POST /api/delivery/routes/{id}/stops/{stopId}/departed
├─ Updates: route_stops.actual_departure_time
└─ Deducts returned quantity back to available inventory

POST /api/delivery/routes/{id}/complete
├─ Body: { actual_distance_km, actual_fuel_liters, actual_duration_minutes, notes }
├─ CRITICAL-1: Calls _deductInventoryForCompletedRoute()
├─ Creates: delivery_log + carbon_footprint_record
└─ Returns: completion summary

POST /api/approvals/{id}/approve
├─ Body: { decision_note (optional) }
├─ Updates: manager_approvals.status = 'approved'
├─ Triggers: downstream workflows (EcoTrust transaction, notifications)
└─ Returns: success

POST /api/approvals/{id}/decline
├─ Body: { reason_note }
├─ Updates: manager_approvals.status = 'rejected'
├─ Triggers: CRITICAL-5 (if route rejection, unlocks inventory)
└─ Returns: success

POST /api/carbon/{id}/verify
├─ Body: { note (optional) }
├─ CRITICAL-6: Checks idempotency (verify status already confirmed?)
├─ Creates: ecotrust_transactions if first verification
├─ Updates: ecotrust_scores
└─ Returns: verification success + points earned

POST /api/carbon/{id}/request-revision
├─ Body: { revision_reason }
├─ Updates: carbon record status to 'revision_requested'
└─ Notifies: admin to resubmit
```

**Super Admin Endpoints:**
```
GET /api/admin/businesses
└─ Returns: all businesses (paginated)

POST /api/admin/business
├─ Body: { business_name, business_type, registration_number, address, contact_email }
├─ Creates: business_profiles + admin user + sends email
└─ Returns: success

GET /api/admin/product-catalog
└─ Returns: 10 supported fruits with all parameters

PUT /api/admin/product-catalog/{fruitId}
├─ Body: { temperature_min, temperature_max, humidity_range, shelf_life_days }
└─ Updates: global catalog

POST /api/admin/ecotrust-config
├─ Body: sustainable_actions updates, level thresholds
└─ Updates: system configuration

GET /api/admin/audit-log
├─ Filters: date range, business_id, approval_type, user
├─ Returns: full approval_history records
└─ Exportable as CSV
```

---

### 6.2 WebSocket/Real-Time Connections

**Live GPS Tracking (Driver in Progress):**
```javascript
// Connect when driver starts delivery
const socket = io(API_URL);

socket.on('connect', () => {
  // Join driver room for their route
  socket.emit('join-route-tracking', { routeId, driverId });
});

socket.on('driver-location-update', (data) => {
  // { latitude, longitude, accuracy, timestamp }
  // Update live map component
  updateDriverMarker(data);
  
  // Check geofence if approaching stop
  checkGeofenceProximity(data);
});

socket.on('stop-status-change', (data) => {
  // { stopId, status: 'arrived'|'departed' }
  updateStopUI(data);
});

// Send driver location every 5 seconds
setInterval(() => {
  const location = getCurrentGPSLocation();
  socket.emit('update-driver-location', { routeId, ...location });
}, 5000);

// Disconnect when delivery completed
socket.emit('leave-route-tracking', routeId);
socket.disconnect();
```

**Approval Notifications (Real-Time):**
```javascript
socket.on('new-approval-pending', (data) => {
  // { approvalId, type: 'spoilage'|'route'|'carbon' }
  // Shows toast & updates pending queue
  showNotification(`New ${data.type} approval pending`);
  refreshApprovalQueue();
});

socket.on('approval-decision-received', (data) => {
  // Notified on the approval request submitter's end
  showNotification(`Your approval was ${data.decision}`);
});
```

---

## 7. Implementation Priority & Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Set up auth, role infrastructure, basic navigation

**Tasks:**
- [ ] Create AuthContext + useAuth hook
- [ ] Create ProtectedRoute component + route guards
- [ ] Modify LoginPage to handle role-based redirects
- [ ] Create RoleNav component with role-specific menu items
- [ ] Create BaseLayout wrapper component
- [ ] Set up API auth interceptor (add token to all requests)
- [ ] Create rolePermissions.js utility matrix
- [ ] Create UnauthorizedPage

**Deliverable:** Users can login and see role-appropriate navigation

---

### Phase 2: Dashboards (Weeks 3-5)
**Goal:** Build all 6 role-specific dashboards

**Weekly Breakdown:**
- **Week 3:**
  - [ ] AdminDashboard (tabs: inventory, delivery, alerts, ecotrust, managers)
  - [ ] InventoryManagerDashboard (pending queue + history)
  
- **Week 4:**
  - [ ] LogisticsManagerDashboard (pending queue + driver monitor + map)
  - [ ] SustainabilityManagerDashboard (verify queue + audit)
  
- **Week 5:**
  - [ ] SuperAdminDashboard (business registry, system health, catalog, config, audit)
  - [ ] DriverDashboard (mobile-optimized, touch-friendly)

**Deliverable:** All 6 dashboards functional with data from backend

---

### Phase 3: Approval Workflows (Weeks 6-7)
**Goal:** Implement full approval queue UIs + approval actions

**Tasks:**
- [ ] Create ApprovalCard reusable component
- [ ] Create SpoilageApprovalQueue component
- [ ] Create RouteApprovalQueue component (with map preview)
- [ ] Create CarbonApprovalQueue component (with variance analysis)
- [ ] Implement approve/decline actions
- [ ] Create approval modal forms
- [ ] Add approval history views
- [ ] Implement notifications for new approvals

**Deliverable:** Managers can view, approve, and decline all approval types

---

### Phase 4: Delivery Execution (Weeks 8-10)
**Goal:** Implement driver delivery flow with GPS & geofencing

**Weekly Breakdown:**
- **Week 8:**
  - [ ] Modify PlanNewDeliveryModal (dropdowns, available qty validation)
  - [ ] Create RouteOptimizer component
  - [ ] Implement AI optimization flow
  
- **Week 9:**
  - [ ] Create useGPS hook (geolocation API integration)
  - [ ] Create StopArrivalGeofence component (50m radius button logic)
  - [ ] Implement start delivery flow with GPS validation (CRITICAL-4)
  
- **Week 10:**
  - [ ] Create DeliveryExecutor component (full driver workflow)
  - [ ] Implement delivery logging (stop checklist, quantities, notes)
  - [ ] Implement route completion with metrics entry
  - [ ] Create DeliveryMap with live tracking (real-time driver locations)

**Deliverable:** Drivers can execute full delivery workflow from start to completion

---

### Phase 5: Inventory & Carbon (Weeks 11-12)
**Goal:** Implement inventory management and carbon verification

**Tasks:**
- [ ] Modify AddProductModal (all dropdowns, validation, warnings)
- [ ] Create InventoryTable component with filtering/sorting
- [ ] Modify useProducts hook (calculate available qty)
- [ ] Create CarbonTrendChart component
- [ ] Implement carbon verification workflow
- [ ] Create CarbonVerificationQueue component
- [ ] Add idempotency logic to carbon verification (CRITICAL-6)

**Deliverable:** Full inventory tracking + carbon verification workflow operational

---

### Phase 6: EcoTrust & Leaderboard (Week 13)
**Goal:** Complete EcoTrust score system UI

**Tasks:**
- [ ] Create EcoTrustDisplay component
- [ ] Create Leaderboard component (all businesses)
- [ ] Create TransactionHistory component
- [ ] Create EcoTrustAudit component (super admin)
- [ ] Implement score recalculation updates
- [ ] Add level progression display

**Deliverable:** EcoTrust system fully visible and integrated

---

### Phase 7: Testing & Refinement (Week 14)
**Goal:** Test all workflows, bug fixes, mobile optimization

**Tasks:**
- [ ] End-to-end testing of all user flows
- [ ] Mobile responsiveness testing
- [ ] GPS/geofencing edge case testing
- [ ] Offline capability for driver app
- [ ] Performance optimization (lazy loading, caching)
- [ ] Accessibility audit (a11y, WCAG 2.1)
- [ ] Bug fixes from testing

**Deliverable:** Production-ready frontend

---

### Implementation File Checklist

**NEW FILES TO CREATE:**

Directories:
```
src/components/shared/
src/components/alerts/
src/components/inventory/
src/components/delivery/
src/components/approvals/
src/components/carbon/
src/components/ecotrust/
src/components/admin/
src/components/drivers/
src/pages/dashboards/
src/pages/workflows/
src/context/
src/services/
src/utils/
src/hooks/ (new files in existing dir)
```

Component Files (80+ new files):
```
Shared: RoleGuard.jsx, ProtectedRoute.jsx, BaseLayout.jsx, RoleNav.jsx, NotificationCenter.jsx
Alerts: SpoilageAlertCard.jsx, AlertDetailModal.jsx, AlertApprovalForm.jsx, SpoilageAlertQueue.jsx
Inventory: InventoryTable.jsx, InventoryWarnings.jsx
Delivery: PlanNewDeliveryModal.jsx, RouteOptimizer.jsx, DriverMonitor.jsx, DeliveryExecutor.jsx, StopChecklist.jsx, DeliveryMap (mod)
Approvals: SpoilageApprovalQueue.jsx, RouteApprovalQueue.jsx, CarbonApprovalQueue.jsx, ApprovalCard.jsx
Carbon: CarbonVerificationQueue.jsx, CarbonTrendChart.jsx
EcoTrust: EcoTrustDisplay.jsx, Leaderboard.jsx, TransactionHistory.jsx, EcoTrustAudit.jsx
Admin: BusinessRegistry.jsx, BusinessRegistrationModal.jsx, ProductCatalogEditor.jsx, SystemHealthDashboard.jsx
Drivers: DriverDashboard.jsx, RouteCard.jsx, DeliveryLogForm.jsx, StopArrivalGeofence.jsx
Dashboards: SuperAdminDashboard.jsx, AdminDashboard.jsx, InventoryManagerDashboard.jsx, LogisticsManagerDashboard.jsx, SustainabilityManagerDashboard.jsx, DriverDashboard.jsx
Workflows: SpoilageWorkflow.jsx, DeliveryWorkflow.jsx, CarbonWorkflow.jsx
```

Hook Files (8 new files):
```
useAuth.js, useRolePermissions.js, useApprovals.js, useGPS.js, useEcoTrust.js
+ Modify: useProducts.js, useAlerts.js, useDelivery.js
```

Context Files (4 new files):
```
AuthContext.js, BusinessContext.js, ApprovalContext.js, NotificationContext.js
```

Service Files (5 new files):
```
authService.js, approvalService.js, geoService.js, inventoryService.js
+ Modify: api.js
```

Utility Files (2 new files):
```
rolePermissions.js, gpsUtils.js
```

Page Files (6 new files):
```
SuperAdminDashboard.jsx, AdminDashboard.jsx, InventoryManagerDashboard.jsx, LogisticsManagerDashboard.jsx, SustainabilityManagerDashboard.jsx, DriverDashboard.jsx
+ Modify: LoginPage.js
```

**MODIFIED FILES:**
```
src/components/Navigation.jsx (role-based menu)
src/components/AddProductModal.js (all dropdowns)
src/components/AIAnalysisModal.js (role check)
src/components/PlanNewDeliveryModal.jsx (qty validation)
src/components/DeliveryMap.jsx (live tracking)
src/pages/LoginPage.js (role redirect)
src/services/api.js (auth interceptor)
src/hooks/useProducts.js (available qty)
src/hooks/useAlerts.js (role filter)
src/hooks/useDelivery.js (role filter)
src/App.js (add contexts + protected routes)
```

---

## CRITICAL INTEGRATION POINTS

### Must-Have Backend Dependencies:
1. **Authentication API:** Must return `role` in login response
2. **Authorization:** All endpoints must filter by `business_id` (except super admin)
3. **Real-Time GPS:** WebSocket for driver location updates (every 5 sec)
4. **Approval Queue Endpoints:** Return filtered by user's required_role
5. **Inventory Availability:** Must subtract allocated quantities from available
6. **Carbon Verification:** Must implement idempotency (CRITICAL-6)
7. **EcoTrust Transactions:** Must prevent duplicates (CRITICAL-2)
8. **GPS Geofencing:** Must validate driver location on route start (CRITICAL-4)

### Frontend → Backend Sync:
- Token refresh every 5 minutes (check token validity)
- Notification polling if WebSocket unavailable
- Offline-capable driver app (queue delivery logs, sync when back online)
- Cache approval queues with 30-second refresh
- Cache dashboard data with 5-minute refresh

---

## Summary

This comprehensive frontend implementation guide outlines:

✅ **Architecture:** Role-based component structure with 6 dashboards  
✅ **Components:** 80+ new/modified components organized by feature  
✅ **Data Flow:** Hooks + Context for state management  
✅ **Workflows:** Step-by-step UI flows for all 3 major workflows  
✅ **API Integration:** Complete endpoint mapping  
✅ **Mobile:** Driver-specific mobile-optimized interface  
✅ **Security:** Role-based access control at component level  
✅ **Timeline:** 14-week implementation roadmap  

**Next Step:** Start with Phase 1 (Weeks 1-2) to establish auth infrastructure and role-based navigation, then proceed sequentially through phases.

