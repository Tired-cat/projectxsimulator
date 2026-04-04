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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_feedback_events: {
        Row: {
          action_taken_at: string | null
          ai_feedback_text: string | null
          board_state_after: Json | null
          board_state_before: Json
          contextualise_pairs_after: number | null
          contextualise_pairs_before: number
          descriptive_cards_after: number | null
          descriptive_cards_before: number
          diagnostic_cards_after: number | null
          diagnostic_cards_before: number
          facebook_spend_after: number | null
          facebook_spend_before: number | null
          feedback_round: number
          id: string
          instagram_spend_after: number | null
          instagram_spend_before: number | null
          newspaper_spend_after: number | null
          newspaper_spend_before: number | null
          post_feedback_action: string | null
          predictive_cards_after: number | null
          predictive_cards_before: number
          prescriptive_cards_after: number | null
          prescriptive_cards_before: number
          requested_at: string
          session_id: string
          tiktok_spend_after: number | null
          tiktok_spend_before: number | null
          time_adjusting_seconds: number | null
          user_id: string
        }
        Insert: {
          action_taken_at?: string | null
          ai_feedback_text?: string | null
          board_state_after?: Json | null
          board_state_before: Json
          contextualise_pairs_after?: number | null
          contextualise_pairs_before?: number
          descriptive_cards_after?: number | null
          descriptive_cards_before?: number
          diagnostic_cards_after?: number | null
          diagnostic_cards_before?: number
          facebook_spend_after?: number | null
          facebook_spend_before?: number | null
          feedback_round?: number
          id?: string
          instagram_spend_after?: number | null
          instagram_spend_before?: number | null
          newspaper_spend_after?: number | null
          newspaper_spend_before?: number | null
          post_feedback_action?: string | null
          predictive_cards_after?: number | null
          predictive_cards_before?: number
          prescriptive_cards_after?: number | null
          prescriptive_cards_before?: number
          requested_at?: string
          session_id: string
          tiktok_spend_after?: number | null
          tiktok_spend_before?: number | null
          time_adjusting_seconds?: number | null
          user_id: string
        }
        Update: {
          action_taken_at?: string | null
          ai_feedback_text?: string | null
          board_state_after?: Json | null
          board_state_before?: Json
          contextualise_pairs_after?: number | null
          contextualise_pairs_before?: number
          descriptive_cards_after?: number | null
          descriptive_cards_before?: number
          diagnostic_cards_after?: number | null
          diagnostic_cards_before?: number
          facebook_spend_after?: number | null
          facebook_spend_before?: number | null
          feedback_round?: number
          id?: string
          instagram_spend_after?: number | null
          instagram_spend_before?: number | null
          newspaper_spend_after?: number | null
          newspaper_spend_before?: number | null
          post_feedback_action?: string | null
          predictive_cards_after?: number | null
          predictive_cards_before?: number
          prescriptive_cards_after?: number | null
          prescriptive_cards_before?: number
          requested_at?: string
          session_id?: string
          tiktok_spend_after?: number | null
          tiktok_spend_before?: number | null
          time_adjusting_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feedback_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      allocation_events: {
        Row: {
          channel: string
          created_at: string
          id: string
          new_value: number | null
          previous_value: number | null
          sequence_number: number | null
          session_id: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          new_value?: number | null
          previous_value?: number | null
          sequence_number?: number | null
          session_id: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          new_value?: number | null
          previous_value?: number | null
          sequence_number?: number | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "allocation_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocation_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      board_events: {
        Row: {
          created_at: string
          event_type: string
          evidence_id: string | null
          evidence_type: string | null
          id: string
          paired_with: string | null
          quadrant: string | null
          sequence_number: number | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          evidence_id?: string | null
          evidence_type?: string | null
          id?: string
          paired_with?: string | null
          quadrant?: string | null
          sequence_number?: number | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          evidence_id?: string | null
          evidence_type?: string | null
          id?: string
          paired_with?: string | null
          quadrant?: string | null
          sequence_number?: number | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          class_code: string
          created_at: string
          id: string
          instructor_id: string
          name: string
          section_code: string
          semester: string | null
          year: number | null
        }
        Insert: {
          class_code?: string
          created_at?: string
          id?: string
          instructor_id: string
          name: string
          section_code: string
          semester?: string | null
          year?: number | null
        }
        Update: {
          class_code?: string
          created_at?: string
          id?: string
          instructor_id?: string
          name?: string
          section_code?: string
          semester?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      navigation_events: {
        Row: {
          entered_at: string
          exited_at: string | null
          id: string
          session_id: string
          tab: string
          time_spent_seconds: number | null
          user_id: string
          visit_number: number | null
        }
        Insert: {
          entered_at?: string
          exited_at?: string | null
          id?: string
          session_id: string
          tab: string
          time_spent_seconds?: number | null
          user_id: string
          visit_number?: number | null
        }
        Update: {
          entered_at?: string
          exited_at?: string | null
          id?: string
          session_id?: string
          tab?: string
          time_spent_seconds?: number | null
          user_id?: string
          visit_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "navigation_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navigation_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_simulation_reflections: {
        Row: {
          id: string
          q1_story_accuracy: string | null
          q2_expression_gaps: string | null
          q3_annotation_usefulness: string | null
          q4_unexpected_conflicts: string | null
          q5_general_feedback: string | null
          session_id: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          q1_story_accuracy?: string | null
          q2_expression_gaps?: string | null
          q3_annotation_usefulness?: string | null
          q4_unexpected_conflicts?: string | null
          q5_general_feedback?: string | null
          session_id: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          q1_story_accuracy?: string | null
          q2_expression_gaps?: string | null
          q3_annotation_usefulness?: string | null
          q4_unexpected_conflicts?: string | null
          q5_general_feedback?: string | null
          session_id?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_simulation_reflections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_simulation_reflections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          institution: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          institution?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          institution?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      reasoning_board_state: {
        Row: {
          adjustments_made: number
          ai_feedback: Json | null
          cards: Json
          current_step: number
          id: string
          last_active_at: string
          last_saved_at: string
          session_id: string
          step_1_completed: boolean
          step_2_completed: boolean
          step_3_completed: boolean
          user_id: string
          written_diagnosis: string | null
        }
        Insert: {
          adjustments_made?: number
          ai_feedback?: Json | null
          cards?: Json
          current_step?: number
          id?: string
          last_active_at?: string
          last_saved_at?: string
          session_id: string
          step_1_completed?: boolean
          step_2_completed?: boolean
          step_3_completed?: boolean
          user_id: string
          written_diagnosis?: string | null
        }
        Update: {
          adjustments_made?: number
          ai_feedback?: Json | null
          cards?: Json
          current_step?: number
          id?: string
          last_active_at?: string
          last_saved_at?: string
          session_id?: string
          step_1_completed?: boolean
          step_2_completed?: boolean
          step_3_completed?: boolean
          user_id?: string
          written_diagnosis?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reasoning_board_state_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      resets: {
        Row: {
          cards_cleared: number | null
          created_at: string
          id: string
          reset_type: string
          session_id: string
          user_id: string
        }
        Insert: {
          cards_cleared?: number | null
          created_at?: string
          id?: string
          reset_type: string
          session_id: string
          user_id: string
        }
        Update: {
          cards_cleared?: number | null
          created_at?: string
          id?: string
          reset_type?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          class_id: string | null
          completed_at: string | null
          id: string
          is_completed: boolean
          scenario_id: string
          started_at: string
          tutorial_completed: boolean
          tutorial_opened: boolean
          user_id: string
        }
        Insert: {
          class_id?: string | null
          completed_at?: string | null
          id?: string
          is_completed?: boolean
          scenario_id?: string
          started_at?: string
          tutorial_completed?: boolean
          tutorial_opened?: boolean
          user_id: string
        }
        Update: {
          class_id?: string | null
          completed_at?: string | null
          id?: string
          is_completed?: boolean
          scenario_id?: string
          started_at?: string
          tutorial_completed?: boolean
          tutorial_opened?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      simulations: {
        Row: {
          class_id: string
          created_at: string
          id: string
          results_json: Json | null
          status: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          results_json?: Json | null
          status?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          results_json?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulations_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      student_enrollments: {
        Row: {
          class_id: string
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          class_id: string
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          class_id?: string
          enrolled_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      student_responses: {
        Row: {
          class_id: string
          created_at: string
          decisions: Json
          id: string
          simulation_id: string
          student_identifier: string
          student_name: string
          submitted_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          decisions?: Json
          id?: string
          simulation_id: string
          student_identifier: string
          student_name: string
          submitted_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          decisions?: Json
          id?: string
          simulation_id?: string
          student_identifier?: string
          student_name?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_responses_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_responses_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          cards_on_board_count: number
          contextualise_pairs_count: number
          descriptive_card_count: number
          diagnostic_card_count: number
          feedback_rounds_used: number
          final_decision: string
          final_facebook_spend: number | null
          final_instagram_spend: number | null
          final_newspaper_spend: number | null
          final_tiktok_spend: number | null
          generated_story: string | null
          id: string
          predictive_card_count: number
          prescriptive_card_count: number
          reasoning_score: number
          session_id: string
          step_1_text: string | null
          step_2_chips: Json | null
          step_3_reflection: string | null
          submitted_at: string
          time_elapsed_seconds: number
          used_ai: boolean
          user_id: string
        }
        Insert: {
          cards_on_board_count?: number
          contextualise_pairs_count?: number
          descriptive_card_count?: number
          diagnostic_card_count?: number
          feedback_rounds_used?: number
          final_decision: string
          final_facebook_spend?: number | null
          final_instagram_spend?: number | null
          final_newspaper_spend?: number | null
          final_tiktok_spend?: number | null
          generated_story?: string | null
          id?: string
          predictive_card_count?: number
          prescriptive_card_count?: number
          reasoning_score?: number
          session_id: string
          step_1_text?: string | null
          step_2_chips?: Json | null
          step_3_reflection?: string | null
          submitted_at?: string
          time_elapsed_seconds?: number
          used_ai?: boolean
          user_id: string
        }
        Update: {
          cards_on_board_count?: number
          contextualise_pairs_count?: number
          descriptive_card_count?: number
          diagnostic_card_count?: number
          feedback_rounds_used?: number
          final_decision?: string
          final_facebook_spend?: number | null
          final_instagram_spend?: number | null
          final_newspaper_spend?: number | null
          final_tiktok_spend?: number | null
          generated_story?: string | null
          id?: string
          predictive_card_count?: number
          prescriptive_card_count?: number
          reasoning_score?: number
          session_id?: string
          step_1_text?: string | null
          step_2_chips?: Json | null
          step_3_reflection?: string | null
          submitted_at?: string
          time_elapsed_seconds?: number
          used_ai?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_events: {
        Row: {
          action: string
          created_at: string
          id: string
          session_id: string
          step_number: number | null
          time_spent_seconds: number | null
          total_steps: number | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          session_id: string
          step_number?: number | null
          time_spent_seconds?: number | null
          total_steps?: number | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          session_id?: string
          step_number?: number | null
          time_spent_seconds?: number | null
          total_steps?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutorial_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_class_instructor: {
        Args: { _class_id: string; _professor_id: string }
        Returns: boolean
      }
      is_enrolled_in_class: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
      is_professor_of_student: {
        Args: { _professor_id: string; _student_user_id: string }
        Returns: boolean
      }
      lookup_class_by_code: {
        Args: { _class_code: string }
        Returns: {
          id: string
          name: string
        }[]
      }
    }
    Enums: {
      app_role: "student" | "professor"
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
      app_role: ["student", "professor"],
    },
  },
} as const
