// api/stocks.js (Neon Final Version)
import postgres from 'serverless-postgres';

const db = postgres({
  connectionString: process.env.DATABASE_URL,
  ssl: 'require',
});

export default async function handler(request, response) {
    const { searchParams } = new URL(request.url, `https://${request.headers.host}`);
    const ticker = searchParams.get('ticker');
    
    try {
        if (ticker) {
            const data = await fetchSingleStockData(ticker);
            return response.status(200).json(data);
        } else {
            console.log("Fetching all heatmap data from 'stocks' table...");
            const data = await db.sql`SELECT * FROM stocks`;

            console.log(`Successfully returned ${data.count} stocks.`);
            return response.status(200).json(data || []);
        }
    } catch (error) {
        console.error('[Stocks API Error]:', error.message);
        return response.status(500).json({ error: error.message });
    }
}

async function fetchSingleStockData(ticker) {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) throw new Error('FINNHUB_API_KEY is not configured.');
    
    const stockInfoList = await db.sql`
        SELECT name_zh, sector_zh FROM stock_list WHERE ticker = ${ticker}
    `;
    const stockInfo = stockInfoList[0];
    
    if (!stockInfo) console.warn(`Could not find ${ticker} in stock_list.`);
    
    const fetchFromFinnhub = async (endpoint) => {
        const url = `https://finnhub.io/api/v1${endpoint}&token=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Finnhub API error for ${url}: ${res.statusText}`);
        return res.json();
    };
    
    const [profile, quote] = await Promise.all([
        fetchFromFinnhub(`/stock/profile2?symbol=${ticker}`),
        fetchFromFinnhub(`/quote?symbol=${ticker}`)
    ]);
    
    const name_zh_final = stockInfo?.name_zh || profile.name || '';
    const sector_zh_final = stockInfo?.sector_zh || profile.finnhubIndustry || 'N/A';
    const description = `${name_zh_final} (${profile.name}) 是一家总部位于 ${profile.country || '未知'} 的公司，属于 ${sector_zh_final} 行业，于 ${profile.ipo || '未知日期'} 上市。`;
    
    return { 
        profile: { ...profile, description, name_zh: name_zh_final, sector_zh: sector_zh_final }, 
        quote 
    };
}