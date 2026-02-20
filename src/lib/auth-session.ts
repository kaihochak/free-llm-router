/**
 * Shared authentication and session helpers for API routes.
 * Consolidates duplicated auth logic from multiple endpoints.
 */

import { createAuth, type AuthEnv } from '@/lib/auth';

export interface SessionResult {
  session: { user: { id: string } };
  databaseUrl: string;
  databaseUrlAdmin?: string;
}

export interface SessionError {
  error: string;
  status: number;
}

/**
 * Get environment configuration from Cloudflare runtime or import.meta.env
 */
export function getEnvConfig(locals: unknown) {
  const runtime = (locals as { runtime?: { env?: Record<string, string> } }).runtime;
  const env = runtime?.env || {};
  const importMetaEnv = (import.meta as { env?: Record<string, string> }).env;

  return {
    databaseUrl: env.DATABASE_URL || importMetaEnv?.DATABASE_URL,
    databaseUrlAdmin: env.DATABASE_URL_ADMIN || importMetaEnv?.DATABASE_URL_ADMIN,
    baseUrl: env.BETTER_AUTH_URL || importMetaEnv?.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET || importMetaEnv?.BETTER_AUTH_SECRET,
    githubClientId: env.GITHUB_CLIENT_ID || importMetaEnv?.GITHUB_CLIENT_ID,
    githubClientSecret: env.GITHUB_CLIENT_SECRET || importMetaEnv?.GITHUB_CLIENT_SECRET,
  };
}

/**
 * Get authenticated session from request.
 * Returns SessionResult on success, SessionError on failure.
 */
export async function getAuthSession(
  request: Request,
  locals: unknown
): Promise<SessionResult | SessionError> {
  const config = getEnvConfig(locals);

  if (!config.databaseUrl || !config.baseUrl || !config.secret) {
    return { error: 'Server configuration error', status: 500 };
  }

  const authEnv: AuthEnv = {
    databaseUrl: config.databaseUrl,
    databaseUrlAdmin: config.databaseUrlAdmin,
    baseUrl: config.baseUrl,
    secret: config.secret,
    githubClientId: config.githubClientId,
    githubClientSecret: config.githubClientSecret,
  };

  let session: Awaited<ReturnType<ReturnType<typeof createAuth>['api']['getSession']>>;
  try {
    const auth = createAuth(authEnv);
    session = await auth.api.getSession({ headers: request.headers });
  } catch (error) {
    console.error('[Auth Session] getSession failed:', error);
    return { error: 'Unauthorized', status: 401 };
  }

  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 };
  }

  return {
    session: session as SessionResult['session'],
    databaseUrl: config.databaseUrl,
    databaseUrlAdmin: config.databaseUrlAdmin,
  };
}

/**
 * Type guard to check if result is an error
 */
export function isSessionError(result: SessionResult | SessionError): result is SessionError {
  return 'error' in result;
}

// Extended result that includes auth instance for endpoints that need to call auth APIs
export interface SessionWithAuthResult extends SessionResult {
  auth: ReturnType<typeof createAuth>;
}

/**
 * Get authenticated session with auth instance.
 * Use this variant when you need to call auth APIs (e.g., createApiKey).
 */
export async function getAuthSessionWithAuth(
  request: Request,
  locals: unknown
): Promise<SessionWithAuthResult | SessionError> {
  const config = getEnvConfig(locals);

  if (!config.databaseUrl || !config.baseUrl || !config.secret) {
    return { error: 'Server configuration error', status: 500 };
  }

  const authEnv: AuthEnv = {
    databaseUrl: config.databaseUrl,
    databaseUrlAdmin: config.databaseUrlAdmin,
    baseUrl: config.baseUrl,
    secret: config.secret,
    githubClientId: config.githubClientId,
    githubClientSecret: config.githubClientSecret,
  };

  let auth: ReturnType<typeof createAuth>;
  let session: Awaited<ReturnType<ReturnType<typeof createAuth>['api']['getSession']>>;
  try {
    auth = createAuth(authEnv);
    session = await auth.api.getSession({ headers: request.headers });
  } catch (error) {
    console.error('[Auth Session] getSessionWithAuth failed:', error);
    return { error: 'Unauthorized', status: 401 };
  }

  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 };
  }

  return {
    session: session as SessionResult['session'],
    databaseUrl: config.databaseUrl,
    databaseUrlAdmin: config.databaseUrlAdmin,
    auth,
  };
}

export function isSessionWithAuthError(
  result: SessionWithAuthResult | SessionError
): result is SessionError {
  return 'error' in result;
}
