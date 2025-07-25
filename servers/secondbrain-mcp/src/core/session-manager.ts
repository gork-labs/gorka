import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { SessionState, SessionLimitError } from '../utils/types.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export class SessionManager {
  private sessions: Map<string, SessionState> = new Map();
  private storePath: string;

  constructor() {
    this.storePath = config.sessionStorePath;
    this.ensureStorageDirectory();
    this.loadExistingSessions();
    this.startCleanupTimer();
  }

  private ensureStorageDirectory(): void {
    try {
      if (!fs.existsSync(this.storePath)) {
        fs.mkdirSync(this.storePath, { recursive: true });
        logger.info('Created session storage directory', { path: this.storePath });
      }
    } catch (error) {
      logger.error('Failed to create session storage directory', {
        path: this.storePath,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private loadExistingSessions(): void {
    try {
      const sessionFile = path.join(this.storePath, 'sessions.json');
      if (fs.existsSync(sessionFile)) {
        const data = fs.readFileSync(sessionFile, 'utf-8');
        const sessionsData = JSON.parse(data);

        // Clean up expired sessions while loading
        const now = new Date();
        for (const [sessionId, sessionData] of Object.entries(sessionsData)) {
          const session = sessionData as SessionState;
          const lastActivity = new Date(session.lastActivity);
          const timeoutMs = config.sessionTimeoutMinutes * 60 * 1000;

          if (now.getTime() - lastActivity.getTime() < timeoutMs) {
            // Ensure backward compatibility - add missing depth fields
            if (session.currentDepth === undefined) {
              session.currentDepth = 0;
            }
            this.sessions.set(sessionId, session);
          }
        }

        logger.info('Loaded sessions from storage', {
          total: Object.keys(sessionsData).length,
          active: this.sessions.size
        });
      }
    } catch (error) {
      logger.warn('Failed to load existing sessions', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private persistSessions(): void {
    try {
      const sessionFile = path.join(this.storePath, 'sessions.json');
      const sessionsData = Object.fromEntries(this.sessions);
      fs.writeFileSync(sessionFile, JSON.stringify(sessionsData, null, 2));
    } catch (error) {
      logger.error('Failed to persist sessions', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private startCleanupTimer(): void {
    // Clean up expired sessions every 5 minutes
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    const timeoutMs = config.sessionTimeoutMinutes * 60 * 1000;
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      const lastActivity = new Date(session.lastActivity);
      if (now.getTime() - lastActivity.getTime() >= timeoutMs) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up expired sessions', { count: cleaned });
      this.persistSessions();
    }
  }

  generateSessionId(): string {
    return crypto.randomUUID();
  }

  createSession(isSubAgent: boolean = false, parentSessionId?: string): string {
    const sessionId = this.generateSessionId();
    const now = new Date().toISOString();

    // Calculate depth based on parent session
    let currentDepth = 0;
    if (parentSessionId) {
      const parentSession = this.sessions.get(parentSessionId);
      if (parentSession) {
        currentDepth = parentSession.currentDepth + 1;
      }
    }

    const session: SessionState = {
      sessionId,
      totalCalls: 0,
      agentTypeCalls: {},
      refinementCount: {},
      isSubAgent,
      currentDepth,
      parentSessionId,
      createdAt: now,
      lastActivity: now
    };

    this.sessions.set(sessionId, session);
    this.persistSessions();

    logger.info('Created new session', {
      sessionId,
      isSubAgent,
      totalSessions: this.sessions.size
    });

    return sessionId;
  }

  getSession(sessionId: string): SessionState | null {
    return this.sessions.get(sessionId) || null;
  }

  updateSession(sessionId: string, updates: Partial<SessionState>): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    Object.assign(session, updates, { lastActivity: new Date().toISOString() });
    this.sessions.set(sessionId, session);
    this.persistSessions();
  }

  trackAgentCall(sessionId: string, agentType: string, taskHash?: string, isRefinement: boolean = false): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Check total call limit
    if (session.totalCalls >= config.maxTotalCalls) {
      throw new SessionLimitError(
        `Maximum total calls exceeded (${config.maxTotalCalls})`,
        { sessionId, totalCalls: session.totalCalls }
      );
    }

    // Track call counts
    session.totalCalls++;
    session.agentTypeCalls[agentType] = (session.agentTypeCalls[agentType] || 0) + 1;

    // Track refinement counts ONLY if explicitly marked as refinement
    if (isRefinement && taskHash) {
      session.refinementCount[taskHash] = (session.refinementCount[taskHash] || 0) + 1;

      if (session.refinementCount[taskHash] > config.maxRefinementIterations) {
        throw new SessionLimitError(
          `Maximum refinement iterations exceeded for task (${config.maxRefinementIterations})`,
          { sessionId, taskHash, refinements: session.refinementCount[taskHash] }
        );
      }
    }

    session.lastActivity = new Date().toISOString();
    this.sessions.set(sessionId, session);
    this.persistSessions();

    logger.debug('Tracked agent call', {
      sessionId,
      agentType,
      totalCalls: session.totalCalls,
      agentTypeCalls: session.agentTypeCalls[agentType],
      taskHash,
      isRefinement
    });
  }

  // Generate a hash for task similarity detection
  generateTaskHash(task: string, context: string, agentType?: string): string {
    // Include agent type to avoid hash collisions between different agents
    const combined = agentType ? `${task}|${context}|${agentType}` : `${task}|${context}`;
    return crypto.createHash('md5').update(combined).digest('hex');
  }

  // Track an explicit refinement attempt
  trackRefinement(sessionId: string, taskHash: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.refinementCount[taskHash] = (session.refinementCount[taskHash] || 0) + 1;

    if (session.refinementCount[taskHash] > config.maxRefinementIterations) {
      throw new SessionLimitError(
        `Maximum refinement iterations exceeded for task (${config.maxRefinementIterations})`,
        { sessionId, taskHash, refinements: session.refinementCount[taskHash] }
      );
    }

    session.lastActivity = new Date().toISOString();
    this.sessions.set(sessionId, session);
    this.persistSessions();

    logger.debug('Tracked refinement', {
      sessionId,
      taskHash,
      refinements: session.refinementCount[taskHash]
    });
  }

  // Check if agent can be spawned (loop protection and depth limits)
  canSpawnAgent(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Sub-agents cannot spawn other agents (prevents cycles)
    if (session.isSubAgent) {
      return false;
    }

    // Check depth limits (if currentDepth is undefined, treat as 0 for backward compatibility)
    const currentDepth = session.currentDepth || 0;
    if (currentDepth >= config.maxDepth) {
      return false;
    }

    // Check total call limits
    return session.totalCalls < config.maxTotalCalls;
  }

  // Check if parallel agent count is within limits
  canSpawnParallelAgents(agentCount: number): boolean {
    return agentCount <= config.maxParallelAgents;
  }

  // Increment refinement count for a specific chatmode
  incrementRefinementCount(sessionId: string, chatmode: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Attempted to increment refinement count for non-existent session', { sessionId, chatmode });
      return; // Gracefully handle missing sessions instead of throwing
    }

    const refinementKey = `refinement_${chatmode}`;
    session.refinementCount[refinementKey] = (session.refinementCount[refinementKey] || 0) + 1;
    session.lastActivity = new Date().toISOString();

    this.sessions.set(sessionId, session);
    this.persistSessions();

    logger.debug('Incremented refinement count', {
      sessionId,
      chatmode,
      count: session.refinementCount[refinementKey]
    });
  }

  // Get refinement count for a specific chatmode
  getRefinementCount(sessionId: string, chatmode: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Attempted to get refinement count for non-existent session', { sessionId });
      return 0;
    }

    const refinementKey = `refinement_${chatmode}`;
    return session.refinementCount[refinementKey] || 0;
  }

  deleteSession(sessionId: string): void {
    if (this.sessions.delete(sessionId)) {
      this.persistSessions();
      logger.info('Deleted session', { sessionId });
    }
  }

  // Get session statistics
  getSessionStats(sessionId: string): Record<string, any> | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const now = new Date();
    const created = new Date(session.createdAt);
    const lastActivity = new Date(session.lastActivity);

    return {
      sessionId: session.sessionId,
      isSubAgent: session.isSubAgent,
      totalCalls: session.totalCalls,
      maxCalls: config.maxTotalCalls,
      agentTypeCalls: session.agentTypeCalls,
      refinementCounts: session.refinementCount,
      durationMinutes: Math.round((now.getTime() - created.getTime()) / 60000),
      minutesSinceLastActivity: Math.round((now.getTime() - lastActivity.getTime()) / 60000),
      createdAt: session.createdAt,
      lastActivity: session.lastActivity
    };
  }

  // Get global statistics
  getGlobalStats(): Record<string, any> {
    return {
      totalActiveSessions: this.sessions.size,
      subAgentSessions: Array.from(this.sessions.values()).filter(s => s.isSubAgent).length,
      primaryAgentSessions: Array.from(this.sessions.values()).filter(s => !s.isSubAgent).length,
      totalCallsAcrossAllSessions: Array.from(this.sessions.values()).reduce((sum, s) => sum + s.totalCalls, 0)
    };
  }
}
