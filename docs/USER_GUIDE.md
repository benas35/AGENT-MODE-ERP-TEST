# User & Admin Guide

The Auto Shop ERP is optimized for multi-location repair shops with Supabase-backed authentication, RLS-based tenant isolation, and real-time collaboration. This guide covers the day-to-day flows and admin configuration needed for go-live.

## User Guide

### Create a Work Order
1. Sign in and open **Work Orders**.
2. Click **Create Work Order**. In the wizard:
   - Select or search an existing customer; use **Add Customer** if needed.
   - Pick a vehicle (VIN decoder available) or create one inline.
   - Add services/labor/parts; quantities auto-extend totals.
   - Assign a technician and schedule; set priority and workflow stage.
3. Review the summary and click **Create**. The work order appears in both the list and workflow board.
4. Use **Start Work**, **Update Status**, or drag across the workflow board to move stages. **View** opens the detail drawer with notes, media, approvals, time tracking, and activity.

### Schedule an Appointment
1. Go to **Planner**.
2. Select a date range; on mobile toggle the **Timeline** view for compact scheduling.
3. Click **New Appointment** (or a quick-book shortcut) and fill customer, vehicle, service type, technician/bay, and time.
4. Drag to resize or move appointments. Tap/click to open the dialog for edit/delete or to convert into a work order.

### Manage Inventory
1. Navigate to **Inventory**.
2. Use search/filter to locate parts. Stock levels and reorder status are shown inline.
3. Click **Add Part** for new items, **Adjust Stock** for corrections, or **Transfer** to move between locations. Each adjustment logs usage for reporting.
4. Parts used on work orders automatically decrement stock and are visible in usage history.

### Generate Invoices
1. Open **Invoices** and click **Create Invoice**.
2. Import from an existing work order or add line items manually; set taxes/terms.
3. Review totals and **Send** to email the customer (or download PDF). **Record Payment** logs partial or full payments and updates the balance.

### Customer & Vehicle History
- From **Customers**, choose **View** to see contact info, communication preferences, and historical work orders.
- From **Vehicles**, open **View** for service history, media gallery, and inspection notes.

## Admin Guide

### User Management
- Use **Settings → Users & Roles** to invite staff by email, assigning roles (Owner, Service Advisor, Technician).
- Deactivate users to revoke access; RLS prevents data access after deactivation.

### Settings Configuration
- **Organization**: set default timezone, currency, and tax rate.
- **Notifications**: configure email/SMS preferences per channel; toggle technician/customer updates.
- **Integrations**: supply Sentry DSN, Twilio/SendGrid keys, and Stripe keys as needed.
- **Security**: enforce 2FA/TOTP, session refresh intervals, and password reset policies.

### Workflow Customization
- In **Settings → Workflow**, edit stages (e.g., Intake, Diagnosis, Approval, Execution, QC, Delivered) and reorder them. Stages drive board columns and status actions.
- Define default SLA targets per stage to surface delays on the workflow board.

### Backup & Recovery
- Run `supabase/backups/run-backup.sh` on a schedule to dump the database and storage metadata; store artifacts in your backup bucket/provider.
- Keep encryption keys and service-role credentials in your secret manager for disaster recovery.

## API Notes

If exposing the API externally:
- Create a **service role** key with restricted policies for integration clients.
- Prefer the Supabase-generated REST endpoints or RPCs (e.g., `reporting_overview`) rather than direct table access.
- Issue JWTs with `org_id` claims so RLS enforces tenant boundaries. Document any webhooks/edge functions separately for integrators.
