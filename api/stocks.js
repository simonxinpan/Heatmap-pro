// api/stocks.js (最终统一版本)

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL, 
  ssl: {
    rejectUnauthorized: false,
  },
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const query = `
      SELECT 
        ticker, 
        name_zh AS company, 
        sector_zh AS sector, 
        market_cap, 
        change_percent AS change_percentage 
      FROM stocks
    `;
    const { rows } = await pool.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('API /api/stocks experienced an error:', error);
    res.status(500).json({ 
        error: 'Internal Server Error', 
        details: 'Failed to fetch data from the database.',
        errorMessage: error.message
    });
  }
}