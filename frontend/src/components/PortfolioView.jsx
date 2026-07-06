import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { createPortfolioChart, updatePortfolioChart } from '../chart';

const fmt = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const fmt2 = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

export default function PortfolioView({ portfolio, stocks, onLoadPortfolio, onOpenAnalysis }) {
  const chartRef = useRef(null);
  const canvasRef = useRef(null);

  const holdings = portfolio?.holdings || {};
  const mfHoldings = portfolio?.mfHoldings || {};
  const transactions = portfolio?.transactions || [];

  let invested = 0;
  for (const h of Object.values(holdings)) invested += h.shares * h.avgPrice;
  const returns = (portfolio?.holdingsValue || 0) - invested;
  const pct = invested > 0 ? ((returns / invested) * 100).toFixed(2) : '0.00';
  const retClass = returns >= 0 ? 'g-bull' : 'g-bear';

  // Build portfolio chart
  useEffect(() => {
    const entries = Object.entries(holdings);
    if (!entries.length) return;
    const labels = entries.map(([t]) => t);
    const data = entries.map(([, h]) => h.totalValue || h.shares * h.avgPrice);
    setTimeout(() => {
      if (!canvasRef.current) return;
      if (chartRef.current) {
        updatePortfolioChart(chartRef.current, labels, data);
      } else {
        chartRef.current = createPortfolioChart('portfolioChart', labels, data);
      }
    }, 100);
  }, [portfolio]);

  useEffect(() => {
    onLoadPortfolio();
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, []);

  return (
    <section className="g-view active-view" id="view-portfolio">
      <div className="g-portfolio-wrap">
        <div className="g-card g-summary-banner">
          <div className="g-summary-tile"><span className="g-tile-label">Invested</span><span className="g-tile-val">{fmt(invested)}</span></div>
          <div className="g-summary-tile"><span className="g-tile-label">Current Value</span><span className="g-tile-val">{fmt(portfolio?.holdingsValue || 0)}</span></div>
          <div className="g-summary-tile"><span className="g-tile-label">Total Returns</span><span className={`g-tile-val ${retClass}`}>{fmt2(returns)} ({pct}%)</span></div>
          <div className="g-summary-tile"><span className="g-tile-label">Available Cash</span><span className="g-tile-val">{fmt(portfolio?.balance || 0)}</span></div>
        </div>

        <div className="g-portfolio-split">
          <div className="g-portfolio-left">
            <h2 className="g-section-title">Stock Holdings</h2>
            <div className="g-card">
              <table className="g-table g-holdings-table">
                <thead><tr>
                  <th>Company</th><th className="text-right">Shares</th>
                  <th className="text-right">Avg Price</th><th className="text-right">LTP</th>
                  <th className="text-right">Current Value</th><th className="text-right">Returns</th><th></th>
                </tr></thead>
                <tbody>
                  {Object.entries(holdings).length === 0 ? (
                    <tr><td colSpan="7" className="g-empty">No stock holdings.</td></tr>
                  ) : Object.entries(holdings).map(([ticker, h]) => {
                    const up = (h.profitLoss || 0) >= 0;
                    return (
                      <tr key={ticker}>
                        <td><strong>{ticker}</strong></td>
                        <td className="text-right">{h.shares}</td>
                        <td className="text-right">₹{h.avgPrice.toFixed(2)}</td>
                        <td className="text-right">₹{h.currentPrice?.toFixed(2) || '--'}</td>
                        <td className="text-right">₹{h.totalValue?.toFixed(2) || '--'}</td>
                        <td className={`text-right ${up ? 'g-bull' : 'g-bear'}`}>₹{h.profitLoss?.toFixed(2) || '--'} ({h.profitLossPercent?.toFixed(2) || 0}%)</td>
                        <td><button onClick={() => onOpenAnalysis(ticker)} style={{ background: 'var(--green)', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Trade</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h2 className="g-section-title" style={{ marginTop: '32px' }}>Mutual Fund Holdings</h2>
            <div className="g-card">
              <table className="g-table g-holdings-table">
                <thead><tr>
                  <th>Fund</th><th className="text-right">Units</th>
                  <th className="text-right">Avg NAV</th><th className="text-right">Current NAV</th>
                  <th className="text-right">Current Value</th><th className="text-right">Returns</th><th></th>
                </tr></thead>
                <tbody>
                  {Object.entries(mfHoldings).length === 0 ? (
                    <tr><td colSpan="7" className="g-empty">No mutual fund holdings.</td></tr>
                  ) : Object.entries(mfHoldings).map(([mfId, h]) => {
                    const currentNav = h.currentNav || h.avgNav || 0;
                    const currentValue = h.units * currentNav;
                    const invested = h.units * (h.avgNav || 0);
                    const returns = currentValue - invested;
                    const up = returns >= 0;
                    return (
                      <tr key={mfId}>
                        <td><strong>{mfId}</strong></td>
                        <td className="text-right">{h.units?.toFixed(4)}</td>
                        <td className="text-right">₹{h.avgNav?.toFixed(2)}</td>
                        <td className="text-right">₹{currentNav.toFixed(2)}</td>
                        <td className="text-right">₹{currentValue.toFixed(2)}</td>
                        <td className={`text-right ${up ? 'g-bull' : 'g-bear'}`}>₹{returns.toFixed(2)}</td>
                        <td><button style={{ background: 'var(--green)', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Trade</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="g-card g-txn-card" style={{ marginTop: '24px' }}>
              <h3 className="g-card-title">Transaction History</h3>
              <table className="g-table">
                <thead><tr>
                  <th>Tx ID</th><th>Date</th><th>Type</th>
                  <th>Ticker</th><th className="text-right">Qty</th>
                  <th className="text-right">Price</th><th className="text-right">Net</th>
                </tr></thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan="7" className="g-empty">No transactions</td></tr>
                  ) : transactions.map(t => {
                    const buy = t.type === 'BUY';
                    return (
                      <tr key={t.id}>
                        <td style={{ fontSize: '11px', color: '#8c8fa6' }}>{t.id?.slice(0, 10)}...</td>
                        <td>{new Date(t.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                        <td><span className={`g-txn-type ${buy ? 'g-txn-buy' : 'g-txn-sell'}`}>{t.type}</span></td>
                        <td><strong>{t.ticker}</strong></td>
                        <td className="text-right">{t.shares}</td>
                        <td className="text-right">₹{t.price?.toFixed(2)}</td>
                        <td className={`text-right ${buy ? 'g-bear' : 'g-bull'}`}>{buy ? '-' : '+'}₹{(t.price * t.shares).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="g-portfolio-right">
            <div className="g-card">
              <h3 className="g-card-title">Asset Allocation</h3>
              <div className="g-donut-wrap">
                <canvas id="portfolioChart" ref={canvasRef}></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
