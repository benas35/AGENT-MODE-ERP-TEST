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

Build for production:
```bash
npm run build
```

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