const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres'
  });
  
  try {
    await client.connect();
    const res = await client.query(`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS feed_prompt_reporter TEXT DEFAULT '';`);
    console.log('Success:', res);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
run();
