import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// Ensure WebSocket is available for the Neon serverless driver (local Node needs ws).
if (typeof WebSocket === 'undefined') {
  const ws = await import('ws');
  neonConfig.webSocketConstructor = ws.WebSocket;
}

const pools = new Map<string, Pool>();

function getPool(databaseUrl: string): Pool {
  const existing = pools.get(databaseUrl);
  if (existing) return existing;

  const pool = new Pool({ connectionString: databaseUrl });
  pools.set(databaseUrl, pool);
  return pool;
}

export function createDb(databaseUrl: string): NodePgDatabase<typeof schema> {
  const pool = getPool(databaseUrl);
  return drizzle(pool, { schema });
}

export type Database = NodePgDatabase<typeof schema>;
