// Database credentials test script
require('dotenv').config({ path: './server/.env' });
const { Pool } = require('pg');

// Try different credential combinations
async function testConnection(username, password) {
  const connectionString = `postgres://${username}:${password}@ep-polished-frost-a1w7uw8n.us-east-2.aws.neon.tech/neondb?sslmode=require`;
  console.log(`Testing connection with username: ${username}`);
  
  try {
    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
    
    // Test basic connection
    const result = await pool.query('SELECT 1 as connected');
    console.log(`✅ SUCCESS with username '${username}' and password '${password.substring(0, 3)}***'`);
    console.log(`Connection string that works: postgres://${username}:${password}@ep-polished-frost-a1w7uw8n.us-east-2.aws.neon.tech/neondb?sslmode=require`);
    
    // Check users table
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`User count: ${userCount.rows[0].count}`);
    
    await pool.end();
    return true;
  } catch (error) {
    console.log(`❌ FAILED with username '${username}': ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('==== DATABASE CREDENTIALS TEST ====');
  
  // Try different common username combinations
  const usernames = ['default', 'postgres', 'admin', 'neon', 'MQZ_fG91TqnLMGNQQ30TV'];
  const passwords = ['7CrZJKUXMJRq', 'MQZ_fG91TqnLMGNQQ30TV'];
  
  let success = false;
  
  for (const username of usernames) {
    for (const password of passwords) {
      if (await testConnection(username, password)) {
        success = true;
        break;
      }
    }
    if (success) break;
  }
  
  if (!success) {
    console.log('\n❌ All connection attempts failed.');
    console.log('Please check your Neon database credentials in the dashboard.');
  } else {
    console.log('\n✅ Found working credentials! Update your .env file with the connection string above.');
  }
}

main();
