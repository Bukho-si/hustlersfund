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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata_json: Json | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata_json?: Json | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata_json?: Json | null
        }
        Relationships: []
      }
      contribution_cycles: {
        Row: {
          closes_on: string
          created_at: string
          deadline: string
          id: string
          is_closed: boolean
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          closes_on: string
          created_at?: string
          deadline: string
          id?: string
          is_closed?: boolean
          week_end_date: string
          week_start_date: string
        }
        Update: {
          closes_on?: string
          created_at?: string
          deadline?: string
          id?: string
          is_closed?: boolean
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: []
      }
      contribution_settings: {
        Row: {
          accident_emergency_amount: number
          cash_atm_fee_amount: number
          created_at: string
          funeral_emergency_amount: number
          id: string
          joining_fee_amount: number
          late_fine_amount: number
          personal_loan_monthly_cap: number
          petrol_loan_weekly_cap: number
          updated_at: string
          weekly_subscription_amount: number
        }
        Insert: {
          accident_emergency_amount?: number
          cash_atm_fee_amount?: number
          created_at?: string
          funeral_emergency_amount?: number
          id?: string
          joining_fee_amount?: number
          late_fine_amount?: number
          personal_loan_monthly_cap?: number
          petrol_loan_weekly_cap?: number
          updated_at?: string
          weekly_subscription_amount?: number
        }
        Update: {
          accident_emergency_amount?: number
          cash_atm_fee_amount?: number
          created_at?: string
          funeral_emergency_amount?: number
          id?: string
          joining_fee_amount?: number
          late_fine_amount?: number
          personal_loan_monthly_cap?: number
          petrol_loan_weekly_cap?: number
          updated_at?: string
          weekly_subscription_amount?: number
        }
        Relationships: []
      }
      emergency_dues: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string
          event_id: string
          id: string
          member_user_id: string
          status: Database["public"]["Enums"]["emergency_due_status"]
          updated_at: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number
          created_at?: string
          event_id: string
          id?: string
          member_user_id: string
          status?: Database["public"]["Enums"]["emergency_due_status"]
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          event_id?: string
          id?: string
          member_user_id?: string
          status?: Database["public"]["Enums"]["emergency_due_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_dues_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "emergency_events"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_events: {
        Row: {
          amount_per_member: number
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          id: string
          status: Database["public"]["Enums"]["emergency_event_status"]
          title: string
          type: Database["public"]["Enums"]["emergency_type"]
          updated_at: string
        }
        Insert: {
          amount_per_member: number
          created_at?: string
          created_by: string
          description?: string | null
          event_date: string
          id?: string
          status?: Database["public"]["Enums"]["emergency_event_status"]
          title: string
          type: Database["public"]["Enums"]["emergency_type"]
          updated_at?: string
        }
        Update: {
          amount_per_member?: number
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string
          id?: string
          status?: Database["public"]["Enums"]["emergency_event_status"]
          title?: string
          type?: Database["public"]["Enums"]["emergency_type"]
          updated_at?: string
        }
        Relationships: []
      }
      loan_repayments: {
        Row: {
          amount: number
          created_at: string
          id: string
          loan_id: string
          paid_at: string
          recorded_by: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          loan_id: string
          paid_at?: string
          recorded_by: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          loan_id?: string
          paid_at?: string
          recorded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_settings: {
        Row: {
          created_at: string
          id: string
          interest_type: string
          personal_interest_rate_percent: number
          petrol_interest_rate_percent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest_type?: string
          personal_interest_rate_percent?: number
          petrol_interest_rate_percent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          interest_type?: string
          personal_interest_rate_percent?: number
          petrol_interest_rate_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      loans: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          interest_amount: number | null
          interest_rate_percent: number | null
          member_user_id: string
          outstanding_balance: number
          reason: string | null
          rejection_reason: string | null
          repayment_period: string | null
          repayment_plan: string | null
          requested_at: string
          status: Database["public"]["Enums"]["loan_status"]
          total_repayable: number | null
          type: Database["public"]["Enums"]["loan_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          interest_amount?: number | null
          interest_rate_percent?: number | null
          member_user_id: string
          outstanding_balance: number
          reason?: string | null
          rejection_reason?: string | null
          repayment_period?: string | null
          repayment_plan?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["loan_status"]
          total_repayable?: number | null
          type: Database["public"]["Enums"]["loan_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          interest_amount?: number | null
          interest_rate_percent?: number | null
          member_user_id?: string
          outstanding_balance?: number
          reason?: string | null
          rejection_reason?: string | null
          repayment_period?: string | null
          repayment_plan?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["loan_status"]
          total_repayable?: number | null
          type?: Database["public"]["Enums"]["loan_type"]
          updated_at?: string
        }
        Relationships: []
      }
      member_profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          join_date: string
          joining_fee_paid: boolean
          joining_fee_paid_total: number
          membership_slots: number
          phone: string | null
          status: Database["public"]["Enums"]["member_status"]
          uber_driver_id: string | null
          updated_at: string
          user_id: string
          vehicle_reg: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          join_date?: string
          joining_fee_paid?: boolean
          joining_fee_paid_total?: number
          membership_slots?: number
          phone?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          uber_driver_id?: string | null
          updated_at?: string
          user_id: string
          vehicle_reg?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          join_date?: string
          joining_fee_paid?: boolean
          joining_fee_paid_total?: number
          membership_slots?: number
          phone?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          uber_driver_id?: string | null
          updated_at?: string
          user_id?: string
          vehicle_reg?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          base_amount: number
          cash_fee_amount: number
          created_at: string
          cycle_id: string | null
          emergency_total_amount: number
          id: string
          joining_fee_amount: number
          late_fine_amount: number
          member_user_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          proof_file_url: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["payment_status"]
          submitted_at: string
          total_amount: number
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          base_amount?: number
          cash_fee_amount?: number
          created_at?: string
          cycle_id?: string | null
          emergency_total_amount?: number
          id?: string
          joining_fee_amount?: number
          late_fine_amount?: number
          member_user_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          proof_file_url?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          submitted_at?: string
          total_amount: number
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          base_amount?: number
          cash_fee_amount?: number
          created_at?: string
          cycle_id?: string | null
          emergency_total_amount?: number
          id?: string
          joining_fee_amount?: number
          late_fine_amount?: number
          member_user_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          proof_file_url?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          submitted_at?: string
          total_amount?: number
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "contribution_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_admin_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "member"
        | "admin"
        | "super_admin"
        | "emergency_admin"
        | "petrol_loan_admin"
        | "personal_loan_admin"
      emergency_due_status: "unpaid" | "paid"
      emergency_event_status: "active" | "closed"
      emergency_type: "funeral" | "accident"
      loan_status: "pending" | "approved" | "rejected"
      loan_type: "petrol" | "personal"
      member_status: "pending" | "active" | "suspended" | "exited"
      payment_method: "eft" | "cash_atm"
      payment_status:
        | "submitted"
        | "pending_verification"
        | "verified"
        | "rejected"
        | "withdrawn"
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
      app_role: [
        "member",
        "admin",
        "super_admin",
        "emergency_admin",
        "petrol_loan_admin",
        "personal_loan_admin",
      ],
      emergency_due_status: ["unpaid", "paid"],
      emergency_event_status: ["active", "closed"],
      emergency_type: ["funeral", "accident"],
      loan_status: ["pending", "approved", "rejected"],
      loan_type: ["petrol", "personal"],
      member_status: ["pending", "active", "suspended", "exited"],
      payment_method: ["eft", "cash_atm"],
      payment_status: [
        "submitted",
        "pending_verification",
        "verified",
        "rejected",
        "withdrawn",
      ],
    },
  },
} as const
