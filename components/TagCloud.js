import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './TagCloud.module.css';

/**
 * 标签云组件
 * 功能：展示股票的所有标签，支持点击跳转到标签详情页
 * 使用场景：个股详情页、搜索结果页等
 */
const TagCloud = ({ 
  stockId, 
  ticker, 
  tags = [], 
  maxTags = 20, 
  showCategory = true,
  size = 'medium',
  className = '' 
}) => {
  const [loading, setLoading] = useState(!tags.length);
  const [stockTags, setStockTags] = useState(tags);
  const [error, setError] = useState(null);

  // 如果没有传入tags，则从API获取
  useEffect(() => {
    if (!tags.length && (stockId || ticker)) {
      fetchStockTags();
    }
  }, [stockId, ticker]);

  /**
   * 从API获取股票标签
   */
  const fetchStockTags = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const identifier = stockId ? `id=${stockId}` : `ticker=${ticker}`;
      const response = await fetch(`/api/stocks/tags?${identifier}`);
      
      if (!response.ok) {
        throw new Error(`获取标签失败: ${response.status}`);
      }
      
      const data = await response.json();
      setStockTags(data.tags || []);
      
    } catch (err) {
      console.error('获取股票标签失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 按类别分组标签
   */
  const groupTagsByCategory = (tags) => {
    const grouped = {};
    tags.forEach(tag => {
      const category = tag.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(tag);
    });
    return grouped;
  };

  /**
   * 获取标签的CSS类名
   */
  const getTagClassName = (tag) => {
    const baseClass = styles.tag;
    const categoryClass = styles[`tag-${tag.category}`] || styles['tag-other'];
    const typeClass = styles[`tag-${tag.type}`] || '';
    const sizeClass = styles[`tag-${size}`];
    
    return `${baseClass} ${categoryClass} ${typeClass} ${sizeClass}`.trim();
  };

  /**
   * 获取标签的样式（包括自定义颜色）
   */
  const getTagStyle = (tag) => {
    const style = {};
    
    if (tag.color) {
      style.backgroundColor = tag.color;
      style.borderColor = tag.color;
      
      // 根据背景色自动调整文字颜色
      const brightness = getBrightness(tag.color);
      style.color = brightness > 128 ? '#000' : '#fff';
    }
    
    // 根据相关度调整透明度
    if (tag.relevance_score) {
      style.opacity = Math.max(0.6, tag.relevance_score);
    }
    
    return style;
  };

  /**
   * 计算颜色亮度
   */
  const getBrightness = (color) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
  };

  /**
   * 渲染加载状态
   */
  if (loading) {
    return (
      <div className={`${styles.tagCloud} ${className}`}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <span>加载标签中...</span>
        </div>
      </div>
    );
  }

  /**
   * 渲染错误状态
   */
  if (error) {
    return (
      <div className={`${styles.tagCloud} ${className}`}>
        <div className={styles.error}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>标签加载失败: {error}</span>
          <button 
            className={styles.retryButton}
            onClick={fetchStockTags}
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  /**
   * 渲染空状态
   */
  if (!stockTags.length) {
    return (
      <div className={`${styles.tagCloud} ${className}`}>
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🏷️</span>
          <span>暂无标签</span>
        </div>
      </div>
    );
  }

  // 限制显示的标签数量
  const displayTags = stockTags.slice(0, maxTags);
  const hiddenCount = stockTags.length - displayTags.length;

  /**
   * 渲染标签组（按类别分组）
   */
  const renderTagsByCategory = () => {
    const groupedTags = groupTagsByCategory(displayTags);
    const categoryOrder = ['static', 'dynamic', 'custom', 'other'];
    const categoryNames = {
      static: '基础信息',
      dynamic: '市场表现',
      custom: '自定义',
      other: '其他'
    };

    return categoryOrder.map(category => {
      const categoryTags = groupedTags[category];
      if (!categoryTags || !categoryTags.length) return null;

      return (
        <div key={category} className={styles.tagCategory}>
          <h4 className={styles.categoryTitle}>
            {categoryNames[category] || category}
          </h4>
          <div className={styles.categoryTags}>
            {categoryTags.map(tag => renderTag(tag))}
          </div>
        </div>
      );
    });
  };

  /**
   * 渲染单个标签
   */
  const renderTag = (tag) => {
    const tagContent = (
      <span 
        className={getTagClassName(tag)}
        style={getTagStyle(tag)}
        title={tag.description || tag.name}
      >
        {tag.name}
        {tag.calculated_value && (
          <span className={styles.tagValue}>
            {formatTagValue(tag.calculated_value, tag.type)}
          </span>
        )}
      </span>
    );

    // 如果标签可点击，包装为Link
    if (tag.is_clickable !== false) {
      return (
        <Link 
          key={tag.id || tag.name} 
          href={`/tags/${encodeURIComponent(tag.name)}`}
          className={styles.tagLink}
        >
          {tagContent}
        </Link>
      );
    }

    return (
      <span key={tag.id || tag.name}>
        {tagContent}
      </span>
    );
  };

  /**
   * 格式化标签值
   */
  const formatTagValue = (value, type) => {
    if (value === null || value === undefined) return '';
    
    switch (type) {
      case 'percentage':
        return ` (${(value * 100).toFixed(1)}%)`;
      case 'currency':
        return ` ($${(value / 1000000).toFixed(1)}M)`;
      case 'ratio':
        return ` (${value.toFixed(2)})`;
      default:
        return ` (${value})`;
    }
  };

  return (
    <div className={`${styles.tagCloud} ${styles[`size-${size}`]} ${className}`}>
      {showCategory ? (
        renderTagsByCategory()
      ) : (
        <div className={styles.allTags}>
          {displayTags.map(tag => renderTag(tag))}
        </div>
      )}
      
      {hiddenCount > 0 && (
        <div className={styles.moreIndicator}>
          <span className={styles.moreText}>
            +{hiddenCount} 个标签
          </span>
        </div>
      )}
    </div>
  );
};

export default TagCloud;

// 导出一些有用的工具函数
export {
  TagCloud
};

// 预设的标签配置
export const TAG_PRESETS = {
  // 个股详情页
  stockDetail: {
    maxTags: 15,
    showCategory: true,
    size: 'medium'
  },
  
  // 搜索结果
  searchResult: {
    maxTags: 8,
    showCategory: false,
    size: 'small'
  },
  
  // 热力图悬浮
  heatmapTooltip: {
    maxTags: 5,
    showCategory: false,
    size: 'small'
  }
};