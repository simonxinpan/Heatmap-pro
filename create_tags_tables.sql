-- 创建标签相关表的SQL脚本
-- 需要在执行 insert_sp500_final.sql 之前运行

-- 创建标签表
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL,  -- 存储颜色代码，如 #FF6B6B
    type VARCHAR(50) DEFAULT '静态',  -- 标签类型：静态/动态
    category VARCHAR(100),  -- 标签分类
    description TEXT,  -- 标签描述
    criteria TEXT,  -- 动态标签的筛选条件
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建股票标签关联表
CREATE TABLE IF NOT EXISTS stock_tags (
    id SERIAL PRIMARY KEY,
    stock_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(stock_id, tag_id)  -- 防止重复关联
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_stock_tags_stock_id ON stock_tags(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_tags_tag_id ON stock_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(type);

-- 验证表创建
SELECT 'tags表创建成功' as status, count(*) as row_count FROM tags;
SELECT 'stock_tags表创建成功' as status, count(*) as row_count FROM stock_tags;