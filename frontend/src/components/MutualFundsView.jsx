import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { createPriceChart, updatePriceChart, createPortfolioChart, updatePortfolioChart } from '../chart';

const fmt = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function MutualFundsView({ portfolio, onLoadPortfolio }) {
  const [allMFs, setAllMFs] = useState([]);
  const [activeMF, setActiveMF] = useState(null);
  const [tradeType, setTradeType] = useState('BUY');
  const [amount, setAmount] = useState(1000);
  const [view, setView] = useState('explore'); // 'explore' | 'analysis'
  const chartRef = useRef(null);
  const canvasRef = useRef(null);
  const sectorChartRef = useRef(null);
  const sectorCanvasRef = useRef(null);

  useEffect(() => {
    api.getMutualFunds().then(setAllMFs).catch(console.error);
  }, []);

  const loadMFAnalysis = async (mf) => {
    setActiveMF(mf);
    setView('analysis');
    // Load MF chart
    try {
      const details = await api.getMFDetails(mf.id);
      
      // Inject mock data for details and graphs since backend lacks them
      const mockData = {
        expenseRatio: (Math.random() * (1.5 - 0.1) + 0.1).toFixed(2),
        exitLoad: '1% if redeemed < 1Y',
        fundManager: ['Rajeev Thakkar', 'Sanjeev Sharma', 'Shreyash Devalkar', 'Rahul Baijal'][Math.floor(Math.random() * 4)],
        inceptionDate: ['28 May 2013', '29 Oct 1996', '17 Jan 2013', '18 Feb 2011'][Math.floor(Math.random() * 4)],
        sectorAllocation: {
          'Financials': Math.floor(Math.random() * 20) + 15,
          'Technology': Math.floor(Math.random() * 15) + 10,
          'Consumer': Math.floor(Math.random() * 15) + 10,
          'Energy': Math.floor(Math.random() * 10) + 5,
          'Others': Math.floor(Math.random() * 20) + 20
        },
        history: Array.from({ length: 20 }).map((_, i) => ({
          time: `Day ${i + 1}`,
          close: (mf.nav || 100) * (1 + (Math.random() - 0.45) * 0.1)
        }))
      };
      Object.assign(details, mockData);

      setActiveMF(details);
      setTimeout(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) {
          updatePriceChart(chartRef.current, details.history || [], true);
        } else {
          chartRef.current = createPriceChart('mfPriceChart', details.history || []);
        }

        if (sectorCanvasRef.current) {
          const labels = details.sectorAllocation ? Object.keys(details.sectorAllocation) : [];
          const data = details.sectorAllocation ? Object.values(details.sectorAllocation) : [];
          if (sectorChartRef.current) {
            updatePortfolioChart(sectorChartRef.current, labels, data);
          } else {
            sectorChartRef.current = createPortfolioChart('mfSectorChart', labels, data);
          }
        }
      }, 100);
    } catch (e) { console.error(e); }
  };

  const handleMFTrade = async () => {
    if (!amount || amount <= 0) { alert('Enter a valid amount'); return; }
    try {
      await api.executeMFTrade(activeMF.id, tradeType, Number(amount));
      await onLoadPortfolio();
      alert(`✅ ${tradeType} order for ₹${amount} in ${activeMF.name} executed!`);
    } catch (err) { alert(`❌ ${err.message}`); }
  };

  const mfBalance = portfolio?.balance || 0;
  const mfHoldings = portfolio?.mfHoldings || {};
  const totalInvested = Object.values(mfHoldings).reduce((s, h) => s + (h.units * h.avgNav || 0), 0);
  const totalCurrent = Object.values(mfHoldings).reduce((s, h) => s + (h.units * (h.currentNav || h.avgNav) || 0), 0);
  const totalReturn = totalCurrent - totalInvested;
  const totalPct = totalInvested > 0 ? ((totalReturn / totalInvested) * 100).toFixed(2) : '0.00';

  if (view === 'analysis' && activeMF) {
    return (
      <section className="g-view active-view" id="view-mf-analysis">
        <div className="g-analysis-wrap">
          <div className="g-analysis-left">
            <button onClick={() => setView('explore')} style={{ marginBottom: '16px', background: 'none', border: '1px solid #ddd', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}>← Back to Funds</button>
            <div className="g-analysis-banner">
              <h1 className="g-stock-title">{activeMF.name}</h1>
              <div className="g-stock-price-block">
                <div className="g-stock-price">₹{activeMF.nav?.toFixed(2) || '--'}</div>
                <div className="g-stock-change" style={{ color: '#8c8fa6', fontSize: '14px' }}>Current NAV</div>
              </div>
            </div>
            <div className="g-chart-container" style={{ height: '300px', marginBottom: '24px' }}>
              <canvas id="mfPriceChart" ref={canvasRef}></canvas>
            </div>
            <div className="g-card" style={{ marginTop: '8px' }}>
              <h3 className="g-card-title">Fund Information</h3>
              <div className="g-metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div className="g-metric"><span>AUM</span><strong>₹{activeMF.aum ? `${(activeMF.aum / 1000).toFixed(1)}k Cr` : '--'}</strong></div>
                <div className="g-metric"><span>Category</span><strong>{activeMF.category || '--'}</strong></div>
                <div className="g-metric"><span>Risk</span><strong>{activeMF.risk || '--'}</strong></div>
                <div className="g-metric"><span>Min Investment</span><strong>₹{activeMF.minLumpsum || '--'}</strong></div>
                <div className="g-metric" style={{ marginTop: '16px' }}><span>Expense Ratio</span><strong>{activeMF.expenseRatio ? `${activeMF.expenseRatio}%` : '--'}</strong></div>
                <div className="g-metric" style={{ marginTop: '16px' }}><span>Exit Load</span><strong>{activeMF.exitLoad || '--'}</strong></div>
                <div className="g-metric" style={{ marginTop: '16px' }}><span>Fund Manager</span><strong>{activeMF.fundManager || '--'}</strong></div>
                <div className="g-metric" style={{ marginTop: '16px' }}><span>Inception Date</span><strong>{activeMF.inceptionDate || '--'}</strong></div>
              </div>
            </div>

            <div className="g-card" style={{ marginTop: '16px', marginBottom: '16px' }}>
              <h3 className="g-card-title">Sector Allocation</h3>
              <div className="g-chart-container" style={{ height: '250px' }}>
                <canvas id="mfSectorChart" ref={sectorCanvasRef}></canvas>
              </div>
            </div>
          </div>
          <div className="g-analysis-right">
            <div className="g-card g-order-card">
              <div className="g-order-tabs">
                <button className={`g-order-tab g-order-buy-tab ${tradeType === 'BUY' ? 'active' : ''}`} onClick={() => setTradeType('BUY')}>INVEST</button>
                <button className={`g-order-tab g-order-sell-tab ${tradeType === 'SELL' ? 'active' : ''}`} onClick={() => setTradeType('SELL')}>WITHDRAW</button>
              </div>
              <div className="g-order-type-row">
                <span className="g-order-type-active">One-time</span>
                <span className="g-order-type-inactive">SIP (Soon)</span>
              </div>
              <div className="g-order-body">
                <div className="g-order-row">
                  <label>Amount (₹)</label>
                  <input type="number" value={amount} min="100" className="g-qty-input" onChange={e => setAmount(e.target.value)} />
                </div>
                <div className="g-order-calcs">
                  <div className="g-calc-row"><span>Current NAV</span><span>₹{activeMF.nav?.toFixed(2) || '--'}</span></div>
                  <div className="g-calc-row"><span>Estimated Units</span><span className="g-calc-total">{activeMF.nav ? (Number(amount) / activeMF.nav).toFixed(4) : '0'}</span></div>
                </div>
                <div className="g-balance-ref">Balance: <strong>{fmt(mfBalance)}</strong></div>
                <button className="g-execute-btn g-buy-btn" onClick={handleMFTrade}>
                  {tradeType === 'BUY' ? 'INVEST' : 'WITHDRAW'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="g-view active-view" id="view-mf">
      <div className="mf-inner-tabs-bar">
        <div className="mf-inner-tabs">
          <button className="mf-inner-tab active">Explore</button>
          <button className="mf-inner-tab">Dashboard</button>
          <button className="mf-inner-tab">SIPs</button>
          <button className="mf-inner-tab">Watchlist</button>
        </div>
        <button className="mf-cart-btn"><span>🛒</span> Cart</button>
      </div>

      <div className="mf-explore-layout">
        <div className="mf-explore-left">
          <div className="mf-section">
            <div className="mf-section-header"><h2 className="mf-section-title">Popular Funds</h2></div>
            <div className="mf-popular-grid">
              {allMFs.slice(0, 4).map(mf => {
                const isUp = mf.cagr3Y >= 0;
                return (
                  <div key={mf.id} className="mf-popular-card" onClick={() => loadMFAnalysis(mf)} style={{ cursor: 'pointer' }}>
                    <div className="mf-popular-logo">{mf.name.substring(0, 2).toUpperCase()}</div>
                    <div className="mf-popular-name">{mf.name}</div>
                    <div className="mf-popular-footer">
                      <span className={`mf-popular-return ${isUp ? 'mf-bull' : 'mf-bear'}`}>{isUp ? '+' : ''}{mf.cagr3Y}%</span>
                      <span className="mf-popular-period">3Y</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mf-section">
            <h2 className="mf-section-title">Collections</h2>
            <div className="mf-collections-grid">
              {[['High return', '📈', 'mf-chip-gold'], ['Best SIP funds', '💰', 'mf-chip-blue'], ['Gold & Silver', '🪙', 'mf-chip-yellow'], ['Large Cap', '🏛️', 'mf-chip-dark'], ['Mid Cap', '📊', 'mf-chip-purple'], ['Small Cap', '🌱', 'mf-chip-green']].map(([label, icon, cls]) => (
                <div key={label} className="mf-collection-chip">
                  <div className={`mf-chip-icon ${cls}`}>{icon}</div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mf-section">
            <h2 className="mf-section-title">All Mutual Funds</h2>
            <div className="mf-all-funds-table-wrap">
              <table className="g-table g-movers-table">
                <thead><tr>
                  <th>Fund Name</th>
                  <th className="text-right">NAV</th>
                  <th className="text-right">1Y Return</th>
                  <th className="text-right">3Y CAGR</th>
                  <th className="text-right">Risk</th>
                  <th className="text-right">Min SIP</th>
                </tr></thead>
                <tbody>
                  {allMFs.map(mf => (
                    <tr key={mf.id} style={{ cursor: 'pointer' }} onClick={() => loadMFAnalysis(mf)}>
                      <td><strong>{mf.name}</strong><div style={{ fontSize: '11px', color: '#8c8fa6' }}>{mf.category}</div></td>
                      <td className="text-right">₹{mf.nav?.toFixed(2)}</td>
                      <td className={`text-right ${mf.cagr1Y >= 0 ? 'text-bull' : 'text-bear'}`}>{mf.cagr1Y}%</td>
                      <td className={`text-right ${mf.cagr3Y >= 0 ? 'text-bull' : 'text-bear'}`}>{mf.cagr3Y}%</td>
                      <td className="text-right"><span className={`mf-risk-badge mf-risk-${mf.risk?.toLowerCase().replace(' ', '-')}`}>{mf.risk}</span></td>
                      <td className="text-right">₹{mf.minSip}/mo</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mf-explore-right">
          <div className="mf-invest-card">
            <h3 className="mf-invest-title">Your Investments</h3>
            <div className="mf-invest-current-label">Current</div>
            <div className="mf-invest-current-value">{fmt(totalCurrent)}</div>
            <div className="mf-invest-rows">
              <div className="mf-invest-row"><span className="mf-invest-label">Total returns</span><span className={`mf-invest-val ${totalReturn >= 0 ? 'mf-bull' : 'mf-bear'}`}>{totalReturn >= 0 ? '+' : ''}{fmt(totalReturn)} ({totalPct}%)</span></div>
              <div className="mf-invest-row"><span className="mf-invest-label">Invested</span><span className="mf-invest-val">{fmt(totalInvested)}</span></div>
            </div>
          </div>

          <div className="mf-tools-card">
            <h3 className="mf-invest-title">Products and Tools</h3>
            {[['📋', 'NFO Live', '7 open'], ['📥', 'Import funds', ''], ['⚖️', 'Compare funds', ''], ['🧮', 'SIP Calculator', ''], ['🔍', 'MF Screener', '']].map(([icon, label, badge]) => (
              <div key={label} className="mf-tool-item">
                <div className="mf-tool-icon">{icon}</div>
                <span className="mf-tool-label">{label}</span>
                {badge && <span className="mf-tool-badge">{badge}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
