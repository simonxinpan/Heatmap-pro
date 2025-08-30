// 热力图组件配置文件

// 默认配置选项
const DEFAULT_CONFIG = {
    // 基础配置
    width: 800,
    height: 600,
    padding: 20,
    
    // 显示选项
    showLabels: true,
    showTooltip: true,
    interactive: true,
    animation: true,
    
    // 颜色配置
    colorScheme: 'default', // 'default', 'blue-red', 'green-red'
    
    // 数据配置
    metric: 'changePercent', // 默认显示指标
    
    // 回调函数
    onStockClick: null,
    onStockHover: null,
    
    // 样式配置
    cellBorderWidth: 1,
    cellBorderColor: '#fff',
    hoverBorderWidth: 2,
    hoverBorderColor: '#333',
    
    // 字体配置
    fontSize: 11,
    fontFamily: 'Arial, sans-serif',
    labelColor: '#333'
};

// 预设配置模板
const PRESET_CONFIGS = {
    // 大型全景热力图
    panoramic: {
        width: 1200,
        height: 800,
        padding: 30,
        showLabels: true,
        fontSize: 12,
        animation: true
    },
    
    // 中等尺寸热力图
    medium: {
        width: 800,
        height: 600,
        padding: 20,
        showLabels: true,
        fontSize: 11,
        animation: true
    },
    
    // 小型嵌入式热力图
    compact: {
        width: 400,
        height: 300,
        padding: 10,
        showLabels: false,
        fontSize: 10,
        animation: false
    },
    
    // 迷你热力图（用于卡片或侧边栏）
    mini: {
        width: 200,
        height: 150,
        padding: 5,
        showLabels: false,
        showTooltip: true,
        fontSize: 8,
        animation: false
    },
    
    // 移动端适配
    mobile: {
        width: 350,
        height: 250,
        padding: 15,
        showLabels: false,
        fontSize: 10,
        interactive: true,
        animation: true
    }
};

// 颜色方案定义
const COLOR_SCHEMES = {
    default: {
        positive: ['#81c784', '#4caf50', '#2e7d32', '#1b5e20'],
        negative: ['#ef5350', '#f44336', '#d32f2f', '#b71c1c'],
        neutral: '#9e9e9e',
        noData: '#e0e0e0'
    },
    
    blueRed: {
        positive: ['#90caf9', '#2196f3', '#1976d2', '#0d47a1'],
        negative: ['#ef5350', '#f44336', '#d32f2f', '#b71c1c'],
        neutral: '#9e9e9e',
        noData: '#e0e0e0'
    },
    
    greenRed: {
        positive: ['#a5d6a7', '#66bb6a', '#43a047', '#2e7d32'],
        negative: ['#ef9a9a', '#ef5350', '#e53935', '#c62828'],
        neutral: '#bdbdbd',
        noData: '#f5f5f5'
    }
};

// 数据字段映射
const FIELD_MAPPINGS = {
    // 股票代码
    symbol: ['symbol', 'ticker', 'code'],
    
    // 股票名称
    name: ['name', 'name_zh', 'companyName', 'company_name'],
    
    // 涨跌幅
    changePercent: ['changePercent', 'change_percent', 'pct_change', 'avgChange'],
    
    // 市值
    marketCap: ['marketCap', 'market_cap', 'totalMarketCap', 'mcap'],
    
    // 成交量
    volume: ['volume', 'totalVolume', 'vol'],
    
    // 价格
    price: ['price', 'currentPrice', 'last_price'],
    
    // 行业
    sector: ['sector', 'sector_zh', 'industry', 'industry_zh']
};

// 工具函数：合并配置
function mergeConfig(baseConfig, userConfig) {
    return {
        ...baseConfig,
        ...userConfig
    };
}

// 工具函数：获取预设配置
function getPresetConfig(presetName) {
    const preset = PRESET_CONFIGS[presetName];
    if (!preset) {
        console.warn(`未找到预设配置: ${presetName}，使用默认配置`);
        return DEFAULT_CONFIG;
    }
    return mergeConfig(DEFAULT_CONFIG, preset);
}

// 工具函数：获取颜色方案
function getColorScheme(schemeName) {
    const scheme = COLOR_SCHEMES[schemeName];
    if (!scheme) {
        console.warn(`未找到颜色方案: ${schemeName}，使用默认方案`);
        return COLOR_SCHEMES.default;
    }
    return scheme;
}

// 工具函数：获取字段值
function getFieldValue(data, fieldType) {
    const possibleFields = FIELD_MAPPINGS[fieldType];
    if (!possibleFields) {
        return data[fieldType];
    }
    
    for (const field of possibleFields) {
        if (data.hasOwnProperty(field) && data[field] !== undefined && data[field] !== null) {
            return data[field];
        }
    }
    
    return null;
}

// 工具函数：验证数据格式
function validateData(data) {
    if (!Array.isArray(data)) {
        throw new Error('数据必须是数组格式');
    }
    
    if (data.length === 0) {
        console.warn('数据数组为空');
        return false;
    }
    
    // 检查必要字段
    const requiredFields = ['symbol', 'changePercent'];
    const missingFields = [];
    
    for (const item of data.slice(0, 3)) { // 检查前3个项目
        for (const field of requiredFields) {
            if (getFieldValue(item, field) === null) {
                if (!missingFields.includes(field)) {
                    missingFields.push(field);
                }
            }
        }
    }
    
    if (missingFields.length > 0) {
        console.warn(`数据中缺少必要字段: ${missingFields.join(', ')}`);
    }
    
    return true;
}

// 导出配置和工具函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEFAULT_CONFIG,
        PRESET_CONFIGS,
        COLOR_SCHEMES,
        FIELD_MAPPINGS,
        mergeConfig,
        getPresetConfig,
        getColorScheme,
        getFieldValue,
        validateData
    };
} else {
    window.HeatmapConfig = {
        DEFAULT_CONFIG,
        PRESET_CONFIGS,
        COLOR_SCHEMES,
        FIELD_MAPPINGS,
        mergeConfig,
        getPresetConfig,
        getColorScheme,
        getFieldValue,
        validateData
    };
}