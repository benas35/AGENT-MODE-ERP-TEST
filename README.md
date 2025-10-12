# Auto Shop ERP System

A comprehensive automotive repair shop management system built with React, TypeScript, Supabase, and Tailwind CSS.

## Features

### Core Modules
- **Dashboard** - Real-time KPIs and business overview
- **Customers** - Customer management and history
- **Vehicles** - Vehicle database with service history
- **Work Orders** - Complete workflow management (Intake → Diagnosis → Approval → Execution → QC)
- **Appointments/Planner** - Drag-drop scheduler with technician assignment
- **Parts & Inventory** - Stock management with auto-reorder
- **Purchase Orders** - Supplier ordering and receiving
- **Invoicing** - PDF generation and Stripe payments
- **Tire Storage** - Seasonal tire storage with photo tracking
- **Reports** - Business analytics and reporting

### Authentication & Roles
- **Owner** - Full system access
- **Service Advisor** - Customer-facing operations
- **Technician** - Work order execution
- Row-level security with Supabase RLS

### Technical Features
- Real-time updates with Supabase subscriptions
- Mobile/tablet responsive (iPad optimized)
- PDF generation for work orders and invoices
- Photo upload for inspections and tire storage
- Barcode scanning for parts
- Email/SMS notifications (placeholders)
- Stripe payment integration
- Comprehensive audit logging

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd auto-shop-erp
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your Supabase credentials:
```env
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_SUPABASE_URL=https://your-project-id.supabase.co
```

5. Run database migrations (if using local Supabase):
```bash
npx supabase db reset
```

### Development

Start the development server:
```bash
npm run dev
```

### Phase 1.1 – Vehicle Media & Documentation

Run the new media migrations and seeds:
```bash
npx supabase db push --file backend/sql/010-media.sql
npx supabase db push --file backend/sql/seeds.sql
```

Deploy the media edge function locally:
```bash
npx supabase functions serve media-process --env-file supabase/.env.local
```

Build for production:
```bash
npm run build
```

### Phase 1.2 – Work Order Photo Documentation

Run the updated migrations and seeds (idempotent):
```bash
npx supabase db push --file backend/sql/010-media.sql
npx supabase db push --file backend/sql/seeds.sql
```

Serve the notification edge function locally and ensure environment variables for SendGrid/Twilio are available when deploying:
```bash
npx supabase functions serve notify-customer --env-file supabase/.env.local
```

Run automated tests for the new media utilities and edge function guards:
```bash
npm run test
deno test backend/tests/functions/notify_customer_test.ts
```

### Phase 1.3 – Internal Communication System

Apply the messaging migrations and refresh demo seeds:
```bash
npx supabase db push --file backend/sql/020-messages.sql
npx supabase db push --file backend/sql/seeds.sql
```

Serve the internal messaging edge function for local development:
```bash
npx supabase functions serve internal-messages --env-file supabase/.env.local
```

Execute the new unit and policy tests:
```bash
npm run test
deno test backend/tests/functions/internal_messages_test.ts
pg_prove backend/tests/rls/internal_messages.sql
```

### Phase 1.4 – Customer Communication Hub

Apply the messaging/customer portal migrations and reseed demo data:
```bash
npx supabase db push --file backend/sql/020-messages.sql
npx supabase db push --file backend/sql/seeds.sql
```

Serve the new customer portal edge functions when developing locally:
```bash
npx supabase functions serve customer-portal --env-file supabase/.env.local
npx supabase functions serve customer-notify --env-file supabase/.env.local
```

Update `supabase/.env.local` with the SendGrid/Twilio credentials used by the notification functions. The portal session function expects `SUPABASE_JWT_SECRET`, `PORTAL_MAGIC_LINK_BASE_URL`, and the service role key.

Run the new automated coverage:
```bash
npm run test
deno test backend/tests/functions/customer_portal_test.ts
deno test backend/tests/functions/customer_notify_test.ts
pg_prove backend/tests/rls/customer_portal.sql
```

To try the portal locally:
1. Open `http://localhost:8080/portal` and request a magic link using the demo customer email (`jonas.jonaitis@email.com`).
2. Copy the `token` returned from the `customer-portal` function logs and visit `http://localhost:8080/portal/session?token=<TOKEN>`.
3. Review the work order status, send messages, and approve/decline the demo estimate.

### Demo Accounts

After running the application, you can create accounts or use these demo credentials:

- **Owner**: `owner@demo.com` / `demo123`
- **Technician**: `technician@demo.com` / `demo123`

(Note: Create these accounts via the signup form)

## Database Schema

The system uses Supabase with the following key tables:

- `organizations` - Multi-tenant organization data
- `profiles` - User profiles with roles
- `customers` - Customer information
- `vehicles` - Vehicle database
- `work_orders` - Service work orders
- `appointments` - Scheduling data  
- `workflow_stages` - Customizable workflow
- `parts` - Inventory items
- `invoices` - Billing data
- `resources` - Technicians and bays

## Architecture

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Shadcn/ui** component library
- **React Query** for data fetching
- **React Router** for navigation
- **Zod** for validation

### Backend  
- **Supabase** - Database, Auth, Storage
- **PostgreSQL** with Row Level Security
- **Edge Functions** for business logic
- **Real-time subscriptions**

### Security
- JWT authentication via Supabase Auth
- Row-level security policies
- Role-based access control
- Input validation with Zod schemas

## Deployment

### Supabase Setup
1. Create a new Supabase project
2. Run the provided SQL migrations
3. Configure RLS policies
4. Set up edge functions for advanced features

### Frontend Deployment
The app can be deployed to:
- Vercel (recommended)
- Netlify  
- Any static hosting service

Update the redirect URLs in Supabase Auth settings after deployment.

## API Documentation

### Authentication
The app uses Supabase Auth with email/password authentication:

```typescript
// Sign up
const { error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    data: { first_name: 'John', last_name: 'Doe' }
  }
})

// Sign in  
const { error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com', 
  password: 'password'
})
```

### Data Access
All data access goes through Supabase with RLS policies:

```typescript
// Get work orders for current user's org
const { data } = await supabase
  .from('work_orders')
  .select('*, customer:customers(*), vehicle:vehicles(*)')
  .order('created_at', { ascending: false })
```

### Phase 2 / Task A

- Use `app/src/app/ErrorBoundary.tsx` for global and route fallbacks (`createRouteErrorBoundary`).
- Default React Query retry/backoff lives in `app/src/lib/queryClient.ts`.
- Wrap new routes with `RouteBoundary` or export a `createRouteErrorBoundary` call for consistent UX.

### Phase 2 / Task B

- Skeleton loaders live in `app/src/components/skeletons` and expose `role="status"`/`aria-busy` for tables, cards, and media grids.
- The shared upload queue is implemented in `app/src/features/uploads/useUploadQueue.ts` (supports enqueue, retry, cancel, dismiss).
- Vehicle and work-order media features consume the queue for per-file progress; pass queue items to `WorkOrderPhotoTimeline` to surface upload status.

### Phase 2 / Task C

- Undo workflows rely on `registerUndo`/`createUndoDeferred` from `app/src/lib/undo.tsx` to delay commits and wire the toast-driven cancel action.
- Wrap React Query mutations with deferred promises (`onMutate` + `UndoCancelledError`) so `undo` restores cached snapshots and `do` performs the real mutation after the TTL.
- Map mutation failures through `mapErrorToFriendlyMessage` to surface consistent destructive/error toasts when optimistic changes cannot be committed.

### Phase 2 / Task D

- Shared Zod/RHF primitives live in `app/src/lib/validation.ts` (`stringNonEmpty`, `safeSubmit`, `schemaResolver`) and power the caption editors plus the quick-reply manager.
- Media caption dialogs/forms follow the pattern in `VehicleMediaGallery` and `WorkOrderPhotoTimeline`, using `mediaCaptionSchema` and `FormField` to surface live errors and character counts.
- Confirmation prompts respect the “Don’t show again” preference keys via `app/src/lib/preferences.ts`; reuse `ConfirmationDialog` with a unique `preferenceKey` for destructive or status-changing flows.

### Phase 2 / Task E

- Reuse the lightweight animation in `app/src/components/feedback/SuccessCheck.tsx` to confirm uploads or sends—mount it with a success message and let it auto-dismiss.
- Media upload flows enqueue progress via the shared queue; see `VehicleMediaUploader` and `WorkOrderPhotoSection` for wiring success indicators to queue state.
- Empty states and illustrations live in `app/src/assets/empties`; import the SVGs to keep gallery, timeline, and inbox blanks consistent and include a CTA button.

### Phase 3 / Part A

- Apply the planner schema and helper function with `npx supabase db push --file backend/sql/030-planner.sql` (seeds included for demo org data).
- Demo technicians, bays, and appointments seed against the ProFix organization and use Europe/Vilnius local time converted to stored UTC.
- Keep planner timestamps in UTC in the database while formatting in Europe/Vilnius on the frontend.

### Phase 3 / Part B

- The interactive planner board lives in `app/src/features/planner` (`PlannerBoard`, `AppointmentCard`, `ResizeHandle`) and powers the `/planner` page.
- Fetch technicians, bays, and day appointments via `usePlannerTechnicians`, `usePlannerBays`, and `usePlannerAppointments` to enable drag, resize, and Supabase `can_schedule` validation with 15-minute snapping.
- `PlannerBoard` accepts the bay filter, mutation handlers, and emits resolved ISO timestamps so new routes can adopt consistent planner UX quickly.

### Phase 3 / Part C

- Launch the edit/create experience with `EditAppointmentDrawer`—pass planner technicians/bays plus either an existing appointment or slot defaults and handle its `onSubmit` with the planner mutations.
- React Query optimistic flows for create/update live in `usePlannerAppointments`; call `createAppointment`/`updateAppointment` after `canSchedule` to keep caches warm while Supabase persists changes.
- Form date inputs expect Europe/Vilnius local strings (`datetime-local` with 15-minute steps) and convert back to UTC via `zonedTimeToUtc` before saving.

### Phase 3 / Part D

- Status labels and colours are centralised in `app/src/features/planner/types.ts`, with `AppointmentCard` exposing quick-action buttons and a context menu that call into the shared helpers.
- Trigger status transitions with `usePlannerAppointments().updateStatus(id, status)`; `PlannerBoard` pipes this into cards and temporarily disables actions while a mutation is pending.
- Live status changes fan out through the Supabase realtime channel initialised inside `usePlannerAppointments`, ensuring every client reflects updates instantly.

### Planner

- `PlannerBoard` (props documented in `app/src/features/planner/PlannerBoard.tsx`) expects technicians, appointments, bay filter, and async handlers for move/resize/status/create.
- Grid math, snap helpers, and zone conversion live in `app/src/features/planner/utils.ts` (`minuteHeight`, `pixelsToTime`, `timeToPixels`, `snapMinutes`), matching the Europe/Vilnius display while persisting UTC strings via `toUtcIso`.
- Optimistic reducers and rollback helpers are centralised in `app/src/features/planner/reducer.ts` so cache updates stay deterministic and conflict-safe.
- Planner Vitest coverage sits in `app/src/features/planner/__tests__` (`npm run test`) and exercises helper math, reducer flows, and optimistic rollback.
- Database overlap guards are verified with Deno (`deno test --allow-env --allow-net --allow-read backend/tests/can_schedule.test.ts`); set `DATABASE_URL`/`SUPABASE_DB_URL` before running.
- Keep storing timestamps in UTC while rendering with `ORG_TIMEZONE = Europe/Vilnius`; conflict toasts from `PlannerBoard` surface the friendly message and suggested slot when `can_schedule` rejects a move.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable  
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please contact [your-email@example.com] or create an issue in the repository.