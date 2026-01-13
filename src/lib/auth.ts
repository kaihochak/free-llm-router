import { betterAuth } from 'better-auth';
import type { Auth as BetterAuthInstance } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { apiKey } from 'better-auth/plugins';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@/db/schema';

// Auth options type that includes the apiKey plugin for proper type inference
type AuthOptions = {
  plugins: [ReturnType<typeof apiKey>];
};

// Environment config passed from runtime
export interface AuthEnv {
  databaseUrl: string;
  baseUrl: string;
  secret: string;
  // Optional for API key verification (only required for OAuth flows)
  githubClientId?: string;
  githubClientSecret?: string;
}

// Cache auth instance to avoid recreation on every request
// Typed with AuthOptions to preserve apiKey plugin endpoints (verifyApiKey, createApiKey, etc.)
const authCache = new Map<string, BetterAuthInstance<AuthOptions>>();

// Simple hash function for cache key (not cryptographic, just for differentiation)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export function createAuth(env: AuthEnv): BetterAuthInstance<AuthOptions> {
  // Include all config values in cache key to handle preview/prod differences
  const secretHash = env.githubClientSecret ? simpleHash(env.githubClientSecret) : '';
  const cacheKey = `${env.databaseUrl}:${env.baseUrl}:${env.githubClientId || ''}:${secretHash}`;

  if (authCache.has(cacheKey)) {
    return authCache.get(cacheKey)!;
  }

  const sql = neon(env.databaseUrl);
  const db = drizzle(sql, { schema });

  // Only include GitHub provider if credentials are provided
  const socialProviders =
    env.githubClientId && env.githubClientSecret
      ? { github: { clientId: env.githubClientId, clientSecret: env.githubClientSecret } }
      : undefined;

  const auth = betterAuth({
    baseURL: env.baseUrl,
    secret: env.secret,
    database: drizzleAdapter(db, {
      provider: 'pg',
      usePlural: true,
      schema: {
        ...schema,
        apikeys: schema.apiKeys, // Map lowercase to camelCase export
      },
    }),
    ...(socialProviders && { socialProviders }),
    plugins: [
      apiKey({
        defaultPrefix: 'fma_',
        rateLimit: {
          enabled: false, // DISABLED - using custom user-level rate limiting
        },
      }),
    ],
  });

  authCache.set(cacheKey, auth);
  return auth;
}

export type Auth = ReturnType<typeof createAuth>;
