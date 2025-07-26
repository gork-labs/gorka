# SecondBrain MCP - Critical Security Fixes Implementation Guide

## 🚨 IMMEDIATE ACTION REQUIRED - Phase 1 Security Fixes

### Fix 1: API Key Security Enhancement

**File to modify**: `servers/secondbrain-mcp/src/utils/config.ts`

**Current Vulnerable Code** (Lines 50-51):
```typescript
openaiApiKey: process.env.OPENAI_API_KEY,
anthropicApiKey: process.env.ANTHROPIC_API_KEY,
```

**SECURITY FIX - Replace with secure implementation**:

```typescript
// Create new file: src/security/secrets-manager.ts
import crypto from 'crypto';

export class SecureSecretsManager {
  private static instance: SecureSecretsManager;
  private encryptionKey: Buffer;

  private constructor() {
    // Use system-level encryption key or secure key derivation
    this.encryptionKey = this.deriveEncryptionKey();
  }

  public static getInstance(): SecureSecretsManager {
    if (!SecureSecretsManager.instance) {
      SecureSecretsManager.instance = new SecureSecretsManager();
    }
    return SecureSecretsManager.instance;
  }

  private deriveEncryptionKey(): Buffer {
    const masterKey = process.env.SECONDBRAIN_MASTER_KEY;
    if (!masterKey) {
      throw new Error('SECONDBRAIN_MASTER_KEY environment variable required for secure operation');
    }
    return crypto.scryptSync(masterKey, 'secondbrain-salt', 32);
  }

  public getApiKey(provider: 'openai' | 'anthropic'): string {
    const envVar = provider === 'openai' ? 'OPENAI_API_KEY_ENCRYPTED' : 'ANTHROPIC_API_KEY_ENCRYPTED';
    const encryptedKey = process.env[envVar];

    if (!encryptedKey) {
      throw new Error(`${envVar} not found. Use the encryption utility to set encrypted API keys.`);
    }

    return this.decrypt(encryptedKey);
  }

  private decrypt(encryptedData: string): string {
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipherGCM('aes-256-gcm', this.encryptionKey);
    decipher.setIV(iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  public encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipherGCM('aes-256-gcm', this.encryptionKey);
    cipher.setIV(iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }
}

// Utility function for setting up encrypted API keys
export function encryptApiKey(plainKey: string): string {
  const secretsManager = SecureSecretsManager.getInstance();
  return secretsManager.encrypt(plainKey);
}
```

**Update config.ts** (Replace lines 50-51):
```typescript
import { SecureSecretsManager } from '../security/secrets-manager.js';

// In getDefaultConfig function, replace:
const secretsManager = SecureSecretsManager.getInstance();

return {
  // ... other config
  openaiApiKey: secretsManager.getApiKey('openai'),
  anthropicApiKey: secretsManager.getApiKey('anthropic'),
  // ... rest of config
};
```

### Fix 2: Agent Isolation Enhancement

**File to create**: `servers/secondbrain-mcp/src/security/agent-isolator.ts`

```typescript
import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

export interface AgentIsolationConfig {
  maxMemoryMB: number;
  maxExecutionTimeMs: number;
  allowedAPIs: string[];
  networkAccess: boolean;
}

export class AgentIsolator extends EventEmitter {
  private workers: Map<string, Worker> = new Map();
  private readonly defaultConfig: AgentIsolationConfig = {
    maxMemoryMB: 512,
    maxExecutionTimeMs: 300000, // 5 minutes
    allowedAPIs: ['openai', 'anthropic'],
    networkAccess: true
  };

  public async spawnIsolatedAgent(
    agentId: string,
    agentCode: string,
    config: Partial<AgentIsolationConfig> = {}
  ): Promise<string> {
    const isolationConfig = { ...this.defaultConfig, ...config };

    try {
      const worker = new Worker(agentCode, {
        eval: true,
        resourceLimits: {
          maxOldGenerationSizeMb: isolationConfig.maxMemoryMB,
          maxYoungGenerationSizeMb: Math.floor(isolationConfig.maxMemoryMB * 0.3),
        }
      });

      // Set execution timeout
      const timeout = setTimeout(() => {
        worker.terminate();
        this.workers.delete(agentId);
        logger.warn(`Agent ${agentId} terminated due to timeout`);
      }, isolationConfig.maxExecutionTimeMs);

      worker.on('exit', (code) => {
        clearTimeout(timeout);
        this.workers.delete(agentId);
        if (code !== 0) {
          logger.error(`Agent ${agentId} exited with code ${code}`);
        }
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        this.workers.delete(agentId);
        logger.error(`Agent ${agentId} error:`, error);
      });

      this.workers.set(agentId, worker);
      logger.info(`Agent ${agentId} spawned with isolation constraints`);

      return agentId;
    } catch (error) {
      logger.error(`Failed to spawn isolated agent ${agentId}:`, error);
      throw error;
    }
  }

  public terminateAgent(agentId: string): boolean {
    const worker = this.workers.get(agentId);
    if (worker) {
      worker.terminate();
      this.workers.delete(agentId);
      logger.info(`Agent ${agentId} terminated`);
      return true;
    }
    return false;
  }

  public getActiveAgents(): string[] {
    return Array.from(this.workers.keys());
  }

  public async terminateAllAgents(): Promise<void> {
    const terminationPromises = Array.from(this.workers.keys()).map(agentId =>
      this.terminateAgent(agentId)
    );
    await Promise.all(terminationPromises);
    logger.info('All agents terminated');
  }
}
```

### Fix 3: Dependency Pinning

**File to modify**: `.vscode/mcp.json`

**CRITICAL CHANGE - Replace @latest patterns**:

```json
{
  "servers": {
    "sequentialthinking": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sequential-thinking@0.3.0"
      ]
    },
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@upstash/context7-mcp@1.2.0"
      ]
    },
    "memory": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-memory@0.4.0"
      ]
    },
    "secondbrain": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@gork-labs/secondbrain-mcp@0.15.0"
      ]
    }
  }
}
```

### Fix 4: Input Validation Enhancement

**File to create**: `servers/secondbrain-mcp/src/security/input-validator.ts`

```typescript
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { logger } from '../utils/logger.js';

// Enhanced input validation schemas
export const SecureInputSchemas = {
  AgentTask: z.object({
    task: z.string()
      .min(10)
      .max(5000)
      .refine(val => !containsMaliciousPatterns(val), {
        message: "Task contains potentially malicious content"
      }),
    context: z.string()
      .max(10000)
      .refine(val => !containsMaliciousPatterns(val), {
        message: "Context contains potentially malicious content"
      }),
    chatmode: z.string()
      .regex(/^[a-zA-Z0-9\s\-_]+$/, "Invalid chatmode format"),
    expected_deliverables: z.string()
      .max(2000)
      .refine(val => !containsMaliciousPatterns(val), {
        message: "Deliverables contain potentially malicious content"
      })
  }),

  McpMessage: z.object({
    method: z.string().regex(/^[a-zA-Z0-9_\/]+$/, "Invalid method format"),
    params: z.record(z.unknown()).optional(),
    id: z.union([z.string(), z.number()]).optional()
  })
};

// Malicious pattern detection
function containsMaliciousPatterns(input: string): boolean {
  const maliciousPatterns = [
    // Script injection patterns
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,

    // Command injection patterns
    /\$\(.*\)/g,
    /`.*`/g,
    /\|\s*\w+/g,
    /;\s*\w+/g,

    // Path traversal patterns
    /\.\.\//g,
    /\.\.\\/g,

    // SQL injection patterns (basic)
    /union\s+select/gi,
    /drop\s+table/gi,
    /exec\s*\(/gi,

    // System command patterns
    /rm\s+-rf/gi,
    /curl\s+/gi,
    /wget\s+/gi,
    /eval\s*\(/gi
  ];

  return maliciousPatterns.some(pattern => pattern.test(input));
}

export class SecureInputValidator {
  public static validateAgentInput(input: unknown): any {
    try {
      // Sanitize string inputs
      if (typeof input === 'object' && input !== null) {
        input = this.sanitizeObject(input);
      }

      // Validate against schema
      const validated = SecureInputSchemas.AgentTask.parse(input);

      logger.debug('Input validation successful');
      return validated;
    } catch (error) {
      logger.warn('Input validation failed:', error);
      throw new Error('Invalid or potentially malicious input detected');
    }
  }

  public static validateMcpMessage(input: unknown): any {
    try {
      const validated = SecureInputSchemas.McpMessage.parse(input);
      logger.debug('MCP message validation successful');
      return validated;
    } catch (error) {
      logger.warn('MCP message validation failed:', error);
      throw new Error('Invalid MCP message format');
    }
  }

  private static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return DOMPurify.sanitize(obj, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true
      });
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }
}
```

## Implementation Instructions

### Step 1: Install Additional Dependencies
```bash
cd servers/secondbrain-mcp
npm install isomorphic-dompurify
npm install --save-dev @types/dompurify
```

### Step 2: Set Up Master Encryption Key
```bash
# Generate secure master key (run once during setup)
export SECONDBRAIN_MASTER_KEY=$(openssl rand -base64 32)
echo "Set SECONDBRAIN_MASTER_KEY=${SECONDBRAIN_MASTER_KEY}" >> .env.local
```

### Step 3: Encrypt Existing API Keys
```bash
# Use the encryption utility to convert existing API keys
node -e "
import { encryptApiKey } from './dist/security/secrets-manager.js';
console.log('OPENAI_API_KEY_ENCRYPTED=' + encryptApiKey(process.env.OPENAI_API_KEY));
console.log('ANTHROPIC_API_KEY_ENCRYPTED=' + encryptApiKey(process.env.ANTHROPIC_API_KEY));
"
```

### Step 4: Update Server Integration
Add the security components to `src/core/server.ts`:

```typescript
import { SecureInputValidator } from '../security/input-validator.js';
import { AgentIsolator } from '../security/agent-isolator.js';

// In SecondBrainServer constructor:
private agentIsolator: AgentIsolator;

constructor() {
  // ... existing code
  this.agentIsolator = new AgentIsolator();
}

// In tool handlers, add validation:
const validatedInput = SecureInputValidator.validateAgentInput(request.params);
```

## Testing the Security Fixes

### Security Test Cases
1. **API Key Encryption Test**: Verify encrypted keys work correctly
2. **Agent Isolation Test**: Confirm memory and execution limits
3. **Input Validation Test**: Test malicious input rejection
4. **Dependency Security Test**: Verify pinned versions load correctly

### Verification Commands
```bash
# Test encrypted API key retrieval
npm test -- --grep "SecureSecretsManager"

# Test agent isolation
npm test -- --grep "AgentIsolator"

# Test input validation
npm test -- --grep "SecureInputValidator"
```

## Success Criteria
- ✅ All API keys encrypted and accessible only through SecureSecretsManager
- ✅ Agent isolation prevents memory/execution time violations
- ✅ Input validation blocks all test malicious inputs
- ✅ Dependencies pinned to specific versions
- ✅ No existing functionality broken
- ✅ Security test suite passes 100%

**IMPLEMENTATION DEADLINE**: 2025-08-02 (7 days from plan creation)
**PRIORITY**: CRITICAL - Required before any production deployment
