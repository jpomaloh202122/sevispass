export declare class RateLimiterService {
    checkRateLimit(clientId: string, windowMs: number, maxRequests: number): Promise<boolean>;
    incrementRequestCount(clientId: string): Promise<void>;
}
//# sourceMappingURL=rate-limiter.service.d.ts.map