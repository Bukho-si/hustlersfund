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
    PostgrestVersion: "14.5"
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
          loss_of_beneficiary_amount: number
          loss_of_member_amount: number
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
          loss_of_beneficiary_amount?: number
          loss_of_member_amount?: number
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
          loss_of_beneficiary_amount?: number
          loss_of_member_amount?: number
          personal_loan_monthly_cap?: number
          petrol_loan_weekly_cap?: number
          updated_at?: string
          weekly_subscription_amount?: number
        }
        Relationships: []
      }
      emergency_contributor_payments: {
        Row: {
          amount: number
          contributor_id: string
          created_at: string
          event_id: string
          id: string
          notes: string | null
          payment_date: string
          recorded_by: string
        }
        Insert: {
          amount: number
          contributor_id: string
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          payment_date?: string
          recorded_by: string
        }
        Update: {
          amount?: number
          contributor_id?: string
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          recorded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contributor_payments_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "emergency_contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_contributor_payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "emergency_events"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contributors: {
        Row: {
          amount_due: number
          amount_paid: number
          contributor_type: string
          created_at: string
          event_id: string
          external_name: string | null
          external_phone: string | null
          id: string
          member_user_id: string | null
          payment_status: string
          recorded_by_admin: string | null
          updated_at: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          contributor_type?: string
          created_at?: string
          event_id: string
          external_name?: string | null
          external_phone?: string | null
          id?: string
          member_user_id?: string | null
          payment_status?: string
          recorded_by_admin?: string | null
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          contributor_type?: string
          created_at?: string
          event_id?: string
          external_name?: string | null
          external_phone?: string | null
          id?: string
          member_user_id?: string | null
          payment_status?: string
          recorded_by_admin?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contributors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "emergency_events"
            referencedColumns: ["id"]
          },
        ]
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
          payment_deadline: string | null
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
          payment_deadline?: string | null
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
          payment_deadline?: string | null
          status?: Database["public"]["Enums"]["emergency_event_status"]
          title?: string
          type?: Database["public"]["Enums"]["emergency_type"]
          updated_at?: string
        }
        Relationships: []
      }
      emergency_payment_history: {
        Row: {
          amount: number
          created_at: string
          due_id: string
          event_id: string
          id: string
          member_user_id: string
          notes: string | null
          payment_date: string
          recorded_by: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_id: string
          event_id: string
          id?: string
          member_user_id: string
          notes?: string | null
          payment_date?: string
          recorded_by: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_id?: string
          event_id?: string
          id?: string
          member_user_id?: string
          notes?: string | null
          payment_date?: string
          recorded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_payment_history_due_id_fkey"
            columns: ["due_id"]
            isOneToOne: false
            referencedRelation: "emergency_dues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_payment_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "emergency_events"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_ledger: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          member_user_id: string
          reference_id: string | null
          transaction_type: Database["public"]["Enums"]["ledger_transaction_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          member_user_id: string
          reference_id?: string | null
          transaction_type: Database["public"]["Enums"]["ledger_transaction_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          member_user_id?: string
          reference_id?: string | null
          transaction_type?: Database["public"]["Enums"]["ledger_transaction_type"]
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
          personal_repayment_days: number
          petrol_interest_rate_percent: number
          petrol_repayment_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest_type?: string
          personal_interest_rate_percent?: number
          personal_repayment_days?: number
          petrol_interest_rate_percent?: number
          petrol_repayment_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          interest_type?: string
          personal_interest_rate_percent?: number
          personal_repayment_days?: number
          petrol_interest_rate_percent?: number
          petrol_repayment_days?: number
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
          disbursed_at: string | null
          disbursed_by: string | null
          due_date: string | null
          id: string
          interest_amount: number | null
          interest_rate_percent: number | null
          locked_at: string | null
          locked_by: string | null
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
          disbursed_at?: string | null
          disbursed_by?: string | null
          due_date?: string | null
          id?: string
          interest_amount?: number | null
          interest_rate_percent?: number | null
          locked_at?: string | null
          locked_by?: string | null
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
          disbursed_at?: string | null
          disbursed_by?: string | null
          due_date?: string | null
          id?: string
          interest_amount?: number | null
          interest_rate_percent?: number | null
          locked_at?: string | null
          locked_by?: string | null
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
      member_wallets: {
        Row: {
          contribution_balance: number
          emergency_contributions_total: number
          id: string
          joining_fee_balance: number
          member_user_id: string
          personal_loan_balance: number
          petrol_loan_balance: number
          updated_at: string
        }
        Insert: {
          contribution_balance?: number
          emergency_contributions_total?: number
          id?: string
          joining_fee_balance?: number
          member_user_id: string
          personal_loan_balance?: number
          petrol_loan_balance?: number
          updated_at?: string
        }
        Update: {
          contribution_balance?: number
          emergency_contributions_total?: number
          id?: string
          joining_fee_balance?: number
          member_user_id?: string
          personal_loan_balance?: number
          petrol_loan_balance?: number
          updated_at?: string
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
      personal_loan_activity: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          details: string | null
          id: string
          loan_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          details?: string | null
          id?: string
          loan_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          details?: string | null
          id?: string
          loan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_loan_activity_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_loan_fund: {
        Row: {
          current_balance: number
          id: string
          last_updated: string
          low_balance_threshold: number
        }
        Insert: {
          current_balance?: number
          id?: string
          last_updated?: string
          low_balance_threshold?: number
        }
        Update: {
          current_balance?: number
          id?: string
          last_updated?: string
          low_balance_threshold?: number
        }
        Relationships: []
      }
      personal_loan_schedule: {
        Row: {
          created_at: string
          current_balance: number
          due_date: string
          id: string
          last_interest_applied_month: string | null
          loan_id: string
          member_user_id: string
          months_late: number
          original_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_balance: number
          due_date: string
          id?: string
          last_interest_applied_month?: string | null
          loan_id: string
          member_user_id: string
          months_late?: number
          original_amount: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          due_date?: string
          id?: string
          last_interest_applied_month?: string | null
          loan_id?: string
          member_user_id?: string
          months_late?: number
          original_amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_loan_schedule_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      petrol_fund: {
        Row: {
          current_balance: number
          id: string
          last_updated: string
          low_balance_threshold: number
        }
        Insert: {
          current_balance?: number
          id?: string
          last_updated?: string
          low_balance_threshold?: number
        }
        Update: {
          current_balance?: number
          id?: string
          last_updated?: string
          low_balance_threshold?: number
        }
        Relationships: []
      }
      petrol_loan_activity: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          details: string | null
          id: string
          loan_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          details?: string | null
          id?: string
          loan_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          details?: string | null
          id?: string
          loan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "petrol_loan_activity_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      petrol_request_window: {
        Row: {
          active: boolean
          end_time: string
          id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
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
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          member_user_id: string
          reference_id: string | null
          transaction_type: Database["public"]["Enums"]["wallet_transaction_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          member_user_id: string
          reference_id?: string | null
          transaction_type: Database["public"]["Enums"]["wallet_transaction_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          member_user_id?: string
          reference_id?: string | null
          transaction_type?: Database["public"]["Enums"]["wallet_transaction_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accrue_personal_loan_interest: { Args: never; Returns: Json }
      backfill_personal_loan_interest: { Args: never; Returns: Json }
      get_member_statement: {
        Args: { _user_id: string }
        Returns: {
          amount: number
          description: string
          entry_date: string
          entry_type: string
          loan_balance: number
          savings_balance: number
        }[]
      }
      has_any_admin_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      recalculate_wallet_balance: {
        Args: { _member_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "member"
        | "admin"
        | "super_admin"
        | "emergency_admin"
        | "petrol_loan_admin"
        | "personal_loan_admin"
        | "accident_admin"
        | "funeral_admin"
      emergency_due_status: "unpaid" | "paid" | "partially_paid" | "overdue"
      emergency_event_status: "active" | "closed"
      emergency_type:
        | "funeral"
        | "accident"
        | "loss_of_member"
        | "loss_of_beneficiary"
      ledger_transaction_type:
        | "joining_fee"
        | "weekly_contribution"
        | "petrol_loan_issued"
        | "petrol_loan_repayment"
        | "personal_loan_issued"
        | "personal_loan_repayment"
        | "emergency_contribution"
        | "late_fee"
        | "cash_fee"
      loan_status:
        | "pending"
        | "approved"
        | "rejected"
        | "requested"
        | "under_review"
        | "disbursed"
        | "repaid"
      loan_type: "petrol" | "personal"
      member_status: "pending" | "active" | "suspended" | "exited"
      payment_method: "eft" | "cash_atm"
      payment_status:
        | "submitted"
        | "pending_verification"
        | "verified"
        | "rejected"
        | "withdrawn"
      wallet_transaction_type:
        | "joining_fee_payment"
        | "weekly_contribution"
        | "petrol_loan_issued"
        | "petrol_loan_repayment"
        | "personal_loan_issued"
        | "personal_loan_repayment"
        | "funeral_contribution"
        | "accident_contribution"
        | "emergency_contribution"
        | "late_fee"
        | "cash_fee"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
        "accident_admin",
        "funeral_admin",
      ],
      emergency_due_status: ["unpaid", "paid", "partially_paid", "overdue"],
      emergency_event_status: ["active", "closed"],
      emergency_type: [
        "funeral",
        "accident",
        "loss_of_member",
        "loss_of_beneficiary",
      ],
      ledger_transaction_type: [
        "joining_fee",
        "weekly_contribution",
        "petrol_loan_issued",
        "petrol_loan_repayment",
        "personal_loan_issued",
        "personal_loan_repayment",
        "emergency_contribution",
        "late_fee",
        "cash_fee",
      ],
      loan_status: [
        "pending",
        "approved",
        "rejected",
        "requested",
        "under_review",
        "disbursed",
        "repaid",
      ],
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
      wallet_transaction_type: [
        "joining_fee_payment",
        "weekly_contribution",
        "petrol_loan_issued",
        "petrol_loan_repayment",
        "personal_loan_issued",
        "personal_loan_repayment",
        "funeral_contribution",
        "accident_contribution",
        "emergency_contribution",
        "late_fee",
        "cash_fee",
      ],
    },
  },
} as const
