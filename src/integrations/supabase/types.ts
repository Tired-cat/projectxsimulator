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
      sessions: {
        Row: {
          completed_at: string | null
          id: string
          is_completed: boolean
          scenario_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          is_completed?: boolean
          scenario_id?: string
          started_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          is_completed?: boolean
          scenario_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
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
          final_decision: string
          id: string
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
          final_decision: string
          id?: string
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
          final_decision?: string
          id?: string
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
