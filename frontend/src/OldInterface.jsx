import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { api } from './api';
import './index.css';
import AnalysisView from './components/AnalysisView';
import PortfolioView from './components/PortfolioView';
import WatchlistView from './components/WatchlistView';
import MutualFundsView from './components/MutualFundsView';

const fmt = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function getLogoColor(ticker) {
  if (!ticker) return '#3b82f6';
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e', '#14b8a6'];
  return colors[ticker.charCodeAt(0) % colors.length];
}

export default function OldInterface() {
  // ── Auth ──────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(!!sessionStorage.getItem('auth_token'));
  const [pinVerified, setPinVerified] = useState(!!sessionStorage.getItem('pin_verified'));
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regPan, setRegPan] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // ── PIN ───────────────────────────────────────
  const [pin, setPin] = useState('');
  const [pinPrompt, setPinPrompt] = useState('Enter your PIN');
  const [pinError, setPinError] = useState('');
  const [isSetupMode, setIsSetupMode] = useState(false);

  // ── App State ──────────────────────────────────
  const [activeView, setActiveView] = useState('dashboard');
  const [activeTicker, setActiveTicker] = useState('');
  const [stocks, setStocks] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [marketStatus, setMarketStatus] = useState('OPEN');
  const [indices, setIndices] = useState({});
  const [userProfile, setUserProfile] = useState(null);
  const [listTab, setListTab] = useState('gainers');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const [showProfileDrop, setShowProfileDrop] = useState(false);
  const [showFundsModal, setShowFundsModal] = useState(false);
  const [fundsAmount, setFundsAmount] = useState('');
  const [fundsBank, setFundsBank] = useState('');
  const [fundsUpi, setFundsUpi] = useState('');
  const [fundsMsg, setFundsMsg] = useState('');

  // ── Theme ──────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  // ── Load portfolio ─────────────────────────────
  const loadPortfolio = useCallback(async () => {
    try {
      const p = await api.getPortfolio();
      setPortfolio(p);
    } catch {}
  }, []);

  // ── Toggle watchlist ────────────────────────────
  const toggleWatchlist = useCallback(async (ticker) => {
    const watched = watchlist.includes(ticker);
    try {
      if (watched) { await api.removeFromWatchlist(ticker); setWatchlist(w => w.filter(t => t !== ticker)); }
      else { await api.addToWatchlist(ticker); setWatchlist(w => [...w, ticker]); }
    } catch (err) { console.error('Watchlist toggle failed', err); }
  }, [watchlist]);

  // ── Unconditional boot ─────────────────────────
  useEffect(() => {
    api.getStocks().then(data => {
      setStocks(data);
      if (!activeTicker && data[0]) setActiveTicker(data[0].ticker);
    }).catch(console.error);
  }, []);

  // ── App boot after auth ────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !pinVerified) return;
    api.getStocks().then(data => {
      setStocks(data);
      if (!activeTicker && data[0]) setActiveTicker(data[0].ticker);
    }).catch(console.error);
    api.getWatchlist().then(data => setWatchlist(data.map(w => w.ticker))).catch(console.error);
    loadPortfolio();
    api.getAuthStatus().then(setUserProfile).catch(console.error);
    api.getMarketStatus().then(r => setMarketStatus(r.status)).catch(console.error);
    api.getIndices().then(setIndices).catch(console.error);

    const unsubscribe = api.connectRealtime((quotes) => {
      setStocks(prev => prev.map(s => {
        const q = quotes[s.ticker];
        return q ? { ...s, ...q } : s;
      }));
    });
    const mktInterval = setInterval(() => {
      api.getMarketStatus().then(r => setMarketStatus(r.status)).catch(console.error);
      api.getIndices().then(setIndices).catch(console.error);
    }, 15000);
    return () => { unsubscribe(); clearInterval(mktInterval); };
  }, [isAuthenticated, pinVerified]);

  // ── PIN setup after login ──────────────────────
  useEffect(() => {
    if (isAuthenticated && !pinVerified) {
      api.getAuthStatus().then(res => {
        setIsSetupMode(!res.isSetup);
        setPinPrompt(res.isSetup ? `Welcome back, ${res.name || ''}` : 'Set up your 4-digit PIN');
      }).catch(() => setPinPrompt('Enter your PIN'));
    }
  }, [isAuthenticated, pinVerified]);

  // ── PIN handling ────────────────────────────────
  const handlePinDigit = async (digit) => {
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 4) {
      try {
        if (isSetupMode) await api.setupPin(newPin);
        else await api.loginPin(newPin);
        sessionStorage.setItem('pin_verified', 'true');
        setPinVerified(true);
        setPin('');
      } catch (err) {
        setPinError(err.message || 'Incorrect PIN');
        setTimeout(() => { setPin(''); setPinError(''); }, 700);
      }
    }
  };
  const handlePinBack = () => setPin(p => p.slice(0, -1));

  const handlePinSubmit = async () => {
    if (pin.length !== 4) return;
    try {
      if (isSetupMode) await api.setupPin(pin);
      else await api.loginPin(pin);
      sessionStorage.setItem('pin_verified', 'true');
      setPinVerified(true);
      setPin('');
    } catch (err) {
      setPinError(err.message || 'Incorrect PIN');
      setTimeout(() => { setPin(''); setPinError(''); }, 1500);
    }
  };

  // ── Login ─────────────────────────────────────
  const handleLogin = async () => {
    if (!email || !password) { setAuthError('Please enter email and password'); return; }
    setAuthLoading(true); setAuthError('');
    try {
      const res = await api.loginEmail(email, password);
      sessionStorage.setItem('auth_token', res.userId);
      setIsAuthenticated(true);
      setShowAuth(false);
    } catch (err) { setAuthError(err.message || 'Login failed'); }
    finally { setAuthLoading(false); }
  };

  // ── Google Login ─────────────────────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    setAuthLoading(true); setAuthError('');
    try {
      const res = await api.loginGoogle(credentialResponse.credential);
      sessionStorage.setItem('auth_token', res.userId);
      setIsAuthenticated(true);
      setShowAuth(false);
    } catch (err) { setAuthError(err.message || 'Google Login failed'); }
    finally { setAuthLoading(false); }
  };

  // ── Register ───────────────────────────────────
  const handleRegister = async () => {
    if (!regName || !regEmail || !regPhone || !regDob || !regPan || !regPassword) { setAuthError('Please fill all required fields'); return; }
    setAuthLoading(true); setAuthError('');
    try {
      const res = await api.registerUser(regName, regEmail, regPassword, regPhone, regDob, regPan.toUpperCase(), regAddress);
      sessionStorage.setItem('auth_token', res.userId);
      setIsAuthenticated(true);
      setShowAuth(false);
    } catch (err) { setAuthError(err.message || 'Registration failed'); }
    finally { setAuthLoading(false); }
  };

  // ── Logout ─────────────────────────────────────
  const handleLogout = () => {
    sessionStorage.clear();
    setIsAuthenticated(false);
    setPinVerified(false);
    setPortfolio(null);
    setStocks([]);
  };

  // ── Navigate to stock analysis ──────────────────
  const openAnalysis = (ticker) => {
    setActiveTicker(ticker);
    setActiveView('analysis');
  };

  // ── Add funds ──────────────────────────────────
  const handleAddFunds = async () => {
    const amount = Number(fundsAmount);
    if (!amount || amount <= 0 || !fundsBank || !fundsUpi) { setFundsMsg('error:Please fill all fields'); return; }
    try {
      await api.addFunds(amount, fundsUpi, fundsBank);
      setFundsMsg(`success:₹${amount.toLocaleString('en-IN')} added successfully!`);
      await loadPortfolio();
      setFundsAmount(''); setFundsBank(''); setFundsUpi('');
      setTimeout(() => { setShowFundsModal(false); setFundsMsg(''); }, 2000);
    } catch (err) { setFundsMsg('error:' + err.message); }
  };

  // ── Search ──────────────────────────────────────
  const searchResults = searchQuery.trim()
    ? stocks.filter(s => s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) || (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // ── Gainers/Losers/Volume ───────────────────────
  const sortedStocks = [...stocks].sort((a, b) => {
    if (listTab === 'volume') return (b.volume || 0) - (a.volume || 0);
    if (listTab === 'gainers') return b.changePercent - a.changePercent;
    return a.changePercent - b.changePercent;
  });

  const showApp = isAuthenticated && pinVerified;
  const showPin = isAuthenticated && !pinVerified;

  // ── Render ─────────────────────────────────────
  return (
    <>
      {/* ════════════ LANDING PAGE ════════════ */}
      {!showApp && (
        <div id="landing-page" className="landing-page">
          <header className="g-navbar">
            <div className="g-navbar-inner">
              <div className="g-brand">
                <div className="g-logo"><div className="g-logo-blue"></div><div className="g-logo-green"></div></div>
                <span className="g-brand-name">fintrix</span>
              </div>
              <nav className="g-nav-links">
                <a href="#" className="g-nav-item">Stocks</a>
                <a href="#" className="g-nav-item">F&amp;O</a>
                <a href="#" className="g-nav-item">Mutual Funds</a>
                <a href="#" className="g-nav-item">More</a>
              </nav>
              <div className="g-nav-right">
                <button style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', marginRight: '16px' }} onClick={toggleTheme}>
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
                <div className="g-search-bar" id="landing-search-bar">
                  <span className="g-search-placeholder">Search Fintrix...</span>
                  <kbd className="g-search-kbd">Ctrl+K</kbd>
                </div>
                <button className="g-cta-btn" onClick={() => setShowAuth(true)}>Login / Sign up</button>
              </div>
            </div>
          </header>

          <div className="g-ticker-wrap">
            <div className="g-ticker-track" id="landing-ticker">
              {stocks.length === 0
                ? <div className="g-ticker-item"><span className="g-ticker-name">Loading market data...</span></div>
                : [...stocks, ...stocks].map((s, i) => {
                    const up = s.changePercent >= 0;
                    return <div key={i} className="g-ticker-item">
                      <span className="g-ticker-name">{s.ticker}</span>
                      <span>{s.price?.toFixed(2)}</span>
                      <span className={up ? 'g-ticker-up' : 'g-ticker-down'}>{up ? '+' : ''}{s.changePercent?.toFixed(2)}%</span>
                    </div>;
                  })
              }
            </div>
          </div>

          <section className="g-hero">
            <div className="g-hero-text">
              <h1 className="g-hero-headline">Grow your wealth<br />with <span className="g-hero-accent">fintrix</span></h1>
              <p className="g-hero-sub">India's smartest virtual stock trading platform.<br />Real NSE prices. Real-time data. Zero risk.</p>
              <button className="g-hero-btn" onClick={() => setShowAuth(true)}>Get started</button>
            </div>
            <div className="g-hero-illustration">
              <img src="img/hero_city.png" alt="Financial city illustration" className="g-hero-img" />
            </div>
          </section>
        </div>
      )}

      {/* ════════════ AUTH OVERLAY ════════════ */}
      {showAuth && (
        <div className="g-auth-overlay" id="google-overlay">
          <div className="g-auth-card">
            <div className="g-auth-logo">
              <div className="g-logo"><div className="g-logo-blue"></div><div className="g-logo-green"></div></div>
              <span className="g-brand-name" style={{ fontSize: '22px' }}>fintrix</span>
            </div>
            <h2 className="g-auth-title">Welcome to Fintrix</h2>
            <p className="g-auth-sub">Sign in or create your free account</p>

            <div className="g-auth-tabs">
              <button className={`g-auth-tab ${authMode === 'login' ? 'active' : ''}`} onClick={() => { setAuthMode('login'); setAuthError(''); }}>Login</button>
              <button className={`g-auth-tab ${authMode === 'register' ? 'active' : ''}`} onClick={() => { setAuthMode('register'); setAuthError(''); }}>Sign Up</button>
            </div>

            {authError && <div className="g-auth-error" style={{ display: 'block', marginBottom: '8px' }}>{authError}</div>}

            {authMode === 'login' ? (
              <div className="g-auth-form">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="g-input" placeholder="Email address" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="g-input" placeholder="Password" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                <button className="g-submit-btn" onClick={handleLogin} disabled={authLoading}>{authLoading ? 'Please wait...' : 'Login'}</button>
                <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0', color: 'var(--text-muted)' }}>
                  <hr style={{ flex: 1, borderColor: 'var(--border)', borderStyle: 'solid', borderWidth: '1px 0 0 0' }} />
                  <span style={{ padding: '0 8px', fontSize: '12px' }}>OR</span>
                  <hr style={{ flex: 1, borderColor: 'var(--border)', borderStyle: 'solid', borderWidth: '1px 0 0 0' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setAuthError('Google Login Failed')} theme={theme === 'dark' ? 'filled_black' : 'outline'} shape="pill" />
                </div>
              </div>
            ) : (
              <div className="g-auth-form">
                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="g-input" placeholder="Full Name" />
                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="g-input" placeholder="Email Address" />
                <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="g-input" placeholder="Phone Number" />
                <input type="date" value={regDob} onChange={e => setRegDob(e.target.value)} className="g-input" placeholder="Date of Birth" />
                <input type="text" value={regPan} onChange={e => setRegPan(e.target.value)} className="g-input" placeholder="PAN Number (e.g. ABCDE1234F)" maxLength="10" style={{ textTransform: 'uppercase' }} />
                <input type="text" value={regAddress} onChange={e => setRegAddress(e.target.value)} className="g-input" placeholder="Address (optional)" />
                <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} className="g-input" placeholder="Create Password" />
                <button className="g-submit-btn" onClick={handleRegister} disabled={authLoading}>{authLoading ? 'Please wait...' : 'Create Account'}</button>
              </div>
            )}
            <button className="g-auth-back" onClick={() => setShowAuth(false)}>← Back to home</button>
          </div>
        </div>
      )}

      {/* ════════════ PIN OVERLAY ════════════ */}
      {showPin && (
        <div className="g-pin-overlay" id="login-overlay">
          <div className="g-pin-card">
            <div className="g-auth-logo" style={{ marginBottom: '8px' }}>
              <div className="g-logo"><div className="g-logo-blue"></div><div className="g-logo-green"></div></div>
              <span className="g-brand-name" style={{ fontSize: '20px' }}>fintrix</span>
            </div>
            <div className="g-pin-prompt">{pinPrompt}</div>
            <div style={{ width: '100%', maxWidth: '240px' }}>
              <input 
                type="password" 
                maxLength={4} 
                className="g-input" 
                placeholder="" 
                autoComplete="new-password"
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 4) setPin(val);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                autoFocus
                style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', padding: '16px', background: 'var(--bg-soft)' }}
              />
              <button 
                className="g-submit-btn" 
                onClick={handlePinSubmit} 
                disabled={pin.length !== 4}
                style={{ marginTop: '16px' }}
              >
                {isSetupMode ? 'Setup PIN' : 'Verify PIN'}
              </button>
            </div>
            {pinError && <div className="g-pin-error visible" style={{ marginTop: '-12px' }}>{pinError}</div>}
          </div>
        </div>
      )}

      {/* ════════════ MAIN APP ════════════ */}
      {showApp && (
        <div id="app-viewport" className="app-viewport">

          {/* ─── APP NAVBAR ─── */}
          <header className="g-app-navbar">
            <div className="g-navbar-row1">
              <div className="g-navbar-inner">
                <div className="g-brand" style={{ cursor: 'pointer' }} onClick={() => setActiveView('dashboard')}>
                  <div className="g-logo"><div className="g-logo-blue"></div><div className="g-logo-green"></div></div>
                  <span className="g-brand-name">fintrix</span>
                </div>
                <nav className="g-nav-links g-app-nav-links">
                  <a href="#" className="g-nav-item" onClick={e => { e.preventDefault(); setActiveView('dashboard'); }}>Stocks</a>
                  <a href="#" className="g-nav-item" onClick={e => { e.preventDefault(); setActiveView('portfolio'); }}>F&amp;O</a>
                  <a href="#" className="g-nav-item" onClick={e => { e.preventDefault(); setActiveView('mf'); }}>Mutual Funds</a>
                </nav>
                <div className="g-app-actions">
                  <button style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', marginRight: '16px' }} onClick={toggleTheme}>
                    {theme === 'light' ? '🌙' : '☀️'}
                  </button>
                  {/* Search */}
                  <div className="g-app-search-wrap">
                    <div className="g-app-search-box">
                      <input type="text" id="search-input" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowSearchDrop(true); }} onFocus={() => setShowSearchDrop(true)} placeholder="Search stocks..." autoComplete="off" />
                      <kbd className="g-search-kbd">Ctrl+K</kbd>
                      {searchQuery && <button className="g-clear-btn" onClick={() => { setSearchQuery(''); setShowSearchDrop(false); }}>✕</button>}
                    </div>
                    {showSearchDrop && searchQuery && (
                      <div className="search-results-popup" style={{ display: 'block' }}>
                        {searchResults.length === 0
                          ? <div style={{ padding: '16px', textAlign: 'center', color: '#8c8fa6', fontSize: '13px' }}>No results</div>
                          : searchResults.map(s => (
                            <div key={s.ticker} className="search-result-item" onClick={() => { openAnalysis(s.ticker); setSearchQuery(''); setShowSearchDrop(false); }}>
                              <div><div className="search-result-ticker">{s.ticker}</div><div className="search-result-name">{s.name || ''}</div></div>
                              <div className="search-result-price">₹{s.price?.toFixed(2)}</div>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>

                  {/* Wallet */}
                  <div className="g-wallet-chip" style={{ cursor: 'pointer' }} title="Add funds" onClick={() => setShowFundsModal(true)}>
                    <span>💰</span>
                    <span>{fmt(portfolio?.balance || 0)}</span>
                  </div>

                  {/* Profile */}
                  <div className="g-profile-wrap">
                    <div className="g-avatar" onClick={() => setShowProfileDrop(s => !s)}>
                      <span>{userProfile?.name?.[0]?.toUpperCase() || 'U'}</span>
                    </div>
                    {showProfileDrop && (
                      <div className="g-profile-dropdown">
                        <div className="g-profile-info">
                          <div className="g-profile-name">{userProfile?.name || 'User'}</div>
                          <div className="g-profile-email">{userProfile?.email || ''}</div>
                          {userProfile?.phone && <div className="g-profile-phone">{userProfile.phone}</div>}
                        </div>
                        <div className="g-dropdown-divider"></div>
                        <button className="g-dropdown-item" onClick={() => { setShowProfileDrop(false); setActiveView('profile'); }}>👤 My Profile</button>
                        <div className="g-dropdown-divider"></div>
                        <button className="g-dropdown-item g-item-danger" onClick={handleLogout}>🚪 Sign Out</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tab row */}
            <div className="g-navbar-row2">
              <div className="g-navbar-inner">
                <nav className="g-app-nav">
                  {[['dashboard', 'Explore'], ['holdings', 'Holdings'], ['portfolio', 'Orders'], ['watchlist', 'Watchlist'], ['mf', 'Mutual Funds']].map(([view, label]) => (
                    <button key={view} className={`g-app-tab ${activeView === view || (view === 'dashboard' && activeView === 'analysis') ? 'active' : ''}`} onClick={() => setActiveView(view)}>{label}</button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Indices ticker */}
            <div className="g-indices-ticker-bar">
              <div className="g-indices-strip">
                {[['NIFTY', 'index-tech'], ['SENSEX', 'index-comp'], ['BANKNIFTY', 'index-bank'], ['MIDCPNIFTY', 'index-mid'], ['FINNIFTY', 'index-fin']].map(([name, key]) => {
                  const d = indices[name];
                  const up = d ? d.changePercent >= 0 : true;
                  return (
                    <div key={name} className="g-index-chip-bar">
                      <span className="g-idx-name">{name}</span>
                      <span className="g-idx-price">{d ? d.price.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '--'}</span>
                      <span className={`g-idx-change ${up ? 'g-bull' : 'g-bear'}`}>{d ? `${up ? '+' : ''}${d.changePercent.toFixed(2)}%` : '+0.00%'}</span>
                    </div>
                  );
                })}
                <div className="g-live-badge">
                  <span className={`g-pulse ${marketStatus === 'CLOSED' ? 'market-closed' : ''}`}></span>
                  <span>{marketStatus === 'OPEN' ? 'Live Markets' : 'Market Closed'}</span>
                </div>
              </div>
            </div>

            {/* App ticker tape */}
            <div className="g-ticker-wrap g-app-ticker">
              <div className="g-ticker-track">
                {[...stocks, ...stocks].map((s, i) => {
                  const up = s.changePercent >= 0;
                  return <div key={i} className="g-ticker-item">
                    <span className="g-ticker-name">{s.ticker}</span>
                    <span>{s.price?.toFixed(2)}</span>
                    <span className={up ? 'g-ticker-up' : 'g-ticker-down'}>{up ? '+' : ''}{s.changePercent?.toFixed(2)}%</span>
                  </div>;
                })}
              </div>
            </div>
          </header>

          {/* ─── VIEWS ─── */}

          {/* EXPLORE / DASHBOARD */}
          {activeView === 'dashboard' && (
            <section className="g-view active-view" id="view-dashboard">
              <div className="g-explore-grid">
                <div className="g-explore-left">
                  <div className="g-section-header"><h2 className="g-section-title">Most traded stocks on Fintrix</h2></div>
                  <div className="g-stocks-grid">
                    {stocks.slice(0, 8).map(s => {
                      const up = s.changePercent >= 0;
                      const color = getLogoColor(s.ticker);
                      const watched = watchlist.includes(s.ticker);
                      return (
                        <div key={s.ticker} className="g-stock-card" onClick={() => openAnalysis(s.ticker)}>
                          <div className="g-card-logo" style={{ background: `${color}15`, color, fontWeight: 700, width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 8 }}>{s.ticker.slice(0, 2)}</div>
                          <div className="g-card-name">{s.name || s.ticker}</div>
                          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto' }}>
                            <div>
                              <div className="g-card-price">₹{(s.price || 0).toFixed(2)}</div>
                              <div className={`g-card-change ${up ? 'text-bull' : 'text-bear'}`}>{up ? '+' : ''}{(s.change || 0).toFixed(2)} ({(s.changePercent || 0).toFixed(2)}%)</div>
                            </div>
                            <button onClick={e => { e.stopPropagation(); toggleWatchlist(s.ticker); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: watched ? '#f59e0b' : '#ccc' }}>★</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="g-card g-lists-card">
                    <div className="g-list-tabs">
                      {['gainers', 'losers', 'volume'].map(tab => (
                        <button key={tab} className={`g-list-tab ${listTab === tab ? 'active' : ''}`} onClick={() => setListTab(tab)}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
                      ))}
                    </div>
                    <div className="g-movers-table-wrap">
                      <table className="g-table g-movers-table">
                        <thead><tr><th>Company</th><th className="text-right">Price</th><th className="text-right">Change</th></tr></thead>
                        <tbody>
                          {sortedStocks.slice(0, 10).map(s => {
                            const up = s.changePercent >= 0;
                            return (
                              <tr key={s.ticker} className="g-movers-row" style={{ cursor: 'pointer' }} onClick={() => openAnalysis(s.ticker)}>
                                <td><strong>{s.ticker}</strong><div style={{ fontSize: '11px', color: '#8c8fa6' }}>{s.name || ''}</div></td>
                                <td className="text-right">₹{(s.price || 0).toFixed(2)}<div style={{ fontSize: '11px' }} className={up ? 'text-bull' : 'text-bear'}>{up ? '+' : ''}{(s.changePercent || 0).toFixed(2)}%</div></td>
                                <td className={`text-right ${up ? 'text-bull' : 'text-bear'}`}>{up ? '+' : ''}{(s.change || 0).toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="g-explore-right">
                  <div className="g-card g-investments-card">
                    <h3 className="g-invest-title">Your investments</h3>
                    {(() => {
                      const holdings = portfolio?.holdings || {};
                      let invested = 0;
                      for (const h of Object.values(holdings)) invested += h.shares * h.avgPrice;
                      const current = portfolio?.holdingsValue || 0;
                      const returns = current - invested;
                      const pct = invested > 0 ? ((returns / invested) * 100).toFixed(2) : '0.00';
                      const cls = returns >= 0 ? 'g-bull' : 'g-bear';
                      return <>
                        <div className="g-invest-row g-invest-main"><span className="g-invest-label">Current value</span><span className="g-invest-value">{fmt(current)}</span></div>
                        <div className="g-invest-divider"></div>
                        <div className="g-invest-row"><span className="g-invest-label">Total returns</span><span className={`g-invest-value ${cls}`}>{fmt(returns)} ({pct}%)</span></div>
                        <div className="g-invest-row"><span className="g-invest-label">Invested</span><span className="g-invest-value">{fmt(invested)}</span></div>
                      </>;
                    })()}
                    <button className="g-add-funds-btn" onClick={() => setShowFundsModal(true)}>+ Add Funds</button>
                  </div>

                  <div className="g-card g-widget">
                    <div className="g-widget-header"><h3 className="g-widget-title">My Watchlist</h3><span>★</span></div>
                    <div className="g-watchlist-list">
                      {stocks.filter(s => watchlist.includes(s.ticker)).length === 0
                        ? <div className="g-empty">No stocks on your watchlist</div>
                        : stocks.filter(s => watchlist.includes(s.ticker)).map(s => {
                          const up = s.changePercent >= 0;
                          return (
                            <div key={s.ticker} className="g-wl-row" style={{ cursor: 'pointer' }} onClick={() => openAnalysis(s.ticker)}>
                              <div><div className="g-wl-ticker">{s.ticker}</div><div className="g-wl-name">{s.name || ''}</div></div>
                              <div className="g-wl-right">
                                <div className="g-wl-price">₹{(s.price || 0).toFixed(2)}</div>
                                <div className={`g-wl-chg ${up ? 'text-bull' : 'text-bear'}`}>{up ? '+' : ''}{(s.changePercent || 0).toFixed(2)}%</div>
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  </div>

                  <div className="g-card g-widget">
                    <div className="g-widget-header"><h3 className="g-widget-title">Recent Transactions</h3><span>🕐</span></div>
                    <div className="g-txn-list">
                      {(portfolio?.transactions || []).length === 0
                        ? <div className="g-empty">No transactions yet</div>
                        : (portfolio.transactions || []).slice(0, 5).map(t => {
                          const buy = t.type === 'BUY';
                          return (
                            <div key={t.id} className="g-txn-row">
                              <span className={`g-txn-type ${buy ? 'g-txn-buy' : 'g-txn-sell'}`}>{t.type}</span>
                              <span className="g-txn-ticker">{t.ticker}</span>
                              <span style={{ fontSize: '11px', color: '#8c8fa6' }}>{t.shares} sh</span>
                              <span className={`g-txn-val ${buy ? 'g-bear' : 'g-bull'}`}>{buy ? '-' : '+'}₹{(t.price * t.shares).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                          );
                        })
                      }
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* STOCK ANALYSIS */}
          {activeView === 'analysis' && activeTicker && (
            <AnalysisView
              ticker={activeTicker}
              stocks={stocks}
              portfolio={portfolio}
              watchlist={watchlist}
              onToggleWatchlist={toggleWatchlist}
              onLoadPortfolio={loadPortfolio}
              marketStatus={marketStatus}
            />
          )}

          {/* HOLDINGS */}
          {activeView === 'holdings' && (
            <section className="g-view active-view" id="view-holdings">
              <div className="g-holdings-wrap">
                {(() => {
                  const holdings = portfolio?.holdings || {};
                  let invested = 0;
                  for (const h of Object.values(holdings)) invested += h.shares * h.avgPrice;
                  const returns = (portfolio?.holdingsValue || 0) - invested;
                  const pct = invested > 0 ? ((returns / invested) * 100).toFixed(2) : '0.00';
                  const cls = returns >= 0 ? 'g-bull' : 'g-bear';
                  return (
                    <>
                      <div className="g-card g-summary-banner">
                        <div className="g-summary-tile"><span className="g-tile-label">Current Value</span><span className="g-tile-val">{fmt(portfolio?.holdingsValue || 0)}</span></div>
                        <div className="g-summary-tile"><span className="g-tile-label">Invested</span><span className="g-tile-val">{fmt(invested)}</span></div>
                        <div className="g-summary-tile"><span className="g-tile-label">Total Returns</span><span className={`g-tile-val ${cls}`}>{fmt(returns)} ({pct}%)</span></div>
                      </div>
                      <div className="g-card" style={{ marginTop: '20px' }}>
                        <table className="g-table g-holdings-table">
                          <thead><tr><th>Company</th><th className="text-right">Shares</th><th className="text-right">Avg Price</th><th className="text-right">LTP</th><th className="text-right">Current Value</th><th className="text-right">Returns</th><th></th></tr></thead>
                          <tbody>
                            {Object.entries(holdings).length === 0
                              ? <tr><td colSpan="7" className="g-empty"><div className="g-empty-state"><div style={{ fontSize: 48, color: '#ccc', marginBottom: 12 }}>📦</div><div style={{ fontSize: 16, fontWeight: 600 }}>No holdings yet</div><div style={{ fontSize: 13, color: '#8c8fa6' }}>Start investing from the Explore tab</div></div></td></tr>
                              : Object.entries(holdings).map(([ticker, h]) => {
                                const up = (h.profitLoss || 0) >= 0;
                                return <tr key={ticker}>
                                  <td><strong>{ticker}</strong></td>
                                  <td className="text-right">{h.shares}</td>
                                  <td className="text-right">₹{h.avgPrice.toFixed(2)}</td>
                                  <td className="text-right">₹{h.currentPrice?.toFixed(2) || '--'}</td>
                                  <td className="text-right">₹{h.totalValue?.toFixed(2) || '--'}</td>
                                  <td className={`text-right ${up ? 'g-bull' : 'g-bear'}`}>₹{h.profitLoss?.toFixed(2) || '--'} ({h.profitLossPercent?.toFixed(2) || 0}%)</td>
                                  <td><button onClick={() => openAnalysis(ticker)} style={{ background: 'var(--green)', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Trade</button></td>
                                </tr>;
                              })
                            }
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </div>
            </section>
          )}

          {/* PORTFOLIO / ORDERS */}
          {activeView === 'portfolio' && (
            <PortfolioView portfolio={portfolio} stocks={stocks} onLoadPortfolio={loadPortfolio} onOpenAnalysis={openAnalysis} />
          )}

          {/* WATCHLIST */}
          {activeView === 'watchlist' && (
            <WatchlistView stocks={stocks} watchlist={watchlist} onOpenAnalysis={openAnalysis} onToggleWatchlist={toggleWatchlist} />
          )}

          {/* MUTUAL FUNDS */}
          {activeView === 'mf' && (
            <MutualFundsView portfolio={portfolio} onLoadPortfolio={loadPortfolio} />
          )}

          {/* PROFILE */}
          {activeView === 'profile' && (
            <section className="g-view active-view" id="view-profile">
              <div className="g-profile-page">
                <h2 className="g-section-title" style={{ marginBottom: '24px' }}>My Profile</h2>
                <div className="g-card g-profile-card-full">
                  <div className="g-profile-avatar-large">
                    <span>{userProfile?.name?.[0]?.toUpperCase() || 'U'}</span>
                  </div>
                  <div className="g-profile-fields">
                    {[['Full Name', userProfile?.name, false], ['Email', userProfile?.email, false], ['Phone', userProfile?.phone, true], ['Date of Birth', userProfile?.dob, true], ['PAN Number', userProfile?.panNumber, true], ['Address', userProfile?.address, true]].map(([label, val]) => (
                      <div key={label} className="g-profile-field">
                        <label>{label}</label>
                        <input type="text" defaultValue={val || ''} className="g-input" placeholder={`Not set`} />
                      </div>
                    ))}
                    <div className="g-profile-actions">
                      <button className="g-submit-btn" onClick={async () => {
                        try {
                          await api.getAuthStatus().then(setUserProfile);
                          alert('Profile saved!');
                        } catch {}
                      }}>Save Changes</button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

        </div>
      )}

      {/* ════════════ ADD FUNDS MODAL ════════════ */}
      {showFundsModal && (
        <div className="g-modal-overlay" id="add-funds-modal">
          <div className="g-modal-card">
            <div className="g-modal-header">
              <h2 className="g-modal-title">Add Funds</h2>
              <button className="g-modal-close" onClick={() => { setShowFundsModal(false); setFundsMsg(''); }}>✕</button>
            </div>
            <div className="g-modal-body">
              <p className="g-modal-desc">Add money to your Fintrix trading account</p>
              <div className="g-modal-field">
                <label>Amount (₹)</label>
                <input type="number" value={fundsAmount} onChange={e => setFundsAmount(e.target.value)} className="g-input g-input-lg" placeholder="Enter amount" min="1" />
              </div>
              <div className="g-modal-quick-amounts">
                {[1000, 5000, 10000, 25000].map(amt => (
                  <button key={amt} className="g-quick-amt" onClick={() => setFundsAmount(String(amt))}>₹{amt.toLocaleString('en-IN')}</button>
                ))}
              </div>
              <div className="g-modal-field">
                <label>Bank Name</label>
                <input type="text" value={fundsBank} onChange={e => setFundsBank(e.target.value)} className="g-input" placeholder="e.g. HDFC Bank, SBI, ICICI" />
              </div>
              <div className="g-modal-field">
                <label>UPI Reference / Transaction ID</label>
                <input type="text" value={fundsUpi} onChange={e => setFundsUpi(e.target.value)} className="g-input" placeholder="e.g. UPI123456789" />
              </div>
              {fundsMsg.startsWith('error:') && <div className="g-modal-error" style={{ display: 'block' }}>{fundsMsg.slice(6)}</div>}
              {fundsMsg.startsWith('success:') && <div className="g-modal-success" style={{ display: 'block' }}>{fundsMsg.slice(8)}</div>}
              <button className="g-submit-btn g-funds-submit" onClick={handleAddFunds}>💰 Add Funds</button>
              <div className="g-modal-note"><span>🛡 Secure bank transfer simulation. Funds credited instantly.</span></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
