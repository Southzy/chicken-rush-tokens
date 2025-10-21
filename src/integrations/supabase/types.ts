export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      emojis: {
        Row: {
          bonus_percentage: number
          created_at: string
          effect_type: string
          emoji_symbol: string
          id: string
          name: string
          rarity: string
        }
        Insert: {
          bonus_percentage?: number
          created_at?: string
          effect_type: string
          emoji_symbol: string
          id?: string
          name: string
          rarity: string
        }
        Update: {
          bonus_percentage?: number
          created_at?: string
          effect_type?: string
          emoji_symbol?: string
          id?: string
          name?: string
          rarity?: string
        }
        Relationships: []
      }
      game_history: {
        Row: {
          bet_amount: string            // NUMERIC(38,0)
          created_at: string
          difficulty: string
          id: string
          multiplier: string            // DECIMAL -> string
          profit: string                // NUMERIC(38,0)
          user_id: string
        }
        Insert: {
          bet_amount: string
          created_at?: string
          difficulty?: string
          id?: string
          multiplier: string
          profit: string
          user_id: string
        }
        Update: {
          bet_amount?: string
          created_at?: string
          difficulty?: string
          id?: string
          multiplier?: string
          profit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          bet_amount: string            // NUMERIC(38,0)
          client_seed: string
          created_at: string
          game_id: string
          id: string
          is_active: boolean
          mine_count: number
          mine_positions: number[]
          nonce: number
          revealed_tiles: number[]
          server_seed: string
          server_seed_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bet_amount: string
          client_seed: string
          created_at?: string
          game_id: string
          id?: string
          is_active?: boolean
          mine_count: number
          mine_positions: number[]
          nonce?: number
          revealed_tiles?: number[]
          server_seed: string
          server_seed_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bet_amount?: string
          client_seed?: string
          created_at?: string
          game_id?: string
          id?: string
          is_active?: boolean
          mine_count?: number
          mine_positions?: number[]
          nonce?: number
          revealed_tiles?: number[]
          server_seed?: string
          server_seed_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loot_boxes: {
        Row: {
          created_at: string
          emoji_pool_size: number
          id: string
          name: string
          price: string                 // เงิน -> NUMERIC => string
          secret_chance: number         // ถ้าใช้ DECIMAL ให้เปลี่ยนเป็น string ด้วย
        }
        Insert: {
          created_at?: string
          emoji_pool_size?: number
          id?: string
          name: string
          price: string
          secret_chance: number
        }
        Update: {
          created_at?: string
          emoji_pool_size?: number
          id?: string
          name?: string
          price?: string
          secret_chance?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          rank: Database["public"]["Enums"]["user_rank"]
          rank_shards: number           // ถ้าใน DB เป็น NUMERIC ให้เปลี่ยนเป็น string
          token_balance: string         // NUMERIC(38,0)
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          id: string
          rank?: Database["public"]["Enums"]["user_rank"]
          rank_shards?: number          // ถ้าใน DB เป็น NUMERIC ให้เปลี่ยนเป็น string
          token_balance?: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          rank?: Database["public"]["Enums"]["user_rank"]
          rank_shards?: number          // ถ้าใน DB เป็น NUMERIC ให้เปลี่ยนเป็น string
          token_balance?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      user_emojis: {
        Row: {
          emoji_id: string
          id: string
          is_equipped: boolean
          obtained_at: string
          user_id: string
        }
        Insert: {
          emoji_id: string
          id?: string
          is_equipped?: boolean
          obtained_at?: string
          user_id: string
        }
        Update: {
          emoji_id?: string
          id?: string
          is_equipped?: boolean
          obtained_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_emojis_emoji_id_fkey"
            columns: ["emoji_id"]
            isOneToOne: false
            referencedRelation: "emojis"
            referencedColumns: ["id"]
          },
        ]
      }
      user_inventory: {
        Row: {
          created_at: string
          id: string
          rune_a: string                // NUMERIC(38,0)
          rune_b: string
          rune_c: string
          rune_d: string
          rune_e: string
          rune_f: string
          rune_g: string
          rune_h: string
          rune_i: string
          rune_j: string
          rune_joke: string
          rune_k: string
          rune_l: string
          rune_m: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rune_a?: string
          rune_b?: string
          rune_c?: string
          rune_d?: string
          rune_e?: string
          rune_f?: string
          rune_g?: string
          rune_h?: string
          rune_i?: string
          rune_j?: string
          rune_joke?: string
          rune_k?: string
          rune_l?: string
          rune_m?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rune_a?: string
          rune_b?: string
          rune_c?: string
          rune_d?: string
          rune_e?: string
          rune_f?: string
          rune_g?: string
          rune_h?: string
          rune_i?: string
          rune_j?: string
          rune_joke?: string
          rune_k?: string
          rune_l?: string
          rune_m?: string
          updated_at?: string
          user_id?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      leaderboard_stats: {
        Row: {
          id: string | null
          luck_score: number | null
          money_score: number | null
          power_score: number | null
          rank: Database["public"]["Enums"]["user_rank"] | null
          rank_shards: number | null                 // ถ้า DB เป็น NUMERIC -> string | null
          rune_a: string | null                      // NUMERIC -> string|null
          rune_b: string | null
          rune_c: string | null
          rune_d: string | null
          rune_e: string | null
          rune_f: string | null
          rune_g: string | null
          rune_h: string | null
          rune_i: string | null
          rune_j: string | null
          rune_joke: string | null
          rune_k: string | null
          rune_l: string | null
          rune_luck: string | null                   // ถ้ามาจาก NUMERIC
          rune_m: string | null
          rune_money: string | null                  // ถ้ามาจาก NUMERIC
          token_balance: string | null               // NUMERIC -> string|null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_old_game_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "admin"
      user_rank:
        | "nova_cadet"
        | "quantum_ranger"
        | "cyber_warden"
        | "celestial_overlord"
        | "eclipse_titan"
        | "starlight_scout"
        | "nebula_ranger"
        | "quasar_sentinel"
        | "pulsar_warden"
        | "eventide_herald"
        | "cosmic_arbiter"
        | "the_joke"
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
      app_role: ["user", "admin"],
      user_rank: [
        "nova_cadet",
        "quantum_ranger",
        "cyber_warden",
        "celestial_overlord",
        "eclipse_titan",
        "starlight_scout",
        "nebula_ranger",
        "quasar_sentinel",
        "pulsar_warden",
        "eventide_herald",
        "cosmic_arbiter",
        "the_joke",
      ],
    },
  },
} as const
