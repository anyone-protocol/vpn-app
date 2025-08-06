#!/usr/bin/env node

/**
 * DNS Proxy Test Script
 * 
 * This script tests the DNS proxy implementation to ensure it's working correctly
 * and preventing DNS leaks. It can test both the DNS proxy functionality and
 * the configuration system.
 * 
 * Usage:
 *   node scripts/test-dns-proxy.js [options]
 * 
 * Options:
 *   --config-test     Test DNS proxy configuration
 *   --proxy-test      Test DNS proxy functionality
 *   --leak-test       Test for DNS leaks
 *   --all             Run all tests
 */

const net = require('net');
const dns = require('dns');
const fs = require('fs');
const path = require('path');

// Test configuration
const DNS_PROXY_PORT = 53535;
const TEST_DOMAINS = [
  'google.com',
  'facebook.com',
  'amazon.com',
  'netflix.com',
  'github.com',
  'example.com'
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// DNS packet utilities
function createDNSQuery(domain, type = 1) {
  // Simple DNS query packet for A record
  const query = Buffer.alloc(512);
  let offset = 0;
  
  // DNS Header (12 bytes)
  query.writeUInt16BE(0x1234, 0); // ID
  query.writeUInt16BE(0x0100, 2); // Flags (standard query)
  query.writeUInt16BE(1, 4);      // Questions
  query.writeUInt16BE(0, 6);      // Answer RRs
  query.writeUInt16BE(0, 8);      // Authority RRs
  query.writeUInt16BE(0, 10);     // Additional RRs
  offset = 12;
  
  // Question section
  const labels = domain.split('.');
  for (const label of labels) {
    query.writeUInt8(label.length, offset);
    offset++;
    query.write(label, offset);
    offset += label.length;
  }
  query.writeUInt8(0, offset); // End of name
  offset++;
  
  query.writeUInt16BE(type, offset);  // Type (A = 1, AAAA = 28)
  offset += 2;
  query.writeUInt16BE(1, offset);  // Class (IN)
  offset += 2;
  
  return query.slice(0, offset);
}

function parseDNSResponse(buffer) {
  try {
    // Parse DNS header
    const id = buffer.readUInt16BE(0);
    const flags = buffer.readUInt16BE(2);
    const questions = buffer.readUInt16BE(4);
    const answers = buffer.readUInt16BE(6);
    
    // Check if it's a response (QR bit set)
    const isResponse = (flags & 0x8000) !== 0;
    const rcode = flags & 0x000F;
    
    if (!isResponse) {
      return { success: false, error: 'Not a DNS response' };
    }
    
    if (rcode !== 0) {
      return { success: false, error: `DNS Error: RCODE ${rcode}` };
    }
    
    return { 
      success: true, 
      id, 
      flags, 
      questions, 
      answers,
      rcode 
    };
  } catch (error) {
    return { success: false, error: `Parse error: ${error.message}` };
  }
}

// Test functions
async function testLocalDNS() {
  log('\n=== Testing Local DNS Resolution ===', 'cyan');
  
  const results = [];
  
  for (const domain of TEST_DOMAINS) {
    try {
      const ip = await new Promise((resolve, reject) => {
        dns.resolve4(domain, (err, addresses) => {
          if (err) {
            reject(err);
          } else {
            resolve(addresses[0] || null);
          }
        });
      });
      
      if (ip) {
        logSuccess(`Local DNS resolved ${domain} to: ${ip}`);
        results.push({ domain, ip, success: true });
      } else {
        logError(`Local DNS failed to resolve ${domain}`);
        results.push({ domain, ip: null, success: false });
      }
    } catch (error) {
      logError(`Local DNS resolution failed for ${domain}: ${error.message}`);
      results.push({ domain, ip: null, success: false, error: error.message });
    }
  }
  
  return results;
}

async function testDNSProxy() {
  log('\n=== Testing DNS Proxy ===', 'cyan');
  
  const results = [];
  
  for (const domain of TEST_DOMAINS) {
    try {
      const result = await new Promise((resolve) => {
        const client = new net.Socket();
        const query = createDNSQuery(domain);
        
        // Add length prefix for TCP DNS
        const packet = Buffer.alloc(query.length + 2);
        packet.writeUInt16BE(query.length, 0);
        query.copy(packet, 2);
        
        client.connect(DNS_PROXY_PORT, '127.0.0.1', () => {
          logInfo(`Connected to DNS proxy for ${domain}`);
          client.write(packet);
        });
        
        let responseBuffer = Buffer.alloc(0);
        
        client.on('data', (data) => {
          responseBuffer = Buffer.concat([responseBuffer, data]);
          
          if (responseBuffer.length >= 2) {
            const responseLength = responseBuffer.readUInt16BE(0);
            if (responseBuffer.length >= responseLength + 2) {
              const dnsResponse = responseBuffer.slice(2, responseLength + 2);
              const parsed = parseDNSResponse(dnsResponse);
              client.end();
              resolve(parsed);
            }
          }
        });
        
        client.on('error', (error) => {
          logError(`DNS proxy connection error for ${domain}: ${error.message}`);
          resolve({ success: false, error: error.message });
        });
        
        client.on('close', () => {
          logInfo(`DNS proxy connection closed for ${domain}`);
        });
        
        // Timeout after 5 seconds
        setTimeout(() => {
          logWarning(`DNS proxy test timeout for ${domain}`);
          client.destroy();
          resolve({ success: false, error: 'Timeout' });
        }, 5000);
      });
      
      if (result.success) {
        logSuccess(`DNS proxy resolved ${domain} successfully`);
        results.push({ domain, success: true, ...result });
      } else {
        logError(`DNS proxy failed for ${domain}: ${result.error}`);
        results.push({ domain, success: false, error: result.error });
      }
    } catch (error) {
      logError(`DNS proxy test error for ${domain}: ${error.message}`);
      results.push({ domain, success: false, error: error.message });
    }
  }
  
  return results;
}

async function testSystemDNS() {
  log('\n=== Testing System DNS Configuration ===', 'cyan');
  
  const servers = dns.getServers();
  logInfo(`Current DNS servers: ${servers.join(', ')}`);
  
  // Check if DNS proxy is configured
  const hasLocalDNS = servers.some(server => 
    server === '127.0.0.1' || server === 'localhost'
  );
  
  if (hasLocalDNS) {
    logSuccess('DNS proxy appears to be configured in system DNS');
  } else {
    logWarning('DNS proxy not found in system DNS configuration');
  }
  
  return { servers, hasLocalDNS };
}

async function testConfiguration() {
  log('\n=== Testing DNS Proxy Configuration ===', 'cyan');
  
  try {
    // Check if configuration file exists
    const configPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'anyone', 'config.json');
    const configExists = fs.existsSync(configPath);
    
    if (configExists) {
      logSuccess(`Configuration file found at: ${configPath}`);
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (config.dnsProxyConfig) {
        logSuccess('DNS proxy configuration found');
        logInfo(`Port: ${config.dnsProxyConfig.port || 'default'}`);
        logInfo(`Nameservers: ${(config.dnsProxyConfig.nameservers || []).join(', ')}`);
        logInfo(`Domain overrides: ${Object.keys(config.dnsProxyConfig.domains || {}).length}`);
        logInfo(`TLD servers: ${Object.keys(config.dnsProxyConfig.servers || {}).length}`);
      } else {
        logWarning('No DNS proxy configuration found in config file');
      }
    } else {
      logWarning(`Configuration file not found at: ${configPath}`);
    }
    
    return { configExists, config: configExists ? config : null };
  } catch (error) {
    logError(`Error reading configuration: ${error.message}`);
    return { configExists: false, error: error.message };
  }
}

async function testDNSLeak() {
  log('\n=== Testing DNS Leak Detection ===', 'cyan');
  
  const localResults = await testLocalDNS();
  const proxyResults = await testDNSProxy();
  const systemDNS = await testSystemDNS();
  
  const leakResults = [];
  
  for (let i = 0; i < TEST_DOMAINS.length; i++) {
    const domain = TEST_DOMAINS[i];
    const localResult = localResults.find(r => r.domain === domain);
    const proxyResult = proxyResults.find(r => r.domain === domain);
    
    if (localResult && proxyResult) {
      const isLeaking = !proxyResult.success && localResult.success;
      const result = {
        domain,
        localSuccess: localResult.success,
        proxySuccess: proxyResult.success,
        isLeaking,
        localIP: localResult.ip,
        proxyIP: proxyResult.ip
      };
      
      if (isLeaking) {
        logError(`DNS LEAK DETECTED for ${domain}`);
      } else if (proxyResult.success) {
        logSuccess(`No DNS leak for ${domain}`);
      } else {
        logWarning(`Both local and proxy DNS failed for ${domain}`);
      }
      
      leakResults.push(result);
    }
  }
  
  return { leakResults, systemDNS };
}

async function runAllTests() {
  log('🚀 Starting Comprehensive DNS Proxy Tests\n', 'bright');
  
  const results = {
    localDNS: await testLocalDNS(),
    dnsProxy: await testDNSProxy(),
    systemDNS: await testSystemDNS(),
    configuration: await testConfiguration(),
    leakTest: await testDNSLeak()
  };
  
  // Summary
  log('\n=== Test Results Summary ===', 'magenta');
  
  const localSuccess = results.localDNS.filter(r => r.success).length;
  const proxySuccess = results.dnsProxy.filter(r => r.success).length;
  const leaks = results.leakTest.leakResults.filter(r => r.isLeaking).length;
  
  log(`Local DNS Resolution: ${localSuccess}/${TEST_DOMAINS.length} ✅`);
  log(`DNS Proxy Functionality: ${proxySuccess}/${TEST_DOMAINS.length} ✅`);
  log(`System DNS Configuration: ${results.systemDNS.hasLocalDNS ? '✅ Configured' : '❌ Not Configured'}`);
  log(`DNS Leaks Detected: ${leaks}/${TEST_DOMAINS.length} ${leaks === 0 ? '✅' : '❌'}`);
  
  // Security assessment
  log('\n=== Security Assessment ===', 'magenta');
  if (proxySuccess > 0 && results.systemDNS.hasLocalDNS && leaks === 0) {
    logSuccess('DNS proxy appears to be working correctly');
    logSuccess('DNS leaks should be prevented');
  } else if (proxySuccess > 0 && !results.systemDNS.hasLocalDNS) {
    logWarning('DNS proxy is working but system not fully configured');
    logWarning('Some applications may still use local DNS');
  } else if (proxySuccess === 0) {
    logError('DNS proxy is not working');
    logError('DNS leaks may occur');
  } else if (leaks > 0) {
    logError(`${leaks} DNS leaks detected`);
    logError('DNS proxy may not be properly configured');
  }
  
  return results;
}

// Command line argument parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    configTest: args.includes('--config-test'),
    proxyTest: args.includes('--proxy-test'),
    leakTest: args.includes('--leak-test'),
    all: args.includes('--all') || args.length === 0
  };
  
  return options;
}

// Main function
async function main() {
  const options = parseArgs();
  
  try {
    if (options.all) {
      await runAllTests();
    } else {
      if (options.configTest) {
        await testConfiguration();
      }
      if (options.proxyTest) {
        await testDNSProxy();
      }
      if (options.leakTest) {
        await testDNSLeak();
      }
    }
  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testLocalDNS,
  testDNSProxy,
  testSystemDNS,
  testConfiguration,
  testDNSLeak,
  runAllTests
}; 