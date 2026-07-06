import React from 'react';

export default function WatchlistView({ stocks, watchlist, onOpenAnalysis, onToggleWatchlist }) {
  const ws = stocks.filter(s => watchlist.includes(s.ticker));

  return (
    <section className="g-view active-view" id="view-watchlist">
      <div style={{ paddingTop: '20px' }}>
        <h2 className="g-section-title" style={{ marginBottom: '16px' }}>My Watchlist</h2>
        <div className="g-card">
          <table className="g-table">
            <thead><tr>
              <th>Company</th><th className="text-right">LTP</th>
              <th className="text-right">Change</th><th className="text-right">Volume</th><th></th>
            </tr></thead>
            <tbody>
              {ws.length === 0 ? (
                <tr><td colSpan="5" className="g-empty">No stocks in your watchlist. Add some from Explore!</td></tr>
              ) : ws.map(s => {
                const up = s.changePercent >= 0;
                return (
                  <tr key={s.ticker} style={{ cursor: 'pointer' }} onClick={() => onOpenAnalysis(s.ticker)}>
                    <td><strong>{s.ticker}</strong><div style={{ fontSize: '11px', color: '#8c8fa6' }}>{s.name || ''}</div></td>
                    <td className="text-right">₹{s.price?.toFixed(2)}</td>
                    <td className={`text-right ${up ? 'text-bull' : 'text-bear'}`}>{up ? '+' : ''}{s.changePercent?.toFixed(2)}%</td>
                    <td className="text-right">{(s.volume || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <button
                        onClick={e => { e.stopPropagation(); onToggleWatchlist(s.ticker); }}
                        style={{ background: 'none', border: '1px solid #eb5757', color: '#eb5757', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
