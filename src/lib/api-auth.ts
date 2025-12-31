import type { APIContext } from 'astro';
import { createAuth, type AuthEnv } from './auth';
import { eq, and } from 'drizzle-orm';
import { createDb, apiKeys } from '@/db';

export interface ApiKeyValidation {
  valid: boolean;
  error?: string;
  errorCode?: string;
  userId?: string;
  keyId?: string;
  remaining?: number;
  limit?: number;
  lastRequest?: Date;
  timeWindow?: number;
}

// CORS headers - include on ALL responses from protected endpoints
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Rate limit error codes to check (Better Auth may use different codes)
const RATE_LIMIT_CODES = ['RATE_LIMITED', 'RATE_LIMIT_EXCEEDED', 'TOO_MANY_REQUESTS'];

// Default rate limit values for when result.key is null
const DEFAULT_RATE_LIMIT = { limit: 200, timeWindow: 86400000 }; // 200/day

/**
 * Extracts env vars from Cloudflare runtime or import.meta.env
 * Only DATABASE_URL and BETTER_AUTH_URL are required for API key verification
 * GitHub OAuth envs are optional (only needed for OAuth flows, not API key verification)
 */
function getEnv(context: APIContext): Partial<AuthEnv> & { missing: string[] } {
  const runtime = (context.locals as { runtime?: { env?: Record<string, string> } }).runtime;
  const env = runtime?.env || {};

  const databaseUrl = env.DATABASE_URL || import.meta.env.DATABASE_URL;
  const baseUrl = env.BETTER_AUTH_URL || import.meta.env.BETTER_AUTH_URL;
  const secret = env.BETTER_AUTH_SECRET || import.meta.env.BETTER_AUTH_SECRET;
  // GitHub envs are optional for API key verification
  const githubClientId = env.GITHUB_CLIENT_ID || import.meta.env.GITHUB_CLIENT_ID;
  const githubClientSecret = env.GITHUB_CLIENT_SECRET || import.meta.env.GITHUB_CLIENT_SECRET;

  const missing: string[] = [];
  if (!databaseUrl) missing.push('DATABASE_URL');
  if (!baseUrl) missing.push('BETTER_AUTH_URL');
  if (!secret) missing.push('BETTER_AUTH_SECRET');
  // Don't require GitHub envs - they're only needed for OAuth, not API key verification

  return { databaseUrl, baseUrl, secret, githubClientId, githubClientSecret, missing };
}

/**
 * Validates API key from Authorization header.
 * Expected format: "Bearer fma_xxxxx"
 */
export async function validateApiKey(context: APIContext): Promise<ApiKeyValidation> {
  // Get all env vars from runtime (Cloudflare Pages) or import.meta.env (dev)
  const envResult = getEnv(context);
  if (envResult.missing.length > 0) {
    return {
      valid: false,
      error: `Server configuration error: missing ${envResult.missing.join(', ')}`,
      errorCode: 'CONFIG_ERROR',
    };
  }

  const authEnv: AuthEnv = {
    databaseUrl: envResult.databaseUrl!,
    baseUrl: envResult.baseUrl!,
    secret: envResult.secret!,
    githubClientId: envResult.githubClientId,
    githubClientSecret: envResult.githubClientSecret,
  };

  // Parse Authorization header
  const authHeader = context.request.headers.get('Authorization');
  if (!authHeader) {
    return { valid: false, error: 'Missing Authorization header', errorCode: 'MISSING_AUTH' };
  }

  // Support "Bearer <key>" format only
  if (!authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      error: 'Invalid Authorization format. Use: Bearer <api-key>',
      errorCode: 'INVALID_FORMAT',
    };
  }

  const apiKey = authHeader.slice(7).trim(); // Remove "Bearer " prefix
  if (!apiKey) {
    return { valid: false, error: 'API key is empty', errorCode: 'EMPTY_KEY' };
  }

  const auth = createAuth(authEnv);

  try {
    // Better Auth verifyApiKey response:
    // { valid: boolean, error: { message, code } | null, key: ApiKey | null }
    const result = await auth.api.verifyApiKey({
      body: { key: apiKey },
    });

    if (!result.valid) {
      // Check for rate limit error codes (may vary by Better Auth version)
      const errorCode = result.error?.code?.toUpperCase() || '';
      const isRateLimited =
        RATE_LIMIT_CODES.some((code) => errorCode.includes(code)) ||
        result.error?.message?.toLowerCase().includes('rate limit');

      if (isRateLimited) {
        // Use defaults if result.key is null (shouldn't happen but be safe)
        const limit = result.key?.rateLimitMax ?? DEFAULT_RATE_LIMIT.limit;
        const timeWindow = result.key?.rateLimitTimeWindow ?? DEFAULT_RATE_LIMIT.timeWindow;
        // If lastRequest is missing, use now so Retry-After = timeWindow
        const lastRequest = result.key?.lastRequest ?? new Date();

        return {
          valid: false,
          error: 'Rate limit exceeded',
          errorCode: 'RATE_LIMITED',
          remaining: 0,
          limit,
          lastRequest,
          timeWindow,
        };
      }

      return {
        valid: false,
        error: result.error?.message || 'Invalid API key',
        errorCode: result.error?.code || 'INVALID_KEY',
      };
    }

    if (!result.key) {
      return { valid: false, error: 'Invalid API key', errorCode: 'INVALID_KEY' };
    }

    return {
      valid: true,
      userId: result.key.userId,
      keyId: result.key.id,
      remaining: result.key.remaining ?? undefined,
      limit: result.key.rateLimitMax ?? 200,
      lastRequest: result.key.lastRequest ?? undefined,
      timeWindow: result.key.rateLimitTimeWindow ?? 86400000,
    };
  } catch (error) {
    console.error('[API Auth] Verification error:', error);
    // Internal errors should be 500, not 401
    return { valid: false, error: 'Internal server error', errorCode: 'SERVER_ERROR' };
  }
}

/**
 * Generate rate limit headers from validation result.
 * X-RateLimit-Reset = lastRequest + timeWindow (sliding window)
 */
export function rateLimitHeaders(validation: ApiKeyValidation): Record<string, string> {
  const headers: Record<string, string> = {};

  if (validation.limit !== undefined) {
    headers['X-RateLimit-Limit'] = String(validation.limit);
  }
  if (validation.remaining !== undefined) {
    headers['X-RateLimit-Remaining'] = String(validation.remaining);
  }
  if (validation.lastRequest && validation.timeWindow) {
    const resetTime = new Date(validation.lastRequest.getTime() + validation.timeWindow);
    headers['X-RateLimit-Reset'] = String(Math.floor(resetTime.getTime() / 1000));
  }

  return headers;
}

/**
 * 401 Unauthorized response - ALWAYS includes CORS headers
 */
export function unauthorizedResponse(error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status: 401,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

/**
 * 429 Rate Limited response - ALWAYS includes CORS headers
 */
export function rateLimitedResponse(validation: ApiKeyValidation): Response {
  const headers: Record<string, string> = { ...corsHeaders, ...rateLimitHeaders(validation) };

  // Retry-After in seconds until reset
  if (validation.lastRequest && validation.timeWindow) {
    const resetTime = validation.lastRequest.getTime() + validation.timeWindow;
    const retryAfter = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
    headers['Retry-After'] = String(retryAfter);
  }

  return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

/**
 * 500 Server Error response - ALWAYS includes CORS headers
 */
export function serverErrorResponse(error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status: 500,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

/**
 * Validates API key without counting towards rate limit.
 * Use this for endpoints where the user is contributing (e.g., feedback).
 * Queries the database directly instead of using Better Auth's verifyApiKey.
 */
export async function validateApiKeyOnly(context: APIContext): Promise<ApiKeyValidation> {
  const envResult = getEnv(context);
  if (envResult.missing.length > 0) {
    return {
      valid: false,
      error: `Server configuration error: missing ${envResult.missing.join(', ')}`,
      errorCode: 'CONFIG_ERROR',
    };
  }

  const authHeader = context.request.headers.get('Authorization');
  if (!authHeader) {
    return { valid: false, error: 'Missing Authorization header', errorCode: 'MISSING_AUTH' };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      error: 'Invalid Authorization format. Use: Bearer <api-key>',
      errorCode: 'INVALID_FORMAT',
    };
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) {
    return { valid: false, error: 'API key is empty', errorCode: 'EMPTY_KEY' };
  }

  try {
    // Hash key with SHA-256 (Better Auth format)
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(apiKey));
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Direct DB query - no rate limit tracking
    const db = createDb(envResult.databaseUrl!);
    const result = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.key, hashHex), eq(apiKeys.enabled, true)))
      .limit(1);

    if (!result.length) {
      return { valid: false, error: 'Invalid API key', errorCode: 'INVALID_KEY' };
    }

    const key = result[0];
    if (key.expiresAt && key.expiresAt < new Date()) {
      return { valid: false, error: 'API key expired', errorCode: 'EXPIRED_KEY' };
    }

    return { valid: true, userId: key.userId, keyId: key.id };
  } catch (error) {
    console.error('[API Auth] Validation error:', error);
    return { valid: false, error: 'Internal server error', errorCode: 'SERVER_ERROR' };
  }
}
