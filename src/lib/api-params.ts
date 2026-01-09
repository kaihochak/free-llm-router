import type { APIContext } from 'astro';
import { type Database, createDb } from '@/db';
import {
  type FilterType,
  type SortType,
  type TimeRange,
  validateFilters,
  validateSort,
  validateLimit,
  validateExcludeWithIssues,
  validateTimeWindow,
  DEFAULT_EXCLUDE_WITH_ISSUES,
  DEFAULT_TIME_WINDOW,
} from '@/lib/api-definitions';
import {
  validateApiKey,
  validateApiKeyOnly,
  type ApiKeyValidation,
  corsHeaders,
} from '@/lib/api-auth';

export interface ParsedModelParams {
  filters: FilterType[];
  sort: SortType;
  limit?: number;
  excludeWithIssues: number;
  timeWindow: TimeRange;
}

export interface RequestContext {
  db: Database;
  params: ParsedModelParams;
  validation: ApiKeyValidation;
  userId?: string;
}

/**
 * Parse and validate query parameters common to /models/ids and /models/full endpoints
 * Uses unified validators from api-definitions.ts (single source of truth)
 */
export function parseModelParams(searchParams: URLSearchParams): ParsedModelParams {
  const filters = validateFilters(searchParams.get('filter'));
  const sort = validateSort(searchParams.get('sort'));
  const limit = validateLimit(searchParams.get('limit'));
  const excludeWithIssues = validateExcludeWithIssues(searchParams.get('excludeWithIssues'));
  const timeWindow = validateTimeWindow(searchParams.get('timeWindow'));

  return { filters, sort, limit, excludeWithIssues, timeWindow };
}

/**
 * Initialize common request context: validate auth, connect to DB, and parse params
 * Returns RequestContext if successful, or Response if error
 */
export async function initializeRequest(context: APIContext): Promise<RequestContext | Response> {
  // Validate API key
  const validation = await validateApiKey(context);

  if (!validation.valid) {
    if (validation.errorCode === 'CONFIG_ERROR' || validation.errorCode === 'SERVER_ERROR') {
      return new Response(JSON.stringify({ error: validation.error || 'Server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    if (validation.errorCode === 'RATE_LIMITED') {
      return new Response(JSON.stringify({ error: validation.error || 'Rate limited' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    return new Response(JSON.stringify({ error: validation.error || 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Get database connection
  const runtime = (context.locals as { runtime?: { env?: { DATABASE_URL?: string } } }).runtime;
  const databaseUrl = runtime?.env?.DATABASE_URL || import.meta.env.DATABASE_URL;

  if (!databaseUrl) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const db = createDb(databaseUrl);

  // Parse parameters
  const params = parseModelParams(context.url.searchParams);

  return { db, params, validation };
}

/**
 * Handle userOnly parameter: validates optional user context
 * Returns userId if userOnly=true, else undefined
 */
export async function getUserIdIfUserOnly(context: APIContext, userOnly: boolean): Promise<string | undefined> {
  if (!userOnly) return undefined;

  const validation = await validateApiKeyOnly(context);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid API key');
  }

  return validation.userId;
}

/**
 * Initialize database connection only (for public endpoints)
 * Returns Database if successful, or Response if error
 */
export async function initializeDb(context: APIContext): Promise<Database | Response> {
  const runtime = (context.locals as { runtime?: { env?: { DATABASE_URL?: string } } }).runtime;
  const databaseUrl = runtime?.env?.DATABASE_URL || import.meta.env.DATABASE_URL;

  if (!databaseUrl) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  return createDb(databaseUrl);
}

export interface AuthOnlyContext {
  db: Database;
  userId: string | undefined;
}

/**
 * Initialize for auth-only endpoints (uses validateApiKeyOnly, doesn't count towards rate limit)
 * Returns AuthOnlyContext if successful, or Response if error
 */
export async function initializeAuthOnly(context: APIContext): Promise<AuthOnlyContext | Response> {
  const validation = await validateApiKeyOnly(context);

  if (!validation.valid) {
    const status = validation.errorCode === 'CONFIG_ERROR' || validation.errorCode === 'SERVER_ERROR' ? 500 : 401;
    return new Response(JSON.stringify({ error: validation.error || (status === 500 ? 'Server error' : 'Unauthorized') }), {
      status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const runtime = (context.locals as { runtime?: { env?: { DATABASE_URL?: string } } }).runtime;
  const databaseUrl = runtime?.env?.DATABASE_URL || import.meta.env.DATABASE_URL;

  if (!databaseUrl) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const db = createDb(databaseUrl);
  return { db, userId: validation.userId };
}
