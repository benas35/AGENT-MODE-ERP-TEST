import { z } from 'zod';

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