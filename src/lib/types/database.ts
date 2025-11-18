export interface Database {
  public: {
    Tables: {
      transactions: {
        Row: {
          id: string;
          user_id: string;
          txn_date: string;
          category_id: string;
          type: "income" | "expense";
          amount: number;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          txn_date: string;
          category_id?: string;
          type: "income" | "expense";
          amount: number;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          txn_date?: string;
          category_id?: string;
          type?: "income" | "expense";
          amount?: number;
          description?: string | null;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: "income" | "expense";
          color: string | null;
          created_at: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          preferred_currency: string;
          monthly_income: number | null;
          savings_target: number | null;
          created_at: string;
        };
      };
    };
  };
}
