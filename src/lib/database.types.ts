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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      brands: {
        Row: {
          auto_mode: boolean
          benchmark_brands: string[]
          category: string
          created_at: string
          id: string
          name: string
          site_domain: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_mode?: boolean
          benchmark_brands?: string[]
          category: string
          created_at?: string
          id?: string
          name: string
          site_domain?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          auto_mode?: boolean
          benchmark_brands?: string[]
          category?: string
          created_at?: string
          id?: string
          name?: string
          site_domain?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      card_types: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          name: string
          trigger_hint: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          name: string
          trigger_hint: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          trigger_hint?: string
        }
        Relationships: []
      }
      citations: {
        Row: {
          answer_id: string
          created_at: string
          domain: string
          id: string
          run_id: string
          source_type: string
          title: string | null
          url: string
          user_id: string
        }
        Insert: {
          answer_id: string
          created_at?: string
          domain: string
          id?: string
          run_id: string
          source_type?: string
          title?: string | null
          url: string
          user_id: string
        }
        Update: {
          answer_id?: string
          created_at?: string
          domain?: string
          id?: string
          run_id?: string
          source_type?: string
          title?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "citations_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "engine_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosis_runs: {
        Row: {
          brand_id: string
          brand_key: string
          created_at: string
          done_items: number
          engines: string[]
          failed_items: number
          finished_at: string | null
          id: string
          is_mock: boolean
          kind: string
          notified_at: string | null
          repeats: number
          search_mode: string
          started_at: string | null
          status: string
          summary: Json | null
          total_items: number
          trigger: string
          user_id: string
        }
        Insert: {
          brand_id: string
          brand_key: string
          created_at?: string
          done_items?: number
          engines?: string[]
          failed_items?: number
          finished_at?: string | null
          id?: string
          is_mock?: boolean
          kind?: string
          notified_at?: string | null
          repeats?: number
          search_mode?: string
          started_at?: string | null
          status?: string
          summary?: Json | null
          total_items?: number
          trigger?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          brand_key?: string
          created_at?: string
          done_items?: number
          engines?: string[]
          failed_items?: number
          finished_at?: string | null
          id?: string
          is_mock?: boolean
          kind?: string
          notified_at?: string | null
          repeats?: number
          search_mode?: string
          started_at?: string | null
          status?: string
          summary?: Json | null
          total_items?: number
          trigger?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_runs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      engine_answers: {
        Row: {
          answer_text: string
          created_at: string
          engine: string
          id: string
          item_id: string
          model: string
          raw_response: Json | null
          request_meta: Json
          run_id: string
          user_id: string
        }
        Insert: {
          answer_text: string
          created_at?: string
          engine: string
          id?: string
          item_id: string
          model: string
          raw_response?: Json | null
          request_meta?: Json
          run_id: string
          user_id: string
        }
        Update: {
          answer_text?: string
          created_at?: string
          engine?: string
          id?: string
          item_id?: string
          model?: string
          raw_response?: Json | null
          request_meta?: Json
          run_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engine_answers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "run_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engine_answers_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      mentions: {
        Row: {
          answer_id: string
          brand_name: string
          created_at: string
          description: string | null
          id: string
          rank: number | null
          role: string
          run_id: string
          user_id: string
        }
        Insert: {
          answer_id: string
          brand_name: string
          created_at?: string
          description?: string | null
          id?: string
          rank?: number | null
          role: string
          run_id: string
          user_id: string
        }
        Update: {
          answer_id?: string
          brand_name?: string
          created_at?: string
          description?: string | null
          id?: string
          rank?: number | null
          role?: string
          run_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentions_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "engine_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      question_templates: {
        Row: {
          category: string
          created_at: string
          id: string
          intent: string
          template: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          intent: string
          template: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          intent?: string
          template?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          brand_id: string
          created_at: string
          generated_text: string | null
          id: string
          position: number | null
          rationale: string | null
          selected: boolean
          strategy: string
          template_id: string | null
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          generated_text?: string | null
          id?: string
          position?: number | null
          rationale?: string | null
          selected?: boolean
          strategy: string
          template_id?: string | null
          text: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          generated_text?: string | null
          id?: string
          position?: number | null
          rationale?: string | null
          selected?: boolean
          strategy?: string
          template_id?: string | null
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "question_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      report_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          run_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          run_id: string
          user_id?: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          run_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_actions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      run_items: {
        Row: {
          attempts: number
          created_at: string
          done_at: string | null
          engine: string
          id: string
          last_error: string | null
          locked_at: string | null
          question_id: string | null
          question_position: number
          question_strategy: string
          question_text: string
          repeat_no: number
          run_id: string
          status: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          done_at?: string | null
          engine: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          question_id?: string | null
          question_position: number
          question_strategy: string
          question_text: string
          repeat_no: number
          run_id: string
          status?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          done_at?: string | null
          engine?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          question_id?: string | null
          question_position?: number
          question_strategy?: string
          question_text?: string
          repeat_no?: number
          run_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_items_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      task_cards: {
        Row: {
          body: string
          card_type: string
          created_at: string
          draft: string | null
          evidence: string
          goal_id: string | null
          id: string
          position: number
          run_id: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          card_type: string
          created_at?: string
          draft?: string | null
          evidence: string
          goal_id?: string | null
          id?: string
          position: number
          run_id: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          card_type?: string
          created_at?: string
          draft?: string | null
          evidence?: string
          goal_id?: string | null
          id?: string
          position?: number
          run_id?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_cards_card_type_fkey"
            columns: ["card_type"]
            isOneToOne: false
            referencedRelation: "card_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "task_cards_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "weekly_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_cards_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          count: number
          created_at: string
          day: string
          id: string
          kind: string
          scope: string
        }
        Insert: {
          count?: number
          created_at?: string
          day?: string
          id?: string
          kind: string
          scope: string
        }
        Update: {
          count?: number
          created_at?: string
          day?: string
          id?: string
          kind?: string
          scope?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          id: string
          note: string | null
          run_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          run_id?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          run_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_goals: {
        Row: {
          baseline_run_id: string
          baseline_value: number
          brand_id: string
          created_at: string
          due_date: string
          evaluated_at: string | null
          id: string
          metric: string
          result_run_id: string | null
          result_value: number | null
          status: string
          target_value: number
          total: number
          user_id: string
        }
        Insert: {
          baseline_run_id: string
          baseline_value: number
          brand_id: string
          created_at?: string
          due_date: string
          evaluated_at?: string | null
          id?: string
          metric?: string
          result_run_id?: string | null
          result_value?: number | null
          status?: string
          target_value: number
          total: number
          user_id: string
        }
        Update: {
          baseline_run_id?: string
          baseline_value?: number
          brand_id?: string
          created_at?: string
          due_date?: string
          evaluated_at?: string | null
          id?: string
          metric?: string
          result_run_id?: string | null
          result_value?: number | null
          status?: string
          target_value?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_goals_baseline_run_id_fkey"
            columns: ["baseline_run_id"]
            isOneToOne: true
            referencedRelation: "diagnosis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_goals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_goals_result_run_id_fkey"
            columns: ["result_run_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_runs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_run_items: {
        Args: { p_limit: number; p_run_id: string }
        Returns: {
          attempts: number
          created_at: string
          done_at: string | null
          engine: string
          id: string
          last_error: string | null
          locked_at: string | null
          question_id: string | null
          question_position: number
          question_strategy: string
          question_text: string
          repeat_no: number
          run_id: string
          status: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "run_items"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      increment_usage: {
        Args: { p_kind: string; p_limit: number; p_scope: string }
        Returns: boolean
      }
      set_cron_secret: { Args: { p_secret: string }; Returns: undefined }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
