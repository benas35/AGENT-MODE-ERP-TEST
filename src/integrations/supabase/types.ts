export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      access_rights: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"]
          active: boolean | null
          branch_id: string | null
          created_at: string | null
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          org_id: string
          permissions: Json | null
          user_id: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"]
          active?: boolean | null
          branch_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          org_id: string
          permissions?: Json | null
          user_id: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"]
          active?: boolean | null
          branch_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          org_id?: string
          permissions?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_rights_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_rights_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_operations: {
        Row: {
          actual_hours: number | null
          appointment_id: string
          created_at: string
          created_by: string
          description: string | null
          dvi_required: boolean | null
          estimated_hours: number
          id: string
          location_id: string | null
          name: string
          org_id: string
          parts_required: Json | null
          position: number
          service_template_id: string | null
          status: string | null
          technician_id: string | null
          updated_at: string
          work_zone_id: string | null
        }
        Insert: {
          actual_hours?: number | null
          appointment_id: string
          created_at?: string
          created_by: string
          description?: string | null
          dvi_required?: boolean | null
          estimated_hours?: number
          id?: string
          location_id?: string | null
          name: string
          org_id: string
          parts_required?: Json | null
          position?: number
          service_template_id?: string | null
          status?: string | null
          technician_id?: string | null
          updated_at?: string
          work_zone_id?: string | null
        }
        Update: {
          actual_hours?: number | null
          appointment_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          dvi_required?: boolean | null
          estimated_hours?: number
          id?: string
          location_id?: string | null
          name?: string
          org_id?: string
          parts_required?: Json | null
          position?: number
          service_template_id?: string | null
          status?: string | null
          technician_id?: string | null
          updated_at?: string
          work_zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_operations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_resources: {
        Row: {
          appointment_id: string
          created_at: string | null
          id: string
          org_id: string
          resource_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string | null
          id?: string
          org_id: string
          resource_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string | null
          id?: string
          org_id?: string
          resource_id?: string
        }
        Relationships: []
      }
      appointment_services: {
        Row: {
          appointment_id: string
          created_at: string | null
          description: string
          estimated_minutes: number | null
          id: string
          inventory_item_id: string | null
          org_id: string
          quantity: number | null
          sort_order: number | null
        }
        Insert: {
          appointment_id: string
          created_at?: string | null
          description: string
          estimated_minutes?: number | null
          id?: string
          inventory_item_id?: string | null
          org_id: string
          quantity?: number | null
          sort_order?: number | null
        }
        Update: {
          appointment_id?: string
          created_at?: string | null
          description?: string
          estimated_minutes?: number | null
          id?: string
          inventory_item_id?: string | null
          org_id?: string
          quantity?: number | null
          sort_order?: number | null
        }
        Relationships: []
      }
      appointment_types: {
        Row: {
          active: boolean | null
          color: string | null
          created_at: string | null
          default_duration_minutes: number | null
          default_services: Json | null
          id: string
          name: string
          org_id: string
          requires_customer: boolean | null
          requires_vehicle: boolean | null
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          default_duration_minutes?: number | null
          default_services?: Json | null
          id?: string
          name: string
          org_id: string
          requires_customer?: boolean | null
          requires_vehicle?: boolean | null
        }
        Update: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          default_duration_minutes?: number | null
          default_services?: Json | null
          id?: string
          name?: string
          org_id?: string
          requires_customer?: boolean | null
          requires_vehicle?: boolean | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          assigned_to: string | null
          bay: string | null
          created_at: string | null
          created_by: string
          customer_approved: boolean | null
          customer_id: string
          delay_reason: string | null
          dependencies: Json | null
          description: string | null
          end_time: string
          estimated_minutes: number | null
          exdates: string[] | null
          id: string
          location_id: string | null
          notes: string | null
          org_id: string
          parts_ready: boolean | null
          planned_end: string | null
          planned_start: string | null
          priority: string | null
          reminder_sent_at: string | null
          rrule: string | null
          service_advisor: string | null
          sla_due_at: string | null
          source: string | null
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          technician_id: string | null
          template_id: string | null
          title: string
          type_id: string | null
          updated_at: string | null
          vehicle_id: string | null
          work_order_id: string | null
          work_zone_id: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          assigned_to?: string | null
          bay?: string | null
          created_at?: string | null
          created_by: string
          customer_approved?: boolean | null
          customer_id: string
          delay_reason?: string | null
          dependencies?: Json | null
          description?: string | null
          end_time: string
          estimated_minutes?: number | null
          exdates?: string[] | null
          id?: string
          location_id?: string | null
          notes?: string | null
          org_id: string
          parts_ready?: boolean | null
          planned_end?: string | null
          planned_start?: string | null
          priority?: string | null
          reminder_sent_at?: string | null
          rrule?: string | null
          service_advisor?: string | null
          sla_due_at?: string | null
          source?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          technician_id?: string | null
          template_id?: string | null
          title: string
          type_id?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
          work_order_id?: string | null
          work_zone_id?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          assigned_to?: string | null
          bay?: string | null
          created_at?: string | null
          created_by?: string
          customer_approved?: boolean | null
          customer_id?: string
          delay_reason?: string | null
          dependencies?: Json | null
          description?: string | null
          end_time?: string
          estimated_minutes?: number | null
          exdates?: string[] | null
          id?: string
          location_id?: string | null
          notes?: string | null
          org_id?: string
          parts_ready?: boolean | null
          planned_end?: string | null
          planned_start?: string | null
          priority?: string | null
          reminder_sent_at?: string | null
          rrule?: string | null
          service_advisor?: string | null
          sla_due_at?: string | null
          source?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          technician_id?: string | null
          template_id?: string | null
          title?: string
          type_id?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
          work_order_id?: string | null
          work_zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "planner_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_work_zone_id_fkey"
            columns: ["work_zone_id"]
            isOneToOne: false
            referencedRelation: "work_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          org_id: string
          uploaded_by: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          org_id: string
          uploaded_by: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          org_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          org_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          org_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          org_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bins: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          id: string
          location_details: string | null
          org_id: string
          warehouse_id: string
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          id?: string
          location_details?: string | null
          org_id: string
          warehouse_id: string
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          id?: string
          location_details?: string | null
          org_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bins_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          attachments: Json | null
          branch_id: string | null
          content: string | null
          created_at: string | null
          customer_id: string | null
          delivered_at: string | null
          direction: string
          id: string
          org_id: string
          provider_id: string | null
          provider_response: Json | null
          read_at: string | null
          sent_at: string | null
          sent_by: string | null
          status: string | null
          subject: string | null
          type: string
          work_order_id: string | null
        }
        Insert: {
          attachments?: Json | null
          branch_id?: string | null
          content?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          direction: string
          id?: string
          org_id: string
          provider_id?: string | null
          provider_response?: Json | null
          read_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject?: string | null
          type: string
          work_order_id?: string | null
        }
        Update: {
          attachments?: Json | null
          branch_id?: string | null
          content?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          direction?: string
          id?: string
          org_id?: string
          provider_id?: string | null
          provider_response?: Json | null
          read_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject?: string | null
          type?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: Json | null
          balance: number | null
          created_at: string | null
          created_by: string | null
          credit_limit: number | null
          customer_number: string | null
          email: string | null
          first_name: string
          gdpr_consent: boolean | null
          id: string
          last_name: string
          location_id: string | null
          marketing_consent_email: boolean | null
          marketing_consent_sms: boolean | null
          mobile: string | null
          notes: string | null
          org_id: string
          phone: string | null
          tax_exempt: boolean | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          balance?: number | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          customer_number?: string | null
          email?: string | null
          first_name: string
          gdpr_consent?: boolean | null
          id?: string
          last_name: string
          location_id?: string | null
          marketing_consent_email?: boolean | null
          marketing_consent_sms?: boolean | null
          mobile?: string | null
          notes?: string | null
          org_id: string
          phone?: string | null
          tax_exempt?: boolean | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          balance?: number | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          customer_number?: string | null
          email?: string | null
          first_name?: string
          gdpr_consent?: boolean | null
          id?: string
          last_name?: string
          location_id?: string | null
          marketing_consent_email?: boolean | null
          marketing_consent_sms?: boolean | null
          mobile?: string | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          tax_exempt?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dvi_signatures: {
        Row: {
          created_at: string | null
          dvi_id: string
          id: string
          ip_address: unknown | null
          org_id: string
          signature_data: string
          signature_type: string
          signed_at: string | null
          signer_name: string
          signer_title: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          dvi_id: string
          id?: string
          ip_address?: unknown | null
          org_id: string
          signature_data: string
          signature_type: string
          signed_at?: string | null
          signer_name: string
          signer_title?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          dvi_id?: string
          id?: string
          ip_address?: unknown | null
          org_id?: string
          signature_data?: string
          signature_type?: string
          signed_at?: string | null
          signer_name?: string
          signer_title?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dvi_signatures_dvi_id_fkey"
            columns: ["dvi_id"]
            isOneToOne: false
            referencedRelation: "dvis"
            referencedColumns: ["id"]
          },
        ]
      }
      dvi_templates: {
        Row: {
          active: boolean | null
          branch_id: string | null
          checklist_items: Json
          created_at: string | null
          created_by: string
          id: string
          name: string
          org_id: string
          service_type: string | null
          updated_at: string | null
          vehicle_type: string | null
        }
        Insert: {
          active?: boolean | null
          branch_id?: string | null
          checklist_items?: Json
          created_at?: string | null
          created_by: string
          id?: string
          name: string
          org_id: string
          service_type?: string | null
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Update: {
          active?: boolean | null
          branch_id?: string | null
          checklist_items?: Json
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
          org_id?: string
          service_type?: string | null
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dvi_templates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dvi_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dvis: {
        Row: {
          branch_id: string | null
          created_at: string | null
          created_by: string
          customer_approved_at: string | null
          customer_signature: Json | null
          customer_viewed_at: string | null
          expires_at: string | null
          id: string
          inspection_data: Json | null
          org_id: string
          share_token: string | null
          status: string | null
          technician_id: string | null
          template_id: string | null
          updated_at: string | null
          vehicle_id: string
          work_order_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          created_by: string
          customer_approved_at?: string | null
          customer_signature?: Json | null
          customer_viewed_at?: string | null
          expires_at?: string | null
          id?: string
          inspection_data?: Json | null
          org_id: string
          share_token?: string | null
          status?: string | null
          technician_id?: string | null
          template_id?: string | null
          updated_at?: string | null
          vehicle_id: string
          work_order_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string
          customer_approved_at?: string | null
          customer_signature?: Json | null
          customer_viewed_at?: string | null
          expires_at?: string | null
          id?: string
          inspection_data?: Json | null
          org_id?: string
          share_token?: string | null
          status?: string | null
          technician_id?: string | null
          template_id?: string | null
          updated_at?: string | null
          vehicle_id?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dvis_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dvis_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dvis_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "dvi_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dvis_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dvis_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_items: {
        Row: {
          created_at: string | null
          description: string
          discount_amount: number | null
          discount_percentage: number | null
          estimate_id: string
          id: string
          inventory_item_id: string | null
          line_total: number | null
          notes: string | null
          org_id: string
          quantity: number | null
          sort_order: number | null
          tax_rate: number | null
          taxable: boolean | null
          type: Database["public"]["Enums"]["item_type"]
          unit_cost: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          description: string
          discount_amount?: number | null
          discount_percentage?: number | null
          estimate_id: string
          id?: string
          inventory_item_id?: string | null
          line_total?: number | null
          notes?: string | null
          org_id: string
          quantity?: number | null
          sort_order?: number | null
          tax_rate?: number | null
          taxable?: boolean | null
          type: Database["public"]["Enums"]["item_type"]
          unit_cost?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          estimate_id?: string
          id?: string
          inventory_item_id?: string | null
          line_total?: number | null
          notes?: string | null
          org_id?: string
          quantity?: number | null
          sort_order?: number | null
          tax_rate?: number | null
          taxable?: boolean | null
          type?: Database["public"]["Enums"]["item_type"]
          unit_cost?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          created_at: string | null
          created_by: string
          customer_id: string
          description: string | null
          estimate_number: string
          expires_at: string | null
          id: string
          internal_notes: string | null
          location_id: string | null
          notes: string | null
          org_id: string
          status: Database["public"]["Enums"]["estimate_status"] | null
          subtotal: number | null
          tax_amount: number | null
          title: string | null
          total: number | null
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          created_at?: string | null
          created_by: string
          customer_id: string
          description?: string | null
          estimate_number: string
          expires_at?: string | null
          id?: string
          internal_notes?: string | null
          location_id?: string | null
          notes?: string | null
          org_id: string
          status?: Database["public"]["Enums"]["estimate_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          title?: string | null
          total?: number | null
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string
          customer_id?: string
          description?: string | null
          estimate_number?: string
          expires_at?: string | null
          id?: string
          internal_notes?: string | null
          location_id?: string | null
          notes?: string | null
          org_id?: string
          status?: Database["public"]["Enums"]["estimate_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          title?: string | null
          total?: number | null
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          data: Json | null
          enabled: boolean | null
          id: string
          key: string
          org_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          enabled?: boolean | null
          id?: string
          key: string
          org_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          enabled?: boolean | null
          id?: string
          key?: string
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipt_lines: {
        Row: {
          bin_id: string | null
          created_at: string | null
          expiry_date: string | null
          goods_receipt_id: string
          id: string
          lot_no: string | null
          org_id: string
          part_id: string
          purchase_order_line_id: string | null
          qty_received: number
          serial_no: string | null
          unit_cost: number
          uom: string | null
          warehouse_id: string
        }
        Insert: {
          bin_id?: string | null
          created_at?: string | null
          expiry_date?: string | null
          goods_receipt_id: string
          id?: string
          lot_no?: string | null
          org_id: string
          part_id: string
          purchase_order_line_id?: string | null
          qty_received: number
          serial_no?: string | null
          unit_cost: number
          uom?: string | null
          warehouse_id: string
        }
        Update: {
          bin_id?: string | null
          created_at?: string | null
          expiry_date?: string | null
          goods_receipt_id?: string
          id?: string
          lot_no?: string | null
          org_id?: string
          part_id?: string
          purchase_order_line_id?: string | null
          qty_received?: number
          serial_no?: string | null
          unit_cost?: number
          uom?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_lines_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "bins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_lines_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_lines_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_lines_purchase_order_line_id_fkey"
            columns: ["purchase_order_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_lines_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipts: {
        Row: {
          created_at: string | null
          id: string
          location_id: string | null
          notes: string | null
          number: string
          org_id: string
          purchase_order_id: string | null
          received_at: string | null
          received_by: string
          status: string | null
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          number: string
          org_id: string
          purchase_order_id?: string | null
          received_at?: string | null
          received_by: string
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          number?: string
          org_id?: string
          purchase_order_id?: string | null
          received_at?: string | null
          received_by?: string
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_results: {
        Row: {
          cost_estimate: number | null
          created_at: string | null
          dvi_id: string
          id: string
          item_key: string
          measurements: Json | null
          notes: string | null
          org_id: string
          photos: Json | null
          priority: string | null
          recommendations: string | null
          status: string
          updated_at: string | null
          videos: Json | null
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string | null
          dvi_id: string
          id?: string
          item_key: string
          measurements?: Json | null
          notes?: string | null
          org_id: string
          photos?: Json | null
          priority?: string | null
          recommendations?: string | null
          status: string
          updated_at?: string | null
          videos?: Json | null
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string | null
          dvi_id?: string
          id?: string
          item_key?: string
          measurements?: Json | null
          notes?: string | null
          org_id?: string
          photos?: Json | null
          priority?: string | null
          recommendations?: string | null
          status?: string
          updated_at?: string | null
          videos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_results_dvi_id_fkey"
            columns: ["dvi_id"]
            isOneToOne: false
            referencedRelation: "dvis"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          active: boolean | null
          barcode: string | null
          bin_location: string | null
          brand: string | null
          category: string | null
          cost: number | null
          created_at: string | null
          cross_reference: Json | null
          description: string | null
          id: string
          location_id: string | null
          markup_percentage: number | null
          markup_rules: Json | null
          name: string
          org_id: string
          price: number | null
          quantity_allocated: number | null
          quantity_available: number | null
          quantity_on_hand: number | null
          reorder_point: number | null
          reorder_quantity: number | null
          serial_tracked: boolean | null
          shelf_location: string | null
          sku: string
          supplier_lead_days: number | null
          tax_code: string | null
          unit: string | null
          updated_at: string | null
          vendor_id: string | null
          vendor_part_number: string | null
          warehouse_id: string | null
          warranty_months: number | null
        }
        Insert: {
          active?: boolean | null
          barcode?: string | null
          bin_location?: string | null
          brand?: string | null
          category?: string | null
          cost?: number | null
          created_at?: string | null
          cross_reference?: Json | null
          description?: string | null
          id?: string
          location_id?: string | null
          markup_percentage?: number | null
          markup_rules?: Json | null
          name: string
          org_id: string
          price?: number | null
          quantity_allocated?: number | null
          quantity_available?: number | null
          quantity_on_hand?: number | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          serial_tracked?: boolean | null
          shelf_location?: string | null
          sku: string
          supplier_lead_days?: number | null
          tax_code?: string | null
          unit?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_part_number?: string | null
          warehouse_id?: string | null
          warranty_months?: number | null
        }
        Update: {
          active?: boolean | null
          barcode?: string | null
          bin_location?: string | null
          brand?: string | null
          category?: string | null
          cost?: number | null
          created_at?: string | null
          cross_reference?: Json | null
          description?: string | null
          id?: string
          location_id?: string | null
          markup_percentage?: number | null
          markup_rules?: Json | null
          name?: string
          org_id?: string
          price?: number | null
          quantity_allocated?: number | null
          quantity_available?: number | null
          quantity_on_hand?: number | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          serial_tracked?: boolean | null
          shelf_location?: string | null
          sku?: string
          supplier_lead_days?: number | null
          tax_code?: string | null
          unit?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_part_number?: string | null
          warehouse_id?: string | null
          warranty_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string | null
          description: string
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          invoice_id: string
          line_total: number | null
          org_id: string
          quantity: number | null
          sort_order: number | null
          tax_rate: number | null
          taxable: boolean | null
          type: Database["public"]["Enums"]["item_type"]
          unit_price: number | null
          work_order_item_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          invoice_id: string
          line_total?: number | null
          org_id: string
          quantity?: number | null
          sort_order?: number | null
          tax_rate?: number | null
          taxable?: boolean | null
          type: Database["public"]["Enums"]["item_type"]
          unit_price?: number | null
          work_order_item_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          invoice_id?: string
          line_total?: number | null
          org_id?: string
          quantity?: number | null
          sort_order?: number | null
          tax_rate?: number | null
          taxable?: boolean | null
          type?: Database["public"]["Enums"]["item_type"]
          unit_price?: number | null
          work_order_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_work_order_item_id_fkey"
            columns: ["work_order_item_id"]
            isOneToOne: false
            referencedRelation: "work_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          balance_due: number | null
          created_at: string | null
          created_by: string
          customer_id: string
          due_at: string | null
          id: string
          invoice_number: string
          issued_at: string | null
          location_id: string | null
          notes: string | null
          org_id: string
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number | null
          tax_amount: number | null
          terms: string | null
          total: number | null
          updated_at: string | null
          vehicle_id: string | null
          work_order_id: string | null
        }
        Insert: {
          balance_due?: number | null
          created_at?: string | null
          created_by: string
          customer_id: string
          due_at?: string | null
          id?: string
          invoice_number: string
          issued_at?: string | null
          location_id?: string | null
          notes?: string | null
          org_id: string
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          terms?: string | null
          total?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          balance_due?: number | null
          created_at?: string | null
          created_by?: string
          customer_id?: string
          due_at?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string | null
          location_id?: string | null
          notes?: string | null
          org_id?: string
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          terms?: string | null
          total?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_lookups: {
        Row: {
          cached_until: string | null
          created_at: string | null
          diagrams: Json | null
          engine: string | null
          id: string
          labor_hours: number | null
          make: string | null
          model: string | null
          operation_code: string | null
          operation_name: string | null
          org_id: string
          procedures: Json | null
          provider_id: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          cached_until?: string | null
          created_at?: string | null
          diagrams?: Json | null
          engine?: string | null
          id?: string
          labor_hours?: number | null
          make?: string | null
          model?: string | null
          operation_code?: string | null
          operation_name?: string | null
          org_id: string
          procedures?: Json | null
          provider_id?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          cached_until?: string | null
          created_at?: string | null
          diagrams?: Json | null
          engine?: string | null
          id?: string
          labor_hours?: number | null
          make?: string | null
          model?: string | null
          operation_code?: string | null
          operation_name?: string | null
          org_id?: string
          procedures?: Json | null
          provider_id?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_lookups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_lookups_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "labor_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_providers: {
        Row: {
          active: boolean | null
          api_endpoint: string | null
          created_at: string | null
          credentials: Json | null
          id: string
          name: string
          org_id: string
          provider_type: string
          seats_available: number | null
          seats_used: number | null
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          api_endpoint?: string | null
          created_at?: string | null
          credentials?: Json | null
          id?: string
          name: string
          org_id: string
          provider_type: string
          seats_available?: number | null
          seats_used?: number | null
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          api_endpoint?: string | null
          created_at?: string | null
          credentials?: Json | null
          id?: string
          name?: string
          org_id?: string
          provider_type?: string
          seats_available?: number | null
          seats_used?: number | null
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_providers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          active: boolean | null
          address: Json | null
          branch_type: Database["public"]["Enums"]["branch_type"] | null
          created_at: string | null
          currency: string | null
          email: string | null
          fiscal_year_start: string | null
          hours: Json | null
          id: string
          is_default: boolean | null
          manager_id: string | null
          name: string
          org_id: string
          phone: string | null
          settings: Json | null
          slug: string
          vat_number: string | null
        }
        Insert: {
          active?: boolean | null
          address?: Json | null
          branch_type?: Database["public"]["Enums"]["branch_type"] | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          fiscal_year_start?: string | null
          hours?: Json | null
          id?: string
          is_default?: boolean | null
          manager_id?: string | null
          name: string
          org_id: string
          phone?: string | null
          settings?: Json | null
          slug: string
          vat_number?: string | null
        }
        Update: {
          active?: boolean | null
          address?: Json | null
          branch_type?: Database["public"]["Enums"]["branch_type"] | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          fiscal_year_start?: string | null
          hours?: Json | null
          id?: string
          is_default?: boolean | null
          manager_id?: string | null
          name?: string
          org_id?: string
          phone?: string | null
          settings?: Json | null
          slug?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          expires_at: string | null
          id: string
          message: string | null
          org_id: string
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          message?: string | null
          org_id: string
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          message?: string | null
          org_id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      number_sequences: {
        Row: {
          created_at: string | null
          current_number: number | null
          entity_type: string
          id: string
          location_id: string | null
          org_id: string
          prefix: string | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          current_number?: number | null
          entity_type: string
          id?: string
          location_id?: string | null
          org_id: string
          prefix?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          current_number?: number | null
          entity_type?: string
          id?: string
          location_id?: string | null
          org_id?: string
          prefix?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "number_sequences_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "number_sequences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: Json | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          email: string | null
          id: string
          locale: string | null
          logo_url: string | null
          max_branches: number | null
          name: string
          phone: string | null
          settings: Json | null
          slug: string
          status: Database["public"]["Enums"]["organization_status"] | null
          subscription_plan: string | null
          tax_number: string | null
          timezone: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          locale?: string | null
          logo_url?: string | null
          max_branches?: number | null
          name: string
          phone?: string | null
          settings?: Json | null
          slug: string
          status?: Database["public"]["Enums"]["organization_status"] | null
          subscription_plan?: string | null
          tax_number?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          locale?: string | null
          logo_url?: string | null
          max_branches?: number | null
          name?: string
          phone?: string | null
          settings?: Json | null
          slug?: string
          status?: Database["public"]["Enums"]["organization_status"] | null
          subscription_plan?: string | null
          tax_number?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      part_categories: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          org_id: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          org_id: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          org_id?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "part_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "part_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          active: boolean | null
          attributes: Json | null
          barcode: string | null
          brand: string | null
          category_id: string | null
          cost_method: string
          created_at: string | null
          default_bin_id: string | null
          default_supplier_id: string | null
          default_warehouse_id: string | null
          description: string | null
          id: string
          is_serialized: boolean | null
          max_stock: number | null
          min_stock: number | null
          name: string
          org_id: string
          part_no: string
          reorder_point: number | null
          reorder_qty: number | null
          sku: string
          tax_code_id: string | null
          track_lot: boolean | null
          uom: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          attributes?: Json | null
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          cost_method?: string
          created_at?: string | null
          default_bin_id?: string | null
          default_supplier_id?: string | null
          default_warehouse_id?: string | null
          description?: string | null
          id?: string
          is_serialized?: boolean | null
          max_stock?: number | null
          min_stock?: number | null
          name: string
          org_id: string
          part_no: string
          reorder_point?: number | null
          reorder_qty?: number | null
          sku: string
          tax_code_id?: string | null
          track_lot?: boolean | null
          uom?: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          attributes?: Json | null
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          cost_method?: string
          created_at?: string | null
          default_bin_id?: string | null
          default_supplier_id?: string | null
          default_warehouse_id?: string | null
          description?: string | null
          id?: string
          is_serialized?: boolean | null
          max_stock?: number | null
          min_stock?: number | null
          name?: string
          org_id?: string
          part_no?: string
          reorder_point?: number | null
          reorder_qty?: number | null
          sku?: string
          tax_code_id?: string | null
          track_lot?: boolean | null
          uom?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "part_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          org_id: string
          processor_id: string | null
          processor_response: Json | null
          received_at: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by: string
          id?: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          org_id: string
          processor_id?: string | null
          processor_response?: Json | null
          received_at?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          org_id?: string
          processor_id?: string | null
          processor_response?: Json | null
          received_at?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_templates: {
        Row: {
          active: boolean | null
          branch_id: string | null
          created_at: string | null
          created_by: string
          default_duration_minutes: number | null
          description: string | null
          id: string
          name: string
          org_id: string
          required_skills: Json | null
          service_type: string | null
          template_data: Json | null
          updated_at: string | null
          work_zone_id: string | null
        }
        Insert: {
          active?: boolean | null
          branch_id?: string | null
          created_at?: string | null
          created_by: string
          default_duration_minutes?: number | null
          description?: string | null
          id?: string
          name: string
          org_id: string
          required_skills?: Json | null
          service_type?: string | null
          template_data?: Json | null
          updated_at?: string | null
          work_zone_id?: string | null
        }
        Update: {
          active?: boolean | null
          branch_id?: string | null
          created_at?: string | null
          created_by?: string
          default_duration_minutes?: number | null
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          required_skills?: Json | null
          service_type?: string | null
          template_data?: Json | null
          updated_at?: string | null
          work_zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planner_templates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planner_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planner_templates_work_zone_id_fkey"
            columns: ["work_zone_id"]
            isOneToOne: false
            referencedRelation: "work_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          org_id: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          org_id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          org_id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          id: string
          inventory_item_id: string
          line_total: number | null
          notes: string | null
          org_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number | null
          unit_cost: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_item_id: string
          line_total?: number | null
          notes?: string | null
          org_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received?: number | null
          unit_cost: number
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_item_id?: string
          line_total?: number | null
          notes?: string | null
          org_id?: string
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          created_by: string
          expected_at: string | null
          id: string
          location_id: string | null
          notes: string | null
          ordered_at: string | null
          org_id: string
          po_number: string
          received_at: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total: number | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expected_at?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          ordered_at?: string | null
          org_id: string
          po_number: string
          received_at?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expected_at?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          ordered_at?: string | null
          org_id?: string
          po_number?: string
          received_at?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total?: number | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_availability: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          org_id: string
          resource_id: string
          start_time: string
          weekday: number
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          org_id: string
          resource_id: string
          start_time: string
          weekday: number
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          org_id?: string
          resource_id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: []
      }
      resource_time_off: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          org_id: string
          reason: string | null
          resource_id: string
          start_time: string
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          org_id: string
          reason?: string | null
          resource_id: string
          start_time: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          org_id?: string
          reason?: string | null
          resource_id?: string
          start_time?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          active: boolean | null
          capacity: number | null
          color: string | null
          created_at: string | null
          employment_type: string | null
          hire_date: string | null
          hourly_rate: number | null
          id: string
          location_id: string | null
          meta: Json | null
          name: string
          org_id: string
          skills: Json | null
          type: string
          updated_at: string | null
          work_zone_id: string | null
        }
        Insert: {
          active?: boolean | null
          capacity?: number | null
          color?: string | null
          created_at?: string | null
          employment_type?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          location_id?: string | null
          meta?: Json | null
          name: string
          org_id: string
          skills?: Json | null
          type: string
          updated_at?: string | null
          work_zone_id?: string | null
        }
        Update: {
          active?: boolean | null
          capacity?: number | null
          color?: string | null
          created_at?: string | null
          employment_type?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          location_id?: string | null
          meta?: Json | null
          name?: string
          org_id?: string
          skills?: Json | null
          type?: string
          updated_at?: string | null
          work_zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_work_zone_id_fkey"
            columns: ["work_zone_id"]
            isOneToOne: false
            referencedRelation: "work_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduler_settings: {
        Row: {
          allow_double_booking: boolean | null
          booking_window_days: number | null
          cancellation_policy: string | null
          created_at: string | null
          day_end: string | null
          day_start: string | null
          default_view: string | null
          id: string
          location_id: string | null
          org_id: string
          overbook_policy: string | null
          reminder_lead_minutes: number[] | null
          slot_minutes: number | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          allow_double_booking?: boolean | null
          booking_window_days?: number | null
          cancellation_policy?: string | null
          created_at?: string | null
          day_end?: string | null
          day_start?: string | null
          default_view?: string | null
          id?: string
          location_id?: string | null
          org_id: string
          overbook_policy?: string | null
          reminder_lead_minutes?: number[] | null
          slot_minutes?: number | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_double_booking?: boolean | null
          booking_window_days?: number | null
          cancellation_policy?: string | null
          created_at?: string | null
          day_end?: string | null
          day_start?: string | null
          default_view?: string | null
          id?: string
          location_id?: string | null
          org_id?: string
          overbook_policy?: string | null
          reminder_lead_minutes?: number[] | null
          slot_minutes?: number | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      service_reminders: {
        Row: {
          active: boolean | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          due_mileage: number | null
          id: string
          interval_miles: number | null
          interval_months: number | null
          notes: string | null
          org_id: string
          sent_at: string | null
          service_type: string
          vehicle_id: string
        }
        Insert: {
          active?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          due_mileage?: number | null
          id?: string
          interval_miles?: number | null
          interval_months?: number | null
          notes?: string | null
          org_id: string
          sent_at?: string | null
          service_type: string
          vehicle_id: string
        }
        Update: {
          active?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          due_mileage?: number | null
          id?: string
          interval_miles?: number | null
          interval_months?: number | null
          notes?: string | null
          org_id?: string
          sent_at?: string | null
          service_type?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_reminders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reminders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_templates: {
        Row: {
          active: boolean | null
          category: string | null
          color: string | null
          created_at: string
          created_by: string | null
          default_duration_minutes: number | null
          description: string | null
          estimated_hours: number | null
          id: string
          location_id: string | null
          name: string
          operations: Json | null
          org_id: string
          parts: Json | null
          skills_required: Json | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          default_duration_minutes?: number | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          location_id?: string | null
          name: string
          operations?: Json | null
          org_id: string
          parts?: Json | null
          skills_required?: Json | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          category?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          default_duration_minutes?: number | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          location_id?: string | null
          name?: string
          operations?: Json | null
          org_id?: string
          parts?: Json | null
          skills_required?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      stock_ledger: {
        Row: {
          bin_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          location_id: string | null
          lot_no: string | null
          notes: string | null
          occurred_at: string | null
          org_id: string
          part_id: string
          qty_delta: number
          ref_id: string | null
          ref_line_id: string | null
          ref_type: string
          serial_no: string | null
          txn_type: string
          unit_cost: number
          value_delta: number
          warehouse_id: string | null
        }
        Insert: {
          bin_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location_id?: string | null
          lot_no?: string | null
          notes?: string | null
          occurred_at?: string | null
          org_id: string
          part_id: string
          qty_delta: number
          ref_id?: string | null
          ref_line_id?: string | null
          ref_type: string
          serial_no?: string | null
          txn_type: string
          unit_cost: number
          value_delta: number
          warehouse_id?: string | null
        }
        Update: {
          bin_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location_id?: string | null
          lot_no?: string | null
          notes?: string | null
          occurred_at?: string | null
          org_id?: string
          part_id?: string
          qty_delta?: number
          ref_id?: string | null
          ref_line_id?: string | null
          ref_type?: string
          serial_no?: string | null
          txn_type?: string
          unit_cost?: number
          value_delta?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_ledger_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "bins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          inventory_item_id: string
          movement_type: string
          notes: string | null
          org_id: string
          quantity_change: number
          reference_id: string | null
          reference_type: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          inventory_item_id: string
          movement_type: string
          notes?: string | null
          org_id: string
          quantity_change: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          inventory_item_id?: string
          movement_type?: string
          notes?: string | null
          org_id?: string
          quantity_change?: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_serials: {
        Row: {
          allocated_at: string | null
          created_at: string | null
          id: string
          inventory_item_id: string
          org_id: string
          received_at: string | null
          serial_number: string
          status: string | null
          used_at: string | null
          warranty_expires_at: string | null
          work_order_id: string | null
        }
        Insert: {
          allocated_at?: string | null
          created_at?: string | null
          id?: string
          inventory_item_id: string
          org_id: string
          received_at?: string | null
          serial_number: string
          status?: string | null
          used_at?: string | null
          warranty_expires_at?: string | null
          work_order_id?: string | null
        }
        Update: {
          allocated_at?: string | null
          created_at?: string | null
          id?: string
          inventory_item_id?: string
          org_id?: string
          received_at?: string | null
          serial_number?: string
          status?: string | null
          used_at?: string | null
          warranty_expires_at?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_serials_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_serials_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_serials_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_invoices: {
        Row: {
          created_at: string | null
          created_by: string
          currency: string | null
          discount_total: number | null
          freight: number | null
          fx_rate: number | null
          grand_total: number | null
          id: string
          invoice_date: string
          location_id: string | null
          notes: string | null
          number: string
          org_id: string
          status: string | null
          subtotal: number | null
          supplier_id: string
          tax_total: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          currency?: string | null
          discount_total?: number | null
          freight?: number | null
          fx_rate?: number | null
          grand_total?: number | null
          id?: string
          invoice_date: string
          location_id?: string | null
          notes?: string | null
          number: string
          org_id: string
          status?: string | null
          subtotal?: number | null
          supplier_id: string
          tax_total?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          currency?: string | null
          discount_total?: number | null
          freight?: number | null
          fx_rate?: number | null
          grand_total?: number | null
          id?: string
          invoice_date?: string
          location_id?: string | null
          notes?: string | null
          number?: string
          org_id?: string
          status?: string | null
          subtotal?: number | null
          supplier_id?: string
          tax_total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean | null
          address: Json | null
          code: string | null
          created_at: string | null
          currency: string
          email: string | null
          id: string
          lead_time_days: number | null
          name: string
          org_id: string
          payment_terms: string | null
          phone: string | null
          updated_at: string | null
          vat_id: string | null
        }
        Insert: {
          active?: boolean | null
          address?: Json | null
          code?: string | null
          created_at?: string | null
          currency?: string
          email?: string | null
          id?: string
          lead_time_days?: number | null
          name: string
          org_id: string
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string | null
          vat_id?: string | null
        }
        Update: {
          active?: boolean | null
          address?: Json | null
          code?: string | null
          created_at?: string | null
          currency?: string
          email?: string | null
          id?: string
          lead_time_days?: number | null
          name?: string
          org_id?: string
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string | null
          vat_id?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          key: string
          org_id: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          org_id: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          org_id?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      technicians: {
        Row: {
          capacity_minutes: number | null
          color: string | null
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          location_id: string | null
          org_id: string
          profile_id: string | null
          skills: string[] | null
          updated_at: string | null
        }
        Insert: {
          capacity_minutes?: number | null
          color?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          org_id: string
          profile_id?: string | null
          skills?: string[] | null
          updated_at?: string | null
        }
        Update: {
          capacity_minutes?: number | null
          color?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          org_id?: string
          profile_id?: string | null
          skills?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technicians_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technicians_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technicians_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          break_minutes: number | null
          clock_in: string
          clock_out: string | null
          created_at: string | null
          id: string
          notes: string | null
          org_id: string
          status: string | null
          total_minutes: number | null
          updated_at: string | null
          user_id: string
          work_order_id: string | null
        }
        Insert: {
          break_minutes?: number | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          org_id: string
          status?: string | null
          total_minutes?: number | null
          updated_at?: string | null
          user_id: string
          work_order_id?: string | null
        }
        Update: {
          break_minutes?: number | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          status?: string | null
          total_minutes?: number | null
          updated_at?: string | null
          user_id?: string
          work_order_id?: string | null
        }
        Relationships: []
      }
      time_logs: {
        Row: {
          billable: boolean | null
          clock_in: string
          clock_out: string | null
          created_at: string | null
          duration_minutes: number | null
          hourly_rate: number | null
          id: string
          notes: string | null
          org_id: string
          user_id: string
          work_order_id: string | null
          work_order_item_id: string | null
        }
        Insert: {
          billable?: boolean | null
          clock_in: string
          clock_out?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          org_id: string
          user_id: string
          work_order_id?: string | null
          work_order_item_id?: string | null
        }
        Update: {
          billable?: boolean | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          org_id?: string
          user_id?: string
          work_order_id?: string | null
          work_order_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_work_order_item_id_fkey"
            columns: ["work_order_item_id"]
            isOneToOne: false
            referencedRelation: "work_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          end_date: string
          hours_requested: number
          id: string
          org_id: string
          reason: string | null
          request_type: string
          start_date: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          end_date: string
          hours_requested?: number
          id?: string
          org_id: string
          reason?: string | null
          request_type: string
          start_date: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          end_date?: string
          hours_requested?: number
          id?: string
          org_id?: string
          reason?: string | null
          request_type?: string
          start_date?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tire_storage: {
        Row: {
          active: boolean | null
          condition: string
          created_at: string | null
          created_by: string
          customer_id: string
          id: string
          next_reminder_date: string | null
          notes: string | null
          org_id: string
          photos: Json | null
          position: string
          quantity: number
          rack_location: string
          removal_date: string | null
          season: string
          stored_date: string
          tire_brand: string
          tire_size: string
          tread_depth: number | null
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          active?: boolean | null
          condition: string
          created_at?: string | null
          created_by: string
          customer_id: string
          id?: string
          next_reminder_date?: string | null
          notes?: string | null
          org_id: string
          photos?: Json | null
          position: string
          quantity?: number
          rack_location: string
          removal_date?: string | null
          season: string
          stored_date?: string
          tire_brand: string
          tire_size: string
          tread_depth?: number | null
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          active?: boolean | null
          condition?: string
          created_at?: string | null
          created_by?: string
          customer_id?: string
          id?: string
          next_reminder_date?: string | null
          notes?: string | null
          org_id?: string
          photos?: Json | null
          position?: string
          quantity?: number
          rack_location?: string
          removal_date?: string | null
          season?: string
          stored_date?: string
          tire_brand?: string
          tire_size?: string
          tread_depth?: number | null
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tire_storage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_storage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_storage_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_media: {
        Row: {
          created_at: string
          created_by: string
          file_name: string
          file_size: number | null
          id: string
          kind: string
          mime_type: string | null
          org_id: string
          storage_path: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          file_name: string
          file_size?: number | null
          id?: string
          kind?: string
          mime_type?: string | null
          org_id: string
          storage_path: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          file_name?: string
          file_size?: number | null
          id?: string
          kind?: string
          mime_type?: string | null
          org_id?: string
          storage_path?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          active: boolean | null
          color: string | null
          created_at: string | null
          customer_id: string
          engine: string | null
          fuel_type: string | null
          id: string
          image_url: string | null
          license_plate: string | null
          make: string
          mileage: number | null
          model: string
          notes: string | null
          org_id: string
          tire_size: string | null
          transmission: string | null
          updated_at: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          customer_id: string
          engine?: string | null
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          license_plate?: string | null
          make: string
          mileage?: number | null
          model: string
          notes?: string | null
          org_id: string
          tire_size?: string | null
          transmission?: string | null
          updated_at?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          customer_id?: string
          engine?: string | null
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          license_plate?: string | null
          make?: string
          mileage?: number | null
          model?: string
          notes?: string | null
          org_id?: string
          tire_size?: string | null
          transmission?: string | null
          updated_at?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          active: boolean | null
          address: Json | null
          api_integration: Json | null
          contact_name: string | null
          created_at: string | null
          credit_limit: number | null
          email: string | null
          id: string
          name: string
          notes: string | null
          org_id: string
          payment_terms: number | null
          phone: string | null
          preferred: boolean | null
          supplier_code: string | null
          tax_number: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: Json | null
          api_integration?: Json | null
          contact_name?: string | null
          created_at?: string | null
          credit_limit?: number | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id: string
          payment_terms?: number | null
          phone?: string | null
          preferred?: boolean | null
          supplier_code?: string | null
          tax_number?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: Json | null
          api_integration?: Json | null
          contact_name?: string | null
          created_at?: string | null
          credit_limit?: number | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          payment_terms?: number | null
          phone?: string | null
          preferred?: boolean | null
          supplier_code?: string | null
          tax_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vin_cache: {
        Row: {
          cached_at: string | null
          decoded_data: Json
          expires_at: string | null
          id: string
          org_id: string
          provider: string
          vin: string
        }
        Insert: {
          cached_at?: string | null
          decoded_data: Json
          expires_at?: string | null
          id?: string
          org_id: string
          provider?: string
          vin: string
        }
        Update: {
          cached_at?: string | null
          decoded_data?: Json
          expires_at?: string | null
          id?: string
          org_id?: string
          provider?: string
          vin?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          location_id: string | null
          notes: string | null
          org_id: string
          preferred_end: string | null
          preferred_start: string | null
          status: string | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          location_id?: string | null
          notes?: string | null
          org_id: string
          preferred_end?: string | null
          preferred_start?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          org_id?: string
          preferred_end?: string | null
          preferred_start?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          active: boolean | null
          address: Json | null
          branch_id: string | null
          code: string
          created_at: string | null
          id: string
          manager_id: string | null
          name: string
          org_id: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          address?: Json | null
          branch_id?: string | null
          code: string
          created_at?: string | null
          id?: string
          manager_id?: string | null
          name: string
          org_id: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          address?: Json | null
          branch_id?: string | null
          code?: string
          created_at?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          org_id?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_items: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          inventory_item_id: string | null
          line_total: number | null
          notes: string | null
          org_id: string
          quantity: number | null
          quantity_used: number | null
          sort_order: number | null
          started_at: string | null
          tax_rate: number | null
          taxable: boolean | null
          technician_id: string | null
          type: Database["public"]["Enums"]["item_type"]
          unit_cost: number | null
          unit_price: number | null
          updated_at: string | null
          work_order_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          inventory_item_id?: string | null
          line_total?: number | null
          notes?: string | null
          org_id: string
          quantity?: number | null
          quantity_used?: number | null
          sort_order?: number | null
          started_at?: string | null
          tax_rate?: number | null
          taxable?: boolean | null
          technician_id?: string | null
          type: Database["public"]["Enums"]["item_type"]
          unit_cost?: number | null
          unit_price?: number | null
          updated_at?: string | null
          work_order_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          inventory_item_id?: string | null
          line_total?: number | null
          notes?: string | null
          org_id?: string
          quantity?: number | null
          quantity_used?: number | null
          sort_order?: number | null
          started_at?: string | null
          tax_rate?: number | null
          taxable?: boolean | null
          technician_id?: string | null
          type?: Database["public"]["Enums"]["item_type"]
          unit_cost?: number | null
          unit_price?: number | null
          updated_at?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_items_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_media: {
        Row: {
          created_at: string
          description: string | null
          id: string
          kind: string
          org_id: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
          work_order_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          org_id: string
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
          work_order_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          org_id?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_media_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_media_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          actual_hours: number | null
          cause: string | null
          complaint: string | null
          completed_at: string | null
          correction: string | null
          created_at: string | null
          created_by: string
          customer_id: string
          description: string | null
          estimate_id: string | null
          estimated_hours: number | null
          id: string
          internal_notes: string | null
          labor_hours_actual: number | null
          labor_hours_estimated: number | null
          location_id: string | null
          mileage_in: number | null
          mileage_out: number | null
          notes: string | null
          org_id: string
          priority: string | null
          promised_at: string | null
          scheduled_at: string | null
          service_advisor: string | null
          sla_due_at: string | null
          stage_entered_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["work_order_status"] | null
          subtotal: number | null
          tax_amount: number | null
          technician_id: string | null
          title: string | null
          total: number | null
          total_estimate: number | null
          updated_at: string | null
          vehicle_id: string
          work_order_number: string
          workflow_notes: string | null
          workflow_stage_id: string | null
        }
        Insert: {
          actual_hours?: number | null
          cause?: string | null
          complaint?: string | null
          completed_at?: string | null
          correction?: string | null
          created_at?: string | null
          created_by: string
          customer_id: string
          description?: string | null
          estimate_id?: string | null
          estimated_hours?: number | null
          id?: string
          internal_notes?: string | null
          labor_hours_actual?: number | null
          labor_hours_estimated?: number | null
          location_id?: string | null
          mileage_in?: number | null
          mileage_out?: number | null
          notes?: string | null
          org_id: string
          priority?: string | null
          promised_at?: string | null
          scheduled_at?: string | null
          service_advisor?: string | null
          sla_due_at?: string | null
          stage_entered_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["work_order_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          technician_id?: string | null
          title?: string | null
          total?: number | null
          total_estimate?: number | null
          updated_at?: string | null
          vehicle_id: string
          work_order_number: string
          workflow_notes?: string | null
          workflow_stage_id?: string | null
        }
        Update: {
          actual_hours?: number | null
          cause?: string | null
          complaint?: string | null
          completed_at?: string | null
          correction?: string | null
          created_at?: string | null
          created_by?: string
          customer_id?: string
          description?: string | null
          estimate_id?: string | null
          estimated_hours?: number | null
          id?: string
          internal_notes?: string | null
          labor_hours_actual?: number | null
          labor_hours_estimated?: number | null
          location_id?: string | null
          mileage_in?: number | null
          mileage_out?: number | null
          notes?: string | null
          org_id?: string
          priority?: string | null
          promised_at?: string | null
          scheduled_at?: string | null
          service_advisor?: string | null
          sla_due_at?: string | null
          stage_entered_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["work_order_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          technician_id?: string | null
          title?: string | null
          total?: number | null
          total_estimate?: number | null
          updated_at?: string | null
          vehicle_id?: string
          work_order_number?: string
          workflow_notes?: string | null
          workflow_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_workflow_stage_id_fkey"
            columns: ["workflow_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      work_zones: {
        Row: {
          active: boolean | null
          branch_id: string | null
          capacity: number | null
          code: string
          color: string | null
          created_at: string | null
          description: string | null
          equipment: Json | null
          id: string
          name: string
          org_id: string
          skills_required: Json | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          branch_id?: string | null
          capacity?: number | null
          code: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          equipment?: Json | null
          id?: string
          name: string
          org_id: string
          skills_required?: Json | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          branch_id?: string | null
          capacity?: number | null
          code?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          equipment?: Json | null
          id?: string
          name?: string
          org_id?: string
          skills_required?: Json | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_zones_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_zones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stages: {
        Row: {
          auto_assign_rules: Json | null
          branch_id: string | null
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          is_final: boolean | null
          name: string
          notification_rules: Json | null
          org_id: string
          sla_hours: number | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          auto_assign_rules?: Json | null
          branch_id?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_final?: boolean | null
          name: string
          notification_rules?: Json | null
          org_id: string
          sla_hours?: number | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_assign_rules?: Json | null
          branch_id?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_final?: boolean | null
          name?: string
          notification_rules?: Json | null
          org_id?: string
          sla_hours?: number | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stages_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_transitions: {
        Row: {
          auto_transition: boolean | null
          conditions: Json | null
          created_at: string | null
          from_stage_id: string | null
          id: string
          name: string
          org_id: string
          required_role: Database["public"]["Enums"]["app_role"] | null
          to_stage_id: string
        }
        Insert: {
          auto_transition?: boolean | null
          conditions?: Json | null
          created_at?: string | null
          from_stage_id?: string | null
          id?: string
          name: string
          org_id: string
          required_role?: Database["public"]["Enums"]["app_role"] | null
          to_stage_id: string
        }
        Update: {
          auto_transition?: boolean | null
          conditions?: Json | null
          created_at?: string | null
          from_stage_id?: string | null
          id?: string
          name?: string
          org_id?: string
          required_role?: Database["public"]["Enums"]["app_role"] | null
          to_stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_transitions_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_transitions_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_appointment_workload: {
        Args: {
          p_end_time: string
          p_resource_id?: string
          p_start_time: string
          p_work_zone_id?: string
        }
        Returns: {
          actual_hours: number
          planned_hours: number
          resource_id: string
          utilization_pct: number
          work_zone_id: string
        }[]
      }
      cancel_appointment: {
        Args: { p_appointment_id: string; p_reason?: string }
        Returns: boolean
      }
      check_appointment_conflicts: {
        Args: { p_appointment_id: string }
        Returns: {
          conflict_appointment_id: string
          conflict_title: string
          overlap_end: string
          overlap_start: string
          resource_name: string
        }[]
      }
      create_work_order_from_appointment: {
        Args: { p_appointment_id: string }
        Returns: string
      }
      find_available_slots: {
        Args: {
          p_constraints?: Json
          p_duration_minutes: number
          p_from_ts: string
          p_location_id: string
          p_resource_type: string
          p_to_ts: string
        }
        Returns: {
          available_resources: string[]
          score: number
          slot_end: string
          slot_start: string
        }[]
      }
      generate_next_number: {
        Args: {
          entity_type_param: string
          location_id_param?: string
          org_id_param: string
        }
        Returns: string
      }
      get_user_branch_access: {
        Args: { target_branch_id?: string }
        Returns: boolean
      }
      get_user_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_workflow_metrics: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_location_id?: string
        }
        Returns: {
          avg_cycle_time_hours: number
          overdue_count: number
          stage_color: string
          stage_id: string
          stage_name: string
          work_order_count: number
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      move_work_order_stage: {
        Args: {
          p_notes?: string
          p_to_stage_id: string
          p_work_order_id: string
        }
        Returns: boolean
      }
      reschedule_appointment: {
        Args: {
          p_appointment_id: string
          p_new_end: string
          p_new_start: string
        }
        Returns: boolean
      }
      schedule_appointment: {
        Args: { payload: Json }
        Returns: string
      }
    }
    Enums: {
      access_level: "BRANCH" | "ORGANIZATION" | "CROSS_ORGANIZATION"
      app_role:
        | "OWNER"
        | "MANAGER"
        | "SERVICE_ADVISOR"
        | "TECHNICIAN"
        | "PARTS_MANAGER"
        | "FRONT_DESK"
        | "VIEWER"
      appointment_status:
        | "SCHEDULED"
        | "CONFIRMED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "CANCELLED"
        | "NO_SHOW"
        | "cancelled"
        | "completed"
        | "no_show"
        | "booked"
        | "checked_in"
        | "in_progress"
        | "waiting_parts"
        | "done"
      branch_type: "MAIN" | "SATELLITE" | "MOBILE"
      estimate_status:
        | "DRAFT"
        | "SENT"
        | "APPROVED"
        | "DECLINED"
        | "EXPIRED"
        | "CONVERTED"
      invoice_status:
        | "DRAFT"
        | "SENT"
        | "PARTIAL"
        | "PAID"
        | "OVERDUE"
        | "CANCELLED"
      item_type: "LABOR" | "PART" | "FEE" | "DISCOUNT"
      organization_status: "ACTIVE" | "SUSPENDED" | "TRIAL"
      payment_method: "CASH" | "CARD" | "BANK_TRANSFER" | "STRIPE" | "OTHER"
      work_order_status:
        | "DRAFT"
        | "SCHEDULED"
        | "IN_PROGRESS"
        | "WAITING_PARTS"
        | "READY"
        | "COMPLETED"
        | "CANCELLED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_level: ["BRANCH", "ORGANIZATION", "CROSS_ORGANIZATION"],
      app_role: [
        "OWNER",
        "MANAGER",
        "SERVICE_ADVISOR",
        "TECHNICIAN",
        "PARTS_MANAGER",
        "FRONT_DESK",
        "VIEWER",
      ],
      appointment_status: [
        "SCHEDULED",
        "CONFIRMED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW",
        "cancelled",
        "completed",
        "no_show",
        "booked",
        "checked_in",
        "in_progress",
        "waiting_parts",
        "done",
      ],
      branch_type: ["MAIN", "SATELLITE", "MOBILE"],
      estimate_status: [
        "DRAFT",
        "SENT",
        "APPROVED",
        "DECLINED",
        "EXPIRED",
        "CONVERTED",
      ],
      invoice_status: [
        "DRAFT",
        "SENT",
        "PARTIAL",
        "PAID",
        "OVERDUE",
        "CANCELLED",
      ],
      item_type: ["LABOR", "PART", "FEE", "DISCOUNT"],
      organization_status: ["ACTIVE", "SUSPENDED", "TRIAL"],
      payment_method: ["CASH", "CARD", "BANK_TRANSFER", "STRIPE", "OTHER"],
      work_order_status: [
        "DRAFT",
        "SCHEDULED",
        "IN_PROGRESS",
        "WAITING_PARTS",
        "READY",
        "COMPLETED",
        "CANCELLED",
      ],
    },
  },
} as const
