// /_scripts/batch-translate.js (功能：将 CSV 转换为最终的 SQL 脚本)
import fs from 'fs/promises';
import neatCsv from 'neat-csv';

async function main() {
    console.log("Starting CSV to SQL conversion process...");

    try {
        // 1. 读取我们手动创建的 CSV 文件
        const csvData = await fs.readFile('./_scripts/sp500_list.csv', 'utf-8');
        const companies = await neatCsv(csvData);
        console.log(`Read ${companies.length} companies from CSV.`);

        // 2. 生成 SQL 插入语句
        // 先清空所有相关旧表，确保数据一致性
        let sqlOutput = `
            TRUNCATE TABLE stock_tags RESTART IDENTITY;
            TRUNCATE TABLE tags RESTART IDENTITY CASCADE;
            TRUNCATE TABLE stocks RESTART IDENTITY CASCADE;
        \n\n`;
        
        sqlOutput += 'INSERT INTO stocks (ticker, name_zh, sector_zh) VALUES\n';
        
        const stockValues = companies.map(company => {
            // 处理 SQL 中的特殊字符，比如单引号
            const ticker = company.ticker.replace(/'/g, "''");
            const name_zh = company.name_zh.replace(/'/g, "''");
            const sector_zh = company.sector_zh.replace(/'/g, "''");
            return `('${ticker}', '${name_zh}', '${sector_zh}')`;
        });
        
        sqlOutput += stockValues.join(',\n') + ';\n\n';

        // 3. 自动生成静态标签的 SQL
        const sectors = [...new Set(companies.map(c => c.sector_zh))];
        sqlOutput += `
            INSERT INTO tags (name, type, description) VALUES
            ('标普500', '特殊名单类', '标普500指数成分股')
        `;
        const tagValues = sectors.map(sector => `, ('${sector.replace(/'/g, "''")}', '行业分类', '行业分类标签')`);
        sqlOutput += tagValues.join('\n') + ';\n\n';

        // 4. 自动生成关联表的 SQL (使用 PostgreSQL 的 DO 块)
        sqlOutput += `
            DO $$
            DECLARE
                sp500_tag_id int;
                sector_tag_id int;
                company record;
            BEGIN
                SELECT id INTO sp500_tag_id FROM tags WHERE name = '标普500';
                FOR company IN SELECT ticker, sector_zh FROM stocks LOOP
                    -- 为所有股票关联“标普500”标签
                    INSERT INTO stock_tags (stock_ticker, tag_id) VALUES (company.ticker, sp500_tag_id) ON CONFLICT DO NOTHING;
                    
                    -- 为股票关联其行业标签
                    SELECT id INTO sector_tag_id FROM tags WHERE name = company.sector_zh;
                    IF sector_tag_id IS NOT NULL THEN
                        INSERT INTO stock_tags (stock_ticker, tag_id) VALUES (company.ticker, sector_tag_id) ON CONFLICT DO NOTHING;
                    END IF;
                END LOOP;
            END $$;
        `;

        // 5. 将所有 SQL 语句写入文件
        await fs.writeFile('./_scripts/insert_sp500_final.sql', sqlOutput);
        console.log("✅ SUCCESS! SQL file 'insert_sp500_final.sql' has been generated in the '_scripts' folder.");
        console.log("Next step: Copy the content of this SQL file and run it in your Neon SQL Editor.");

    } catch (error) {
        console.error("❌ An error occurred:", error);
        console.error("Please make sure 'sp500_list.csv' exists in the '_scripts' folder and is formatted correctly.");
    }
}

// 确保你的 package.json 中有 "type": "module"
main();