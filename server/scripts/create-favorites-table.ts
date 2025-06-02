// Script to create the favorites table
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { sql } from 'drizzle-orm';

// Import schema directly
import * as schema from '../shared/schema';
import { favorites } from '../shared/schema';

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

async function createFavoritesTable() {
  try {
    console.log('Creating favorites table...');
    
    // Create the favorites table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        video_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT favorites_user_video_idx UNIQUE (user_id, video_id)
      );
    `);
    
    console.log('✅ Favorites table created successfully!');
    
    // Verify the table exists
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'favorites'
      );
    `);
    
    console.log('Table exists:', result.rows[0].exists);
    
  } catch (error) {
    console.error('❌ Failed to create favorites table:', error);
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Run the function
createFavoritesTable().catch(console.error);
