import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { SessionManager } from '../../src/core/session-manager.js';
import { config } from '../../src/utils/config.js';
import { SessionLimitError } from '../../src/utils/types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let tempDir: string;

  beforeEach(() => {
    // Create temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secondbrain-test-'));

    // Override config for testing
    Object.assign(config, {
      sessionStorePath: tempDir,
      maxTotalCalls: 5,
      maxRefinementIterations: 2,
      sessionTimeoutMinutes: 1
    });

    sessionManager = new SessionManager();
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  test('should create a new session', () => {
    const sessionId = sessionManager.createSession();

    expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    const session = sessionManager.getSession(sessionId);
    expect(session).toBeDefined();
    expect(session?.totalCalls).toBe(0);
    expect(session?.isSubAgent).toBe(false);
  });

  test('should create sub-agent session', () => {
    const sessionId = sessionManager.createSession(true);

    const session = sessionManager.getSession(sessionId);
    expect(session?.isSubAgent).toBe(true);
  });

  test('should track agent calls', () => {
    const sessionId = sessionManager.createSession();

    sessionManager.trackAgentCall(sessionId, 'Security Engineer');

    const session = sessionManager.getSession(sessionId);
    expect(session?.totalCalls).toBe(1);
    expect(session?.agentTypeCalls['Security Engineer']).toBe(1);
  });

  test('should enforce call limits', () => {
    const sessionId = sessionManager.createSession();

    // Use up all allowed calls
    for (let i = 0; i < config.maxTotalCalls; i++) {
      sessionManager.trackAgentCall(sessionId, 'Security Engineer');
    }

    // Next call should throw
    expect(() => {
      sessionManager.trackAgentCall(sessionId, 'Security Engineer');
    }).toThrow(SessionLimitError);
  });

  test('should enforce refinement limits', () => {
    const sessionId = sessionManager.createSession();
    const taskHash = sessionManager.generateTaskHash('test task', 'test context');

    // Use up allowed refinements
    for (let i = 0; i < config.maxRefinementIterations; i++) {
      sessionManager.trackAgentCall(sessionId, 'Security Engineer', taskHash, true); // isRefinement = true
    }

    // Next refinement should throw
    expect(() => {
      sessionManager.trackAgentCall(sessionId, 'Security Engineer', taskHash, true); // isRefinement = true
    }).toThrow(SessionLimitError);
  });

  test('should prevent sub-agents from spawning agents', () => {
    const subAgentSessionId = sessionManager.createSession(true);

    expect(sessionManager.canSpawnAgent(subAgentSessionId)).toBe(false);
  });

  test('should allow primary agents to spawn agents', () => {
    const primarySessionId = sessionManager.createSession(false);

    expect(sessionManager.canSpawnAgent(primarySessionId)).toBe(true);
  });

  test('should generate consistent task hashes', () => {
    const hash1 = sessionManager.generateTaskHash('test task', 'test context');
    const hash2 = sessionManager.generateTaskHash('test task', 'test context');
    const hash3 = sessionManager.generateTaskHash('different task', 'test context');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  test('should provide session statistics', () => {
    const sessionId = sessionManager.createSession();
    sessionManager.trackAgentCall(sessionId, 'Security Engineer');
    sessionManager.trackAgentCall(sessionId, 'DevOps Engineer');

    const stats = sessionManager.getSessionStats(sessionId);

    expect(stats).toBeDefined();
    expect(stats?.totalCalls).toBe(2);
    expect(stats?.agentTypeCalls['Security Engineer']).toBe(1);
    expect(stats?.agentTypeCalls['DevOps Engineer']).toBe(1);
  });

  test('should provide global statistics', () => {
    const session1 = sessionManager.createSession();
    const session2 = sessionManager.createSession(true);

    sessionManager.trackAgentCall(session1, 'Security Engineer');

    const globalStats = sessionManager.getGlobalStats();

    expect(globalStats.totalActiveSessions).toBe(2);
    expect(globalStats.subAgentSessions).toBe(1);
    expect(globalStats.primaryAgentSessions).toBe(1);
    expect(globalStats.totalCallsAcrossAllSessions).toBe(1);
  });

  test('should persist and load sessions', () => {
    const sessionId = sessionManager.createSession();
    sessionManager.trackAgentCall(sessionId, 'Security Engineer');

    // Create new session manager to test persistence
    const newSessionManager = new SessionManager();
    const loadedSession = newSessionManager.getSession(sessionId);

    expect(loadedSession).toBeDefined();
    expect(loadedSession?.totalCalls).toBe(1);
    expect(loadedSession?.agentTypeCalls['Security Engineer']).toBe(1);
  });

  test('should delete sessions', () => {
    const sessionId = sessionManager.createSession();

    expect(sessionManager.getSession(sessionId)).toBeDefined();

    sessionManager.deleteSession(sessionId);

    expect(sessionManager.getSession(sessionId)).toBeNull();
  });
});
