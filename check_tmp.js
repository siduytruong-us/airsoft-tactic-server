const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-us-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.ycqcvjpqdvlsoqclstht',
  password: 'Vippergod12!',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await client.connect();
  const migs = await client.query(`SELECT version FROM schema_migrations ORDER BY version`);
  console.log('schema_migrations:', migs.rows.map(r => r.version));

  const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'fields' ORDER BY column_name`);
  console.log('fields columns:', cols.rows.map(r => r.column_name));

  await client.end();
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
