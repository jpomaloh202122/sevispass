import { GatewayConfig, Route } from '../types';

export class GatewayService {
  private config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  async routeRequest(path: string, method: string): Promise<Route | null> {
    return this.config.routes.find(route => 
      route.path === path && route.method.toLowerCase() === method.toLowerCase()
    ) || null;
  }

  async validateAuth(token: string): Promise<boolean> {
    // Placeholder implementation
    throw new Error('Not implemented');
  }
}