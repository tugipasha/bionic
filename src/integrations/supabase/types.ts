export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          font_family: string;
          font_size: string;
          bionic_fixation: number;
          bionic_weight: string;
          bionic_color: string;
          line_height: string;
          default_wpm: number;
          tts_speed: number;
          saccade_step: number;
          dark_mode: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          font_family?: string;
          font_size?: string;
          bionic_fixation?: number;
          bionic_weight?: string;
          bionic_color?: string;
          line_height?: string;
          default_wpm?: number;
          tts_speed?: number;
          saccade_step?: number;
          dark_mode?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          font_family?: string;
          font_size?: string;
          bionic_fixation?: number;
          bionic_weight?: string;
          bionic_color?: string;
          line_height?: string;
          default_wpm?: number;
          tts_speed?: number;
          saccade_step?: number;
          dark_mode?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      reading_tests: {
        Row: {
          id: string;
          user_id: string | null;
          test_number: number;
          title: string;
          normal_wpm: number;
          bionic_wpm: number;
          improvement_percentage: number;
          accuracy: number;
          duration_seconds: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          test_number?: number;
          title: string;
          normal_wpm: number;
          bionic_wpm: number;
          improvement_percentage: number;
          accuracy?: number;
          duration_seconds: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          test_number?: number;
          title?: string;
          normal_wpm?: number;
          bionic_wpm?: number;
          improvement_percentage?: number;
          accuracy?: number;
          duration_seconds?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      library_documents: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          text: string;
          words: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          text: string;
          words?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string;
          text?: string;
          words?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reading_logs: {
        Row: {
          id: string;
          user_id: string | null;
          source_lang: string;
          target_lang: string;
          word_count: number;
          is_bionic: boolean;
          text_snippet: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          source_lang: string;
          target_lang: string;
          word_count: number;
          is_bionic?: boolean;
          text_snippet?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          source_lang?: string;
          target_lang?: string;
          word_count?: number;
          is_bionic?: boolean;
          text_snippet?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_conversations: {
        Row: {
          id: string;
          user_id: string | null;
          role: string;
          prompt: string;
          response: string | null;
          model: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          role: string;
          prompt: string;
          response?: string | null;
          model?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          role?: string;
          prompt?: string;
          response?: string | null;
          model?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
