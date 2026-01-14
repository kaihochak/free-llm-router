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

  // Get some active models to create feedback for
  const models = await db.select().from(freeModels).where(eq(freeModels.isActive, true)).limit(5);

  if (models.length === 0) {
    console.log('No active models found. Please sync models first.');
    return;
  }

  console.log(`Found ${models.length} models:`, models.map(m => m.id));

  const feedbackRecords: typeof modelFeedback.$inferInsert[] = [];

  // Create time buckets: every 5 minutes for the last 60 minutes (12 buckets)
  const now = Date.now();
  const bucketIntervalMs = 5 * 60 * 1000; // 5 minutes
  const numBuckets = 12;

  for (let bucketIndex = 0; bucketIndex < numBuckets; bucketIndex++) {
    // Calculate the timestamp for this bucket
    const bucketTime = new Date(now - bucketIndex * bucketIntervalMs);

    // For each model, create some reports in this bucket
    for (const model of models) {
      // Random number of reports per bucket per model (2-6)
      const numReports = 2 + Math.floor(Math.random() * 5);

      // Varying error rate per bucket to make chart interesting (5% - 50%)
      const errorRate = 0.05 + Math.random() * 0.45;

      for (let i = 0; i < numReports; i++) {
        const isError = Math.random() < errorRate;

        // Add small random offset within the bucket (0-4 minutes)
        const offsetMs = Math.floor(Math.random() * 4 * 60 * 1000);
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

  console.log(`Inserting ${feedbackRecords.length} feedback records across ${numBuckets} time buckets...`);

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
