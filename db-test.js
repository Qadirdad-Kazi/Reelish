// Simple database connection test script
require('dotenv').config({ path: './server/.env' });
const { Pool } = require('pg');

async function main() {
  console.log('==== DATABASE CONNECTION TEST ====');
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'Set (value hidden for security)' : 'Not set'}`);
  
  try {
    // Create a connection pool with proper SSL configuration for Neon
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    // Test basic connection
    const connectionTest = await pool.query('SELECT 1 as connected');
    console.log('✅ Database connection successful:', connectionTest.rows[0]);
    
    // Check users table
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`✅ User count: ${userCount.rows[0].count}`);
    
    if (parseInt(userCount.rows[0].count) > 0) {
      // Get sample user
      const sampleUser = await pool.query('SELECT id, username, email FROM users LIMIT 1');
      console.log('✅ Sample user:', sampleUser.rows[0]);
    }
    
    await pool.end();
    console.log('==== TEST COMPLETE ====');
  } catch (error) {
    console.error('❌ DATABASE ERROR:', error);
    console.error('Stack trace:', error?.stack || 'No stack trace available');
    process.exit(1);
  }
}

main();
