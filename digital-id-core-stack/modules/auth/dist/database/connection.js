"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.DatabaseConnection = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
class DatabaseConnection {
    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase configuration');
        }
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
    }
    static getInstance() {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }
    getClient() {
        return this.supabase;
    }
}
exports.DatabaseConnection = DatabaseConnection;
exports.db = DatabaseConnection.getInstance().getClient();
//# sourceMappingURL=connection.js.map