You are a coding assistant with full knowledge of this codebase.
Below are the code signatures extracted by SigMap v6.10.0 on 2026-05-10T09:00:01.417Z.

Use these signatures to answer questions about the code accurately.
When the user asks about a specific file or function, refer to the signatures below.
Before answering questions about specific code areas, prefer running `sigmap ask "<query>"` to get the most relevant files. After config changes, `sigmap validate` confirms coverage.

## Code Signatures

## deps
```
src/app/register/page.tsx ← actions, otp-verification, location-map, package-selector, ktp-upload
src/app/register/otp-verification.tsx ← otp-actions
src/app/technician/dashboard/page.tsx ← login/actions, dashboard-client
src/app/technician/login/page.tsx ← actions
src/app/technician/schedule/page.tsx ← login/actions, schedule-client
src/app/technician/logout/route.ts ← login/actions
src/app/technician/tasks/[id]/page.tsx ← ../login/actions, task-detail-client
src/lib/revenue-pdf-generator.ts ← pdf-generator
src/lib/payment-gate.ts ← prisma, utils
src/app/admin/attention/page.tsx ← actions
src/app/admin/billing/page.tsx ← actions
src/app/admin/billing/unmatched-payments/page.tsx ← unmatched-payments-client
src/app/admin/customers/[id]/page.tsx ← ktp-viewer, signature-viewer, edit-form, ktp-upload, edit-billing-date
src/app/admin/customers/[id]/manual-invoice-button.tsx ← actions
src/app/admin/customers/customer-form.tsx ← actions, ../register/location-map
src/app/admin/customers/customers-list.tsx ← export-button, actions
src/app/admin/customers/new/page.tsx ← customer-form
src/app/admin/hotspot/komisi/page.tsx ← komisi-tabs
src/app/admin/customers/page.tsx ← customers-list
src/app/admin/hotspot/monitor/page.tsx ← monitor-dashboard
src/app/admin/hotspot/servers/[id]/page.tsx ← scheduler-button
src/app/admin/hotspot/sales/page.tsx ← sales-list
src/app/admin/hotspot/packages/page.tsx ← packages-client
src/app/admin/dashboard-charts.tsx ← dashboard-time-filter
src/app/admin/hotspot/komisi/rules/new/page.tsx ← komisi-rule-form
src/app/admin/hotspot/servers/new/page.tsx ← server-form
src/app/admin/hotspot/servers/[id]/edit/page.tsx ← ../new/server-form
src/app/admin/hotspot/packages/new/page.tsx ← package-form
src/app/admin/hotspot/packages/[id]/edit/page.tsx ← ../new/package-form
src/app/admin/hotspot/vouchers/voucher-list.tsx ← server-status-badge
src/app/admin/hotspot/vouchers/page.tsx ← voucher-list
src/app/admin/hotspot/servers/new/server-form.tsx ← connection-log-modal
src/app/admin/layout.tsx ← sidebar, settings/roles/actions
src/app/admin/hotspot/vouchers/new/page.tsx ← voucher-form
src/app/admin/page.tsx ← dashboard-charts
src/app/admin/leads/[id]/page.tsx ← schedule-form, activate-form, payment-flow-selector, complete-installation-button, payment-gate-card
src/app/admin/login/page.tsx ← actions
src/app/admin/leads/[id]/schedule-form.tsx ← actions
src/app/admin/sales/sales-form.tsx ← actions
src/app/admin/sales/[id]/edit/page.tsx ← ../sales-form
src/app/admin/sales/new/page.tsx ← sales-form
src/app/admin/settings/reminder-templates-form.tsx ← actions, ai-actions
src/app/admin/settings/settings-tabs.tsx ← settings-form, terms-form, xendit-form, admin-credentials-form, ai-config-form
src/app/admin/sidebar.tsx ← actions
src/app/admin/settings/roles/page.tsx ← actions
src/app/admin/settings/page.tsx ← settings-tabs
src/app/admin/settings/payment-templates-form.tsx ← actions
src/app/admin/settings/sales-template-form.tsx ← actions
src/app/admin/settings/welcome-template-form.tsx ← actions
src/app/admin/technicians/schedule/page.tsx ← schedule-calendar, schedule-list
src/app/admin/users/page.tsx ← actions, user-list
src/app/admin/users/user-list.tsx ← actions
src/app/admin/technicians/kpi/page.tsx ← kpi-dashboard
src/app/admin/technicians/[id]/edit/page.tsx ← ../technician-form
src/app/admin/whatsapp/chats/[id]/chat-input.tsx ← actions
src/app/admin/whatsapp/chats/[id]/chat-page-client.tsx ← _components/chat-window-chiquita
src/app/admin/whatsapp/chats/layout.tsx ← chat-list, resizable-chats-layout
src/app/admin/whatsapp/settings-form.tsx ← tabs/persona-tab, tabs/variables-tab, tabs/knowledge-tab, whatsapp-status
src/app/admin/whatsapp/chats/[id]/page.tsx ← chat-page-client, customer-context-panel, resizable-layout
src/app/admin/whatsapp/page.tsx ← whatsapp-status, settings-form
src/app/admin/whatsapp/chats/resizable-chats-layout.tsx ← _components/chat-list-chiquita
src/app/technician/kpi/page.tsx ← kpi-client
src/lib/email-welcome.ts ← prisma, email
src/lib/payment-reminder.ts ← prisma, email
src/lib/payment-reminder-manual.ts ← prisma, email, utils/whatsapp-jid
src/lib/invoice-generator.ts ← invoice-utils, reminder-scheduler
src/lib/queue/producer.ts ← ../lib/redis
src/lib/kpi-calculator.ts ← prisma
src/lib/services/routeros-profile-service.ts ← routeros-service, routeros-php-service
src/lib/services/hotspot-voucher-service.ts ← routeros-service, routeros-profile-service, routeros-php-service
src/lib/services/voucher-expiry-detector-service.ts ← routeros-service
src/lib/services/voucher-expiry-service.ts ← routeros-service
src/lib/services/voucher-monitor-service.ts ← routeros-service
src/lib/technician-notification.ts ← prisma, email
worker/queue-consumer.js ← src/lib/evolution-api, src/lib/redis
src/lib/whatsapp-welcome.ts ← prisma
worker/queue-consumer.ts ← src/lib/evolution-api, src/lib/redis
worker/whatsapp.js ← queue-consumer, src/lib/evolution-api
```

## todos
```
src/lib/mikrotik.ts:17  # TODO: Implement actual API call here
```

## changes (last 10 commits — 3 months ago)
```
src/app/admin/attention/page.tsx              +AttentionPage
src/app/admin/attention/actions.ts            +getAttentionItems  +manualBlockUser  +manualUnblockUser  +sendManualBillingReminder
src/app/admin/billing/actions.ts              +recreateXenditInvoice  ~softDeleteInvoice
src/app/admin/billing/receivables/page.tsx    +ReceivablesContent  +ReceivablesPage  ~ReceivablesPage
src/app/admin/billing/unmatched-payments/actions.ts ~searchInvoices
src/app/admin/customers/[id]/edit-location-map.tsx +updateMapLocationWithMap  ~updateMapLocationWithMap  ~EditLocationMap
src/app/admin/customers/[id]/manual-invoice-button.tsx +formatDateInput  +ManualInvoiceButton
src/app/admin/customers/[id]/invoice-actions.tsx +InvoiceActions
src/app/admin/customers/[id]/back-button.tsx  +BackButton
src/app/admin/customers/customer-form.tsx     +handleFinalize  ~CustomerForm  ~handleProvinceChange  ~handleSubmit
src/app/admin/customers/actions.ts            +createInstallationInvoiceAction  +getWelcomeMessagePreviewAction  +sendCustomWelcomeMessageAction  +restoreCustomer
src/app/admin/customers/customers-list.tsx    +CustomersList  ~CustomersList
src/app/admin/customers/export-button.tsx     +ExportButton
src/app/admin/hotspot/komisi/page.tsx         +KomisiPage
src/app/admin/hotspot/monitor/page.tsx        +MonitorPage
src/app/admin/hotspot/servers/[id]/page.tsx   +ServerDetailPage
src/app/admin/hotspot/sales/page.tsx          +SalesPage
src/app/admin/hotspot/sales/sales-list.tsx    +SalesList
src/app/admin/hotspot/komisi/komisi-tabs.tsx  +KomisiTabs
src/app/admin/hotspot/packages/page.tsx       +HotspotPackagesPage
src/app/admin/hotspot/komisi/rules/new/komisi-rule-form.tsx +KomisiRuleForm
src/app/admin/dashboard-charts.tsx            +DashboardCharts  ~DashboardCharts
src/app/admin/hotspot/packages/new/package-form.tsx +PackageForm
src/app/admin/hotspot/komisi/rules/new/page.tsx +NewKomisiRulePage
src/app/admin/hotspot/monitor/monitor-dashboard.tsx +MonitorDashboard
src/app/admin/hotspot/packages/packages-client.tsx +PackagesClient
src/app/admin/hotspot/servers/new/page.tsx    +NewServerPage
src/app/admin/hotspot/servers/[id]/scheduler-button.tsx +SchedulerButton
src/app/admin/hotspot/servers/new/connection-log-modal.tsx +ConnectionLogModal
src/app/admin/hotspot/servers/[id]/edit/page.tsx +EditServerPage
src/app/admin/hotspot/packages/new/page.tsx   +NewPackagePage
src/app/admin/hotspot/packages/[id]/edit/page.tsx +EditPackagePage
src/app/admin/hotspot/vouchers/[id]/page.tsx  +VoucherDetailPage
src/app/admin/hotspot/servers/page.tsx        +HotspotServersPage
src/app/admin/hotspot/vouchers/voucher-list.tsx +VoucherList
src/app/admin/hotspot/vouchers/page.tsx       +VouchersPage
src/app/admin/hotspot/servers/new/server-form.tsx +ServerForm
src/app/admin/hotspot/vouchers/new/voucher-form.tsx +VoucherForm
src/app/admin/leads/[id]/actions.ts           ~markInvoiceAsPaid  ~scheduleInstallation
src/app/admin/layout.tsx                      +AdminLayout  ~AdminLayout
src/app/admin/hotspot/vouchers/new/page.tsx   +NewVoucherPage
src/app/admin/hotspot/vouchers/server-status-badge.tsx +ServerStatusBadge
src/app/admin/login/actions.ts                ~loginAdmin
src/app/admin/login/page.tsx                  ~AdminLoginPage
src/app/admin/leads/[id]/schedule-form.tsx    ~ScheduleForm  ~handleSubmit
src/app/admin/settings/ai-actions.ts          +generateReminderTemplateAction  ~getTokenUsageStats
src/app/admin/sales/actions.ts                ~saveSales  ~deleteSales
src/app/admin/settings/actions.ts             +updateSalesTemplate  +updatePaymentTemplates  ~saveTerms  ~updateWelcomeTemplate
src/app/admin/sales/sales-form.tsx            ~SalesForm
src/app/admin/settings/reminder-templates-form.tsx +handleGenerate  ~ReminderTemplatesForm  ~handleSubmit
src/app/admin/settings/settings-tabs.tsx      +SettingsTabs  ~SettingsTabs
src/app/admin/settings/whatsapp-settings-form.tsx +WhatsAppSettingsClient
src/app/admin/sidebar.tsx                     +Sidebar  +SimpleLink  +CollapsibleMenu  +SubLink
src/app/admin/settings/roles/actions.ts       +getRolePermissions  +updateRolePermissions
src/app/admin/settings/roles/page.tsx         +RolePermissionsPage  +fetchPermissions
src/app/admin/settings/payment-templates-form.tsx +PaymentTemplatesForm  +handleSubmit
src/app/admin/settings/sales-template-form.tsx +SalesTemplateForm  +handleSubmit
src/app/admin/settings/welcome-template-form.tsx ~WelcomeTemplateForm
src/app/admin/technicians/actions.ts          ~saveTechnician
src/app/admin/technicians/schedule/schedule-calendar.tsx +CreateTaskModal  ~CreateTaskModal  ~isSameMonth  ~ScheduleCalendar
src/app/admin/users/page.tsx                  +UsersPage
src/app/admin/users/user-list.tsx             +UserList
src/app/admin/users/actions.ts                +getUsers  +createUser  +updateUser  +updateUserRole
src/app/admin/whatsapp/chats/[id]/chat-page-client.tsx ~ChatPageClient
src/app/admin/whatsapp/whatsapp-status.tsx    +WhatsAppConnection  ~WhatsAppStatus
src/app/api/admin/ai/generate-prompt/route.ts +POST
src/app/admin/whatsapp/chats/[id]/messages-list.tsx ~MessagesList
src/app/admin/whatsapp/settings-form.tsx      +SettingsForm
src/app/admin/whatsapp/chats/_components/chat-list-chiquita.tsx +BadgeMock  +ChatListChiquita
src/app/admin/whatsapp/chats/[id]/customer-context-panel.tsx +CustomerContextPanel
src/app/admin/whatsapp/tabs/persona-tab.tsx   +PersonaTab
src/app/admin/whatsapp/chats/_components/chat-window-chiquita.tsx +ChatWindowChiquita
src/app/admin/whatsapp/page.tsx               ~WhatsAppPage
src/app/admin/whatsapp/tabs/variables-tab.tsx +VariablesTab
src/app/admin/whatsapp/chats/resizable-chats-layout.tsx +ResizableChatsLayout
src/app/admin/whatsapp/chats/[id]/resizable-layout.tsx +ResizableChatLayout
src/app/admin/whatsapp/tabs/knowledge-tab.tsx +KnowledgeTab
src/app/api/admin/billing/revenue-report/route.ts ~getPeriodDates  ~GET
src/app/api/admin/billing/revenue-report/send-report/route.ts ~POST
src/app/api/admin/billing/receivables/send-report/route.ts ~POST  ~calculateAging
src/app/api/admin/dashboard/chart-data/route.ts ~GET
src/app/api/admin/billing/receivables/route.ts ~getAgingBucket  ~GET  ~calculateAging
src/app/api/admin/billing/revenue-report/export/route.ts ~GET
src/app/api/admin/customers/send-welcome/route.ts ~POST
src/app/api/admin/billing/receivables/export/route.ts ~GET  ~calculateAging
src/app/api/admin/customers/export/route.ts   +POST
src/app/api/admin/hotspot/komisi/records/route.ts +checkAdminAuth  +GET
src/app/api/admin/customers/send-welcome-email/route.ts ~POST
src/app/api/admin/hotspot/komisi/rules/route.ts +checkAdminAuth  +GET  +POST
src/app/api/admin/hotspot/packages/[id]/route.ts +checkAdminAuth  +GET  +PUT  +DELETE
src/app/api/admin/hotspot/vouchers/bulk-delete/route.ts +checkAdminAuth  +POST
src/app/api/admin/hotspot/sales/stats/route.ts +checkAdminAuth  +GET
src/app/api/admin/hotspot/vouchers/check-status/route.ts +checkAdminAuth  +POST
src/app/api/admin/hotspot/vouchers/[id]/route.ts +checkAdminAuth  +GET  +DELETE
src/app/api/admin/hotspot/servers/test-connection/route.ts +checkAdminAuth  +POST
src/app/api/admin/hotspot/servers/[id]/route.ts +checkAdminAuth  +encryptPassword  +GET  +PUT
src/app/api/admin/hotspot/servers/route.ts    +checkAdminAuth  +encryptPassword  +GET  +POST
src/app/api/admin/hotspot/sales/route.ts      +checkAdminAuth  +GET  +POST
src/app/api/admin/hotspot/servers/status/route.ts +checkAdminAuth  +GET
src/app/api/admin/hotspot/sessions/route.ts   +checkAdminAuth  +decryptPassword  +GET  +POST
src/app/api/admin/hotspot/packages/route.ts   +checkAdminAuth  +GET  +POST  +DELETE
src/app/api/admin/hotspot/vouchers/batch-send-whatsapp/route.ts +checkAdminAuth  +POST
src/app/api/admin/invoices/route.ts           ~GET
src/app/api/admin/invoices/[id]/send-sales-notification/route.ts +POST
src/app/api/admin/hotspot/vouchers/route.ts   +checkAdminAuth  +GET
src/app/api/admin/hotspot/vouchers/sync-status/route.ts +checkAdminAuth  +POST
src/app/api/admin/hotspot/vouchers/generate/route.ts +checkAdminAuth  +POST
src/app/api/admin/invoices/[id]/send-payment-notification/route.ts +POST
src/app/api/cron/payment-reminder-v2/route.ts +getRandomWhatsAppDelay  ~getRandomWhatsAppDelay  ~delay  ~GET
src/app/api/cron/check-due/route.ts           ~GET
src/app/api/admin/technicians/tasks/route.ts  ~GET  ~POST
src/app/api/admin/technicians/tasks/[id]/route.ts ~GET  ~PATCH
src/app/api/admin/technicians/tasks/create-maintenance/route.ts ~POST
src/app/api/admin/technicians/kpi/[technicianId]/route.ts ~GET
src/app/api/admin/settings/whatsapp/route.ts  +POST
src/app/api/admin/technicians/kpi/route.ts    ~GET
src/app/api/cron/sync-hotspot-sessions/route.ts +POST  +GET
src/app/api/cron/check-expired-vouchers/route.ts +GET  +POST
src/app/api/cron/check-voucher-expiry/route.ts +GET  +POST
src/app/api/admin/sales/route.ts              ~GET
src/app/api/cron/payment-reminder/route.ts    ~GET
src/app/api/reseller/dashboard/route.ts       +checkResellerAuth  +GET
src/app/api/technician/tasks/[id]/complete/route.ts ~POST
src/app/api/technician/tasks/route.ts         ~GET
src/app/api/test/check-steven/route.ts        ~GET
src/app/api/reseller/reports/route.ts         +checkResellerAuth  +GET
src/app/api/technician/tasks/[id]/route.ts    ~GET
src/app/api/reseller/sales/route.ts           +checkResellerAuth  +GET
src/app/api/reseller/komisi/route.ts          +checkResellerAuth  +GET
src/app/api/technician/tasks/[id]/start/route.ts ~POST
src/app/api/public/leads/chat/route.ts        ~POST
src/app/api/technician/kpi/route.ts           ~GET
src/app/api/reseller/login/route.ts           +POST
src/app/api/reseller/vouchers/route.ts        +checkResellerAuth  +GET  +POST
src/app/api/postal-code/search/route.ts       ~GET
src/app/api/settings/whatsapp/route.ts        +GET  +POST
src/app/api/reseller/logout/route.ts          +POST
src/app/api/webhooks/evolution/[[...slug]]/route.ts +POST  +handleQrCodeUpdate  +handleConnectionUpdate  +handleMessagesUpsert
src/app/api/webhooks/xendit/route.ts          ~POST
src/app/api/whatsapp/status/route.ts          ~GET
src/app/api/test/send-steven-reminder/route.ts ~POST
src/app/api/whatsapp/connect/route.ts         +POST  +saveQrCode
src/app/api/upload/task-photo/route.ts        ~POST
src/app/api/whatsapp/customer-info/route.ts   +GET
src/app/api/whatsapp/chats/messages/route.ts  +GET
src/app/api/whatsapp/disconnect/route.ts      ~POST
src/app/api/whatsapp/messages/[id]/route.ts   +DELETE
src/app/register/location-map.tsx             ~LocationMap
src/app/reseller/dashboard/page.tsx           +getResellerId  +ResellerDashboardPage
src/app/reseller/komisi/page.tsx              +getResellerId  +ResellerKomisiPage
src/app/reseller/sales/page.tsx               +getResellerId  +ResellerSalesPage
src/app/reseller/vouchers/page.tsx            +getResellerId  +ResellerVouchersPage
src/app/reseller/layout.tsx                   +getReseller  +ResellerLayout  +ResellerNavLink
src/app/technician/login/actions.ts           ~sendTechnicianOTP  ~loginTechnician  ~logoutTechnician  ~getCurrentTechnician
src/app/reseller-login/page.tsx               +ResellerLoginPage
src/app/reseller-login/layout.tsx             +ResellerLoginLayout
src/lib/ai-service.ts                         +tools  ~AIService
src/lib/email-welcome.ts                      ~sendWelcomeEmailMessage
src/app/technician/tasks/[id]/task-detail-client.tsx ~TaskDetailClient
src/components/ui/button.tsx                  +Button
src/components/ui/input.tsx                   +Input
src/components/ui/badge.tsx                   +Badge
src/lib/payment-reminder.ts                   +getReminderTemplate  ~getReminderTemplate  ~sendEmailReminder  ~sendPaymentReminder
src/lib/payment-reminder-manual.ts            +sendWhatsAppReminder  +getRandomItem  +getTimeBasedGreeting  +getSafeGreeting
src/lib/invoice-generator.ts                  ~calculateInvoiceDetails  ~generateInvoice
src/lib/evolution-api.ts                      +EvolutionApiService
src/lib/redis.ts                              +getRedisClient
src/lib/queue/producer.ts                     +getQueue  +enqueueMessage
src/lib/redis.js                              +getRedisClient
src/lib/kpi-calculator.ts                     ~calculateKPI  ~calculateAndSaveKPI  ~calculateKPIForAllTechnicians
src/lib/permissions.ts                        +hasPermission
src/lib/password.ts                           +hashPassword  +verifyPassword
src/lib/services/routeros-profile-service.ts  +RouterOSProfileService  +untuk
src/lib/services/hotspot-voucher-service.ts   +HotspotVoucherService
src/lib/services/routeros-service.ts          +RouterOSService
src/lib/services/routeros-php-service.ts      +RouterOSPHPService
src/lib/services/voucher-expiry-detector-service.ts +parseMikrotikDuration  +parseValidity  +VoucherExpiryDetectorService
src/lib/services/voucher-expiry-service.ts    +VoucherExpiryService
src/lib/services/voucher-monitor-service.ts   +parseMikrotikDuration  +toInt  +VoucherMonitorService
src/lib/technician-notification.ts            ~sendTaskAssignmentNotification  ~sendTaskUpdateNotification
src/middleware.ts                             +getIp  +checkRateLimit  ~middleware
worker/queue-consumer.js                      +adopt  +fulfilled  +rejected  +step
src/lib/whatsapp-welcome.ts                   +processSpintax  +getWelcomeMessagePreview  +getDefaultWelcomeTemplate  ~getDefaultWelcomeTemplate
worker/queue-consumer.ts                      +setupQueueConsumer
src/lib/services/whatsapp-voucher-service.ts  +WhatsAppVoucherService
src/lib/utils/whatsapp-jid.ts                 +formatPhoneToJid  +isValidJid  +normalizeJid
src/lib/utils.ts                              +formatCurrency  ~formatDate
src/lib/session.ts                            +createSession  +getSession  +destroySession
worker/whatsapp.js                            +adopt  +fulfilled  +rejected  +step
worker/reminder-processor.js                  +adopt  +fulfilled  +rejected  +step
scripts/create-admin.mjs                      +main
scripts/fix-db-conflict.js                    +main
scripts/routeros-php/check_all_servers.php    +decryptPassword
scripts/routeros-php/routeros_api.class.php   +v1  +RouterosAPI  +isIterable  +debug
```

## prisma

### prisma/migrations/20260125000000_add_nik_column/migration.sql
```
INDEX User_nik_key ON User
```

### prisma/migrations/20260120000000_add_payment_flow_system/migration.sql
```
TABLE PaymentFlow
TABLE Promo
TABLE PromoUsage
INDEX Invoice_invoiceNumber_key ON Invoice
INDEX Promo_code_key ON Promo
INDEX PromoUsage_invoiceId_key ON PromoUsage
TYPE InvoiceType
TYPE InvoiceCategory
```

### prisma/migrations/20260123000000_add_ai_models/migration.sql
```
TABLE AIPrompt
TABLE AITokenUsage
TABLE WhatsAppConversation
INDEX AIPrompt_key_key ON AIPrompt
```

### prisma/migrations/20260120000001_add_hotspot_system/migration.sql
```
TABLE SaasTierConfig
TABLE SaasSubscription
TABLE MikrotikServer
TABLE HotspotPackage
TABLE HotspotVoucher
TABLE HotspotUser
TABLE HotspotSession
TABLE VoucherSale
TABLE KomisiRule
TABLE KomisiRecord
INDEX SaasTierConfig_tier_key ON SaasTierConfig
INDEX SaasSubscription_userId_key ON SaasSubscription
INDEX HotspotVoucher_code_key ON HotspotVoucher
INDEX HotspotVoucher_username_key ON HotspotVoucher
INDEX HotspotUser_username_key ON HotspotUser
INDEX HotspotSession_mikrotikSessionId_key ON HotspotSession
INDEX HotspotSession_username_idx ON HotspotSession
INDEX HotspotSession_serverId_idx ON HotspotSession
INDEX HotspotSession_voucherId_idx ON HotspotSession
INDEX HotspotSession_startTime_idx ON HotspotSession
INDEX VoucherSale_resellerUserId_idx ON VoucherSale
INDEX VoucherSale_createdAt_idx ON VoucherSale
INDEX VoucherSale_paymentStatus_idx ON VoucherSale
INDEX KomisiRecord_resellerUserId_idx ON KomisiRecord
INDEX KomisiRecord_status_idx ON KomisiRecord
```

### prisma/migrations/20260121000000_add_collection_status/migration.sql
```
TYPE CollectionStatus
```

### prisma/migrations/manual_add_retry_count_to_whatsapp_outgoing.sql
```
INDEX WhatsAppOutgoing_retryCount_idx ON WhatsAppOutgoing
```

## scripts

### scripts/create-admin.mjs
```
async function main()
```

### scripts/backup-db.sh
```
# Configuration
```

### scripts/fix-db-conflict.js
```
async function main()
```

### scripts/routeros-php/check_all_servers.php
```
function decryptPassword($encryptedPassword)
```

### scripts/setup-github-auth.sh
```
# Script untuk setup GitHub authentication
```

### scripts/setup-firewall.sh
```
# Script untuk setup firewall UFW dan fail2ban
```

### scripts/setup-expired-vouchers-cron.sh
```
# Script untuk setup cron job check expired vouchers
```

### scripts/routeros-php/routeros_api.class.php
```
class RouterosAPI
  function isIterable($var)
  function debug($text)
  function encodeLength($length)
  function connect($ip, $login, $password)
  function disconnect()
```

## src

### src/app/register/package-selector.tsx
```
component PackageSelector
props PackageSelectorProps
hook useState
export PackageSelector
```

### src/app/register/page.tsx
```
component RegisterPage
component SubmitButton
hook useState
hook useEffect
hook useFormStatus
handler onVerified
handler onSelect
handler onLocationChange
handler onLocationSelect
handler onUploadComplete
handler onEnd
handler onChange
```

### src/app/register/otp-verification.tsx
```
component OTPVerification
props OTPVerificationProps
hook useState
export OTPVerification
handler onChange
handler onClick
```

### src/app/register/ktp-upload.tsx
```
component KTPUpload
props KTPUploadProps
hook useState
hook useRef
export KTPUpload
handler onClick
handler onChange
```

### src/app/register/signature-pad.tsx
```
component SignaturePad
props SignaturePadProps
hook useRef
hook useState
export SignaturePad
handler onClick
handler onEnd
```

### src/app/technician/dashboard/dashboard-client.tsx
```
component TechnicianDashboardClient
props TechnicianDashboardClientProps
hook useRouter
hook useState
hook useEffect
export TechnicianDashboardClient
handler onClick
```

### src/app/technician/kpi/kpi-client.tsx
```
component TechnicianKPIClient
props TechnicianKPIClientProps
hook useRouter
hook useState
hook useEffect
export TechnicianKPIClient
handler onRateData
```

### src/app/technician/dashboard/page.tsx
```
component TechnicianDashboardPage
```

### src/app/technician/login/page.tsx
```
component TechnicianLoginPage
hook useState
hook useRouter
handler onSubmit
handler onChange
handler onClick
```

### src/app/technician/schedule/page.tsx
```
component TechnicianSchedulePage
```

### src/app/technician/logout/route.ts
```
export async function POST()
```

### src/app/technician/schedule/schedule-client.tsx
```
component TechnicianScheduleClient
props TechnicianScheduleClientProps
hook useRouter
hook useState
hook useEffect
export TechnicianScheduleClient
handler onChange
handler onClick
```

### src/app/technician/tasks/[id]/page.tsx
```
component TaskDetailPage
props PageProps
```

### src/components/ui/confirmation-dialog.tsx
```
component ConfirmationDialog
props ConfirmationDialogProps
export ConfirmationDialog
handler onClick
```

### src/lib/revenue-pdf-generator.ts
```
export async function generateRevenuePDF(data) → Promise<Buffer>
```

### src/lib/reminder-scheduler.ts
```
export async function schedulePaymentReminders(invoiceId, dueDate)
export async function cancelPendingReminders(invoiceId)
export async function getDueReminders(limit)
export async function markReminderSent(reminderId)
export async function markReminderFailed(reminderId, error)
```

### src/lib/invoice-utils.ts
```
export async function generateInvoiceNumber(type) → Promise<string>
export function calculatePrepaidValidUntil(months, bonusMonths) → Date
export function calculateTrialEndDate(activatedDate, trialDays) → Date
export function getInvoiceDescription(type, category, months?, bonusMonths?) → string
export function calculateNextBillingDate(subscription) → Date | null
```

### src/lib/mikrotik.ts
```
export async function toggleBlockUser(ipAddress, block)
```

### src/lib/date-utils.ts
```
export function addOneMonth(date) → Date
export function addMonths(date, months) → Date
export function isLeapYear(year) → boolean
export function getLastDayOfMonth(year, month) → number
```

### src/lib/pdf-generator.ts
```
export async function generatePDFFromHTML(html) → Promise<Buffer>
export function pdfToBase64(pdfBuffer) → string
export function pdfToDataURL(pdfBuffer) → string
```

### src/lib/email.ts
```
export interface EmailOptions
  to: string
  subject: string
  html: string
  text?: string
export async function sendEmail(options) → Promise<boolean>
```

### src/lib/payment-gate.ts
```
export interface PaymentGateStatus
  hasInvoice: boolean
  isPaid: boolean
  canProceed: boolean
  invoice?: any
export type PaymentGateType
export async function checkPaymentGateStatus(userId, gateType) → Promise<PaymentGateStatus>
export function generateWhatsAppPaymentLink(phoneNumber, invoice, customerName) → string
export function formatInvoiceAmount(amount) → string
```

### src/lib/subscription.ts
```
export async function activateSubscription(userId, prepaidMonths, bonusMonths)
```

### src/lib/xendit.ts
```
export async function createInvoice(params)
export async function getInvoice(invoiceId)
```

### src/lib/whatsapp-send-media.ts
```
export function savePDFToTemp(pdfBuffer, fileName) → string
export function cleanupTempPDF(filePath) → void
```

### src/app/admin/attention/page.tsx
```
component AttentionPage
hook useRouter
hook useState
hook useEffect
handler onClick
```

### src/app/admin/attention/actions.ts
```
export interface AttentionItem
  id: string
  type: AttentionType
  title: string
  description: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  date: Date
  data: any
export type AttentionType
export async function getAttentionItems() → Promise<AttentionItem[]>
export async function manualBlockUser(userId)
export async function manualUnblockUser(userId)
export async function sendManualBillingReminder(invoiceId)
```

### src/app/admin/billing/page.tsx
```
component BillingPage
hook useState
hook useEffect
handler onChange
handler onClick
```

### src/app/admin/billing/actions.ts
```
export async function softDeleteInvoice(invoiceId)
export async function recreateXenditInvoice(invoiceId)
```

### src/app/admin/billing/revenue-report/page.tsx
```
component RevenueReportPage
hook useState
hook useEffect
handler onClick
handler onChange
```

### src/app/admin/billing/receivables/page.tsx
```
component ReceivablesContent
component ReceivablesPage
hook useRouter
hook useSearchParams
hook useState
hook useCallback
hook useRef
hook useEffect
handler onStatus
handler onClick
handler onChange
```

### src/app/admin/billing/unmatched-payments/actions.ts
```
export async function getUnmatchedPayments()
export async function searchInvoices(query)
export async function matchPaymentWithInvoice(paymentTransactionId, invoiceId)
```

### src/app/admin/billing/unmatched-payments/page.tsx
```
component UnmatchedPaymentsPage
```

### src/app/admin/customers/[id]/page.tsx
```
component CustomerDetailsPage
props PageProps
```

### src/app/admin/customers/[id]/edit-location-map.tsx
```
component EditLocationMap
props EditLocationMapProps
hook useRef
hook useState
hook useEffect
export EditLocationMap
handler onClick
```

### src/app/admin/customers/[id]/manual-invoice-button.tsx
```
component ManualInvoiceButton
props ManualInvoiceButtonProps
hook useState
hook useTransition
export ManualInvoiceButton
handler onSubmit
handler onChange
```

### src/app/admin/customers/[id]/invoice-actions.tsx
```
component InvoiceActions
props InvoiceActionsProps
hook useState
hook useRouter
handler onClick
```

### src/app/admin/customers/[id]/back-button.tsx
```
component BackButton
hook useState
hook useEffect
export BackButton
```

### src/app/admin/customers/customer-form.tsx
```
component CustomerForm
props CustomerFormProps
hook useRouter
hook useState
export CustomerForm
handler onChange
handler onLocationSelect
handler onClick
```

### src/app/admin/customers/actions.ts
```
export async function createCustomer(formData)
export async function createInstallationInvoiceAction(userId, amount)
export async function getWelcomeMessagePreviewAction(userId)
export async function sendCustomWelcomeMessageAction(userId, content)
export async function updateCustomer(userId, formData)
export async function deleteCustomer(userId)
export async function restoreCustomer(userId)
export async function updateCustomerKTP(userId, ktpImageUrl)
export async function updateNextBillingDate(userId, nextBillingDate)
export async function updateStartDate(userId, startDate)
export async function createManualInvoice(userId, params)
export async function sendSalesStatusInquiry(customerId)
```

### src/app/admin/customers/customers-list.tsx
```
component CustomersList
props CustomersListProps
hook useRouter
hook useSearchParams
hook useState
hook useEffect
export CustomersList
handler onChange
handler onClick
```

### src/app/admin/customers/new/page.tsx
```
component NewCustomerPage
```

### src/app/admin/customers/export-button.tsx
```
component ExportButton
props ExportButtonProps
hook useState
export ExportButton
handler onClick
```

### src/app/admin/hotspot/komisi/page.tsx
```
component KomisiPage
```

### src/app/admin/customers/page.tsx
```
component CustomersPage
props PageProps
handler onId
```

### src/app/admin/hotspot/monitor/page.tsx
```
component MonitorPage
```

### src/app/admin/hotspot/servers/[id]/page.tsx
```
component ServerDetailPage
props PageProps
```

### src/app/admin/hotspot/sales/page.tsx
```
component SalesPage
props PageProps
```

### src/app/admin/hotspot/sales/sales-list.tsx
```
component SalesList
props SalesListProps
```

### src/app/admin/hotspot/komisi/komisi-tabs.tsx
```
component KomisiTabs
props KomisiTabsProps
hook useState
handler onClick
```

### src/app/admin/hotspot/packages/page.tsx
```
component HotspotPackagesPage
```

### src/app/admin/hotspot/komisi/rules/new/komisi-rule-form.tsx
```
component KomisiRuleForm
props KomisiRuleFormProps
hook useRouter
hook useState
handler onSubmit
handler onChange
```

### src/app/admin/dashboard-charts.tsx
```
component DashboardCharts
props DashboardChartsProps
hook useState
hook useEffect
export DashboardCharts
handler onRangeChange
```

### src/app/admin/hotspot/packages/new/package-form.tsx
```
component PackageForm
props PackageFormProps
hook useRouter
hook useState
handler onSubmit
handler onChange
```

### src/app/admin/hotspot/komisi/rules/new/page.tsx
```
component NewKomisiRulePage
```

### src/app/admin/hotspot/monitor/monitor-dashboard.tsx
```
component MonitorDashboard
props MonitorDashboardProps
hook useState
hook useEffect
handler onClick
```

### src/app/admin/hotspot/packages/packages-client.tsx
```
component PackagesClient
props Props
hook useRouter
hook useState
handler onChange
handler onClick
```

### src/app/admin/hotspot/servers/new/page.tsx
```
component NewServerPage
```

### src/app/admin/hotspot/servers/[id]/scheduler-button.tsx
```
component SchedulerButton
props SchedulerButtonProps
hook useState
hook useEffect
handler onClick
```

### src/app/admin/hotspot/servers/new/connection-log-modal.tsx
```
component ConnectionLogModal
props ConnectionLogModalProps
hook useState
hook useEffect
handler onClick
```

### src/app/admin/hotspot/servers/[id]/edit/page.tsx
```
component EditServerPage
props PageProps
```

### src/app/admin/hotspot/packages/new/page.tsx
```
component NewPackagePage
```

### src/app/admin/hotspot/packages/[id]/edit/page.tsx
```
component EditPackagePage
props PageProps
```

### src/app/admin/hotspot/vouchers/[id]/page.tsx
```
component VoucherDetailPage
props PageProps
```

### src/app/admin/hotspot/servers/page.tsx
```
component HotspotServersPage
```

### src/app/admin/hotspot/vouchers/voucher-list.tsx
```
component VoucherList
props VoucherListProps
hook useRouter
hook useSearchParams
hook useState
hook useRef
hook useEffect
handler onChange
handler onClick
```

### src/app/admin/hotspot/vouchers/page.tsx
```
component VouchersPage
props PageProps
```

### src/app/admin/hotspot/servers/new/server-form.tsx
```
component ServerForm
props ServerFormProps
hook useRouter
hook useState
handler onSubmit
handler onChange
handler onClick
```

### src/app/admin/hotspot/vouchers/new/voucher-form.tsx
```
component VoucherForm
props VoucherFormProps
hook useRouter
hook useState
hook useEffect
handler onSubmit
handler onChange
```

### src/app/admin/leads/[id]/actions.ts
```
export async function assignPaymentFlow(userId, paymentFlowId)
export async function generateInstallationInvoiceForGate(userId)
export async function generateFirstMonthInvoiceForGate(userId, promoCode?)
export async function markInvoiceAsPaid(invoiceId)
export async function activateCustomer(userId, paymentFlowId, packageId, trialDays?, promoCode?)
export async function resetPaymentFlow(userId)
export async function scheduleInstallation(userId, date, technicianId)
export async function completeInstallation(userId)
export async function previewInvoice(userId, type)
export async function archiveInvoice(invoiceId)
```

### src/app/admin/layout.tsx
```
component AdminLayout
```

### src/app/admin/hotspot/vouchers/new/page.tsx
```
component NewVoucherPage
```

### src/app/admin/hotspot/vouchers/server-status-badge.tsx
```
component ServerStatusBadge
props ServerStatusBadgeProps
export ServerStatusBadge
```

### src/app/admin/page.tsx
```
component AdminDashboard
```

### src/app/admin/leads/[id]/page.tsx
```
component LeadDetailsPage
props PageProps
handler onGate
```

### src/app/admin/login/actions.ts
```
export async function loginAdmin(username, password)
```

### src/app/admin/login/page.tsx
```
component AdminLoginPage
hook useState
hook useRouter
handler onSubmit
handler onChange
```

### src/app/admin/leads/[id]/schedule-form.tsx
```
component ScheduleForm
hook useState
export ScheduleForm
handler onSubmit
handler onChange
```

### src/app/admin/sales/page.tsx
```
component SalesPage
```

### src/app/admin/settings/ai-actions.ts
```
export async function updateAIConfig(formData)
export async function getAIConfig()
export async function getTokenUsageStats()
export async function generateReminderTemplateAction(interval, type)
```

### src/app/admin/sales/actions.ts
```
export async function saveSales(formData, id?)
export async function deleteSales(id)
```

### src/app/admin/settings/actions.ts
```
export async function updateAdminCredentials(formData)
export async function saveSettings(formData)
export async function saveTerms(formData)
export async function updateReminderTemplates(data)
export async function updateWelcomeTemplate(data)
export async function updateSalesTemplate(invoiceTemplate, statusInquiryTemplate?)
export async function updatePaymentTemplates(data)
```

### src/app/admin/sales/sales-form.tsx
```
component SalesForm
hook useState
hook useRouter
export SalesForm
```

### src/app/admin/sales/[id]/edit/page.tsx
```
component EditSalesPage
props PageProps
```

### src/app/admin/sales/new/page.tsx
```
component NewSalesPage
```

### src/app/admin/settings/reminder-templates-form.tsx
```
component ReminderTemplatesForm
props ReminderTemplatesFormProps
hook useState
hook useEffect
export ReminderTemplatesForm
handler onChange
handler onSubmit
```

### src/app/admin/settings/settings-tabs.tsx
```
component SettingsTabs
props SettingsTabsProps
hook useState
export SettingsTabs
```

### src/app/admin/settings/whatsapp-settings-form.tsx
```
component WhatsAppSettingsClient
props WhatsAppSettingsProps
hook useRouter
hook useState
handler onChange
handler onClick
```

### src/app/admin/sidebar.tsx
```
component Sidebar
component SimpleLink
component CollapsibleMenu
component SubLink
props SidebarProps
hook usePathname
hook useState
hook useEffect
handler onClick
```

### src/app/admin/settings/roles/actions.ts
```
export async function getRolePermissions(role)
export async function updateRolePermissions(role, modules)
```

### src/app/admin/settings/roles/page.tsx
```
component RolePermissionsPage
hook useState
hook useEffect
handler onClick
```

### src/app/admin/settings/page.tsx
```
component SettingsPage
```

### src/app/admin/settings/payment-templates-form.tsx
```
component PaymentTemplatesForm
props PaymentTemplatesFormProps
hook useState
export PaymentTemplatesForm
handler onSubmit
handler onChange
```

### src/app/admin/settings/sales-template-form.tsx
```
component SalesTemplateForm
props SalesTemplateFormProps
hook useState
export SalesTemplateForm
handler onSubmit
handler onChange
```

### src/app/admin/settings/welcome-template-form.tsx
```
component WelcomeTemplateForm
props WelcomeTemplateFormProps
hook useState
hook useEffect
export WelcomeTemplateForm
handler onSubmit
handler onChange
```

### src/app/admin/technicians/page.tsx
```
component TechniciansPage
```

### src/app/admin/technicians/actions.ts
```
export async function saveTechnician(formData, id?)
```

### src/app/admin/technicians/schedule/schedule-calendar.tsx
```
component ScheduleCalendar
component TaskDetailModal
component CreateTaskModal
component EditTaskModal
props ScheduleCalendarProps
hook useState
hook useEffect
export ScheduleCalendar
handler onClick
handler onChange
handler onEdit
handler onSubmit
```

### src/app/admin/technicians/schedule/page.tsx
```
component ScheduleManagementPage
```

### src/app/admin/users/page.tsx
```
component UsersPage
```

### src/app/admin/users/user-list.tsx
```
component UserList
props UserListProps
hook useState
hook useRouter
hook useSearchParams
hook useEffect
handler onChange
handler onClick
handler onSubmit
```

### src/app/admin/users/actions.ts
```
export async function getUsers(query?, role?, status?)
export async function createUser(data)
export async function updateUser(userId, data)
export async function updateUserRole(userId, role)
export async function deleteUser(userId)
```

### src/app/admin/technicians/kpi/page.tsx
```
component TechnicianKPIPage
```

### src/app/admin/technicians/[id]/edit/page.tsx
```
component EditTechnicianPage
props PageProps
```

### src/app/admin/whatsapp/chats/[id]/chat-input.tsx
```
component ChatInput
props ChatInputProps
hook useState
handler onChange
handler onKeyDown
handler onClick
```

### src/app/admin/whatsapp/chats/[id]/chat-page-client.tsx
```
component ChatPageClient
props ChatPageClientProps
```

### src/app/admin/whatsapp/chats/layout.tsx
```
component ChatsLayout
```

### src/app/admin/whatsapp/whatsapp-status.tsx
```
component WhatsAppConnection
hook useState
hook useRef
hook useEffect
handler onChange
handler onClick
```

### src/app/api/admin/ai/generate-prompt/route.ts
```
export async function POST(request)
```

### src/app/admin/whatsapp/chats/[id]/messages-list.tsx
```
component MessagesList
props MessagesListProps
hook useState
hook useRef
hook useEffect
```

### src/app/admin/whatsapp/settings-form.tsx
```
component SettingsForm
hook useState
hook useEffect
handler onSubmit
handler onChange
handler onSave
```

### src/app/admin/whatsapp/chats/_components/chat-list-chiquita.tsx
```
component BadgeMock
component ChatListChiquita
hook useState
hook useEffect
export ChatListChiquita
```

### src/app/admin/whatsapp/chats/[id]/customer-context-panel.tsx
```
component CustomerContextPanel
props CustomerContextPanelProps
hook useState
hook useEffect
handler onSubmit
handler onChange
```

### src/app/admin/whatsapp/chats/[id]/page.tsx
```
component ChatDetailPage
props PageProps
```

### src/app/admin/whatsapp/tabs/persona-tab.tsx
```
component PersonaTab
props PersonaTabProps
hook useState
handler onChange
handler onKeyDown
handler onClick
handler onSubmit
```

### src/app/admin/whatsapp/chats/_components/chat-window-chiquita.tsx
```
component ChatWindowChiquita
hook useState
hook useRef
hook useEffect
export ChatWindowChiquita
handler onClick
handler onChange
handler onKeyDown
```

### src/app/admin/whatsapp/page.tsx
```
component WhatsAppPage
```

### src/app/admin/whatsapp/chats/chat-list.tsx
```
component ChatList
props ChatListProps
hook useState
hook usePathname
hook useEffect
```

### src/app/admin/whatsapp/tabs/variables-tab.tsx
```
component VariablesTab
props VariablesTabProps
hook useState
handler onSubmit
handler onChange
handler onClick
```

### src/app/admin/whatsapp/qr-code-display.tsx
```
component QRCodeDisplay
props QRCodeDisplayProps
hook useState
```

### src/app/admin/whatsapp/chats/resizable-chats-layout.tsx
```
component ResizableChatsLayout
props ResizableChatsLayoutProps
hook useState
hook useRef
hook useEffect
handler onSelectChat
handler onMouseDown
```

### src/app/admin/whatsapp/chats/[id]/resizable-layout.tsx
```
component ResizableChatLayout
props ResizableChatLayoutProps
hook useState
hook useRef
hook useEffect
handler onMouseDown
```

### src/app/admin/whatsapp/tabs/knowledge-tab.tsx
```
component KnowledgeTab
props KnowledgeTabProps
hook useState
handler onSubmit
handler onChange
```

### src/app/api/admin/billing/revenue-report/route.ts
```
export async function GET(request)
```

### src/app/api/admin/billing/revenue-report/send-report/route.ts
```
export async function POST(request)
```

### src/app/api/admin/billing/receivables/send-report/route.ts
```
export async function POST(request)
```

### src/app/api/admin/dashboard/chart-data/route.ts
```
export async function GET(request)
```

### src/app/api/admin/billing/receivables/route.ts
```
export async function GET(request)
```

### src/app/api/admin/billing/revenue-report/export/route.ts
```
export async function GET(request)
```

### src/app/api/admin/customers/send-welcome/route.ts
```
export async function POST(request)
```

### src/app/api/admin/billing/receivables/export/route.ts
```
export async function GET(request)
```

### src/app/api/admin/customers/export/route.ts
```
export async function POST(req)
```

### src/app/api/admin/hotspot/komisi/records/route.ts
```
export async function GET(request)
```

### src/app/api/admin/customers/send-welcome-email/route.ts
```
export async function POST(request)
```

### src/app/api/admin/hotspot/komisi/rules/route.ts
```
export async function GET(request)
export async function POST(request)
```

### src/app/api/admin/hotspot/packages/[id]/route.ts
```
export async function GET(request, { params })
export async function PUT(request, { params })
export async function DELETE(request, { params })
```

### src/app/api/admin/hotspot/vouchers/bulk-delete/route.ts
```
export async function POST(request)
```

### src/app/api/admin/hotspot/sales/stats/route.ts
```
export async function GET(request)
```

### src/app/api/admin/hotspot/vouchers/check-status/route.ts
```
export async function POST(request)
```

### src/app/api/admin/hotspot/vouchers/[id]/route.ts
```
export async function GET(request, { params })
export async function DELETE(request, { params })
```

### src/app/api/admin/hotspot/servers/test-connection/route.ts
```
export async function POST(request)
```

### src/app/api/admin/hotspot/servers/[id]/route.ts
```
export async function GET(request, { params })
export async function PUT(request, { params })
export async function DELETE(request, { params })
```

### src/app/api/admin/hotspot/servers/route.ts
```
export async function GET(request)
export async function POST(request)
```

### src/app/api/admin/hotspot/sales/route.ts
```
export async function GET(request)
export async function POST(request)
```

### src/app/api/admin/hotspot/servers/status/route.ts
```
export async function GET(request)
```

### src/app/api/admin/hotspot/sessions/route.ts
```
export async function GET(request)
export async function POST(request)
```

### src/app/api/admin/hotspot/packages/route.ts
```
export async function GET(request)
export async function POST(request)
export async function DELETE(request)
```

### src/app/api/admin/hotspot/vouchers/batch-send-whatsapp/route.ts
```
export async function POST(request)
```

### src/app/api/admin/invoices/route.ts
```
export async function GET(request)
```

### src/app/api/admin/invoices/[id]/send-sales-notification/route.ts
```
export async function POST(req, props)
```

### src/app/api/admin/hotspot/vouchers/route.ts
```
export async function GET(request)
```

### src/app/api/admin/hotspot/vouchers/sync-status/route.ts
```
export async function POST(request)
```

### src/app/api/admin/hotspot/vouchers/generate/route.ts
```
export async function POST(request)
```

### src/app/api/admin/invoices/[id]/send-payment-notification/route.ts
```
export async function POST(req, props)
```

### src/app/api/cron/payment-reminder-v2/route.ts
```
export async function GET()
```

### src/app/api/cron/check-due/route.ts
```
export async function GET()
```

### src/app/api/admin/technicians/tasks/route.ts
```
export async function GET(request)
export async function POST(request)
```

### src/app/api/admin/technicians/tasks/[id]/route.ts
```
export async function GET(request, { params })
export async function PATCH(request, { params })
```

### src/app/api/admin/technicians/tasks/create-maintenance/route.ts
```
export async function POST(request)
```

### src/app/api/admin/technicians/kpi/[technicianId]/route.ts
```
export async function GET(request, { params })
```

### src/app/api/admin/settings/whatsapp/route.ts
```
export async function POST(request)
```

### src/app/api/admin/technicians/kpi/route.ts
```
export async function GET(request)
export async function POST(request)
```

### src/app/api/cron/sync-hotspot-sessions/route.ts
```
export async function POST(request)
export async function GET(request)
```

### src/app/api/cron/check-expired-vouchers/route.ts
```
export async function GET(request)
export async function POST(request)
```

### src/app/api/cron/check-voucher-expiry/route.ts
```
export async function GET(request)
export async function POST(request)
```

### src/app/api/admin/sales/route.ts
```
export async function GET()
```

### src/app/api/cron/payment-reminder/route.ts
```
export async function GET()
```

### src/app/api/reseller/dashboard/route.ts
```
export async function GET(request)
```

### src/app/api/technician/tasks/[id]/complete/route.ts
```
export async function POST(request, { params })
```

### src/app/api/technician/tasks/route.ts
```
export async function GET(request)
```

### src/app/api/test/check-steven/route.ts
```
export async function GET()
```

### src/app/api/reseller/reports/route.ts
```
export async function GET(request)
```

### src/app/api/technician/tasks/[id]/route.ts
```
export async function GET(request, { params })
```

### src/app/api/reseller/sales/route.ts
```
export async function GET(request)
```

### src/app/api/reseller/komisi/route.ts
```
export async function GET(request)
```

### src/app/api/technician/tasks/[id]/start/route.ts
```
export async function POST(request, { params })
```

### src/app/api/public/leads/chat/route.ts
```
export async function POST(request)
```

### src/app/api/technician/kpi/route.ts
```
export async function GET(request)
```

### src/app/api/reseller/login/route.ts
```
export async function POST(request)
```

### src/app/api/reseller/vouchers/route.ts
```
export async function GET(request)
export async function POST(request)
```

### src/app/api/postal-code/search/route.ts
```
export async function GET(request)
```

### src/app/api/settings/whatsapp/route.ts
```
export async function GET()
export async function POST(request)
```

### src/app/api/reseller/logout/route.ts
```
export async function POST(request)
```

### src/app/api/webhooks/evolution/[[...slug]]/route.ts
```
export async function POST(req)
```

### src/app/api/webhooks/xendit/route.ts
```
export async function POST(request)
```

### src/app/api/whatsapp/status/route.ts
```
export async function GET(request)
```

### src/app/api/test/send-steven-reminder/route.ts
```
export async function POST()
```

### src/app/api/whatsapp/connect/route.ts
```
export async function POST()
```

### src/app/api/upload/task-photo/route.ts
```
export async function POST(request)
```

### src/app/api/whatsapp/customer-info/route.ts
```
export async function GET(request)
```

### src/app/api/whatsapp/chats/messages/route.ts
```
export async function GET(req)
```

### src/app/api/whatsapp/disconnect/route.ts
```
export async function POST()
```

### src/app/api/whatsapp/messages/[id]/route.ts
```
export async function DELETE(request, props)
```

### src/app/register/location-map.tsx
```
component LocationMap
props LocationMapProps
hook useRef
hook useState
hook useEffect
export LocationMap
handler onClick
```

### src/app/globals.css
```
var --background
var --foreground
var --card
var --card-foreground
var --popover
var --popover-foreground
var --primary
var --primary-foreground
var --secondary
var --secondary-foreground
var --muted
var --muted-foreground
var --accent
var --accent-foreground
var --destructive
var --destructive-foreground
var --border
var --input
var --ring
var --radius
```

### src/app/reseller/dashboard/page.tsx
```
component ResellerDashboardPage
```

### src/app/reseller/komisi/page.tsx
```
component ResellerKomisiPage
```

### src/app/reseller/sales/page.tsx
```
component ResellerSalesPage
```

### src/app/reseller/vouchers/page.tsx
```
component ResellerVouchersPage
```

### src/app/reseller/layout.tsx
```
component ResellerLayout
component ResellerNavLink
```

### src/app/technician/login/actions.ts
```
export async function sendTechnicianOTP(phone)
export async function loginTechnician(phone, password?, otp?)
export async function logoutTechnician()
export async function getCurrentTechnician()
```

### src/app/technician/kpi/page.tsx
```
component TechnicianKPIPage
```

### src/app/reseller-login/page.tsx
```
component ResellerLoginPage
hook useRouter
hook useState
handler onSubmit
handler onChange
```

### src/app/reseller-login/layout.tsx
```
component ResellerLoginLayout
```

### src/lib/ai-service.ts
```
export class AIService
```

### src/lib/email-welcome.ts
```
export async function sendWelcomeEmailMessage(userId, forceResend) → Promise<boolean>
```

### src/app/technician/tasks/[id]/task-detail-client.tsx
```
component TaskDetailClient
props TaskDetailClientProps
hook useRouter
hook useState
hook useEffect
export TaskDetailClient
handler onSubmit
handler onChange
handler onClick
```

### src/components/ui/button.tsx
```
component Button
handler onVariants
```

### src/components/ui/input.tsx
```
component Input
```

### src/components/ui/badge.tsx
```
component Badge
export BadgeProps
```

### src/lib/payment-reminder.ts
```
export async function sendPaymentReminder(invoiceId, reminderType, reminderId?) → Promise<
```

### src/lib/payment-reminder-manual.ts
```
export async function sendPaymentReminderManual(invoiceId, options) → Promise<
```

### src/lib/invoice-generator.ts
```
export async function calculateInvoiceDetails(params)
export async function generateInvoice(params)
export async function generateInstallationInvoice(userId, paymentFlowId, promoCode?)
export async function previewInstallationInvoice(userId, paymentFlowId, promoCode?)
export async function generateFirstMonthInvoice(userId, paymentFlowId, promoCode?)
export async function previewFirstMonthInvoice(userId, paymentFlowId, promoCode?)
```

### src/lib/evolution-api.ts
```
export class EvolutionApiService
  constructor()
  async sendTextMessage(jid, text)
  async sendMediaMessage(jid, mediaType, mediaUrl, caption?, fileName?)
  async sendPresence(jid, presence, delay?)
```

### src/lib/redis.ts
```
export function getRedisClient() → Redis
```

### src/lib/queue/producer.ts
```
export function getQueue() → Queue
export async function enqueueMessage(jid, text, priority)
```

### src/lib/redis.js
```
export function getRedisClient()
```

### src/lib/kpi-calculator.ts
```
export interface KPIMetrics
  totalTasks: number
  completedTasks: number
  onTimeTasks: number
  failedTasks: number
  totalTimeSpent: number
  averageTimeSpent: number
  completionRate: number
  onTimeRate: number
export async function calculateKPI(technicianId, periodStart, periodEnd) → Promise<KPIMetrics>
export async function calculateAndSaveKPI(technicianId, periodStart, periodEnd, periodType) → Promise<void>
export async function calculateKPIForAllTechnicians(periodStart, periodEnd, periodType) → Promise<void>
```

### src/lib/permissions.ts
```
export type ModuleType
export function hasPermission(userPermissions, module) → boolean
```

### src/lib/password.ts
```
export async function hashPassword(password) → Promise<string>
export async function verifyPassword(password, hash) → Promise<boolean>
```

### src/lib/services/routeros-profile-service.ts
```
export class RouterOSProfileService
```

### src/lib/services/hotspot-voucher-service.ts
```
export interface VoucherGenerationOptions
  prefix?: string
  codeLength?: number
  combination?: 'ALPHANUMERIC' | 'NUMERIC' | 'ALPHA
  username?: boolean
  password?: boolean
export class HotspotVoucherService
  async generateVouchers(serverId, packageId, quantity, options, resellerUserId?)
  async activateVoucher(code) → Promise<any>
  async syncVoucherToMikrotik(voucherId) → Promise<void>
```

### src/lib/services/routeros-service.ts
```
export interface MikrotikConnectionConfig
  host: string
  port: number
  username: string
  password: string
  useSSL?: boolean
  timeout?: number
export interface HotspotUserData
  username: string
  password?: string
  profile?: string
  limitUptime?: string
  disabled?: boolean
  comment?: string
export interface HotspotUserUpdate
  password?: string
  profile?: string
  limitUptime?: string
  disabled?: boolean
  comment?: string
export class RouterOSService
  async connect(serverId, config) → Promise<RouterOSAPIT
```

### src/lib/services/routeros-php-service.ts
```
export interface RouterOSPHPConfig
  host: string
  port: number
  username: string
  password: string
export interface ProfileParams
  profileName: string
  downloadSpeed?: string
  uploadSpeed?: string
  rateLimit?: string
  limitUptime?: string
  sharedUsers?: number
  statusAutorefresh?: string
  addressPool?: string
export interface UserParams
  username: string
  password?: string
  profile?: string
  limitUptime?: string
  macCookieTimeout?: string
  addMacCookie?: boolean
  disabled?: boolean
  comment?: string
export class RouterOSPHPService
  constructor()
```

### src/lib/services/voucher-expiry-detector-service.ts
```
export class VoucherExpiryDetectorService
  start() → void
  stop() → void
  async checkExpiredVouchers() → Promise<
```

### src/lib/services/voucher-expiry-service.ts
```
export class VoucherExpiryService
  async expireVoucher(voucherId) → Promise<
  async checkAndExpireVouchers() → Promise<
```

### src/lib/services/voucher-monitor-service.ts
```
export class VoucherMonitorService
  async syncAllServersAndUpdateVouchers() → Promise<
  async syncServerSessions(serverId) → Promise<
```

### src/lib/technician-notification.ts
```
export async function sendTaskAssignmentNotification(technicianId, task) → Promise<boolean>
export async function sendTaskUpdateNotification(technicianId, task, updateType) → Promise<boolean>
```

### src/middleware.ts
```
export async function middleware(request)
```

### src/lib/whatsapp-welcome.ts
```
export async function sendWelcomeWhatsAppMessage(userId, forceResend, customContent?) → Promise<boolean>
export async function getWelcomeMessagePreview(userId) → Promise<string | null>
export function getDefaultWelcomeTemplate() → string
```

### src/lib/services/whatsapp-voucher-service.ts
```
export class WhatsAppVoucherService
  async sendVoucher(voucherId, phoneNumber) → Promise<void>
  async sendVouchers(voucherIds, phoneNumber) → Promise<void>
```

### src/lib/utils/whatsapp-jid.ts
```
export function formatPhoneToJid(phoneNumber) → string
export function isValidJid(jid) → boolean
export function normalizeJid(jid) → string
```

### src/lib/utils.ts
```
export function cn(...inputs)
export function formatDate(date)
export function formatCurrency(amount) → string
```

### src/lib/session.ts
```
export interface JWTPayload
  sub: string
  role: string
  name?: string
export async function createSession(payload) → Promise<void>
export async function getSession() → Promise<JWTPayload | null>
export async function destroySession() → Promise<void>
```

## worker

### worker/reminder-processor.ts
```
export function startReminderProcessor()
```

### worker/queue-consumer.js
```
export function setupQueueConsumer()
```

### worker/queue-consumer.ts
```
export function setupQueueConsumer()
```

### worker/whatsapp.js
```
function processOutgoingQueue()
```

### worker/reminder-processor.js
```
export function startReminderProcessor()
function processDueReminders()
function getMsUntilNext6AMGMT7()
```
