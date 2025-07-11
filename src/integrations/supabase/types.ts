export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          barber_id: string | null
          barbershop_id: string | null
          client_email: string | null
          client_name: string
          client_phone: string
          created_at: string
          id: string
          no_talk: boolean | null
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          service_id: string | null
          status: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          barber_id?: string | null
          barbershop_id?: string | null
          client_email?: string | null
          client_name: string
          client_phone: string
          created_at?: string
          id?: string
          no_talk?: boolean | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          service_id?: string | null
          status?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          barber_id?: string | null
          barbershop_id?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string
          created_at?: string
          id?: string
          no_talk?: boolean | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          service_id?: string | null
          status?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          barbershop_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          photo_url: string | null
        }
        Insert: {
          barbershop_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          photo_url?: string | null
        }
        Update: {
          barbershop_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barbers_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershops: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          mercadopago_access_token: string | null
          name: string
          owner_id: string | null
          phone: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          mercadopago_access_token?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          mercadopago_access_token?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_hours: {
        Row: {
          barbershop_id: string | null
          close_time: string | null
          day_of_week: number
          id: string
          is_open: boolean | null
          open_time: string | null
        }
        Insert: {
          barbershop_id?: string | null
          close_time?: string | null
          day_of_week: number
          id?: string
          is_open?: boolean | null
          open_time?: string | null
        }
        Update: {
          barbershop_id?: string | null
          close_time?: string | null
          day_of_week?: number
          id?: string
          is_open?: boolean | null
          open_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks: {
        Row: {
          appointment_date: string
          appointment_id: string
          barber_name: string
          barbershop_id: string
          client_name: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          service_name: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_id: string
          barber_name: string
          barbershop_id: string
          client_name: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          service_name: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_id?: string
          barber_name?: string
          barbershop_id?: string
          client_name?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          service_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          name: string
          phone: string
        }
        Insert: {
          id: string
          name: string
          phone: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          barbershop_id: string | null
          created_at: string
          duration: number
          id: string
          is_active: boolean | null
          name: string
          price: number
        }
        Insert: {
          barbershop_id?: string | null
          created_at?: string
          duration: number
          id?: string
          is_active?: boolean | null
          name: string
          price: number
        }
        Update: {
          barbershop_id?: string | null
          created_at?: string
          duration?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_connect_accounts: {
        Row: {
          account_status: string | null
          barbershop_id: string
          charges_enabled: boolean | null
          created_at: string
          id: string
          payouts_enabled: boolean | null
          stripe_account_id: string
          updated_at: string
        }
        Insert: {
          account_status?: string | null
          barbershop_id: string
          charges_enabled?: boolean | null
          created_at?: string
          id?: string
          payouts_enabled?: boolean | null
          stripe_account_id: string
          updated_at?: string
        }
        Update: {
          account_status?: string | null
          barbershop_id?: string
          charges_enabled?: boolean | null
          created_at?: string
          id?: string
          payouts_enabled?: boolean | null
          stripe_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_connect_accounts_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          barbershop_id: string | null
          blocked_at: string | null
          blocked_reason: string | null
          created_at: string
          current_period_end: string | null
          id: string
          is_trial: boolean | null
          payment_failed_at: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          barbershop_id?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_trial?: boolean | null
          payment_failed_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          barbershop_id?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_trial?: boolean | null
          payment_failed_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_subscription_status: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
