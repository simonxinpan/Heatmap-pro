
-- S&P 500股票数据插入脚本
-- 清空现有数据并重新插入

TRUNCATE TABLE stock_tags RESTART IDENTITY;
TRUNCATE TABLE tags RESTART IDENTITY CASCADE;
TRUNCATE TABLE stocks RESTART IDENTITY CASCADE;

INSERT INTO stocks (ticker, name_zh, sector_zh) VALUES
('A', '安捷伦科技', '医疗保健'),
('AAL', '美国航空', '工业'),
('AAPL', '苹果公司', '信息技术'),
('ABBV', '艾伯维', '医疗保健'),
('ABNB', '爱彼迎', '非必需消费品'),
('ABT', '雅培', '医疗保健'),
('ACGL', 'Arch Capital Group', '金融'),
('ACN', '埃森哲', '信息技术'),
('ADBE', '奥多比', '信息技术'),
('ADI', '亚德诺半导体', '半导体'),
('ADM', '阿彻丹尼尔斯米德兰', '日常消费品'),
('ADP', '自动数据处理公司', '信息技术'),
('ADSK', '欧特克', '信息技术'),
('AEE', 'Ameren', '公用事业'),
('AEP', '美国电力', '公用事业'),
('AES', '爱依斯电力', '公用事业'),
('AFL', '美国家庭人寿保险', '金融'),
('AIG', '美国国际集团', '金融'),
('AIZ', 'Assurant', '金融'),
('AJG', '亚瑟加拉格尔', '金融'),
('AKAM', '阿卡迈科技', '信息技术'),
('ALB', '雅宝', '原材料'),
('ALGN', '隐适美科技', '医疗保健'),
('ALK', '阿拉斯加航空', '工业'),
('ALL', '好事达', '金融'),
('ALLE', 'Allegion', '工业'),
('AMAT', '应用材料', '半导体'),
('AMCR', 'Amcor', '原材料'),
('AMD', '超威半导体', '半导体'),
('AME', '阿美德克', '工业'),
('AMGN', '安进', '医疗保健'),
('AMP', '美盛安斯泰来', '金融'),
('AMT', '美国电塔', '房地产'),
('AMZN', '亚马逊', '非必需消费品'),
('ANET', '阿里斯塔网络', '信息技术'),
('ANSS', '安世', '信息技术'),
('AON', '怡安', '金融'),
('AOS', 'A.O.史密斯', '工业'),
('APA', '阿帕奇', '能源'),
('APD', '空气化工产品', '原材料'),
('APH', '安费诺', '信息技术'),
('APTV', '安波福', '非必需消费品'),
('ARE', '亚历山大房地产', '房地产');

-- 插入标签数据
INSERT INTO tags (name, description, color) VALUES
('大盘股', '市值超过100亿美元的股票', '#FF6B6B'),
('科技股', '科技行业相关股票', '#4ECDC4'),
('医疗股', '医疗保健行业股票', '#45B7D1'),
('金融股', '金融服务行业股票', '#96CEB4'),
('消费股', '消费品行业股票', '#FFEAA7'),
('工业股', '工业制造业股票', '#DDA0DD'),
('能源股', '能源行业股票', '#98D8C8'),
('公用事业', '公用事业行业股票', '#F7DC6F'),
('房地产', '房地产投资信托', '#BB8FCE'),
('原材料', '原材料行业股票', '#85C1E9');

-- 为股票分配标签
INSERT INTO stock_tags (stock_id, tag_id) 
SELECT s.id, t.id 
FROM stocks s, tags t 
WHERE 
    (s.sector_zh = '信息技术' AND t.name = '科技股') OR
    (s.sector_zh = '医疗保健' AND t.name = '医疗股') OR
    (s.sector_zh = '金融' AND t.name = '金融股') OR
    (s.sector_zh IN ('日常消费品', '非必需消费品') AND t.name = '消费股') OR
    (s.sector_zh = '工业' AND t.name = '工业股') OR
    (s.sector_zh = '能源' AND t.name = '能源股') OR
    (s.sector_zh = '公用事业' AND t.name = '公用事业') OR
    (s.sector_zh = '房地产' AND t.name = '房地产') OR
    (s.sector_zh = '原材料' AND t.name = '原材料');

-- 为所有股票添加大盘股标签（假设都是大盘股）
INSERT INTO stock_tags (stock_id, tag_id)
SELECT s.id, t.id
FROM stocks s, tags t
WHERE t.name = '大盘股';

COMMIT;
        
