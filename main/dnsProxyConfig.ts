// src/main/dnsProxyConfig.ts
import Store from "electron-store";

export interface DNSProxyConfig {
  port: number;
  host: string;
  logging: string;
  nameservers: string[];
  servers: Record<string, string>; // TLD or domain -> nameserver
  domains: Record<string, string>; // Domain -> IP address
  hosts: Record<string, string>; // Host -> IP address
  timeout: number;
  fallbackEnabled: boolean;
}

export const defaultDNSProxyConfig: DNSProxyConfig = {
  port: 53535,
  host: '127.0.0.1',
  logging: 'dns-proxy:query',
  nameservers: [
    '8.8.8.8',
    '8.8.4.4',
    '1.1.1.1'
  ],
  servers: {
    // Route specific TLDs to different nameservers
    'com': '8.8.8.8',
    'org': '1.1.1.1',
    'net': '8.8.4.4'
  },
  domains: {
    // Override specific domains with IP addresses
    'dev': '127.0.0.1',
    'localhost': '127.0.0.1',
    'internal': '192.168.1.1',
    // Geolocation APIs - bypass DNS proxy for these
    'ipwhois.app': 'direct',
    'ipapi.co': 'direct',
    'ipinfo.io': 'direct'
  },
  hosts: {
    // Override specific hosts
    'devlocal': '127.0.0.1',
    'test': '192.168.1.100'
  },
  timeout: 350, // milliseconds
  fallbackEnabled: true
};

class DNSProxyConfigManager {
  private store: Store;
  private config: DNSProxyConfig;

  constructor() {
    this.store = new Store();
    this.config = this.loadConfig();
  }

  private loadConfig(): DNSProxyConfig {
    const storedConfig = this.store.get('dnsProxyConfig', {}) as Partial<DNSProxyConfig>;
    return { ...defaultDNSProxyConfig, ...storedConfig };
  }

  getConfig(): DNSProxyConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<DNSProxyConfig>): void {
    this.config = { ...this.config, ...updates };
    this.store.set('dnsProxyConfig', this.config);
  }

  getNameserverForDomain(domain: string): string {
    // Check for exact domain match first
    if (this.config.servers[domain]) {
      return this.config.servers[domain];
    }

    // Check for TLD match
    const tld = this.extractTLD(domain);
    if (this.config.servers[tld]) {
      return this.config.servers[tld];
    }

    // Return first default nameserver
    return this.config.nameservers[0];
  }

  getNameservers(): string[] {
    return [...this.config.nameservers];
  }

  getDomainOverride(domain: string): string | null {
    // Check for exact match
    if (this.config.domains[domain]) {
      return this.config.domains[domain];
    }

    // Check for wildcard patterns
    for (const [pattern, ip] of Object.entries(this.config.domains)) {
      if (this.matchesWildcard(domain, pattern)) {
        return ip;
      }
    }

    return null;
  }

  getHostOverride(host: string): string | null {
    // Check for exact match
    if (this.config.hosts[host]) {
      return this.config.hosts[host];
    }

    // Check for aliases
    const alias = this.config.hosts[host];
    if (alias && this.config.hosts[alias]) {
      return this.config.hosts[alias];
    }

    return null;
  }

  private extractTLD(domain: string): string {
    const parts = domain.split('.');
    if (parts.length >= 2) {
      return parts[parts.length - 1];
    }
    return domain;
  }

  private matchesWildcard(domain: string, pattern: string): boolean {
    if (!pattern.includes('*')) {
      return domain === pattern;
    }

    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(domain);
  }

  isLoggingEnabled(level: string): boolean {
    const loggingLevels = this.config.logging.split(',');
    return loggingLevels.includes(level) || loggingLevels.includes('*');
  }

  getTimeout(): number {
    return this.config.timeout;
  }

  isFallbackEnabled(): boolean {
    return this.config.fallbackEnabled;
  }
}

// Global config manager instance
export const dnsProxyConfig = new DNSProxyConfigManager(); 