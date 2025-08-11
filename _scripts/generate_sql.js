import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取CSV文件
const csvPath = path.join(__dirname, 'sp500_list.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

// 解析CSV
const lines = csvContent.trim().split('\n');
const header = lines[0];
const dataLines = lines.slice(1);

console.log(`发现 ${dataLines.length} 条股票记录`);

// 生成SQL插入语句
let sqlInserts = [];

dataLines.forEach(line => {
    const [ticker, name_zh, sector_zh, asset_type] = line.split(',');
    if (ticker && name_zh && sector_zh) {
        // 转义单引号
        const escapedName = name_zh.replace(/'/g, "''");
        const escapedSector = sector_zh.replace(/'/g, "''");
        sqlInserts.push(`('${ticker}', '${escapedName}', '${escapedSector}')`);
    }
});

// 生成完整的SQL文件内容
const sqlContent = `-- SP500股票数据插入脚本
-- 自动生成于 ${new Date().toISOString()}

-- 清空现有数据
TRUNCATE TABLE stock_tags RESTART IDENTITY;
TRUNCATE TABLE tags RESTART IDENTITY CASCADE;
TRUNCATE TABLE stocks RESTART IDENTITY CASCADE;

-- 插入所有SP500股票数据
INSERT INTO stocks (ticker, name_zh, sector_zh) VALUES
${sqlInserts.join(',\n')};

-- 插入标签数据
INSERT INTO tags (name, color) VALUES
('大盘股', '#FF6B6B'),
('科技股', '#4ECDC4'),
('金融股', '#45B7D1'),
('医疗股', '#96CEB4'),
('消费股', '#FFEAA7'),
('工业股', '#DDA0DD'),
('能源股', '#98D8C8'),
('公用事业', '#F7DC6F'),
('房地产', '#BB8FCE'),
('原材料', '#85C1E9'),
('通讯服务', '#F8C471'),
('半导体', '#82E0AA');

-- 为股票分配标签（基于行业分类）
INSERT INTO stock_tags (stock_id, tag_id)
SELECT s.id, t.id
FROM stocks s
JOIN tags t ON (
    (s.sector_zh = '信息技术' AND t.name = '科技股') OR
    (s.sector_zh = '金融' AND t.name = '金融股') OR
    (s.sector_zh = '医疗保健' AND t.name = '医疗股') OR
    (s.sector_zh IN ('日常消费品', '非必需消费品') AND t.name = '消费股') OR
    (s.sector_zh = '工业' AND t.name = '工业股') OR
    (s.sector_zh = '能源' AND t.name = '能源股') OR
    (s.sector_zh = '公用事业' AND t.name = '公用事业') OR
    (s.sector_zh = '房地产' AND t.name = '房地产') OR
    (s.sector_zh = '原材料' AND t.name = '原材料') OR
    (s.sector_zh = '通讯服务' AND t.name = '通讯服务') OR
    (s.sector_zh = '媒体娱乐' AND t.name = '通讯服务') OR
    (s.sector_zh = '半导体' AND t.name = '半导体')
);

-- 为所有股票添加大盘股标签
INSERT INTO stock_tags (stock_id, tag_id)
SELECT s.id, t.id
FROM stocks s
CROSS JOIN tags t
WHERE t.name = '大盘股'
AND NOT EXISTS (
    SELECT 1 FROM stock_tags st 
    WHERE st.stock_id = s.id AND st.tag_id = t.id
);
`;

// 写入新的SQL文件
const outputPath = path.join(__dirname, 'insert_sp500_final.sql');
fs.writeFileSync(outputPath, sqlContent, 'utf8');

console.log(`已生成包含 ${sqlInserts.length} 条股票记录的SQL文件: ${outputPath}`);
console.log('SQL文件已更新完成！');