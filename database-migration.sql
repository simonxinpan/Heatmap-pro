-- 数据库迁移脚本：修复热力图显示不全问题
-- 执行此脚本来为现有的stocks表添加缺失的字段

-- 检查当前表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stocks' 
ORDER BY ordinal_position;

-- 为现有表添加缺失字段（安全操作，不会影响现有数据）
ALTER TABLE stocks 
ADD COLUMN IF NOT EXISTS last_price NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS change_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS change_percent DECIMAL(8,4),
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ;

-- 验证字段已成功添加
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'stocks' 
AND column_name IN ('last_price', 'change_amount', 'change_percent', 'last_updated')
ORDER BY column_name;

-- 检查表中的数据（前5条记录）
SELECT ticker, name_zh, market_cap, last_price, change_percent, last_updated
FROM stocks 
ORDER BY market_cap DESC NULLS LAST
LIMIT 5;

-- 显示表的总记录数
SELECT COUNT(*) as total_stocks FROM stocks;

COMMIT;