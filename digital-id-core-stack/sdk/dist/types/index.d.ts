export interface ClientConfig {
    baseUrl: string;
    apiKey?: string;
    timeout?: number;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}
//# sourceMappingURL=index.d.ts.map