export interface Route {
  path: string;
  method: string;
  target: string;
  authRequired?: boolean;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

export interface GatewayConfig {
  routes: Route[];
  cors: {
    origin: string[];
    credentials: boolean;
  };
}