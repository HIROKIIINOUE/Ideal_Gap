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
    };
    Views: {};
    Functions: {};
    Enums: {
      language: "ja" | "en" | "fr";
      status: "trial" | "active" | "canceled" | "expired" | "signupAwait";
    };
    CompositeTypes: {};
  };
};
