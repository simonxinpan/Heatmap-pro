-- 智能标签系统数据库设计
-- 版本: V1.0
-- 创建日期: 2024年12月
-- 说明: 为股票热力图项目添加智能标签功能的数据库结构

-- =====================================================
-- 1. 标签主表 (tags)
-- =====================================================
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE COMMENT '标签名称（中文）',
    name_en VARCHAR(50) COMMENT '标签名称（英文）',
    category VARCHAR(20) NOT NULL COMMENT '标签类别: static(静态) 或 dynamic(动态)',
    type VARCHAR(20) NOT NULL COMMENT '标签类型: industry(行业), performance(表现), financial(财务), index(指数), region(地区)',
    description TEXT COMMENT '标签描述',
    color VARCHAR(7) DEFAULT '#2196F3' COMMENT '标签显示颜色（十六进制）',
    calculation_rule TEXT COMMENT '动态标签的计算规则（JSON格式）',
    is_active BOOLEAN DEFAULT true COMMENT '是否启用',
    sort_order INTEGER DEFAULT 0 COMMENT '显示排序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. 股票标签关联表 (stock_tags)
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_tags (
    id SERIAL PRIMARY KEY,
    stock_id INTEGER NOT NULL COMMENT '股票ID，关联stocks表',
    tag_id INTEGER NOT NULL COMMENT '标签ID，关联tags表',
    relevance_score DECIMAL(3,2) DEFAULT 1.00 COMMENT '相关度评分 (0.00-1.00)',
    calculated_value DECIMAL(15,4) COMMENT '计算得出的具体数值（如ROE值、涨跌幅等）',
    is_valid BOOLEAN DEFAULT true COMMENT '标签是否有效（用于动态标签的失效处理）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stock_id, tag_id)
);

-- =====================================================
-- 3. 标签更新日志表 (tag_update_logs)
-- =====================================================
CREATE TABLE IF NOT EXISTS tag_update_logs (
    id SERIAL PRIMARY KEY,
    tag_id INTEGER NOT NULL COMMENT '标签ID',
    update_type VARCHAR(20) NOT NULL COMMENT '更新类型: create, update, delete',
    affected_stocks_count INTEGER DEFAULT 0 COMMENT '受影响的股票数量',
    execution_time_ms INTEGER COMMENT '执行时间（毫秒）',
    error_message TEXT COMMENT '错误信息（如果有）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 4. 创建索引以优化查询性能
-- =====================================================

-- 股票标签关联表索引
CREATE INDEX IF NOT EXISTS idx_stock_tags_stock_id ON stock_tags(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_tags_tag_id ON stock_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_stock_tags_valid ON stock_tags(is_valid);
CREATE INDEX IF NOT EXISTS idx_stock_tags_relevance ON stock_tags(relevance_score DESC);

-- 标签表索引
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(type);
CREATE INDEX IF NOT EXISTS idx_tags_active ON tags(is_active);
CREATE INDEX IF NOT EXISTS idx_tags_sort_order ON tags(sort_order);

-- 更新日志表索引
CREATE INDEX IF NOT EXISTS idx_tag_update_logs_tag_id ON tag_update_logs(tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_update_logs_created_at ON tag_update_logs(created_at DESC);

-- =====================================================
-- 5. 初始化静态标签数据
-- =====================================================

-- 行业标签
INSERT INTO tags (name, name_en, category, type, description, color, sort_order) VALUES
('科技', 'Technology', 'static', 'industry', '科技行业股票', '#2196F3', 1),
('医疗健康', 'Healthcare', 'static', 'industry', '医疗健康行业股票', '#4CAF50', 2),
('金融', 'Financial', 'static', 'industry', '金融行业股票', '#FF9800', 3),
('消费', 'Consumer', 'static', 'industry', '消费行业股票', '#E91E63', 4),
('能源', 'Energy', 'static', 'industry', '能源行业股票', '#795548', 5),
('工业', 'Industrial', 'static', 'industry', '工业行业股票', '#607D8B', 6),
('材料', 'Materials', 'static', 'industry', '材料行业股票', '#9C27B0', 7),
('公用事业', 'Utilities', 'static', 'industry', '公用事业行业股票', '#009688', 8),
('房地产', 'Real Estate', 'static', 'industry', '房地产行业股票', '#8BC34A', 9),
('通信', 'Communication', 'static', 'industry', '通信行业股票', '#3F51B5', 10)
ON CONFLICT (name) DO NOTHING;

-- 指数标签
INSERT INTO tags (name, name_en, category, type, description, color, sort_order) VALUES
('标普500', 'S&P 500', 'static', 'index', '标普500指数成分股', '#1976D2', 11),
('纳斯达克100', 'NASDAQ 100', 'static', 'index', '纳斯达克100指数成分股', '#388E3C', 12),
('道琼斯30', 'Dow Jones 30', 'static', 'index', '道琼斯30指数成分股', '#F57C00', 13)
ON CONFLICT (name) DO NOTHING;

-- 市值规模标签
INSERT INTO tags (name, name_en, category, type, description, color, sort_order) VALUES
('大盘股', 'Large Cap', 'dynamic', 'size', '市值超过100亿美元的股票', '#1565C0', 14),
('中盘股', 'Mid Cap', 'dynamic', 'size', '市值在20-100亿美元的股票', '#5E35B1', 15),
('小盘股', 'Small Cap', 'dynamic', 'size', '市值低于20亿美元的股票', '#E53935', 16)
ON CONFLICT (name) DO NOTHING;

-- 动态市场表现标签
INSERT INTO tags (name, name_en, category, type, description, color, sort_order, calculation_rule) VALUES
('52周新高', '52W High', 'dynamic', 'performance', '股价创52周新高', '#4CAF50', 17, '{"rule": "current_price >= max_52w_price * 0.99", "update_frequency": "daily"}'),
('52周新低', '52W Low', 'dynamic', 'performance', '股价创52周新低', '#F44336', 18, '{"rule": "current_price <= min_52w_price * 1.01", "update_frequency": "daily"}'),
('近期强势', 'Recent Strong', 'dynamic', 'performance', '近30日涨幅超过10%', '#8BC34A', 19, '{"rule": "change_30d > 0.10", "update_frequency": "daily"}'),
('近期弱势', 'Recent Weak', 'dynamic', 'performance', '近30日跌幅超过10%', '#FF5722', 20, '{"rule": "change_30d < -0.10", "update_frequency": "daily"}'),
('高成交量', 'High Volume', 'dynamic', 'performance', '成交量超过30日均量2倍', '#FF9800', 21, '{"rule": "volume > avg_volume_30d * 2", "update_frequency": "daily"}')
ON CONFLICT (name) DO NOTHING;

-- 动态财务质量标签
INSERT INTO tags (name, name_en, category, type, description, color, sort_order, calculation_rule) VALUES
('高ROE', 'High ROE', 'dynamic', 'financial', 'ROE超过15%的优质股票', '#2E7D32', 22, '{"rule": "roe > 0.15", "update_frequency": "quarterly"}'),
('低市盈率', 'Low P/E', 'dynamic', 'financial', '市盈率低于15倍的价值股', '#1976D2', 23, '{"rule": "pe_ratio < 15 AND pe_ratio > 0", "update_frequency": "daily"}'),
('高股息率', 'High Dividend', 'dynamic', 'financial', '股息率超过3%的分红股', '#388E3C', 24, '{"rule": "dividend_yield > 0.03", "update_frequency": "quarterly"}'),
('稳定增长', 'Stable Growth', 'dynamic', 'financial', '连续4个季度营收增长', '#5D4037', 25, '{"rule": "revenue_growth_4q_consecutive > 0", "update_frequency": "quarterly"}')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 6. 创建视图以简化查询
-- =====================================================

-- 股票标签汇总视图
CREATE OR REPLACE VIEW stock_tags_summary AS
SELECT 
    s.ticker,
    s.name_zh,
    s.sector_zh,
    s.market_cap,
    COUNT(st.tag_id) as total_tags,
    COUNT(CASE WHEN t.category = 'static' THEN 1 END) as static_tags,
    COUNT(CASE WHEN t.category = 'dynamic' THEN 1 END) as dynamic_tags,
    STRING_AGG(t.name, ', ' ORDER BY t.sort_order) as tag_names
FROM stocks s
LEFT JOIN stock_tags st ON s.id = st.stock_id AND st.is_valid = true
LEFT JOIN tags t ON st.tag_id = t.id AND t.is_active = true
GROUP BY s.id, s.ticker, s.name_zh, s.sector_zh, s.market_cap;

-- 标签统计视图
CREATE OR REPLACE VIEW tag_statistics AS
SELECT 
    t.id,
    t.name,
    t.category,
    t.type,
    t.color,
    COUNT(st.stock_id) as stock_count,
    AVG(st.relevance_score) as avg_relevance,
    MAX(st.updated_at) as last_updated
FROM tags t
LEFT JOIN stock_tags st ON t.id = st.tag_id AND st.is_valid = true
WHERE t.is_active = true
GROUP BY t.id, t.name, t.category, t.type, t.color
ORDER BY t.sort_order;

-- =====================================================
-- 7. 创建触发器以自动更新时间戳
-- =====================================================

-- 更新tags表的updated_at字段
CREATE OR REPLACE FUNCTION update_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_tags_updated_at();

-- 更新stock_tags表的updated_at字段
CREATE OR REPLACE FUNCTION update_stock_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_tags_updated_at
    BEFORE UPDATE ON stock_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_tags_updated_at();

-- =====================================================
-- 8. 示例查询语句
-- =====================================================

/*
-- 查询某只股票的所有标签
SELECT t.name, t.type, t.color, st.relevance_score, st.calculated_value
FROM stocks s
JOIN stock_tags st ON s.id = st.stock_id
JOIN tags t ON st.tag_id = t.id
WHERE s.ticker = 'AAPL' AND st.is_valid = true AND t.is_active = true
ORDER BY t.sort_order;

-- 查询拥有某个标签的所有股票
SELECT s.ticker, s.name_zh, s.market_cap, st.relevance_score, st.calculated_value
FROM tags t
JOIN stock_tags st ON t.id = st.tag_id
JOIN stocks s ON st.stock_id = s.id
WHERE t.name = '高ROE' AND st.is_valid = true AND t.is_active = true
ORDER BY st.relevance_score DESC, s.market_cap DESC;

-- 查询标签统计信息
SELECT * FROM tag_statistics
WHERE stock_count > 0
ORDER BY stock_count DESC;

-- 查询股票标签汇总
SELECT * FROM stock_tags_summary
WHERE total_tags > 0
ORDER BY total_tags DESC, market_cap DESC;
*/

-- =====================================================
-- 9. 数据完整性约束
-- =====================================================

-- 确保标签类别只能是指定值
ALTER TABLE tags ADD CONSTRAINT check_category 
    CHECK (category IN ('static', 'dynamic'));

-- 确保标签类型只能是指定值
ALTER TABLE tags ADD CONSTRAINT check_type 
    CHECK (type IN ('industry', 'performance', 'financial', 'index', 'region', 'size'));

-- 确保相关度评分在有效范围内
ALTER TABLE stock_tags ADD CONSTRAINT check_relevance_score 
    CHECK (relevance_score >= 0.00 AND relevance_score <= 1.00);

-- 确保颜色代码格式正确
ALTER TABLE tags ADD CONSTRAINT check_color_format 
    CHECK (color ~ '^#[0-9A-Fa-f]{6}$');

COMMIT;

-- 数据库设计完成
-- 下一步: 开发API端点和标签计算逻辑