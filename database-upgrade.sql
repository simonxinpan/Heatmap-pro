-- 数据库升级脚本：为stocks表添加缓存字段
-- 执行前请备份数据库

-- 添加报价缓存字段
ALTER TABLE stocks 
ADD COLUMN IF NOT EXISTS last_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS change_percent DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_stocks_last_updated ON stocks(last_updated);
CREATE INDEX IF NOT EXISTS idx_stocks_change_percent ON stocks(change_percent);
CREATE INDEX IF NOT EXISTS idx_stocks_market_cap_price ON stocks(market_cap, last_price);

-- 添加注释
COMMENT ON COLUMN stocks.last_price IS '最新股价';
COMMENT ON COLUMN stocks.change_amount IS '涨跌金额';
COMMENT ON COLUMN stocks.change_percent IS '涨跌幅百分比';
COMMENT ON COLUMN stocks.last_updated IS '数据最后更新时间';

-- 验证表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'stocks' 
ORDER BY ordinal_position;