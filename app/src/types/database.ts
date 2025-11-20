import type { Database } from '@/integrations/supabase/types';

// Database table types
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type Location = Database['public']['Tables']['locations']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type Vehicle = Database['public']['Tables']['vehicles']['Row'];
export type Vendor = Database['public']['Tables']['vendors']['Row'];
export type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
export type Estimate = Database['public']['Tables']['estimates']['Row'];
export type WorkOrder = Database['public']['Tables']['work_orders']['Row'];
export type EstimateItem = Database['public']['Tables']['estimate_items']['Row'];
export type WorkOrderItem = Database['public']['Tables']['work_order_items']['Row'];
export type Invoice = Database['public']['Tables']['invoices']['Row'];
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
export type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'];
export type PurchaseOrderItem = Database['public']['Tables']['purchase_order_items']['Row'];
export type StockMovement = Database['public']['Tables']['stock_movements']['Row'];
export type TimeLog = Database['public']['Tables']['time_logs']['Row'];
export type Appointment = Database['public']['Tables']['appointments']['Row'];
export type Attachment = Database['public']['Tables']['attachments']['Row'];
export type ServiceReminder = Database['public']['Tables']['service_reminders']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type UserNotificationPreference = Database['public']['Tables']['user_notification_preferences']['Row'];
export type AuditLog = Database['public']['Tables']['audit_log']['Row'];
export type NumberSequence = Database['public']['Tables']['number_sequences']['Row'];
export type FeatureFlag = Database['public']['Tables']['feature_flags']['Row'];
export type WorkOrderNote = Database['public']['Tables']['work_order_notes']['Row'];
export type WorkOrderActivity = Database['public']['Tables']['work_order_activity']['Row'];
export type WorkOrderApproval = Database['public']['Tables']['work_order_approvals']['Row'];

// Database enum types
export type AppRole = Database['public']['Enums']['app_role'];
export type WorkOrderStatus = Database['public']['Enums']['work_order_status'];
export type WorkOrderApprovalStatus = Database['public']['Enums']['work_order_approval_status'];
export type EstimateStatus = Database['public']['Enums']['estimate_status'];
export type InvoiceStatus = Database['public']['Enums']['invoice_status'];
export type PaymentMethod = Database['public']['Enums']['payment_method'];
export type ItemType = Database['public']['Enums']['item_type'];
export type AppointmentStatus = Database['public']['Enums']['appointment_status'];

// Insert types for creating new records
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert'];
export type LocationInsert = Database['public']['Tables']['locations']['Insert'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
export type VendorInsert = Database['public']['Tables']['vendors']['Insert'];
export type InventoryItemInsert = Database['public']['Tables']['inventory_items']['Insert'];
export type EstimateInsert = Database['public']['Tables']['estimates']['Insert'];
export type WorkOrderInsert = Database['public']['Tables']['work_orders']['Insert'];
export type EstimateItemInsert = Database['public']['Tables']['estimate_items']['Insert'];
export type WorkOrderItemInsert = Database['public']['Tables']['work_order_items']['Insert'];
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
export type InvoiceItemInsert = Database['public']['Tables']['invoice_items']['Insert'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
export type PurchaseOrderInsert = Database['public']['Tables']['purchase_orders']['Insert'];
export type PurchaseOrderItemInsert = Database['public']['Tables']['purchase_order_items']['Insert'];
export type StockMovementInsert = Database['public']['Tables']['stock_movements']['Insert'];
export type TimeLogInsert = Database['public']['Tables']['time_logs']['Insert'];
export type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
export type AttachmentInsert = Database['public']['Tables']['attachments']['Insert'];
export type ServiceReminderInsert = Database['public']['Tables']['service_reminders']['Insert'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type UserNotificationPreferenceInsert = Database['public']['Tables']['user_notification_preferences']['Insert'];
export type AuditLogInsert = Database['public']['Tables']['audit_log']['Insert'];
export type WorkOrderNoteInsert = Database['public']['Tables']['work_order_notes']['Insert'];
export type WorkOrderActivityInsert = Database['public']['Tables']['work_order_activity']['Insert'];
export type WorkOrderApprovalInsert = Database['public']['Tables']['work_order_approvals']['Insert'];

// Update types for modifying existing records
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update'];
export type LocationUpdate = Database['public']['Tables']['locations']['Update'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type CustomerUpdate = Database['public']['Tables']['customers']['Update'];
export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update'];
export type VendorUpdate = Database['public']['Tables']['vendors']['Update'];
export type InventoryItemUpdate = Database['public']['Tables']['inventory_items']['Update'];
export type EstimateUpdate = Database['public']['Tables']['estimates']['Update'];
export type WorkOrderUpdate = Database['public']['Tables']['work_orders']['Update'];
export type EstimateItemUpdate = Database['public']['Tables']['estimate_items']['Update'];
export type WorkOrderItemUpdate = Database['public']['Tables']['work_order_items']['Update'];
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];
export type InvoiceItemUpdate = Database['public']['Tables']['invoice_items']['Update'];
export type PaymentUpdate = Database['public']['Tables']['payments']['Update'];
export type PurchaseOrderUpdate = Database['public']['Tables']['purchase_orders']['Update'];
export type PurchaseOrderItemUpdate = Database['public']['Tables']['purchase_order_items']['Update'];
export type StockMovementUpdate = Database['public']['Tables']['stock_movements']['Update'];
export type TimeLogUpdate = Database['public']['Tables']['time_logs']['Update'];
export type AppointmentUpdate = Database['public']['Tables']['appointments']['Update'];
export type AttachmentUpdate = Database['public']['Tables']['attachments']['Update'];
export type ServiceReminderUpdate = Database['public']['Tables']['service_reminders']['Update'];
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];
export type UserNotificationPreferenceUpdate = Database['public']['Tables']['user_notification_preferences']['Update'];
export type AuditLogUpdate = Database['public']['Tables']['audit_log']['Update'];
export type WorkOrderNoteUpdate = Database['public']['Tables']['work_order_notes']['Update'];
export type WorkOrderActivityUpdate = Database['public']['Tables']['work_order_activity']['Update'];
export type WorkOrderApprovalUpdate = Database['public']['Tables']['work_order_approvals']['Update'];

// Extended types with relationships
export interface CustomerWithVehicles extends Customer {
  vehicles: Vehicle[];
}

export interface VehicleWithCustomer extends Vehicle {
  customer: Customer;
}

export interface WorkOrderWithDetails extends WorkOrder {
  customer: Customer;
  vehicle: Vehicle;
  work_order_items: WorkOrderItem[];
  estimate?: Estimate;
}

export interface EstimateWithDetails extends Estimate {
  customer: Customer;
  vehicle: Vehicle;
  estimate_items: EstimateItem[];
}

export interface InvoiceWithDetails extends Invoice {
  customer: Customer;
  vehicle?: Vehicle;
  work_order?: WorkOrder;
  invoice_items: InvoiceItem[];
  payments: Payment[];
}

export interface InventoryItemWithVendor extends InventoryItem {
  vendor?: Vendor;
}

export interface PurchaseOrderWithDetails extends PurchaseOrder {
  vendor: Vendor;
  purchase_order_items: Array<PurchaseOrderItem & {
    inventory_item: InventoryItem;
  }>;
}

export interface ProfileWithOrganization extends Profile {
  organization: Organization;
  location?: Location;
}

// Utility types
export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  state?: string;
}

export interface BusinessHours {
  monday?: { open: string; close: string; closed?: boolean };
  tuesday?: { open: string; close: string; closed?: boolean };
  wednesday?: { open: string; close: string; closed?: boolean };
  thursday?: { open: string; close: string; closed?: boolean };
  friday?: { open: string; close: string; closed?: boolean };
  saturday?: { open: string; close: string; closed?: boolean };
  sunday?: { open: string; close: string; closed?: boolean };
}

export interface TotalsCalculation {
  subtotal: number;
  taxAmount: number;
  total: number;
  discount?: number;
}

// Dashboard KPIs
export interface DashboardKPIs {
  todayAppointments: number;
  vehiclesInShop: number;
  wipValue: number;
  invoicesDue: number;
  technicianUtilization: number;
  averageRepairOrder: number;
  lowStockItems: number;
  overdueInvoices: number;
}

// Search/filter types
export interface CustomerFilter {
  search?: string;
  location?: string;
  hasBalance?: boolean;
  marketingConsent?: boolean;
}

export interface VehicleFilter {
  search?: string;
  customerId?: string;
  make?: string;
  year?: number;
  active?: boolean;
}

export interface WorkOrderFilter {
  search?: string;
  status?: WorkOrderStatus[];
  customerId?: string;
  vehicleId?: string;
  technicianId?: string;
  dateFrom?: string;
  dateTo?: string;
  priority?: string;
}

export interface InventoryFilter {
  search?: string;
  category?: string;
  brand?: string;
  vendorId?: string;
  lowStock?: boolean;
  active?: boolean;
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  totalPages: number;
  currentPage: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Form validation types
export type FormErrors<T> = {
  [K in keyof T]?: string;
}

export interface FormState<T> {
  data: T;
  errors: FormErrors<T>;
  isSubmitting: boolean;
  isDirty: boolean;
}