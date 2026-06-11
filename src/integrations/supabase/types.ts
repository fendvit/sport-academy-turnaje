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
      groups: {
        Row: {
          id: string
          name: string
          tournament_id: string
        }
        Insert: {
          id?: string
          name: string
          tournament_id: string
        }
        Update: {
          id?: string
          name?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          active: boolean
          away_score: number | null
          away_team_id: string
          field: number
          group_id: string
          home_score: number | null
          home_team_id: string
          id: string
          match_order: number
          played: boolean
          scheduled_time: string | null
          tournament_id: string
        }
        Insert: {
          active?: boolean
          away_score?: number | null
          away_team_id: string
          field?: number
          group_id: string
          home_score?: number | null
          home_team_id: string
          id?: string
          match_order?: number
          played?: boolean
          scheduled_time?: string | null
          tournament_id: string
        }
        Update: {
          active?: boolean
          away_score?: number | null
          away_team_id?: string
          field?: number
          group_id?: string
          home_score?: number | null
          home_team_id?: string
          id?: string
          match_order?: number
          played?: boolean
          scheduled_time?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          id: string
          name: string
          number: number | null
          team_id: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          number?: number | null
          team_id: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          number?: number | null
          team_id?: string
          tournament_id?: string
        }
        Relationships: []
      }
      playoff_matches: {
        Row: {
          active: boolean
          away_score: number | null
          away_team_id: string | null
          field: number
          home_score: number | null
          home_team_id: string | null
          id: string
          played: boolean
          position: number
          round: number
          scheduled_time: string | null
          tournament_id: string
        }
        Insert: {
          active?: boolean
          away_score?: number | null
          away_team_id?: string | null
          field?: number
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          played?: boolean
          position?: number
          round: number
          scheduled_time?: string | null
          tournament_id: string
        }
        Update: {
          active?: boolean
          away_score?: number | null
          away_team_id?: string | null
          field?: number
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          played?: boolean
          position?: number
          round?: number
          scheduled_time?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playoff_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      scorers: {
        Row: {
          created_at: string
          field: number
          id: string
          pin: string
          token: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          field: number
          id?: string
          pin: string
          token?: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          field?: number
          id?: string
          pin?: string
          token?: string
          tournament_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          group_id: string
          id: string
          name: string
          tournament_id: string
          trainer: string | null
        }
        Insert: {
          group_id: string
          id?: string
          name: string
          tournament_id: string
          trainer?: string | null
        }
        Update: {
          group_id?: string
          id?: string
          name?: string
          tournament_id?: string
          trainer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          archived: boolean
          break_duration_minutes: number
          category: string
          created_at: string
          date: string
          field_count: number
          id: string
          match_duration_minutes: number
          name: string
          password: string
          phase: string
          playoff_format: string
          playoff_match_duration_minutes: number | null
          playoff_start_time: string | null
          round_count: number
          start_time: string
          tiebreaker_rule: string
        }
        Insert: {
          archived?: boolean
          break_duration_minutes?: number
          category?: string
          created_at?: string
          date: string
          field_count?: number
          id?: string
          match_duration_minutes?: number
          name: string
          password: string
          phase?: string
          playoff_format?: string
          playoff_match_duration_minutes?: number | null
          playoff_start_time?: string | null
          round_count?: number
          start_time?: string
          tiebreaker_rule?: string
        }
        Update: {
          archived?: boolean
          break_duration_minutes?: number
          category?: string
          created_at?: string
          date?: string
          field_count?: number
          id?: string
          match_duration_minutes?: number
          name?: string
          password?: string
          phase?: string
          playoff_format?: string
          playoff_match_duration_minutes?: number | null
          playoff_start_time?: string | null
          round_count?: number
          start_time?: string
          tiebreaker_rule?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      verify_scorer_pin: {
        Args: { _pin: string; _token: string }
        Returns: boolean
      }
      verify_tournament_password: {
        Args: { _password: string; _tournament_id: string }
        Returns: boolean
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
