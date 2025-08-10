-- 标签系统数据库改造脚本
-- 第一阶段：数据库改造 (在 Neon)

-- 创建标签表
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL, -- '静态' 或 '动态'
    category VARCHAR(100), -- 分类：行业、特殊名单、财务指标等
    description TEXT,
    criteria TEXT, -- 动态标签的筛选条件
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建股票标签关联表（多对多关系）
CREATE TABLE IF NOT EXISTS stock_tags (
    stock_ticker VARCHAR(10) NOT NULL REFERENCES stocks(ticker),
    tag_id INTEGER NOT NULL REFERENCES tags(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (stock_ticker, tag_id)
);

-- 为查询创建索引，提升性能
CREATE INDEX IF NOT EXISTS idx_stock_tags_ticker ON stock_tags(stock_ticker);
CREATE INDEX IF NOT EXISTS idx_stock_tags_tag_id ON stock_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(type);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);

-- 插入静态标签数据

-- 行业分类标签
INSERT INTO tags (name, type, category, description) VALUES
('科技', '静态', '行业分类', '科技行业股票'),
('金融', '静态', '行业分类', '金融服务行业股票'),
('医疗', '静态', '行业分类', '医疗保健行业股票'),
('消费', '静态', '行业分类', '消费品行业股票'),
('能源', '静态', '行业分类', '能源行业股票'),
('工业', '静态', '行业分类', '工业行业股票'),
('材料', '静态', '行业分类', '原材料行业股票'),
('公用事业', '静态', '行业分类', '公用事业行业股票'),
('房地产', '静态', '行业分类', '房地产行业股票'),
('通信', '静态', '行业分类', '通信服务行业股票')
ON CONFLICT (name) DO NOTHING;

-- 特殊名单标签
INSERT INTO tags (name, type, category, description) VALUES
('FAANG', '静态', '特殊名单', 'Facebook, Apple, Amazon, Netflix, Google'),
('道琼斯成分股', '静态', '特殊名单', '道琼斯工业平均指数成分股'),
('纳斯达克100', '静态', '特殊名单', '纳斯达克100指数成分股'),
('标普500', '静态', '特殊名单', '标普500指数成分股'),
('高分红股', '静态', '特殊名单', '高股息收益率股票'),
('新兴科技', '静态', '特殊名单', '新兴科技领域股票'),
('ESG优选', '静态', '特殊名单', '环境、社会和治理优秀股票'),
('蓝筹股', '静态', '特殊名单', '大型稳定公司股票')
ON CONFLICT (name) DO NOTHING;

-- 动态标签（基于财务指标）
INSERT INTO tags (name, type, category, description, criteria) VALUES
('高市值', '动态', '市值排行', '市值排名前25的股票', 'market_cap DESC LIMIT 25'),
('中等市值', '动态', '市值排行', '市值排名26-100的股票', 'market_cap DESC LIMIT 75 OFFSET 25'),
('小市值', '动态', '市值排行', '市值排名101-200的股票', 'market_cap DESC LIMIT 100 OFFSET 100'),
('涨幅榜', '动态', '股市表现', '当日涨幅最大的前25只股票', 'change_percent DESC LIMIT 25'),
('跌幅榜', '动态', '股市表现', '当日跌幅最大的前25只股票', 'change_percent ASC LIMIT 25'),
('高价股', '动态', '价格区间', '股价最高的前25只股票', 'current_price DESC LIMIT 25'),
('低价股', '动态', '价格区间', '股价相对较低的前25只股票', 'current_price ASC LIMIT 25'),
('活跃股', '动态', '交易活跃度', '交易活跃度高的股票', 'volume DESC LIMIT 25'),
('稳定股', '动态', '波动性', '价格波动较小的稳定股票', 'volatility ASC LIMIT 25'),
('成长股', '动态', '财务表现', '营收增长率高的股票', 'revenue_growth DESC LIMIT 25')
ON CONFLICT (name) DO NOTHING;

-- 为现有股票分配行业标签
-- 科技行业
INSERT INTO stock_tags (stock_ticker, tag_id)
SELECT s.ticker, t.id
FROM stocks s, tags t
WHERE s.sector_zh = '科技' AND t.name = '科技'
ON CONFLICT DO NOTHING;

-- 金融行业
INSERT INTO stock_tags (stock_ticker, tag_id)
SELECT s.ticker, t.id
FROM stocks s, tags t
WHERE s.sector_zh = '金融' AND t.name = '金融'
ON CONFLICT DO NOTHING;

-- 医疗行业
INSERT INTO stock_tags (stock_ticker, tag_id)
SELECT s.ticker, t.id
FROM stocks s, tags t
WHERE s.sector_zh = '医疗' AND t.name = '医疗'
ON CONFLICT DO NOTHING;

-- 消费行业
INSERT INTO stock_tags (stock_ticker, tag_id)
SELECT s.ticker, t.id
FROM stocks s, tags t
WHERE s.sector_zh = '消费' AND t.name = '消费'
ON CONFLICT DO NOTHING;

-- 汽车行业（归类到消费）
INSERT INTO stock_tags (stock_ticker, tag_id)
SELECT s.ticker, t.id
FROM stocks s, tags t
WHERE s.sector_zh = '汽车' AND t.name = '消费'
ON CONFLICT DO NOTHING;

-- FAANG 特殊标签
INSERT INTO stock_tags (stock_ticker, tag_id)
SELECT ticker, (SELECT id FROM tags WHERE name = 'FAANG')
FROM (VALUES ('META'), ('AAPL'), ('AMZN'), ('NFLX'), ('GOOGL')) AS faang(ticker)
WHERE EXISTS (SELECT 1 FROM stocks WHERE stocks.ticker = faang.ticker)
ON CONFLICT DO NOTHING;

-- 创建更新时间戳的触发器
CREATE OR REPLACE FUNCTION update_tags_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_tags_updated_at_column();

-- 查询验证标签数据
SELECT 
    t.name as tag_name,
    t.type,
    t.category,
    COUNT(st.stock_ticker) as stock_count
FROM tags t
LEFT JOIN stock_tags st ON t.id = st.tag_id
GROUP BY t.id, t.name, t.type, t.category
ORDER BY t.type, t.category, t.name;