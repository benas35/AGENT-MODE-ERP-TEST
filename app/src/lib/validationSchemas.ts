import { z } from 'zod';
import { sanitizeText } from "@/lib/validation";

const baseAppointmentSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  vehicle_id: z.string().uuid('Invalid vehicle ID').optional(),
  technician_id: z.string().uuid('Invalid technician ID').optional(),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  start_time: z.date({
    required_error: 'Start time is required',
    invalid_type_error: 'Invalid start time'
  }),
  end_time: z.date({
    required_error: 'End time is required', 
    invalid_type_error: 'Invalid end time'
  }),
  location_id: z.string().uuid('Invalid location ID').optional(),
  status: z.enum(['booked', 'checked_in', 'in_progress', 'waiting_parts', 'done']).default('booked'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  estimated_minutes: z.number().min(15, 'Minimum 15 minutes').max(480, 'Maximum 8 hours').default(60),
  source: z.string().default('web')
});

export const createAppointmentSchema = baseAppointmentSchema.refine(
  (data) => data.start_time < data.end_time,
  {
    message: 'End time must be after start time',
    path: ['end_time']
  }
);

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = baseAppointmentSchema.partial().extend({
  id: z.string().uuid('Invalid appointment ID')
});

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

const lineItemSchema = z.object({
  id: z.string(),
  type: z.enum(["LABOR", "PART", "FEE", "DISCOUNT"]),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters")
    .transform(sanitizeText),
  quantity: z.number().positive("Quantity must be greater than zero"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  discountAmount: z.number().min(0, "Discount cannot be negative"),
  technicianId: z.string().uuid("Invalid technician ID").optional(),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional().transform((value) =>
    value ? sanitizeText(value) : undefined
  ),
});

export const workOrderFormSchema = z.object({
  title: z
    .string()
    .min(3, "Title is required")
    .max(120, "Title must be less than 120 characters")
    .transform(sanitizeText),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .optional()
    .transform((value) => (value ? sanitizeText(value) : undefined)),
  customerId: z.string().uuid("Customer is required"),
  vehicleId: z.string().uuid("Vehicle is required"),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  workflowStageId: z.string().uuid("Workflow stage is required"),
  estimatedHours: z.number().min(0.25, "Estimated hours must be at least 0.25"),
  notes: z.string().max(2000, "Notes must be less than 2000 characters").optional().transform((value) =>
    value ? sanitizeText(value) : undefined
  ),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  assignment: z.object({
    technicianId: z.string().uuid("Invalid technician ID").optional(),
    scheduledAt: z.string().datetime().optional(),
    promisedAt: z.string().datetime().optional(),
  }),
});

export type WorkOrderFormInput = z.infer<typeof workOrderFormSchema>;

export const customerSchema = z.object({
  firstName: z.string().min(1, "First name is required").transform(sanitizeText),
  lastName: z.string().min(1, "Last name is required").transform(sanitizeText),
  email: z
    .string()
    .email("Invalid email")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? sanitizeText(value) : "")),
  phone: z
    .string()
    .max(30, "Phone number is too long")
    .optional()
    .transform((value) => (value ? sanitizeText(value) : undefined)),
  mobile: z
    .string()
    .max(30, "Mobile number is too long")
    .optional()
    .transform((value) => (value ? sanitizeText(value) : undefined)),
  line1: z.string().max(200).optional().transform((value) => (value ? sanitizeText(value) : undefined)),
  line2: z.string().max(200).optional().transform((value) => (value ? sanitizeText(value) : undefined)),
  city: z.string().max(120).optional().transform((value) => (value ? sanitizeText(value) : undefined)),
  state: z.string().max(60).optional().transform((value) => (value ? sanitizeText(value) : undefined)),
  postalCode: z.string().max(20).optional().transform((value) => (value ? sanitizeText(value) : undefined)),
  marketingEmail: z.boolean().default(true),
  marketingSms: z.boolean().default(false),
  notes: z.string().max(2000).optional().transform((value) => (value ? sanitizeText(value) : undefined)),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const vehicleSchema = z.object({
  make: z.string().min(1, "Make is required").transform(sanitizeText),
  model: z.string().min(1, "Model is required").transform(sanitizeText),
  year: z
    .string()
    .optional()
    .transform((value) => (value ? sanitizeText(value) : undefined)),
  vin: z
    .string()
    .max(50, "VIN is too long")
    .optional()
    .transform((value) => (value ? sanitizeText(value) : undefined)),
  licensePlate: z
    .string()
    .max(30, "License plate is too long")
    .optional()
    .transform((value) => (value ? sanitizeText(value) : undefined)),
  color: z.string().max(60).optional().transform((value) => (value ? sanitizeText(value) : undefined)),
  mileage: z
    .string()
    .regex(/^\d*$/, "Mileage must be numeric")
    .optional()
    .transform((value) => (value ? sanitizeText(value) : undefined)),
  notes: z.string().max(1000).optional().transform((value) => (value ? sanitizeText(value) : undefined)),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;