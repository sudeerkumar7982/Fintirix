import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { createPriceChart, updatePriceChart } from '../chart';

const fmt = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

export default function AnalysisView({ ticker, stocks, portfolio, watchlist, onToggleWatchlist, onLoadPortfolio, marketStatus }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [activeInterval, setActiveInterval] = useState('1Y');
  const [tradeType, setTradeType] = useState('BUY');
  const [shares, setShares] = useState(1);
  const [analysis, setAnalysis] = useState(null);

  const stock = stocks.find(s => s.ticker === ticker) || {};
  const up = (stock.changePercent || 0) >= 0;
  const owned = portfolio?.holdings?.[ticker]?.shares || 0;
  const balance = portfolio?.balance || 0;
  const watched = watchlist.includes(ticker);

  // Load chart data when ticker or interval changes
  useEffect(() => {
    if (!ticker) return;
    api.getStockHistory(ticker, activeInterval).then(history => {
      if (!canvasRef.current) return;
      const isPositive = history.length > 1 ? history[history.length - 1].close >= history[0].close : true;
      if (chartRef.current) {
        updatePriceChart(chartRef.current, history, isPositive);
      } else {
        chartRef.current = createPriceChart('mainPriceChart', history);
      }
    }).catch(console.error);

    api.getStockAnalysis(ticker).then(setAnalysis).catch(() => setAnalysis(null));
  }, [ticker, activeInterval]);

  // Destroy chart on unmount
  useEffect(() => {
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, []);

  const low = stock.low || (stock.price || 0) * 0.98;
  const high = stock.high || (stock.price || 0) * 1.02;
  const low52 = stock.yearLow || (stock.price || 0) * 0.8;
  const high52 = stock.yearHigh || (stock.price || 0) * 1.2;
  const todayPct = high > low ? Math.min(100, Math.max(0, ((stock.price - low) / (high - low)) * 100)) : 50;
  const yearPct = high52 > low52 ? Math.min(100, Math.max(0, ((stock.price - low52) / (high52 - low52)) * 100)) : 50;

  const marketDepthBuy = Array.from({ length: 5 }, (_, i) => ({
    price: ((stock.price || 0) * (1 - 0.002 * (i + 1))).toFixed(2),
    qty: Math.floor(Math.random() * 500 + 100)
  }));
  const marketDepthSell = Array.from({ length: 5 }, (_, i) => ({
    price: ((stock.price || 0) * (1 + 0.002 * (i + 1))).toFixed(2),
    qty: Math.floor(Math.random() * 500 + 100)
  }));

  const handleTrade = async () => {
    if (!shares || shares <= 0) { alert('Enter a valid quantity'); return; }
    if (marketStatus === 'CLOSED') { alert('Market is closed'); return; }
    try {
      await api.executeTrade(ticker, tradeType, parseInt(shares));
      await onLoadPortfolio();
      alert(`✅ ${tradeType} ${shares} shares of ${ticker} executed!`);
    } catch (err) { alert(`❌ ${err.message}`); }
  };

  return (
    <section className="g-view active-view" id="view-analysis">
      <div className="g-analysis-grid">
        <div className="g-analysis-left">
          <div className="g-stock-banner">
            <div className="g-banner-left">
              <h1 className="g-stock-name">{stock.name || ticker}</h1>
            </div>
            <div className="g-banner-right">
              <div className="g-stock-price">₹{(stock.price || 0).toFixed(2)}</div>
              <div className={`g-stock-change ${up ? 'g-bull' : 'g-bear'}`}>
                {up ? '+' : ''}{(stock.change || 0).toFixed(2)} ({up ? '+' : ''}{(stock.changePercent || 0).toFixed(2)}%)
              </div>
            </div>
          </div>

          <div className="g-card g-chart-card">
            <div className="g-chart-header">
              <span className="g-chart-label">Price Trend</span>
              <div className="g-pills" id="chart-interval-selectors">
                {['1D', '1W', '1M', '1Y'].map(interval => (
                  <button key={interval}
                    className={`g-pill ${activeInterval === interval ? 'g-pill-active' : ''}`}
                    onClick={() => setActiveInterval(interval)}>
                    {interval}
                  </button>
                ))}
              </div>
            </div>
            <div className="g-canvas-wrap">
              <canvas id="mainPriceChart" ref={canvasRef}></canvas>
            </div>
          </div>

          <div className="g-card g-perf-card">
            <h3 className="g-card-title">Performance</h3>
            <div className="g-perf-row">
              <span className="g-perf-label">Today's Low</span>
              <span className="g-perf-val">₹{low.toFixed(2)}</span>
              <div className="g-slider-bar"><div className="g-slider-ptr" style={{ left: `${todayPct}%` }}></div></div>
              <span className="g-perf-val">₹{high.toFixed(2)}</span>
              <span className="g-perf-label">Today's High</span>
            </div>
            <div className="g-perf-row">
              <span className="g-perf-label">52W Low</span>
              <span className="g-perf-val">₹{low52.toFixed(2)}</span>
              <div className="g-slider-bar"><div className="g-slider-ptr" style={{ left: `${yearPct}%` }}></div></div>
              <span className="g-perf-val">₹{high52.toFixed(2)}</span>
              <span className="g-perf-label">52W High</span>
            </div>
          </div>

          <div className="g-two-col">
            <div className="g-card g-depth-card">
              <h3 className="g-card-title">Market Depth</h3>
              <div className="g-depth-grid">
                <div>
                  <h4 className="g-depth-head g-bull">Buy Bids</h4>
                  <table className="g-table"><thead><tr><th>Bid Price</th><th className="text-right">Qty</th></tr></thead>
                    <tbody>
                      {marketDepthBuy.map((r, i) => <tr key={i}><td className="g-bull">₹{r.price}</td><td className="text-right">{r.qty}</td></tr>)}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h4 className="g-depth-head g-bear">Sell Offers</h4>
                  <table className="g-table"><thead><tr><th>Ask Price</th><th className="text-right">Qty</th></tr></thead>
                    <tbody>
                      {marketDepthSell.map((r, i) => <tr key={i}><td className="g-bear">₹{r.price}</td><td className="text-right">{r.qty}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="g-card g-metrics-card">
              <h3 className="g-card-title">Key Metrics</h3>
              <div className="g-metrics-grid">
                <div className="g-metric"><span className="g-metric-label">Open</span><span className="g-metric-val">₹{stock.open?.toFixed(2) || '--'}</span></div>
                <div className="g-metric"><span className="g-metric-label">Volume</span><span className="g-metric-val">{(stock.volume || 0).toLocaleString('en-IN')}</span></div>
                <div className="g-metric"><span className="g-metric-label">Mkt Cap</span><span className="g-metric-val">{stock.marketCap ? `₹${(stock.marketCap / 1e12).toFixed(2)}T` : '--'}</span></div>
                <div className="g-metric"><span className="g-metric-label">P/E Ratio</span><span className="g-metric-val">{stock.peRatio?.toFixed(2) || '--'}</span></div>
                <div className="g-metric"><span className="g-metric-label">Div Yield</span><span className="g-metric-val">{stock.dividendYield ? `${stock.dividendYield.toFixed(2)}%` : '--'}</span></div>
              </div>
            </div>
          </div>

          {analysis && (
            <div className="g-card g-signals-card">
              <h3 className="g-card-title">Technical Signals</h3>
              <div className="g-signals-inner">
                <div className="g-rating-circle" style={{ background: analysis.score >= 60 ? '#e8faf5' : analysis.score >= 40 ? '#fff8eb' : '#fef2f2', color: analysis.score >= 60 ? '#00d09c' : analysis.score >= 40 ? '#f59e0b' : '#eb5757' }}>
                  {analysis.score ?? 50}
                </div>
                <div className="g-rating-meta">
                  <div className="g-rating-verdict">{analysis.signal || 'Hold'}</div>
                  <p className="g-rating-desc">{analysis.description || ''}</p>
                </div>
              </div>
              <div className="g-signal-list">
                <div className="g-signal-row"><span>RSI (14)</span><span className="g-signal-badge">{analysis.indicators?.rsi?.toFixed(2) ?? '--'}</span></div>
                <div className="g-signal-row"><span>MACD (12,26)</span><span className="g-signal-badge">{analysis.indicators?.macd?.toFixed(4) ?? '--'}</span></div>
                <div className="g-signal-row"><span>Signal (9)</span><span className="g-signal-badge">{analysis.indicators?.macdSignal?.toFixed(4) ?? '--'}</span></div>
                <div className="g-signal-row"><span>20-Day SMA</span><span className="g-signal-badge">{analysis.indicators?.sma20 ? `₹${analysis.indicators.sma20.toFixed(2)}` : '--'}</span></div>
                <div className="g-signal-row"><span>50-Day SMA</span><span className="g-signal-badge">{analysis.indicators?.sma50 ? `₹${analysis.indicators.sma50.toFixed(2)}` : '--'}</span></div>
              </div>
            </div>
          )}
        </div>

        <div className="g-analysis-right">
          <div className="g-card g-order-card">
            <div className="g-order-tabs">
              <button className={`g-order-tab g-order-buy-tab ${tradeType === 'BUY' ? 'active' : ''}`} onClick={() => setTradeType('BUY')}>BUY</button>
              <button className={`g-order-tab g-order-sell-tab ${tradeType === 'SELL' ? 'active' : ''}`} onClick={() => setTradeType('SELL')}>SELL</button>
            </div>
            <div className="g-order-type-row">
              <span className="g-order-type-active">Delivery</span>
              <span className="g-order-type-inactive">Intraday</span>
            </div>
            <div className="g-order-body">
              <div className="g-order-row">
                <label>Qty <span className="g-order-sub">(NSE)</span></label>
                <input type="number" value={shares} min="1" className="g-qty-input" onChange={e => setShares(e.target.value)} />
              </div>
              <div className="g-order-row">
                <label>Price <span className="g-order-sub">(Market)</span></label>
                <input type="text" value="Market" readOnly disabled className="g-qty-input g-qty-disabled" />
              </div>
              <div className="g-order-calcs">
                <div className="g-calc-row">
                  <span>Shares Owned</span><span>{owned}</span>
                </div>
                <div className="g-calc-row">
                  <span>Estimated Cost</span><span className="g-calc-total">{fmt((stock.price || 0) * (parseInt(shares) || 0))}</span>
                </div>
              </div>
              <div className="g-balance-ref">Balance: <strong>{fmt(balance)}</strong></div>
              <button
                className={`g-execute-btn ${tradeType === 'BUY' ? 'g-buy-btn' : 'g-sell-btn'}`}
                onClick={handleTrade}
                disabled={marketStatus === 'CLOSED'}>
                {marketStatus === 'CLOSED' ? 'MARKET CLOSED' : tradeType}
              </button>
              <button className="g-watchlist-link" onClick={() => onToggleWatchlist(ticker)}>
                <span>{watched ? '★ Remove from Watchlist' : '☆ Add to Watchlist'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
