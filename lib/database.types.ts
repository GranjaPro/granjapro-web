export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      farms: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          producer_name: string;
          production_system: string;
          total_birds: number;
          main_breed: string;
          sells_eggs_directly: boolean;
          financial_tracking: boolean;
          owner_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          producer_name: string;
          production_system?: string;
          total_birds?: number;
          main_breed?: string;
          sells_eggs_directly?: boolean;
          financial_tracking?: boolean;
          owner_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          producer_name?: string;
          production_system?: string;
          total_birds?: number;
          main_breed?: string;
          sells_eggs_directly?: boolean;
          financial_tracking?: boolean;
          owner_id?: string;
        };
      };
      barns: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          farm_id: string;
          name: string;
          capacity: number;
          current_birds: number;
          production_system: string;
          status: "active" | "maintenance" | "inactive";
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          farm_id: string;
          name: string;
          capacity?: number;
          current_birds?: number;
          production_system?: string;
          status?: "active" | "maintenance" | "inactive";
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          farm_id?: string;
          name?: string;
          capacity?: number;
          current_birds?: number;
          production_system?: string;
          status?: "active" | "maintenance" | "inactive";
        };
      };
      flocks: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          farm_id: string;
          barn_id: string;
          code: string;
          breed: string;
          lineage: string | null;
          bird_count: number;
          arrival_age_weeks: number;
          arrival_date: string;
          avg_weight_kg: number | null;
          supplier: string | null;
          supplier_contact: string | null;
          origin: string | null;
          production_system: string;
          status: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          farm_id: string;
          barn_id: string;
          code: string;
          breed: string;
          lineage?: string | null;
          bird_count: number;
          arrival_age_weeks?: number;
          arrival_date: string;
          avg_weight_kg?: number | null;
          supplier?: string | null;
          supplier_contact?: string | null;
          origin?: string | null;
          production_system?: string;
          status?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          farm_id?: string;
          barn_id?: string;
          code?: string;
          breed?: string;
          lineage?: string | null;
          bird_count?: number;
          arrival_age_weeks?: number;
          arrival_date?: string;
          avg_weight_kg?: number | null;
          supplier?: string | null;
          supplier_contact?: string | null;
          origin?: string | null;
          production_system?: string;
          status?: string;
        };
      };
      egg_production: {
        Row: {
          id: string;
          created_at: string;
          farm_id: string;
          barn_id: string | null;
          flock_id: string | null;
          date: string;
          eggs_produced: number;
          broken_eggs: number;
          dirty_eggs: number;
          discarded_eggs: number;
          eggs_sold: number;
          egg_price: number;
          laying_rate: number;
          eggs_per_bird: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          farm_id: string;
          barn_id?: string | null;
          flock_id?: string | null;
          date: string;
          eggs_produced: number;
          broken_eggs?: number;
          dirty_eggs?: number;
          discarded_eggs?: number;
          eggs_sold?: number;
          egg_price?: number;
          laying_rate?: number;
          eggs_per_bird?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          farm_id?: string;
          barn_id?: string | null;
          flock_id?: string | null;
          date?: string;
          eggs_produced?: number;
          broken_eggs?: number;
          dirty_eggs?: number;
          discarded_eggs?: number;
          eggs_sold?: number;
          egg_price?: number;
          laying_rate?: number;
          eggs_per_bird?: number;
        };
      };
      inventory: {
        Row: {
          id: string;
          created_at: string;
          farm_id: string;
          name: string;
          location: string | null;
          area: string | null;
          status: string;
          type: string;
          capacity: string | null;
          current_occupation: number;
          quantity: number;
          unit: string;
          inventory_value: number;
          expiration_date: string | null;
          daily_consumption: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          farm_id: string;
          name: string;
          location?: string | null;
          area?: string | null;
          status?: string;
          type: string;
          capacity?: string | null;
          current_occupation?: number;
          quantity?: number;
          unit: string;
          inventory_value?: number;
          expiration_date?: string | null;
          daily_consumption?: number;
          notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          farm_id?: string;
          name?: string;
          location?: string | null;
          area?: string | null;
          status?: string;
          type?: string;
          capacity?: string | null;
          current_occupation?: number;
          quantity?: number;
          unit?: string;
          inventory_value?: number;
          expiration_date?: string | null;
          daily_consumption?: number;
          notes?: string | null;
        };
      };
      feed_consumption: {        Row: {
          id: string;
          created_at: string;
          farm_id: string;
          barn_id: string | null;
          flock_id: string | null;
          date: string;
          quantity_kg: number;
          cost: number;
          feed_type: string;
          cost_per_egg: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          farm_id: string;
          barn_id?: string | null;
          flock_id?: string | null;
          date: string;
          quantity_kg: number;
          cost?: number;
          feed_type?: string;
          cost_per_egg?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          farm_id?: string;
          barn_id?: string | null;
          flock_id?: string | null;
          date?: string;
          quantity_kg?: number;
          cost?: number;
          feed_type?: string;
          cost_per_egg?: number;
        };
      };
      mortality: {
        Row: {
          id: string;
          created_at: string;
          farm_id: string;
          barn_id: string | null;
          flock_id: string | null;
          date: string;
          dead_birds: number;
          cause: string;
          mortality_rate: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          farm_id: string;
          barn_id?: string | null;
          flock_id?: string | null;
          date: string;
          dead_birds: number;
          cause?: string;
          mortality_rate?: number;
          notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          farm_id?: string;
          barn_id?: string | null;
          flock_id?: string | null;
          date?: string;
          dead_birds?: number;
          cause?: string;
          mortality_rate?: number;
          notes?: string | null;
        };
      };
      financial_transactions: {
        Row: {
          id: string;
          created_at: string;
          farm_id: string;
          date: string;
          type: "revenue" | "expense";
          category: string;
          description: string;
          amount: number;
          payment_method: string | null;
          reference: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          farm_id: string;
          date: string;
          type: "revenue" | "expense";
          category: string;
          description: string;
          amount: number;
          payment_method?: string | null;
          reference?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          farm_id?: string;
          date?: string;
          type?: "revenue" | "expense";
          category?: string;
          description?: string;
          amount?: number;
          payment_method?: string | null;
          reference?: string | null;
        };
      };
      customers: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          farm_id: string;
          name: string;
          type: "market" | "restaurant" | "distributor" | "direct";
          phone: string | null;
          email: string | null;
          location: string | null;
          payment_terms: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          farm_id: string;
          name: string;
          type?: "market" | "restaurant" | "distributor" | "direct";
          phone?: string | null;
          email?: string | null;
          location?: string | null;
          payment_terms?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          farm_id?: string;
          name?: string;
          type?: "market" | "restaurant" | "distributor" | "direct";
          phone?: string | null;
          email?: string | null;
          location?: string | null;
          payment_terms?: string | null;
          notes?: string | null;
        };
      };
      sales: {
        Row: {
          id: string;
          created_at: string;
          farm_id: string;
          customer_id: string | null;
          date: string;
          quantity: number;
          egg_type: string;
          unit_price: number;
          total: number;
          payment_status: "pending" | "paid" | "overdue";
          notes: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          farm_id: string;
          customer_id?: string | null;
          date: string;
          quantity: number;
          egg_type?: string;
          unit_price: number;
          total: number;
          payment_status?: "pending" | "paid" | "overdue";
          notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          farm_id?: string;
          customer_id?: string | null;
          date?: string;
          quantity?: number;
          egg_type?: string;
          unit_price?: number;
          total?: number;
          payment_status?: "pending" | "paid" | "overdue";
          notes?: string | null;
        };
      };
      tasks: {
        Row: {
          id: string;
          created_at: string;
          farm_id: string;
          title: string;
          done: boolean;
          scheduled_time: string | null;
          date: string;
          assigned_to: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          farm_id: string;
          title: string;
          done?: boolean;
          scheduled_time?: string | null;
          date: string;
          assigned_to?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          farm_id?: string;
          title?: string;
          done?: boolean;
          scheduled_time?: string | null;
          date?: string;
          assigned_to?: string | null;
        };
      };
      equipment: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          farm_id: string;
          name: string;
          location: string | null;
          type: "alimentacao" | "climatizacao" | "iluminacao" | "hidraulico" | "geral";
          status: "operacional" | "manutencao" | "inativo";
          brand: string | null;
          model: string | null;
          installation_date: string | null;
          next_maintenance_date: string | null;
          notes: string | null;
          equipment_value: number;
          usage_hours: number;
          lifespan_hours: number;
          installation_company: string | null;
          support_contact: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          farm_id: string;
          name: string;
          location?: string | null;
          type?: "alimentacao" | "climatizacao" | "iluminacao" | "hidraulico" | "geral";
          status?: "operacional" | "manutencao" | "inativo";
          brand?: string | null;
          model?: string | null;
          installation_date?: string | null;
          next_maintenance_date?: string | null;
          notes?: string | null;
          equipment_value?: number;
          usage_hours?: number;
          lifespan_hours?: number;
          installation_company?: string | null;
          support_contact?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          farm_id?: string;
          name?: string;
          location?: string | null;
          type?: "alimentacao" | "climatizacao" | "iluminacao" | "hidraulico" | "geral";
          status?: "operacional" | "manutencao" | "inativo";
          brand?: string | null;
          model?: string | null;
          installation_date?: string | null;
          next_maintenance_date?: string | null;
          notes?: string | null;
          equipment_value?: number;
          usage_hours?: number;
          lifespan_hours?: number;
          installation_company?: string | null;
          support_contact?: string | null;
        };
      };
      workers: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          farm_id: string;
          name: string;
          role: "gerente" | "tratador" | "coletor" | "motorista" | "manutencao" | "administrativo";
          status: "ativo" | "ferias" | "afastado" | "desligado";
          phone: string | null;
          email: string | null;
          location: string | null;
          hiring_date: string | null;
          salary: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          farm_id: string;
          name: string;
          role?: "gerente" | "tratador" | "coletor" | "motorista" | "manutencao" | "administrativo";
          status?: "ativo" | "ferias" | "afastado" | "desligado";
          phone?: string | null;
          email?: string | null;
          location?: string | null;
          hiring_date?: string | null;
          salary?: number;
          notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          farm_id?: string;
          name?: string;
          role?: "gerente" | "tratador" | "coletor" | "motorista" | "manutencao" | "administrativo";
          status?: "ativo" | "ferias" | "afastado" | "desligado";
          phone?: string | null;
          email?: string | null;
          location?: string | null;
          hiring_date?: string | null;
          salary?: number;
          notes?: string | null;
        };
      };
      alerts: {
        Row: {
          id: string;
          created_at: string;
          farm_id: string;
          type: "info" | "warning" | "error";
          message: string;
          read: boolean;
          resolved: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          farm_id: string;
          type?: "info" | "warning" | "error";
          message: string;
          read?: boolean;
          resolved?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          farm_id?: string;
          type?: "info" | "warning" | "error";
          message?: string;
          read?: boolean;
          resolved?: boolean;
        };
      };
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          email: string;
          full_name: string;
          farm_id: string | null;
          role: "owner" | "manager" | "worker";
          avatar_url: string | null;
          plan: "essencial" | "pro" | "premium" | null;
          trial_started_at: string | null;
          trial_ends_at: string | null;
          trial_used_at: string | null;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          email: string;
          full_name: string;
          farm_id?: string | null;
          role?: "owner" | "manager" | "worker";
          avatar_url?: string | null;
          plan?: "essencial" | "pro" | "premium" | null;
          trial_started_at?: string | null;
          trial_ends_at?: string | null;
          trial_used_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string;
          full_name?: string;
          farm_id?: string | null;
          role?: "owner" | "manager" | "worker";
          avatar_url?: string | null;
          plan?: "essencial" | "pro" | "premium" | null;
          trial_started_at?: string | null;
          trial_ends_at?: string | null;
          trial_used_at?: string | null;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
