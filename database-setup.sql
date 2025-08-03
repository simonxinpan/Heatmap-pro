-- Neon数据库初始化脚本
-- 用于创建标普500股票数据表

-- 创建主要股票数据表
CREATE TABLE IF NOT EXISTS stocks (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL UNIQUE,
    name_zh VARCHAR(100),
    name_en VARCHAR(100),
    sector_zh VARCHAR(50),
    sector_en VARCHAR(50),
    market_cap BIGINT,
    change_percent DECIMAL(8,4),
    current_price DECIMAL(10,2),
    last_price DECIMAL(10,2),
    change_amount DECIMAL(10,2),
    last_updated TIMESTAMPTZ,
    logo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 为现有表添加缺失字段（如果不存在）
ALTER TABLE stocks 
ADD COLUMN IF NOT EXISTS last_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS change_percent DECIMAL(8,4),
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ;

-- 创建股票详细信息表
CREATE TABLE IF NOT EXISTS stock_list (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL UNIQUE,
    name_zh VARCHAR(100),
    sector_zh VARCHAR(50),
    exchange VARCHAR(20),
    country VARCHAR(50),
    ipo_date DATE,
    website TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_stocks_ticker ON stocks(ticker);
CREATE INDEX IF NOT EXISTS idx_stocks_market_cap ON stocks(market_cap DESC);
CREATE INDEX IF NOT EXISTS idx_stock_list_ticker ON stock_list(ticker);

-- 插入一些示例数据（标普500主要股票）
INSERT INTO stocks (ticker, name_zh, name_en, sector_zh, sector_en, market_cap, change_percent, current_price, logo) VALUES
('AAPL', '苹果公司', 'Apple Inc.', '科技', 'Technology', 2450000000000, 1.69, 175.43, 'https://logo.clearbit.com/apple.com'),
('MSFT', '微软', 'Microsoft Corporation', '科技', 'Technology', 2200000000000, 0.85, 295.37, 'https://logo.clearbit.com/microsoft.com'),
('GOOGL', '谷歌', 'Alphabet Inc.', '科技', 'Technology', 1500000000000, -0.42, 120.45, 'https://logo.clearbit.com/google.com'),
('AMZN', '亚马逊', 'Amazon.com Inc.', '消费', 'Consumer Discretionary', 1200000000000, 2.15, 118.35, 'https://logo.clearbit.com/amazon.com'),
('TSLA', '特斯拉', 'Tesla Inc.', '汽车', 'Consumer Discretionary', 800000000000, -1.23, 251.82, 'https://logo.clearbit.com/tesla.com'),
('NVDA', '英伟达', 'NVIDIA Corporation', '科技', 'Technology', 900000000000, 3.45, 367.89, 'https://logo.clearbit.com/nvidia.com'),
('META', 'Meta平台', 'Meta Platforms Inc.', '科技', 'Technology', 750000000000, 1.87, 295.89, 'https://logo.clearbit.com/meta.com'),
('BRK.B', '伯克希尔', 'Berkshire Hathaway Inc.', '金融', 'Financials', 700000000000, 0.45, 345.67, 'https://logo.clearbit.com/berkshirehathaway.com'),
('UNH', '联合健康', 'UnitedHealth Group Inc.', '医疗', 'Health Care', 450000000000, 1.23, 478.92, 'https://logo.clearbit.com/unitedhealthgroup.com'),
('JNJ', '强生', 'Johnson & Johnson', '医疗', 'Health Care', 420000000000, 0.67, 159.84, 'https://logo.clearbit.com/jnj.com')
ON CONFLICT (ticker) DO UPDATE SET
    name_zh = EXCLUDED.name_zh,
    name_en = EXCLUDED.name_en,
    sector_zh = EXCLUDED.sector_zh,
    sector_en = EXCLUDED.sector_en,
    market_cap = EXCLUDED.market_cap,
    change_percent = EXCLUDED.change_percent,
    current_price = EXCLUDED.current_price,
    logo = EXCLUDED.logo,
    updated_at = CURRENT_TIMESTAMP;

-- 插入股票详细信息
INSERT INTO stock_list (ticker, name_zh, sector_zh, exchange, country, website, description) VALUES
('AAPL', '苹果公司', '科技', 'NASDAQ', 'US', 'https://www.apple.com', '苹果公司是一家美国跨国科技公司，设计、开发和销售消费电子产品、计算机软件和在线服务。'),
('MSFT', '微软', '科技', 'NASDAQ', 'US', 'https://www.microsoft.com', '微软公司是一家美国跨国科技公司，开发、制造、许可、支持和销售计算机软件、消费电子产品、个人计算机和相关服务。'),
('GOOGL', '谷歌', '科技', 'NASDAQ', 'US', 'https://www.google.com', 'Alphabet Inc.是谷歌的母公司，是一家美国跨国企业集团，专注于互联网相关服务和产品。'),
('AMZN', '亚马逊', '消费', 'NASDAQ', 'US', 'https://www.amazon.com', '亚马逊公司是一家美国跨国科技公司，专注于电子商务、云计算、数字流媒体和人工智能。'),
('TSLA', '特斯拉', '汽车', 'NASDAQ', 'US', 'https://www.tesla.com', '特斯拉公司是一家美国电动汽车和清洁能源公司，设计和制造电动汽车、能源存储系统和太阳能板。'),
('NVDA', '英伟达', '科技', 'NASDAQ', 'US', 'https://www.nvidia.com', '英伟达公司是一家美国跨国科技公司，设计图形处理单元（GPU）用于游戏和专业市场，以及用于汽车市场和数据中心的片上系统单元。'),
('META', 'Meta平台', '科技', 'NASDAQ', 'US', 'https://www.meta.com', 'Meta Platforms Inc.是一家美国跨国科技企业集团，拥有Facebook、Instagram、WhatsApp等社交媒体平台。'),
('BRK.B', '伯克希尔', '金融', 'NYSE', 'US', 'https://www.berkshirehathaway.com', '伯克希尔·哈撒韦公司是一家美国跨国企业集团控股公司，总部位于内布拉斯加州奥马哈。'),
('UNH', '联合健康', '医疗', 'NYSE', 'US', 'https://www.unitedhealthgroup.com', '联合健康集团是一家美国跨国管理医疗保健和保险公司。'),
('JNJ', '强生', '医疗', 'NYSE', 'US', 'https://www.jnj.com', '强生公司是一家美国跨国医疗设备、制药和消费品制造公司。')
ON CONFLICT (ticker) DO UPDATE SET
    name_zh = EXCLUDED.name_zh,
    sector_zh = EXCLUDED.sector_zh,
    exchange = EXCLUDED.exchange,
    country = EXCLUDED.country,
    website = EXCLUDED.website,
    description = EXCLUDED.description;

-- 创建更新时间戳的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stocks_updated_at BEFORE UPDATE ON stocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 查询验证数据
SELECT 
    ticker, 
    name_zh, 
    sector_zh, 
    market_cap/1000000000 as market_cap_billions,
    change_percent,
    current_price
FROM stocks 
ORDER BY market_cap DESC
LIMIT 10;