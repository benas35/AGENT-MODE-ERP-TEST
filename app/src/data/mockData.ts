export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  vehicles: Vehicle[];
  createdAt: string;
}

export interface Vehicle {
  id: string;
  customerId: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  licensePlate: string;
  mileage: number;
  color: string;
}

export interface WorkOrder {
  id: string;
  number: string;
  customerId: string;
  vehicleId: string;
  status: 'scheduled' | 'in-progress' | 'waiting-parts' | 'ready' | 'completed';
  title: string;
  description: string;
  estimatedHours: number;
  laborRate: number;
  partsTotal: number;
  total: number;
  createdAt: string;
  dueDate: string;
  technicianId?: string;
}

export interface Technician {
  id: string;
  name: string;
  specialty: string;
  hourlyRate: number;
  status: 'available' | 'busy' | 'off-duty';
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  reorderPoint: number;
  cost: number;
  price: number;
  supplier: string;
}

export const mockCustomers: Customer[] = [
  {
    id: "1",
    name: "John Smith",
    phone: "(555) 123-4567",
    email: "john.smith@email.com",
    address: "123 Main St, Anytown, ST 12345",
    vehicles: [],
    createdAt: "2024-01-15"
  },
  {
    id: "2", 
    name: "Sarah Johnson",
    phone: "(555) 987-6543",
    email: "sarah.j@email.com",
    address: "456 Oak Ave, Somewhere, ST 67890",
    vehicles: [],
    createdAt: "2024-02-10"
  },
  {
    id: "3",
    name: "Mike Williams", 
    phone: "(555) 456-7890",
    email: "mwilliams@email.com",
    address: "789 Pine Rd, Elsewhere, ST 54321",
    vehicles: [],
    createdAt: "2024-03-05"
  }
];

export const mockVehicles: Vehicle[] = [
  {
    id: "1",
    customerId: "1", 
    vin: "1HGBH41JXMN109186",
    year: 2018,
    make: "Honda",
    model: "Civic",
    licensePlate: "ABC-1234",
    mileage: 45000,
    color: "Blue"
  },
  {
    id: "2",
    customerId: "2",
    vin: "1FTFW1ET5DFC25379", 
    year: 2020,
    make: "Ford",
    model: "F-150",
    licensePlate: "XYZ-5678",
    mileage: 32000,
    color: "Red"
  },
  {
    id: "3",
    customerId: "3",
    vin: "2T1BURHE0JC045123",
    year: 2019,
    make: "Toyota",
    model: "Corolla", 
    licensePlate: "DEF-9012",
    mileage: 38000,
    color: "White"
  }
];

export const mockTechnicians: Technician[] = [
  {
    id: "1",
    name: "Carlos Rodriguez",
    specialty: "Engine & Transmission",
    hourlyRate: 85,
    status: "busy"
  },
  {
    id: "2", 
    name: "Janet Kim",
    specialty: "Electrical & Electronics",
    hourlyRate: 90,
    status: "available"
  },
  {
    id: "3",
    name: "Robert Taylor",
    specialty: "Brakes & Suspension", 
    hourlyRate: 80,
    status: "available"
  }
];

export const mockWorkOrders: WorkOrder[] = [
  {
    id: "1",
    number: "WO-2024-001",
    customerId: "1",
    vehicleId: "1", 
    status: "in-progress",
    title: "Oil Change & Brake Inspection",
    description: "Regular maintenance - oil change and comprehensive brake system inspection",
    estimatedHours: 2,
    laborRate: 85,
    partsTotal: 45.99,
    total: 215.99,
    createdAt: "2024-09-15T08:30:00",
    dueDate: "2024-09-16T17:00:00",
    technicianId: "1"
  },
  {
    id: "2",
    number: "WO-2024-002", 
    customerId: "2",
    vehicleId: "2",
    status: "scheduled",
    title: "Transmission Service",
    description: "Automatic transmission fluid change and filter replacement",
    estimatedHours: 3,
    laborRate: 85,
    partsTotal: 125.50,
    total: 380.50,
    createdAt: "2024-09-14T14:15:00",
    dueDate: "2024-09-17T12:00:00",
    technicianId: "1"
  },
  {
    id: "3",
    number: "WO-2024-003",
    customerId: "3", 
    vehicleId: "3",
    status: "waiting-parts",
    title: "AC Compressor Replacement",
    description: "Replace faulty AC compressor and recharge system",
    estimatedHours: 4,
    laborRate: 90,
    partsTotal: 450.00,
    total: 810.00,
    createdAt: "2024-09-13T10:00:00",
    dueDate: "2024-09-18T16:00:00", 
    technicianId: "2"
  },
  {
    id: "4",
    number: "WO-2024-004",
    customerId: "1",
    vehicleId: "1",
    status: "ready",
    title: "Brake Pad Replacement",
    description: "Replace front brake pads and resurface rotors",
    estimatedHours: 2.5,
    laborRate: 80,
    partsTotal: 89.95,
    total: 289.95,
    createdAt: "2024-09-12T09:30:00",
    dueDate: "2024-09-16T15:00:00",
    technicianId: "3"
  }
];

export const mockInventory: InventoryItem[] = [
  {
    id: "1",
    sku: "OIL-5W30-5Q",
    name: "5W-30 Motor Oil (5qt)",
    category: "Fluids",
    quantity: 24,
    reorderPoint: 10,
    cost: 18.50,
    price: 34.99,
    supplier: "Valvoline"
  },
  {
    id: "2",
    sku: "BP-SEMI-FRONT",
    name: "Semi-Metallic Brake Pads (Front)",
    category: "Brakes",
    quantity: 8,
    reorderPoint: 5,
    cost: 45.00,
    price: 89.95,
    supplier: "Wagner"
  },
  {
    id: "3", 
    sku: "AF-TRANS-QT",
    name: "Automatic Transmission Fluid (1qt)",
    category: "Fluids",
    quantity: 12,
    reorderPoint: 8,
    cost: 8.75,
    price: 16.99,
    supplier: "Mobil 1"
  },
  {
    id: "4",
    sku: "FILTER-OIL-STD",
    name: "Oil Filter - Standard",
    category: "Filters", 
    quantity: 32,
    reorderPoint: 15,
    cost: 4.25,
    price: 12.99,
    supplier: "Fram"
  }
];

// Helper functions
export const getCustomerById = (id: string) => mockCustomers.find(c => c.id === id);
export const getVehicleById = (id: string) => mockVehicles.find(v => v.id === id);
export const getTechnicianById = (id: string) => mockTechnicians.find(t => t.id === id);
export const getWorkOrdersByStatus = (status: WorkOrder['status']) => 
  mockWorkOrders.filter(wo => wo.status === status);