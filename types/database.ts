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
      access_overrides: {
        Row: {
          access_type: string;
          created_at: string | null;
          ends_at: string | null;
          id: string;
          is_active: boolean;
          note: string | null;
          starts_at: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          access_type: string;
          created_at?: string | null;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          note?: string | null;
          starts_at?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          access_type?: string;
          created_at?: string | null;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          note?: string | null;
          starts_at?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "access_overrides_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      deleted_accounts: {
        Row: {
          created_at: string;
          deleted_at: string;
          email_hash: string;
          had_account_before: boolean;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string;
          email_hash: string;
          had_account_before?: boolean;
          id?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string;
          email_hash?: string;
          had_account_before?: boolean;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          created_at: string | null;
          email: string;
          had_account_before: boolean | null;
          id: string;
          is_canceled: boolean | null;
          language: "ja" | "en" | "fr" | null;
          name: string;
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
      focus_music_tracks: {
        Row: {
          bucket: string | null;
          created_at: string | null;
          duration: number | null;
          id: string;
          music_category: string[] | null;
          storage_path: string | null;
          title: string | null;
          updated_at: string | null;
        };
        Insert: {
          bucket?: string | null;
          created_at?: string | null;
          duration?: number | null;
          id?: string;
          music_category?: string[] | null;
          storage_path?: string | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Update: {
          bucket?: string | null;
          created_at?: string | null;
          duration?: number | null;
          id?: string;
          music_category?: string[] | null;
          storage_path?: string | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
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
      long_term_goals: {
        Row: {
          created_at: string | null;
          description: string;
          id: string;
          is_done: boolean | null;
          order: number | null;
          until_when: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          description: string;
          id?: string;
          is_done?: boolean | null;
          order?: number | null;
          until_when: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          description?: string;
          id?: string;
          is_done?: boolean | null;
          order?: number | null;
          until_when?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "long_term_goals_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      yearly_goals: {
        Row: {
          accumulated_time_year: number | null;
          is_done: boolean | null;
          year_goal_color: string;
          created_at: string | null;
          description: string;
          id: string;
          order: number | null;
          updated_at: string | null;
          user_id: string;
          yearly_goal_detail: string | null;
        };
        Insert: {
          accumulated_time_year?: number | null;
          is_done?: boolean | null;
          year_goal_color: string;
          created_at?: string | null;
          description: string;
          id?: string;
          order?: number | null;
          updated_at?: string | null;
          user_id: string;
          yearly_goal_detail?: string | null;
        };
        Update: {
          accumulated_time_year?: number | null;
          is_done?: boolean | null;
          year_goal_color?: string;
          created_at?: string | null;
          description?: string;
          id?: string;
          order?: number | null;
          updated_at?: string | null;
          user_id?: string;
          yearly_goal_detail?: string | null;
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
      monthly_goals: {
        Row: {
          accumulated_time_month: number | null;
          created_at: string | null;
          description: string;
          estimated_time_month: number | null;
          id: string;
          month: number;
          order: number | null;
          updated_at: string | null;
          user_id: string;
          yearly_goal_id: string;
        };
        Insert: {
          accumulated_time_month?: number | null;
          created_at?: string | null;
          description: string;
          estimated_time_month?: number | null;
          id?: string;
          month: number;
          order?: number | null;
          updated_at?: string | null;
          user_id: string;
          yearly_goal_id: string;
        };
        Update: {
          accumulated_time_month?: number | null;
          created_at?: string | null;
          description?: string;
          estimated_time_month?: number | null;
          id?: string;
          month?: number;
          order?: number | null;
          updated_at?: string | null;
          user_id?: string;
          yearly_goal_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "monthly_goals_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monthly_goals_yearly_goal_id_fkey";
            columns: ["yearly_goal_id"];
            referencedRelation: "yearly_goals";
            referencedColumns: ["id"];
          },
        ];
      };
      weekly_tasks: {
        Row: {
          accumulated_time_week: number | null;
          created_at: string | null;
          description: string;
          id: string;
          is_done: boolean | null;
          next_start_point: string | null;
          order: number | null;
          updated_at: string | null;
          user_id: string;
          yearly_goal_id: string | null;
        };
        Insert: {
          accumulated_time_week?: number | null;
          created_at?: string | null;
          description: string;
          id?: string;
          is_done?: boolean | null;
          next_start_point?: string | null;
          order?: number | null;
          updated_at?: string | null;
          user_id: string;
          yearly_goal_id?: string | null;
        };
        Update: {
          accumulated_time_week?: number | null;
          created_at?: string | null;
          description?: string;
          id?: string;
          is_done?: boolean | null;
          next_start_point?: string | null;
          order?: number | null;
          updated_at?: string | null;
          user_id?: string;
          yearly_goal_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "weekly_tasks_yearly_goal_id_fkey";
            columns: ["yearly_goal_id"];
            referencedRelation: "yearly_goals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekly_tasks_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      fun_plans: {
        Row: {
          created_at: string | null;
          description: string;
          id: string;
          order: number | null;
          scheduled_at: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          description: string;
          id?: string;
          order?: number | null;
          scheduled_at?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          description?: string;
          id?: string;
          order?: number | null;
          scheduled_at?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fun_plans_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {};
    Functions: {
      check_user_exists: {
        Args: {
          p_email: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      language: "ja" | "en" | "fr";
      status: "trial" | "active" | "canceled" | "expired" | "signupAwait";
      category: "bug" | "request" | "feedback" | "other";
      os_type: "ios" | "android";
    };
    CompositeTypes: {};
  };
};
