import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import TagCloud from '../../components/TagCloud';
import styles from '../../styles/TagDetail.module.css';

/**
 * 标签详情页
 * 功能：展示拥有特定标签的所有股票，支持列表和热力图两种视图
 * 路由：/tags/[tagName]
 */
const TagDetailPage = ({ initialData, tagName }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);
  const [tagData, setTagData] = useState(initialData || null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'heatmap'
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance' | 'market_cap' | 'change_percent'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  // 如果没有初始数据，客户端获取
  useEffect(() => {
    if (!initialData && tagName) {
      fetchTagData();
    }
  }, [tagName]);

  /**
   * 获取标签数据
   */
  const fetchTagData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        sort_by: sortBy,
        sort_order: sortOrder,
        page: page.toString(),
        page_size: pageSize.toString()
      });
      
      const response = await fetch(`/api/tags/${encodeURIComponent(tagName)}?${params}`);
      
      if (!response.ok) {
        throw new Error(`获取标签数据失败: ${response.status}`);
      }
      
      const data = await response.json();
      setTagData(data);
      
    } catch (err) {
      console.error('获取标签数据失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 当排序或分页改变时重新获取数据
  useEffect(() => {
    if (tagName && (sortBy || sortOrder || page)) {
      fetchTagData();
    }
  }, [sortBy, sortOrder, page]);

  /**
   * 处理排序改变
   */
  const handleSortChange = (newSortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
    setPage(1); // 重置到第一页
  };

  /**
   * 处理视图模式切换
   */
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  /**
   * 格式化数值显示
   */
  const formatValue = (value, type) => {
    if (value === null || value === undefined) return '-';
    
    switch (type) {
      case 'currency':
        return `$${(value / 1000000000).toFixed(2)}B`;
      case 'percentage':
        return `${(value * 100).toFixed(2)}%`;
      case 'ratio':
        return value.toFixed(2);
      default:
        return value.toString();
    }
  };

  /**
   * 渲染股票列表项
   */
  const renderStockItem = (stock) => {
    const changeClass = stock.change_percent > 0 ? styles.positive : 
                       stock.change_percent < 0 ? styles.negative : styles.neutral;
    
    return (
      <div key={stock.id} className={styles.stockItem}>
        <div className={styles.stockMain}>
          <div className={styles.stockInfo}>
            <Link href={`/stocks/${stock.ticker}`} className={styles.stockLink}>
              <h3 className={styles.stockTicker}>{stock.ticker}</h3>
              <p className={styles.stockName}>{stock.name_zh || stock.name}</p>
            </Link>
          </div>
          
          <div className={styles.stockMetrics}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>当前价格</span>
              <span className={styles.metricValue}>
                ${stock.current_price?.toFixed(2) || '-'}
              </span>
            </div>
            
            <div className={styles.metric}>
              <span className={styles.metricLabel}>涨跌幅</span>
              <span className={`${styles.metricValue} ${changeClass}`}>
                {stock.change_percent ? `${(stock.change_percent * 100).toFixed(2)}%` : '-'}
              </span>
            </div>
            
            <div className={styles.metric}>
              <span className={styles.metricLabel}>市值</span>
              <span className={styles.metricValue}>
                {formatValue(stock.market_cap, 'currency')}
              </span>
            </div>
            
            <div className={styles.metric}>
              <span className={styles.metricLabel}>相关度</span>
              <span className={styles.metricValue}>
                {(stock.relevance_score * 100).toFixed(0)}%
              </span>
            </div>
            
            {stock.calculated_value && (
              <div className={styles.metric}>
                <span className={styles.metricLabel}>标签值</span>
                <span className={styles.metricValue}>
                  {formatValue(stock.calculated_value, tagData?.tag?.value_type)}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.stockTags}>
          <TagCloud 
            stockId={stock.id}
            tags={stock.other_tags || []}
            maxTags={5}
            showCategory={false}
            size="small"
          />
        </div>
      </div>
    );
  };

  /**
   * 渲染热力图视图
   */
  const renderHeatmapView = () => {
    if (!tagData?.stocks?.length) return null;
    
    return (
      <div className={styles.heatmapContainer}>
        <div className={styles.heatmapGrid}>
          {tagData.stocks.map(stock => {
            const changePercent = stock.change_percent || 0;
            const intensity = Math.min(Math.abs(changePercent * 100), 10) / 10;
            const colorClass = changePercent > 0 ? 'gain' : changePercent < 0 ? 'loss' : 'neutral';
            
            return (
              <Link 
                key={stock.id}
                href={`/stocks/${stock.ticker}`}
                className={`${styles.heatmapItem} ${styles[colorClass]}`}
                style={{
                  opacity: 0.6 + (intensity * 0.4),
                  fontSize: `${Math.max(10, Math.min(16, Math.log(stock.market_cap || 1000000000) * 2))}px`
                }}
                title={`${stock.ticker} - ${stock.name_zh || stock.name}\n价格: $${stock.current_price?.toFixed(2) || '-'}\n涨跌: ${(changePercent * 100).toFixed(2)}%`}
              >
                <div className={styles.heatmapTicker}>{stock.ticker}</div>
                <div className={styles.heatmapChange}>
                  {(changePercent * 100).toFixed(1)}%
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  /**
   * 渲染分页控件
   */
  const renderPagination = () => {
    if (!tagData?.pagination) return null;
    
    const { current_page, total_pages, has_next, has_prev } = tagData.pagination;
    
    return (
      <div className={styles.pagination}>
        <button 
          className={styles.pageButton}
          disabled={!has_prev}
          onClick={() => setPage(current_page - 1)}
        >
          上一页
        </button>
        
        <span className={styles.pageInfo}>
          第 {current_page} 页，共 {total_pages} 页
        </span>
        
        <button 
          className={styles.pageButton}
          disabled={!has_next}
          onClick={() => setPage(current_page + 1)}
        >
          下一页
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>加载标签数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h1>加载失败</h1>
          <p>{error}</p>
          <button onClick={fetchTagData} className={styles.retryButton}>
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!tagData) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <h1>标签不存在</h1>
          <p>未找到标签 "{tagName}"</p>
          <Link href="/" className={styles.backLink}>
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const { tag, stocks, statistics } = tagData;

  return (
    <>
      <Head>
        <title>{tag.name} - 股票标签 | 美股热力图</title>
        <meta name="description" content={`查看所有拥有"${tag.name}"标签的股票，包含${stocks?.length || 0}只股票的详细信息和实时数据。`} />
        <meta name="keywords" content={`${tag.name}, 股票标签, 美股筛选, 投资策略`} />
      </Head>
      
      <div className={styles.container}>
        {/* 标签信息头部 */}
        <div className={styles.header}>
          <div className={styles.tagInfo}>
            <h1 className={styles.tagTitle}>{tag.name}</h1>
            {tag.description && (
              <p className={styles.tagDescription}>{tag.description}</p>
            )}
            
            <div className={styles.tagMeta}>
              <span className={`${styles.tagCategory} ${styles[tag.category]}`}>
                {tag.category === 'static' ? '基础信息' : 
                 tag.category === 'dynamic' ? '市场表现' : '其他'}
              </span>
              
              {tag.calculation_rule && (
                <span className={styles.tagRule} title={tag.calculation_rule}>
                  📊 计算规则
                </span>
              )}
              
              {tag.last_updated && (
                <span className={styles.lastUpdated}>
                  更新时间: {new Date(tag.last_updated).toLocaleString('zh-CN')}
                </span>
              )}
            </div>
          </div>
          
          {/* 统计信息 */}
          {statistics && (
            <div className={styles.statistics}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{statistics.total_stocks}</span>
                <span className={styles.statLabel}>股票数量</span>
              </div>
              
              {statistics.avg_market_cap && (
                <div className={styles.statItem}>
                  <span className={styles.statValue}>
                    {formatValue(statistics.avg_market_cap, 'currency')}
                  </span>
                  <span className={styles.statLabel}>平均市值</span>
                </div>
              )}
              
              {statistics.avg_change_percent !== undefined && (
                <div className={styles.statItem}>
                  <span className={`${styles.statValue} ${
                    statistics.avg_change_percent > 0 ? styles.positive : 
                    statistics.avg_change_percent < 0 ? styles.negative : styles.neutral
                  }`}>
                    {(statistics.avg_change_percent * 100).toFixed(2)}%
                  </span>
                  <span className={styles.statLabel}>平均涨跌幅</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 控制栏 */}
        <div className={styles.controls}>
          <div className={styles.viewModeToggle}>
            <button 
              className={`${styles.toggleButton} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => handleViewModeChange('list')}
            >
              📋 列表视图
            </button>
            <button 
              className={`${styles.toggleButton} ${viewMode === 'heatmap' ? styles.active : ''}`}
              onClick={() => handleViewModeChange('heatmap')}
            >
              🔥 热力图
            </button>
          </div>
          
          <div className={styles.sortControls}>
            <label className={styles.sortLabel}>排序:</label>
            <button 
              className={`${styles.sortButton} ${sortBy === 'relevance' ? styles.active : ''}`}
              onClick={() => handleSortChange('relevance')}
            >
              相关度 {sortBy === 'relevance' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button 
              className={`${styles.sortButton} ${sortBy === 'market_cap' ? styles.active : ''}`}
              onClick={() => handleSortChange('market_cap')}
            >
              市值 {sortBy === 'market_cap' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button 
              className={`${styles.sortButton} ${sortBy === 'change_percent' ? styles.active : ''}`}
              onClick={() => handleSortChange('change_percent')}
            >
              涨跌幅 {sortBy === 'change_percent' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </div>
        
        {/* 股票列表/热力图 */}
        <div className={styles.content}>
          {viewMode === 'list' ? (
            <div className={styles.stockList}>
              {stocks?.map(renderStockItem)}
            </div>
          ) : (
            renderHeatmapView()
          )}
          
          {!stocks?.length && (
            <div className={styles.empty}>
              <p>暂无股票数据</p>
            </div>
          )}
        </div>
        
        {/* 分页 */}
        {renderPagination()}
      </div>
    </>
  );
};

/**
 * 服务端渲染获取初始数据
 */
export const getServerSideProps = async ({ params, query }) => {
  const { tagName } = params;
  
  try {
    // 这里应该调用你的API或直接查询数据库
    // 为了演示，返回空的初始数据
    return {
      props: {
        tagName: decodeURIComponent(tagName),
        initialData: null // 在实际应用中，这里应该包含从服务端获取的数据
      }
    };
  } catch (error) {
    console.error('获取标签数据失败:', error);
    return {
      props: {
        tagName: decodeURIComponent(tagName),
        initialData: null
      }
    };
  }
};

export default TagDetailPage;