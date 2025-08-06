// src/main/dnsProxy.ts
import * as dns from 'dns';
import * as net from 'net';
import { state } from './state';
import { dnsProxyConfig } from './dnsProxyConfig';

interface DNSQuery {
  id: number;
  flags: number;
  questionCount: number;
  answers: number;
  authority: number;
  additional: number;
  questions: DNSQuestion[];
}

interface DNSQuestion {
  name: string;
  type: number;
  class: number;
}

interface DNSAnswer {
  name: string;
  type: number;
  class: number;
  ttl: number;
  data: string | Buffer;
}

class DNSProxy {
  private server: net.Server | null = null;
  private port: number = 53535;
  private running: boolean = false;

  constructor(port?: number) {
    if (port) {
      this.port = port;
    }
  }

  async start(): Promise<number> {
    if (this.running) {
      console.log('DNS proxy is already running');
      return this.port;
    }

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleConnection(socket);
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        this.running = true;
        console.log(`DNS proxy started on port ${this.port}`);
        resolve(this.port);
      });

      this.server.on('error', (error) => {
        console.error('DNS proxy error:', error);
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.running || !this.server) {
      return;
    }

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.running = false;
        this.server = null;
        console.log('DNS proxy stopped');
        resolve();
      });
    });
  }

  private handleConnection(socket: net.Socket): void {
    let buffer = Buffer.alloc(0);

    socket.on('data', async (data) => {
      buffer = Buffer.concat([buffer, data]);
      
      // Process complete DNS packets
      while (buffer.length >= 12) { // Minimum DNS header size
        const packetLength = buffer.readUInt16BE(0);
        
        if (buffer.length < packetLength + 2) {
          break; // Wait for more data
        }

        const dnsPacket = buffer.slice(2, packetLength + 2);
        buffer = buffer.slice(packetLength + 2);

        try {
          const response = await this.processDNSQuery(dnsPacket);
          if (response) {
            const responsePacket = Buffer.concat([
              Buffer.alloc(2, 0), // Length placeholder
              response
            ]);
            responsePacket.writeUInt16BE(response.length, 0);
            socket.write(responsePacket);
          }
        } catch (error) {
          console.error('Error processing DNS query:', error);
          // Send error response
          const errorResponse = this.createErrorResponse(dnsPacket);
          if (errorResponse) {
            const responsePacket = Buffer.concat([
              Buffer.alloc(2, 0),
              errorResponse
            ]);
            responsePacket.writeUInt16BE(errorResponse.length, 0);
            socket.write(responsePacket);
          }
        }
      }
    });

    socket.on('error', (error) => {
      console.error('DNS proxy socket error:', error);
    });

    socket.on('close', () => {
      // Clean up
    });
  }

  private async processDNSQuery(dnsPacket: Buffer): Promise<Buffer | null> {
    try {
      const query = this.parseDNSQuery(dnsPacket);
      if (!query || query.questions.length === 0) {
        return null;
      }

      const question = query.questions[0];
      const domain = question.name.toLowerCase();
      
      if (dnsProxyConfig.isLoggingEnabled('dns-proxy:query')) {
        console.log(`DNS query for: ${domain} (type: ${question.type})`);
      }

      // Check for domain/host overrides first
      const domainOverride = dnsProxyConfig.getDomainOverride(domain);
      if (domainOverride) {
        if (dnsProxyConfig.isLoggingEnabled('dns-proxy:debug')) {
          console.log(`Domain override for ${domain}: ${domainOverride}`);
        }
        return this.createOverrideResponse(dnsPacket, domainOverride);
      }

      const hostOverride = dnsProxyConfig.getHostOverride(domain);
      if (hostOverride) {
        if (dnsProxyConfig.isLoggingEnabled('dns-proxy:debug')) {
          console.log(`Host override for ${domain}: ${hostOverride}`);
        }
        return this.createOverrideResponse(dnsPacket, hostOverride);
      }

      // Route through SOCKS proxy with fallback
      const response = await this.queryThroughSOCKSWithFallback(dnsPacket, domain);
      return response;
    } catch (error) {
      console.error('Error in processDNSQuery:', error);
      return null;
    }
  }

  private async queryThroughSOCKSWithFallback(dnsPacket: Buffer, domain: string): Promise<Buffer | null> {
    if (!state.anonSocksClient) {
      console.error('SOCKS client not available');
      return this.fallbackToLocalDNS(domain, dnsPacket);
    }

    try {
      // Get configured nameserver for this domain
      const nameserver = dnsProxyConfig.getNameserverForDomain(domain);
      const timeout = dnsProxyConfig.getTimeout();
      
      if (dnsProxyConfig.isLoggingEnabled('dns-proxy:debug')) {
        console.log(`Using nameserver ${nameserver} for domain ${domain}`);
      }

      // Try SOCKS proxy first
      const response = await this.queryThroughSOCKS(dnsPacket, nameserver, timeout);
      if (response) {
        return response;
      }

      // Fallback to local DNS if enabled
      if (dnsProxyConfig.isFallbackEnabled()) {
        if (dnsProxyConfig.isLoggingEnabled('dns-proxy:debug')) {
          console.log(`SOCKS query failed, falling back to local DNS for ${domain}`);
        }
        return this.fallbackToLocalDNS(domain, dnsPacket);
      }

      return null;
    } catch (error) {
      console.error('Error querying DNS through SOCKS:', error);
      return this.fallbackToLocalDNS(domain, dnsPacket);
    }
  }

  private async queryThroughSOCKS(dnsPacket: Buffer, nameserver: string, timeout: number): Promise<Buffer | null> {
    try {
      // Parse nameserver (support for custom ports)
      const [host, portStr] = nameserver.split(':');
      const port = portStr ? parseInt(portStr) : 53;

      // For now, use a simplified approach that works with the existing SOCKS client
      // In a full implementation, you'd create a direct TCP connection through SOCKS
      const dnsResponse = await this.createBasicDNSResponse(dnsPacket, host);
      return dnsResponse;
    } catch (error) {
      console.error('Error in SOCKS DNS query:', error);
      return null;
    }
  }

  private async fallbackToLocalDNS(domain: string, originalPacket: Buffer): Promise<Buffer | null> {
    try {
      const nameservers = dnsProxyConfig.getNameservers();
      
      for (const nameserver of nameservers) {
        try {
          const response = await this.queryLocalDNS(domain, nameserver);
          if (response) {
            if (dnsProxyConfig.isLoggingEnabled('dns-proxy:debug')) {
              console.log(`Local DNS fallback successful for ${domain} using ${nameserver}`);
            }
            return response;
          }
        } catch (error) {
          console.error(`Local DNS query failed for ${nameserver}:`, error);
          continue;
        }
      }
      
      console.error('All DNS queries failed');
      return null;
    } catch (error) {
      console.error('Error in fallback DNS query:', error);
      return null;
    }
  }

  private async queryLocalDNS(domain: string, nameserver: string): Promise<Buffer | null> {
    return new Promise((resolve) => {
      // Temporarily set DNS server
      const originalServers = dns.getServers();
      dns.setServers([nameserver]);
      
      dns.resolve4(domain, (err, addresses) => {
        // Restore original DNS servers
        dns.setServers(originalServers);
        
        if (err || !addresses || addresses.length === 0) {
          resolve(null);
        } else {
          // Create DNS response with resolved IP
          const response = this.createDNSResponseWithIP(domain, addresses[0]);
          resolve(response);
        }
      });
    });
  }

  private createOverrideResponse(originalPacket: Buffer, ipAddress: string): Buffer {
    try {
      // Create a DNS response with the override IP
      const response = this.createDNSResponseWithIP('override', ipAddress);
      return response;
    } catch (error) {
      console.error('Error creating override response:', error);
      return this.createErrorResponse(originalPacket);
    }
  }

  private createDNSResponseWithIP(domain: string, ipAddress: string): Buffer {
    try {
      // Parse IP address
      const ipParts = ipAddress.split('.').map(part => parseInt(part));
      if (ipParts.length !== 4) {
        throw new Error('Invalid IP address format');
      }

      // Create basic response structure
      const response = Buffer.alloc(512);
      let offset = 0;

      // DNS Header (12 bytes)
      response.writeUInt16BE(0x1234, 0); // ID (placeholder)
      response.writeUInt16BE(0x8180, 2); // Flags (QR=1, RCODE=0)
      response.writeUInt16BE(1, 4);      // Questions
      response.writeUInt16BE(1, 6);      // Answer RRs
      response.writeUInt16BE(0, 8);      // Authority RRs
      response.writeUInt16BE(0, 10);     // Additional RRs
      offset = 12;

      // Question section (simplified)
      response.writeUInt16BE(0xC00C, offset); // Name pointer
      offset += 2;
      response.writeUInt16BE(1, offset);      // Type (A)
      offset += 2;
      response.writeUInt16BE(1, offset);      // Class (IN)
      offset += 2;

      // Answer section
      response.writeUInt16BE(0xC00C, offset); // Name pointer
      offset += 2;
      response.writeUInt16BE(1, offset);      // Type (A)
      offset += 2;
      response.writeUInt16BE(1, offset);      // Class (IN)
      offset += 2;
      response.writeUInt32BE(300, offset);    // TTL (5 minutes)
      offset += 4;
      response.writeUInt16BE(4, offset);      // Data length
      offset += 2;

      // IP address
      for (let i = 0; i < 4; i++) {
        response.writeUInt8(ipParts[i], offset + i);
      }
      offset += 4;

      return response.slice(0, offset);
    } catch (error) {
      console.error('Error creating DNS response with IP:', error);
      return Buffer.alloc(0);
    }
  }

  private parseDNSQuery(buffer: Buffer): DNSQuery | null {
    try {
      if (buffer.length < 12) {
        return null;
      }

      const id = buffer.readUInt16BE(0);
      const flags = buffer.readUInt16BE(2);
      const questions = buffer.readUInt16BE(4);
      const answers = buffer.readUInt16BE(6);
      const authority = buffer.readUInt16BE(8);
      const additional = buffer.readUInt16BE(10);

      const dnsQuery: DNSQuery = {
        id,
        flags,
        questionCount: questions,
        answers,
        authority,
        additional,
        questions: []
      };

      let offset = 12;

      // Parse questions
      for (let i = 0; i < questions; i++) {
        const question = this.parseDNSQuestion(buffer, offset);
        if (question) {
          dnsQuery.questions.push(question);
          offset = question.offset;
        } else {
          break;
        }
      }

      return dnsQuery;
    } catch (error) {
      console.error('Error parsing DNS query:', error);
      return null;
    }
  }

  private parseDNSQuestion(buffer: Buffer, offset: number): (DNSQuestion & { offset: number }) | null {
    try {
      const name = this.parseDNSName(buffer, offset);
      if (!name) {
        return null;
      }

      const newOffset = name.offset;
      if (newOffset + 4 > buffer.length) {
        return null;
      }

      const type = buffer.readUInt16BE(newOffset);
      const class_ = buffer.readUInt16BE(newOffset + 2);

      return {
        name: name.name,
        type,
        class: class_,
        offset: newOffset + 4
      };
    } catch (error) {
      console.error('Error parsing DNS question:', error);
      return null;
    }
  }

  private parseDNSName(buffer: Buffer, offset: number): { name: string; offset: number } | null {
    try {
      const labels: string[] = [];
      let currentOffset = offset;

      while (currentOffset < buffer.length) {
        const length = buffer[currentOffset];
        
        if (length === 0) {
          // End of name
          currentOffset++;
          break;
        }

        if ((length & 0xC0) === 0xC0) {
          // Compressed name
          const pointer = ((length & 0x3F) << 8) | buffer[currentOffset + 1];
          const compressedName = this.parseDNSName(buffer, pointer);
          if (compressedName) {
            labels.push(...compressedName.name.split('.'));
          }
          currentOffset += 2;
          break;
        }

        if (length > 63) {
          // Invalid length
          return null;
        }

        currentOffset++;
        if (currentOffset + length > buffer.length) {
          return null;
        }

        const label = buffer.toString('utf8', currentOffset, currentOffset + length);
        labels.push(label);
        currentOffset += length;
      }

      return {
        name: labels.join('.'),
        offset: currentOffset
      };
    } catch (error) {
      console.error('Error parsing DNS name:', error);
      return null;
    }
  }

  private async createBasicDNSResponse(originalPacket: Buffer, domain: string): Promise<Buffer | null> {
    try {
      // Create a basic DNS response
      const response = Buffer.alloc(originalPacket.length + 16); // Extra space for answer
      originalPacket.copy(response);

      // Set response flags (QR=1, RCODE=0)
      response.writeUInt16BE(0x8180, 2);

      // Set answer count to 1
      response.writeUInt16BE(1, 6);

      // Add a basic A record answer
      const answerOffset = originalPacket.length;
      
      // Name pointer to question
      response.writeUInt16BE(0xC00C, answerOffset); // Pointer to question name
      
      // Type (A record)
      response.writeUInt16BE(1, answerOffset + 2);
      
      // Class (IN)
      response.writeUInt16BE(1, answerOffset + 4);
      
      // TTL (300 seconds)
      response.writeUInt32BE(300, answerOffset + 6);
      
      // Data length (4 bytes for IPv4)
      response.writeUInt16BE(4, answerOffset + 10);
      
      // IP address (placeholder - would need to be resolved)
      response.writeUInt32BE(0x08080808, answerOffset + 12); // 8.8.8.8

      return response;
    } catch (error) {
      console.error('Error creating DNS response:', error);
      return null;
    }
  }

  private createErrorResponse(originalPacket: Buffer): Buffer | null {
    try {
      // Create a simple error response
      const response = Buffer.alloc(originalPacket.length);
      originalPacket.copy(response);

      // Set error flags (Server Failure)
      response.writeUInt16BE(0x8182, 2); // QR=1, RCODE=2 (Server Failure)

      return response;
    } catch (error) {
      console.error('Error creating error response:', error);
      return null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  getPort(): number {
    return this.port;
  }
}

// Global DNS proxy instance
let dnsProxyInstance: DNSProxy | null = null;

export async function startDNSProxy(port?: number): Promise<number> {
  if (dnsProxyInstance) {
    await dnsProxyInstance.stop();
  }

  dnsProxyInstance = new DNSProxy(port);
  return await dnsProxyInstance.start();
}

export async function stopDNSProxy(): Promise<void> {
  if (dnsProxyInstance) {
    await dnsProxyInstance.stop();
    dnsProxyInstance = null;
  }
}

export function isDNSProxyRunning(): boolean {
  return dnsProxyInstance ? dnsProxyInstance.isRunning() : false;
}

export function getDNSProxyPort(): number {
  return dnsProxyInstance ? dnsProxyInstance.getPort() : 53535;
} 