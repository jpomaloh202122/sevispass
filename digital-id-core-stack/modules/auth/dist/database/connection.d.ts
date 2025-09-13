import { SupabaseClient } from '@supabase/supabase-js';
export declare class DatabaseConnection {
    private static instance;
    private supabase;
    private constructor();
    static getInstance(): DatabaseConnection;
    getClient(): SupabaseClient;
}
export declare const db: SupabaseClient<any, "public", "public", any, any>;
//# sourceMappingURL=connection.d.ts.map