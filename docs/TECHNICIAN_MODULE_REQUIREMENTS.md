# 📋 Analisis Kebutuhan: Modul Teknisi Lengkap

## 🎯 Overview

Modul teknisi yang lengkap untuk mengelola jadwal instalasi/maintenance, tracking KPI, dan memberikan akses self-service untuk teknisi agar dapat melihat jadwal dan melakukan report tugas mereka.

---

## 📊 Data yang Tersedia di Sistem

### 1. Technician Model (Current)
```prisma
model Technician {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  name   String
  phone  String
  email  String?
  status String  @default("ACTIVE") // ACTIVE, INACTIVE
  
  installations Installation[]
}
```

### 2. Installation Model (Current)
```prisma
model Installation {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  scheduledDate DateTime?
  completedDate DateTime?
  
  technicianId String?
  technician   Technician? @relation(fields: [technicianId], references: [id])
  
  notes  String?
  status InstallStatus @default(PENDING)
  
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])
}

enum InstallStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
  CANCELLED
}
```

---

## 🎨 Fitur-Fitur yang Diperlukan

### 1. **Admin Module: Manajemen Teknisi**

#### A. Dashboard Teknisi (Admin View)
- **List Semua Teknisi**: 
  - Card atau tabel dengan informasi dasar
  - Status (ACTIVE/INACTIVE)
  - Total tugas yang dikerjakan
  - Rating/KPI summary
  - Quick actions (edit, view schedule, view KPI)

#### B. Manajemen Teknisi
- **CRUD Teknisi**:
  - Create: Tambah teknisi baru
  - Read: Lihat detail teknisi
  - Update: Edit informasi teknisi
  - Delete: Soft delete atau deactivate
- **Informasi Teknisi**:
  - Nama, Phone, Email
  - Status (ACTIVE/INACTIVE)
  - Area kerja (opsional: wilayah yang ditangani)
  - Skill set (opsional: jenis instalasi yang bisa dikerjakan)
  - Tanggal bergabung
  - Foto profil (opsional)

#### C. Penjadwalan Instalasi/Maintenance
- **Calendar View**:
  - Kalender bulanan dengan semua jadwal
  - Filter per teknisi
  - Color coding per status
  - Drag & drop untuk reschedule
- **Assign Task**:
  - Assign instalasi ke teknisi
  - Assign maintenance ke teknisi
  - Bulk assign (multiple tasks ke satu teknisi)
  - Auto-assign berdasarkan lokasi/area kerja
- **Task Types**:
  - **Instalasi Baru**: Installation untuk customer baru
  - **Maintenance**: Perawatan rutin atau perbaikan
  - **Troubleshooting**: Troubleshooting masalah teknis
  - **Upgrade**: Upgrade peralatan/paket

---

### 2. **KPI & Performance Tracking**

#### A. KPI Metrics
- **Completion Rate**: 
  - % tugas yang selesai tepat waktu
  - % tugas yang selesai vs total tugas
- **Average Completion Time**:
  - Rata-rata waktu penyelesaian tugas
  - Breakdown per jenis tugas
- **Customer Satisfaction**:
  - Rating dari customer (jika ada)
  - Feedback/review
- **On-Time Performance**:
  - % tugas yang selesai sesuai jadwal
  - % tugas yang terlambat
- **Task Volume**:
  - Total tugas per periode (hari/minggu/bulan)
  - Breakdown per jenis tugas
- **Quality Metrics**:
  - % tugas yang tidak perlu revisi
  - % tugas yang gagal
  - Rata-rata revisi per tugas

#### B. KPI Dashboard
- **Summary Cards**:
  - Completion Rate
  - Average Completion Time
  - Tasks This Month
  - On-Time Rate
- **Charts**:
  - Trend completion rate over time
  - Task volume per periode
  - Breakdown per task type
  - Performance comparison antar teknisi
- **Leaderboard**:
  - Ranking teknisi berdasarkan KPI
  - Top performers
  - Improvement areas

#### C. KPI Reports
- **Periode Reports**:
  - Harian
  - Mingguan
  - Bulanan
  - Custom range
- **Export**:
  - CSV
  - PDF
  - Excel

---

### 3. **Teknisi Self-Service Module**

#### A. Authentication & Authorization
- **Login System**:
  - Login dengan phone/email + password
  - OTP via WhatsApp (opsional)
  - Session management
- **Role**: `TECHNICIAN`
- **Access Control**:
  - Hanya bisa melihat tugas sendiri
  - Hanya bisa update tugas yang ditugaskan ke mereka
  - Tidak bisa melihat data teknisi lain

#### B. Dashboard Teknisi (Self-Service)
- **Today's Tasks**:
  - List tugas hari ini
  - Urutan berdasarkan waktu/jadwal
  - Status (PENDING, IN_PROGRESS, COMPLETED)
  - Quick actions (start, complete, report)
- **Upcoming Tasks**:
  - Tugas yang akan datang (minggu ini)
  - Calendar view
- **My Stats**:
  - Completion rate bulan ini
  - Tasks completed bulan ini
  - Average completion time
  - On-time rate

#### C. Schedule View
- **Calendar View**:
  - Kalender dengan semua tugas yang di-assign
  - Filter per status
  - Filter per jenis tugas
- **List View**:
  - List semua tugas dengan detail
  - Sort by date, status, priority
  - Search/filter

#### D. Task Details & Reporting
- **View Task Details**:
  - Informasi customer (nama, phone, alamat)
  - Lokasi (dengan map/link Google Maps)
  - Jenis tugas
  - Jadwal
  - Notes/instruksi khusus
  - History (jika ada revisi)
- **Start Task**:
  - Update status ke IN_PROGRESS
  - Record start time
  - Optional: Check-in location (GPS)
- **Complete Task**:
  - Update status ke COMPLETED
  - Record completion time
  - Upload foto (sebelum/sesudah, jika diperlukan)
  - Report form:
    - Status penyelesaian (berhasil/gagal/perlu follow-up)
    - Notes/deskripsi pekerjaan
    - Material/peralatan yang digunakan
    - Waktu yang dibutuhkan
    - Masalah yang ditemukan (jika ada)
    - Rekomendasi (jika ada)
  - Customer signature/confirmation (opsional)
- **Report Issues**:
  - Report masalah selama pengerjaan
  - Request bantuan/support
  - Escalate ke supervisor

---

### 4. **Database Schema Enhancements**

#### A. Enhanced Technician Model
```prisma
model Technician {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Basic Info
  name   String
  phone  String  @unique
  email  String? @unique
  password String? // For self-service login
  
  // Status
  status String  @default("ACTIVE") // ACTIVE, INACTIVE, ON_LEAVE
  
  // Work Area (optional)
  assignedProvinces String[] // Array of province IDs
  assignedCities    String[] // Array of city IDs
  
  // Skills (optional)
  skills String[] // e.g., ["INSTALLATION", "MAINTENANCE", "TROUBLESHOOTING"]
  
  // Profile
  photoUrl String?
  joinDate DateTime @default(now())
  
  // Relations
  installations Installation[]
  maintenanceTasks MaintenanceTask[]
  taskReports TaskReport[]
  kpiRecords KPIRecord[]
}
```

#### B. Enhanced Installation Model
```prisma
model Installation {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Scheduling
  scheduledDate DateTime?
  completedDate DateTime?
  startedDate DateTime? // When technician started the task
  
  // Assignment
  technicianId String?
  technician   Technician? @relation(fields: [technicianId], references: [id])
  
  // Task Details
  taskType TaskType @default(INSTALLATION) // INSTALLATION, MAINTENANCE, TROUBLESHOOTING, UPGRADE
  priority Priority @default(NORMAL) // LOW, NORMAL, HIGH, URGENT
  
  // Status
  notes  String?
  status InstallStatus @default(PENDING)
  
  // Location
  locationNotes String? // Additional location instructions
  
  // Relations
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])
  reports TaskReport[]
}
```

#### C. New Models

**MaintenanceTask Model**:
```prisma
model MaintenanceTask {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Scheduling
  scheduledDate DateTime
  completedDate DateTime?
  startedDate DateTime?
  
  // Assignment
  technicianId String?
  technician   Technician? @relation(fields: [technicianId], references: [id])
  
  // Task Details
  taskType String // ROUTINE, REPAIR, UPGRADE
  priority Priority @default(NORMAL)
  description String?
  locationNotes String?
  
  // Customer
  customerId String
  customer   User @relation(fields: [customerId], references: [id])
  
  // Status
  status TaskStatus @default(PENDING) // PENDING, IN_PROGRESS, COMPLETED, CANCELLED, FAILED
  
  // Relations
  reports TaskReport[]
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
  FAILED
}

enum TaskType {
  INSTALLATION
  MAINTENANCE
  TROUBLESHOOTING
  UPGRADE
}

enum Priority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

**TaskReport Model**:
```prisma
model TaskReport {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Task Reference
  installationId String?
  installation   Installation? @relation(fields: [installationId], references: [id])
  
  maintenanceTaskId String?
  maintenanceTask   MaintenanceTask? @relation(fields: [maintenanceTaskId], references: [id])
  
  // Technician
  technicianId String
  technician   Technician @relation(fields: [technicianId], references: [id])
  
  // Report Details
  status TaskCompletionStatus // SUCCESS, FAILED, NEEDS_FOLLOWUP
  description String @db.Text // What was done
  materialsUsed String? // Materials/equipment used
  timeSpent Int? // Minutes spent
  issuesFound String? // Issues encountered
  recommendations String? // Recommendations
  
  // Media
  photos String[] // Array of photo URLs
  
  // Customer Confirmation
  customerSignature String? // Base64 signature or URL
  customerConfirmed Boolean @default(false)
  customerNotes String?
  
  // Quality Check
  needsRevision Boolean @default(false)
  revisionReason String?
}

enum TaskCompletionStatus {
  SUCCESS
  FAILED
  NEEDS_FOLLOWUP
}
```

**KPIRecord Model**:
```prisma
model KPIRecord {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  
  // Technician
  technicianId String
  technician   Technician @relation(fields: [technicianId], references: [id])
  
  // Period
  periodStart DateTime
  periodEnd DateTime
  periodType PeriodType // DAILY, WEEKLY, MONTHLY
  
  // Metrics
  totalTasks Int @default(0)
  completedTasks Int @default(0)
  onTimeTasks Int @default(0)
  failedTasks Int @default(0)
  
  totalTimeSpent Int @default(0) // Total minutes
  averageTimeSpent Float @default(0) // Average minutes per task
  
  completionRate Float @default(0) // Percentage
  onTimeRate Float @default(0) // Percentage
  
  // Calculated
  tasksPerDay Float? // Average tasks per day
  qualityScore Float? // Based on revision rate, customer satisfaction, etc.
}

enum PeriodType {
  DAILY
  WEEKLY
  MONTHLY
}
```

---

### 5. **Admin Features**

#### A. Technician Management Page
- **List View**:
  - Tabel dengan semua teknisi
  - Filter by status
  - Search by name/phone/email
  - Sort by name, join date, performance
- **Detail View**:
  - Informasi lengkap teknisi
  - Schedule calendar
  - KPI dashboard
  - Task history
  - Edit form

#### B. Schedule Management Page
- **Calendar View**:
  - Full calendar dengan semua tugas
  - Filter by teknisi
  - Filter by status
  - Filter by task type
  - Drag & drop untuk reschedule
- **List View**:
  - List semua tugas
  - Filter & search
  - Bulk actions (assign, reschedule, cancel)
- **Assign Task**:
  - Form untuk assign tugas ke teknisi
  - Auto-suggest teknisi berdasarkan lokasi
  - Conflict detection (jika teknisi sudah ada tugas di waktu yang sama)

#### C. KPI Dashboard Page
- **Overview**:
  - Summary semua teknisi
  - Top performers
  - Areas for improvement
- **Per Teknisi**:
  - Detail KPI per teknisi
  - Trend charts
  - Comparison dengan rata-rata
- **Reports**:
  - Generate reports per periode
  - Export functionality

---

### 6. **Teknisi Self-Service Features**

#### A. Login Page (`/technician/login`)
- Login form
- Phone/Email + Password
- OTP option (via WhatsApp)

#### B. Dashboard (`/technician/dashboard`)
- Today's tasks summary
- Upcoming tasks
- My stats
- Quick actions

#### C. Schedule Page (`/technician/schedule`)
- Calendar view
- List view
- Filter options

#### D. Task Detail Page (`/technician/tasks/[id]`)
- View task details
- Start task button
- Complete task form
- Upload photos
- Report form

#### E. My Performance (`/technician/performance`)
- KPI summary
- Charts & trends
- Task history

---

### 7. **API Endpoints**

#### Admin APIs
- `GET /api/admin/technicians` - List semua teknisi
- `GET /api/admin/technicians/[id]` - Detail teknisi
- `POST /api/admin/technicians` - Create teknisi
- `PATCH /api/admin/technicians/[id]` - Update teknisi
- `DELETE /api/admin/technicians/[id]` - Delete teknisi
- `GET /api/admin/technicians/[id]/schedule` - Jadwal teknisi
- `GET /api/admin/technicians/[id]/kpi` - KPI teknisi
- `GET /api/admin/technicians/[id]/tasks` - Tugas teknisi
- `POST /api/admin/tasks/assign` - Assign tugas
- `GET /api/admin/schedule` - Schedule calendar data
- `GET /api/admin/kpi` - KPI dashboard data

#### Technician APIs (Self-Service)
- `POST /api/technician/auth/login` - Login
- `POST /api/technician/auth/logout` - Logout
- `GET /api/technician/profile` - Profile teknisi
- `PATCH /api/technician/profile` - Update profile
- `GET /api/technician/schedule` - Jadwal saya
- `GET /api/technician/tasks` - Tugas saya
- `GET /api/technician/tasks/[id]` - Detail tugas
- `PATCH /api/technician/tasks/[id]/start` - Start tugas
- `POST /api/technician/tasks/[id]/complete` - Complete & report tugas
- `POST /api/technician/tasks/[id]/report-issue` - Report masalah
- `GET /api/technician/performance` - KPI saya

---

### 8. **UI/UX Considerations**

#### Admin Module
- **Layout**: 
  - Sidebar dengan menu teknisi
  - Main content area
  - Consistent dengan design system existing
- **Color Scheme**:
  - Consistent dengan theme existing
  - Color coding untuk status tasks
- **Responsive**: 
  - Mobile-friendly untuk akses di lapangan
  - Tablet-friendly untuk calendar view

#### Technician Self-Service Module
- **Mobile-First Design**:
  - Optimized untuk smartphone
  - Easy navigation
  - Touch-friendly buttons
- **Simple & Clean**:
  - Focus pada tasks
  - Minimal distractions
  - Quick actions
- **Offline Support** (Future):
  - Cache tasks untuk offline viewing
  - Sync ketika online kembali

---

### 9. **Workflow & Business Logic**

#### A. Task Assignment Flow
1. Admin creates/assigns task
2. Task appears in teknisi's schedule
3. Teknisi receives notification (WhatsApp/Email)
4. Teknisi starts task (update status)
5. Teknisi completes task & submits report
6. System calculates KPI
7. Admin reviews report (optional approval)

#### B. KPI Calculation Flow
- **Daily**: Calculate at end of day
- **Weekly**: Calculate at end of week
- **Monthly**: Calculate at end of month
- **Real-time**: Update on task completion

#### C. Notification Flow
- **Task Assigned**: Notify teknisi via WhatsApp/Email
- **Task Reminder**: Remind teknisi before scheduled time
- **Task Overdue**: Alert jika tugas belum selesai setelah due date
- **KPI Update**: Weekly/monthly summary

---

### 10. **Integration Points**

#### A. WhatsApp Integration
- Send task notifications
- Send reminders
- Receive status updates (opsional)

#### B. Google Maps Integration
- Show location on map
- Get directions
- Distance calculation

#### C. Photo Upload
- Upload photos during task completion
- Store in cloud storage (S3/Cloudinary)
- Compress & optimize

---

## 🚀 Implementation Priority

### Phase 1: Core Features (MVP)
1. ✅ Enhanced Technician & Installation models
2. ✅ MaintenanceTask model
3. ✅ TaskReport model
4. ✅ Admin: Technician management (CRUD)
5. ✅ Admin: Schedule management (calendar view)
6. ✅ Admin: Task assignment
7. ✅ Technician: Login & authentication
8. ✅ Technician: View schedule
9. ✅ Technician: Task detail & completion form

### Phase 2: KPI & Analytics
1. ✅ KPIRecord model
2. ✅ KPI calculation logic
3. ✅ Admin: KPI dashboard
4. ✅ Technician: Performance view
5. ✅ KPI reports & export

### Phase 3: Advanced Features
1. ✅ Auto-assignment based on location
2. ✅ Conflict detection
3. ✅ Bulk operations
4. ✅ Photo upload & management
5. ✅ Customer signature/confirmation
6. ✅ Notification system
7. ✅ Mobile app (optional)

---

## 📝 Questions untuk Diskusi

1. **Authentication**:
   - Apakah teknisi perlu password atau cukup OTP via WhatsApp?
   - Apakah perlu 2FA?

2. **Task Types**:
   - Apakah maintenance perlu model terpisah atau cukup di Installation?
   - Apakah perlu recurring maintenance tasks?

3. **KPI Metrics**:
   - Metrics apa saja yang paling penting?
   - Apakah perlu customer rating/feedback?
   - Bagaimana menghitung quality score?

4. **Notifications**:
   - Channel apa saja yang digunakan? (WhatsApp, Email, SMS, Push)
   - Frequency reminder?

5. **Photo Upload**:
   - Storage solution? (Local, S3, Cloudinary)
   - Size limit?
   - Compression needed?

6. **Location Tracking**:
   - Apakah perlu GPS tracking?
   - Check-in/check-out location?

7. **Approval Workflow**:
   - Apakah report perlu approval dari supervisor?
   - Atau langsung approved setelah submit?

8. **Revisions**:
   - Bagaimana handle tugas yang perlu revisi?
   - Apakah teknisi bisa reassign ke teknisi lain?

---

## 🔄 Migration Plan

### Database Migrations Needed:
1. Add fields to Technician model (password, work area, skills, photo)
2. Add fields to Installation model (taskType, priority, startedDate, locationNotes)
3. Create MaintenanceTask model
4. Create TaskReport model
5. Create KPIRecord model
6. Add enums (TaskType, Priority, TaskStatus, TaskCompletionStatus, PeriodType)

---

## 📚 Referensi

- [Installation Model Schema](../prisma/schema.prisma)
- [Technician Model Schema](../prisma/schema.prisma)
- [Schedule Installation Flow](../src/app/admin/leads/[id]/actions.ts)

---

**Last Updated**: 2025-01-XX
**Status**: Planning - Pending Discussion

