// Fix import paths to work with ts-node
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Import schema directly
import * as schema from '../shared/schema';

// Configure neon for WebSockets
neonConfig.webSocketConstructor = ws;

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create connection pool and db instance
const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

// Destructure schema for easier access
const { 
  users, videos, comments, likes, follows, videoViews, conversations, messages, 
  notifications, tags, videoTags, trendingHashtags, passwordResetTokens 
} = schema;
import { sql } from 'drizzle-orm';

async function checkDatabaseConnection() {
  try {
    // Simple query to check if the database is accessible
    const result = await db.execute(sql`SELECT 1 as connected`);
    console.log('✅ Database connection successful!', result);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

async function getDatabaseStats() {
  try {
    // Get counts from all tables
    const userCount = await db.select({ count: sql`count(*)` }).from(users);
    const videoCount = await db.select({ count: sql`count(*)` }).from(videos);
    const commentCount = await db.select({ count: sql`count(*)` }).from(comments);
    const likeCount = await db.select({ count: sql`count(*)` }).from(likes);
    const followCount = await db.select({ count: sql`count(*)` }).from(follows);
    const viewCount = await db.select({ count: sql`count(*)` }).from(videoViews);
    
    console.log('📊 Database Statistics:');
    console.log(`- Users: ${userCount[0].count}`);
    console.log(`- Videos: ${videoCount[0].count}`);
    console.log(`- Comments: ${commentCount[0].count}`);
    console.log(`- Likes: ${likeCount[0].count}`);
    console.log(`- Follows: ${followCount[0].count}`);
    console.log(`- Video Views: ${viewCount[0].count}`);
  } catch (error) {
    console.error('❌ Failed to get database statistics:', error);
  }
}

async function clearAllData() {
  try {
    console.log('🗑️ Starting database cleanup...');
    
    // Delete data from tables in order to respect foreign key constraints
    await db.delete(messages);
    await db.delete(conversations);
    await db.delete(notifications);
    await db.delete(videoTags);
    await db.delete(tags);
    await db.delete(trendingHashtags);
    await db.delete(videoViews);
    await db.delete(likes);
    await db.delete(comments);
    await db.delete(videos);
    await db.delete(follows);
    await db.delete(passwordResetTokens);
    await db.delete(users);
    
    console.log('✅ All data has been cleared from the database!');
  } catch (error) {
    console.error('❌ Failed to clear database:', error);
  }
}

async function main() {
  const isConnected = await checkDatabaseConnection();
  
  if (isConnected) {
    console.log('\n--- Current Database Stats ---');
    await getDatabaseStats();
    
    // Ask for confirmation before clearing data
    const args = process.argv.slice(2);
    if (args.includes('--clear') || args.includes('-c')) {
      await clearAllData();
      console.log('\n--- Database Stats After Clearing ---');
      await getDatabaseStats();
    } else {
      console.log('\n⚠️ To clear all data, run with --clear or -c flag');
      console.log('Example: npx ts-node db-check-and-clear.ts --clear');
    }
  }
  
  // Close the connection pool
  await pool.end();
}

main().catch(console.error);
