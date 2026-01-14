// This is for seeding the database with synthetic feedback data for testing purposes.

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { modelFeedback, freeModels } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

// Generate a random ID
function randomId() {
  return crypto.randomUUID();
}

async function seed() {
  console.log('Fetching active models...');

  // Get active models to create feedback for
  const models = await db.select().from(freeModels).where(eq(freeModels.isActive, true));

  if (models.length === 0) {
    console.log('No active models found. Please sync models first.');
    return;
  }

  console.log(`Found ${models.length} models:`, models.map(m => m.id));

  const feedbackRecords: typeof modelFeedback.$inferInsert[] = [];
  const now = Date.now();

  // Time ranges to cover: 15m, 30m, 1h, 6h, 24h, 7d, 30d
  // Create buckets that ensure data in each time range
  const timeRanges = [
    { name: '15m', buckets: 3, intervalMs: 5 * 60 * 1000 },      // 3 buckets × 5min = 15min
    { name: '30m', buckets: 3, intervalMs: 5 * 60 * 1000, offsetMs: 15 * 60 * 1000 }, // 15-30min ago
    { name: '1h', buckets: 6, intervalMs: 5 * 60 * 1000, offsetMs: 30 * 60 * 1000 },  // 30-60min ago
    { name: '6h', buckets: 10, intervalMs: 30 * 60 * 1000, offsetMs: 1 * 60 * 60 * 1000 }, // 1-6h ago
    { name: '24h', buckets: 12, intervalMs: 60 * 60 * 1000, offsetMs: 6 * 60 * 60 * 1000 }, // 6-24h ago
    { name: '7d', buckets: 12, intervalMs: 12 * 60 * 60 * 1000, offsetMs: 24 * 60 * 60 * 1000 }, // 1-7d ago
    { name: '30d', buckets: 12, intervalMs: 2 * 24 * 60 * 60 * 1000, offsetMs: 7 * 24 * 60 * 60 * 1000 }, // 7-30d ago
  ];

  for (const range of timeRanges) {
    const baseOffset = range.offsetMs || 0;

    for (let bucketIndex = 0; bucketIndex < range.buckets; bucketIndex++) {
      // Calculate the timestamp for this bucket
      const bucketTime = new Date(now - baseOffset - bucketIndex * range.intervalMs);

      // For each model, create some reports in this bucket
      for (const model of models) {
        // Random number of reports per bucket per model (2-6)
        const numReports = 2 + Math.floor(Math.random() * 5);

        // Varying error rate per bucket to make chart interesting (5% - 50%)
        const errorRate = 0.05 + Math.random() * 0.45;

        for (let i = 0; i < numReports; i++) {
          const isError = Math.random() < errorRate;

          // Add small random offset within the bucket
          const maxOffset = Math.min(range.intervalMs * 0.8, 4 * 60 * 1000);
          const offsetMs = Math.floor(Math.random() * maxOffset);
          const createdAt = new Date(bucketTime.getTime() - offsetMs);

          if (isError) {
            const issueTypes = ['rate_limited', 'unavailable', 'error'] as const;
            const issue = issueTypes[Math.floor(Math.random() * issueTypes.length)];

            feedbackRecords.push({
              id: randomId(),
              modelId: model.id,
              isSuccess: false,
              issue,
              details: `Test ${issue} error`,
              source: 'seed-script',
              createdAt,
            });
          } else {
            feedbackRecords.push({
              id: randomId(),
              modelId: model.id,
              isSuccess: true,
              issue: null,
              details: null,
              source: 'seed-script',
              createdAt,
            });
          }
        }
      }
    }

    console.log(`Created ${range.name} range data`);
  }

  const totalBuckets = timeRanges.reduce((sum, r) => sum + r.buckets, 0);
  console.log(`Inserting ${feedbackRecords.length} feedback records across ${totalBuckets} time buckets...`);

  // Insert in batches
  const batchSize = 50;
  for (let i = 0; i < feedbackRecords.length; i += batchSize) {
    const batch = feedbackRecords.slice(i, i + batchSize);
    await db.insert(modelFeedback).values(batch);
    console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(feedbackRecords.length / batchSize)}`);
  }

  console.log('Done seeding feedback data!');
}

seed().catch(console.error);
