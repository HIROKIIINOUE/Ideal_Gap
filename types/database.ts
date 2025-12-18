export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          created_at: string | null;
          email: string;
          had_account_before: boolean | null;
          id: string;
          is_canceled: boolean | null;
          language: "ja" | "en" | "fr" | null;
          name: string;
          time_zone: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          had_account_before?: boolean | null;
          id: string;
          is_canceled?: boolean | null;
          language?: "ja" | "en" | "fr" | null;
          name: string;
          time_zone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          had_account_before?: boolean | null;
          id?: string;
          is_canceled?: boolean | null;
          language?: "ja" | "en" | "fr" | null;
          name?: string;
          time_zone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      feedbacks: {
        Row: {
          app_version: string | null;
          category: "bug" | "request" | "feedback" | "other" | null;
          created_at: string | null;
          id: string;
          is_login_user: boolean | null;
          message: string;
          platform: "ios" | "android" | null;
          user_email: string | null;
          user_id: string | null;
          user_name: string | null;
        };
        Insert: {
          app_version?: string | null;
          category?: "bug" | "request" | "feedback" | "other" | null;
          created_at?: string | null;
          id?: string;
          is_login_user?: boolean | null;
          message: string;
          platform?: "ios" | "android" | null;
          user_email?: string | null;
          user_id?: string | null;
          user_name?: string | null;
        };
        Update: {
          app_version?: string | null;
          category?: "bug" | "request" | "feedback" | "other" | null;
          created_at?: string | null;
          id?: string;
          is_login_user?: boolean | null;
          message?: string;
          platform?: "ios" | "android" | null;
          user_email?: string | null;
          user_id?: string | null;
          user_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "feedbacks_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null;
          created_at: string | null;
          current_period_end: string | null;
          id: string;
          plan: string | null;
          status:
            | "trial"
            | "active"
            | "canceled"
            | "expired"
            | "signupAwait"
            | null;
          trial_ends_at: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          cancel_at_period_end?: boolean | null;
          created_at?: string | null;
          current_period_end?: string | null;
          id?: string;
          plan?: string | null;
          status?:
            | "trial"
            | "active"
            | "canceled"
            | "expired"
            | "signupAwait"
            | null;
          trial_ends_at?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          cancel_at_period_end?: boolean | null;
          created_at?: string | null;
          current_period_end?: string | null;
          id?: string;
          plan?: string | null;
          status?:
            | "trial"
            | "active"
            | "canceled"
            | "expired"
            | "signupAwait"
            | null;
          trial_ends_at?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_ideal: {
        Row: {
          created_at: string | null;
          description: string;
          id: string;
          order: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          description: string;
          id?: string;
          order?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          description?: string;
          id?: string;
          order?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_ideal_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      yearly_goals: {
        Row: {
          accumulated_time_year: number | null;
          category: string;
          category_color: string;
          created_at: string | null;
          description: string;
          id: string;
          order: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          accumulated_time_year?: number | null;
          category: string;
          category_color: string;
          created_at?: string | null;
          description: string;
          id?: string;
          order?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          accumulated_time_year?: number | null;
          category?: string;
          category_color?: string;
          created_at?: string | null;
          description?: string;
          id?: string;
          order?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "yearly_goals_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      language: "ja" | "en" | "fr";
      status: "trial" | "active" | "canceled" | "expired" | "signupAwait";
      category: "bug" | "request" | "feedback" | "other";
      os_type: "ios" | "android";
    };
    CompositeTypes: {};
  };
};
