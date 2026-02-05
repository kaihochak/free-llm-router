import type { ApiKeyValidation } from '@/lib/api-auth';
import { corsHeaders, rateLimitHeaders } from '@/lib/api-auth';

export type HeaderMap = Record<string, string>;

export function mergeHeaders(...parts: Array<HeaderMap | undefined>): HeaderMap {
  return Object.assign({}, ...parts.filter(Boolean));
}

export function jsonResponse(
  body: unknown,
  options?: { status?: number; headers?: HeaderMap }
): Response {
  const headers = mergeHeaders({ 'Content-Type': 'application/json' }, options?.headers);
  return new Response(JSON.stringify(body), { status: options?.status ?? 200, headers });
}

export function noContentResponse(options?: { status?: number; headers?: HeaderMap }): Response {
  return new Response(null, {
    status: options?.status ?? 204,
    headers: options?.headers,
  });
}

export function apiResponseHeaders(options?: {
  cacheControl?: string;
  validation?: ApiKeyValidation;
  cors?: boolean;
  extra?: HeaderMap;
}): HeaderMap {
  const headers: HeaderMap = {};

  if (options?.cacheControl) {
    headers['Cache-Control'] = options.cacheControl;
  }

  if (options?.cors !== false) {
    Object.assign(headers, corsHeaders);
  }

  if (options?.validation) {
    Object.assign(headers, rateLimitHeaders(options.validation));
  }

  if (options?.extra) {
    Object.assign(headers, options.extra);
  }

  return headers;
}
