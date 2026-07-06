import { api } from "./api.js";
import { createPriceChart, updatePriceChart, createPortfolioChart, updatePortfolioChart } from "./chart.js";

const state = {
  marketStatus: "OPEN",
  stocks: [],
  watchlist: [],
  portfolio: null,
  activeTicker: "",
  activeInterval: "1Y",
  currentTradeType: "BUY",
  currentListTab: "gainers",
  priceChart: null,
  portfolioChart: null,
  userProfile: null
};

function formatINR(n) { return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(n); }

// ──────────────────────────────────────────────
// BOOT
// ──────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const userId = sessionStorage.getItem("auth_token");
  const pinOk  = sessionStorage.getItem("pin_verified");

  if (userId && pinOk) { hideLanding(); finishAppInit(); }
  else if (!userId)    { showLanding(); }
  else                 { hideLanding(); showPinOverlay(); initPinScreen(); }
});

function showLanding() {
  document.getElementById("landing-page").style.display = "flex";
  document.getElementById("google-overlay").classList.add("hidden");
  document.getElementById("login-overlay").classList.add("hidden");
  document.getElementById("app-viewport").classList.add("hidden");

  document.getElementById("btn-landing-login").onclick = openAuth;
  document.getElementById("btn-hero-start").onclick = openAuth;
  document.getElementById("tab-login").onclick = () => switchTab("login");
  document.getElementById("tab-register").onclick = () => switchTab("register");
  document.getElementById("btn-auth-back").onclick = () => document.getElementById("google-overlay").classList.add("hidden");
  document.getElementById("btn-email-login").onclick = handleLogin;
  document.getElementById("login-password").onkeydown = e => { if(e.key==="Enter") handleLogin(); };
  document.getElementById("btn-email-register").onclick = handleRegister;
  document.getElementById("reg-password").onkeydown = e => { if(e.key==="Enter") handleRegister(); };

  initLandingTicker();
}

function openAuth() { document.getElementById("google-overlay").classList.remove("hidden"); switchTab("login"); }

function switchTab(tab) {
  const isLogin = tab === "login";
  document.getElementById("tab-login").classList.toggle("active", isLogin);
  document.getElementById("tab-register").classList.toggle("active", !isLogin);
  document.getElementById("login-form").classList.toggle("hidden", !isLogin);
  document.getElementById("register-form").classList.toggle("hidden", isLogin);
}

async function handleLogin() {
  const email = document.getElementById("login-email").value.trim();
  const pass  = document.getElementById("login-password").value.trim();
  const errEl = document.getElementById("login-error");
  const btn   = document.getElementById("btn-email-login");
  if (!email || !pass) { showError(errEl, "Please enter email and password"); return; }
  btn.textContent = "Please wait..."; btn.disabled = true;
  try {
    const res = await api.loginEmail(email, pass);
    sessionStorage.setItem("auth_token", res.userId);
    document.getElementById("google-overlay").classList.add("hidden");
    showPinOverlay(); initPinScreen();
  } catch(err) { showError(errEl, err.message || "Login failed"); }
  finally { btn.textContent = "Login"; btn.disabled = false; }
}

async function handleRegister() {
  const name    = document.getElementById("reg-name").value.trim();
  const email   = document.getElementById("reg-email").value.trim();
  const phone   = document.getElementById("reg-phone").value.trim();
  const dob     = document.getElementById("reg-dob").value.trim();
  const pan     = document.getElementById("reg-pan").value.trim().toUpperCase();
  const address = document.getElementById("reg-address").value.trim();
  const pass    = document.getElementById("reg-password").value.trim();
  const errEl   = document.getElementById("reg-error");
  const btn     = document.getElementById("btn-email-register");

  if (!name||!email||!phone||!dob||!pan||!pass) { showError(errEl,"Please fill all required fields"); return; }
  btn.textContent = "Please wait..."; btn.disabled = true;
  try {
    const res = await api.registerUser(name, email, pass, phone, dob, pan, address || "");
    sessionStorage.setItem("auth_token", res.userId);
    document.getElementById("google-overlay").classList.add("hidden");
    showPinOverlay(); initPinScreen();
  } catch(err) { showError(errEl, err.message || "Registration failed"); }
  finally { btn.textContent = "Create Account"; btn.disabled = false; }
}

function showError(el, msg) { el.textContent = msg; el.classList.remove("hidden"); setTimeout(() => el.classList.add("hidden"), 4000); }
function hideLanding() { document.getElementById("landing-page").style.display = "none"; }

// Expose on window so non-module fallback can use these once module is ready
window._fintrixLogin    = handleLogin;
window._fintrixRegister = handleRegister;
window._fintrixOpenAuth = openAuth;
function showPinOverlay() { document.getElementById("login-overlay").classList.remove("hidden"); document.getElementById("google-overlay").classList.add("hidden"); }

// ──────────────────────────────────────────────
// PIN SCREEN
// ──────────────────────────────────────────────
async function initPinScreen() {
  const promptEl = document.getElementById("login-prompt");
  const dots     = document.querySelectorAll(".g-pin-dot");
  const errorText = document.getElementById("pin-error-text");
  let currentPin = "", isSetupMode = false;

  try {
    const status = await api.getAuthStatus();
    isSetupMode = !status.isSetup;
    promptEl.textContent = isSetupMode ? "Set up your 4-digit PIN" : `Welcome back, ${status.name || ""}`;
  } catch { promptEl.textContent = "Enter your PIN"; }

  document.querySelectorAll(".g-num-btn").forEach(btn => {
    btn.onclick = () => {
      const val = btn.dataset.val;
      if (val !== undefined && currentPin.length < 4) {
        currentPin += val; updateDots(dots, currentPin);
        if (currentPin.length === 4) submitPin(currentPin);
      }
    };
  });
  document.getElementById("pin-backspace").onclick = () => { currentPin = currentPin.slice(0,-1); updateDots(dots, currentPin); };

  document.addEventListener("keydown", function kbHandler(e) {
    if (document.getElementById("login-overlay").classList.contains("hidden")) return;
    if (e.key >= "0" && e.key <= "9" && currentPin.length < 4) { currentPin += e.key; updateDots(dots, currentPin); if (currentPin.length === 4) submitPin(currentPin); }
    else if (e.key === "Backspace") { currentPin = currentPin.slice(0,-1); updateDots(dots, currentPin); }
  });

  async function submitPin(pin) {
    errorText.classList.remove("visible");
    try {
      if (isSetupMode) await api.setupPin(pin); else await api.loginPin(pin);
      sessionStorage.setItem("pin_verified","true");
      document.getElementById("login-overlay").classList.add("hidden");
      finishAppInit();
    } catch(err) {
      errorText.textContent = err.message || "Incorrect PIN"; errorText.classList.add("visible");
      setTimeout(() => { currentPin=""; updateDots(dots,""); }, 600);
    }
  }
}
function updateDots(dots, pin) { dots.forEach((d,i) => d.classList.toggle("filled", i < pin.length)); }

// ──────────────────────────────────────────────
// APP INIT
// ──────────────────────────────────────────────
function finishAppInit() {
  document.getElementById("login-overlay").classList.add("hidden");
  document.getElementById("landing-page").style.display = "none";
  document.getElementById("app-viewport").classList.remove("hidden");

  initNavigation();
  initSearch();
  initIntervalSelectors();
  initTradeWidget();
  initMFTradeWidget();
  initListTabs();
  initProfileDropdown();
  initAddFundsModal();
  initProfilePage();

  loadInitialData();
  connectSSE();
  pollMarketStatus();
  setInterval(pollMarketStatus, 10000);
  lucide.createIcons();
}

// ──────────────────────────────────────────────
// NAVIGATION
// ──────────────────────────────────────────────
function initNavigation() {
  const tabs  = document.querySelectorAll(".g-app-tab");
  const views = document.querySelectorAll(".g-view");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      views.forEach(v => v.classList.remove("active-view"));
      document.getElementById(`view-${tab.dataset.view}`)?.classList.add("active-view");

      if (tab.dataset.view === "dashboard")  refreshDashboard();
      if (tab.dataset.view === "analysis")   refreshAnalysis();
      if (tab.dataset.view === "holdings")   refreshHoldings();
      if (tab.dataset.view === "portfolio")  refreshPortfolio();
      if (tab.dataset.view === "watchlist")  refreshWatchlistView();
      if (tab.dataset.view === "news")       refreshNews();
      if (tab.dataset.view === "mf")         refreshMFDashboard();
      if (tab.dataset.view === "profile")    refreshProfileView();
      lucide.createIcons();
    });
  });

  document.getElementById("btn-brand-home")?.addEventListener("click", () => document.getElementById("btn-nav-dashboard").click());

  // Top navbar links → switch to relevant tab
  document.getElementById("btn-topnav-stocks")?.addEventListener("click", (e) => { e.preventDefault(); document.getElementById("btn-nav-dashboard").click(); });
  document.getElementById("btn-topnav-fo")?.addEventListener("click", (e) => { e.preventDefault(); document.getElementById("btn-nav-portfolio").click(); });
  document.getElementById("btn-topnav-mf")?.addEventListener("click", (e) => { e.preventDefault(); document.getElementById("btn-nav-mf").click(); });
}

// ──────────────────────────────────────────────
// MUTUAL FUNDS
// ──────────────────────────────────────────────
let allMFs = [];
let activeMF = null;
let currentMFTradeType = "BUY";

async function refreshMFDashboard() {
  try {
    allMFs = await api.getMutualFunds();

    // --- Popular Funds (top 4 cards) ---
    const popularGrid = document.getElementById("mf-popular-grid");
    if (popularGrid) {
      popularGrid.innerHTML = allMFs.slice(0, 4).map(mf => {
        const isUp = mf.cagr3Y >= 0;
        return `
          <div class="mf-popular-card" onclick="loadMFAnalysis('${mf.id}')">
            <div class="mf-popular-logo">${mf.name.substring(0,2).toUpperCase()}</div>
            <div class="mf-popular-name">${mf.name}</div>
            <div class="mf-popular-footer">
              <span class="mf-popular-return ${isUp ? 'mf-bull' : 'mf-bear'}">+${mf.cagr3Y}%</span>
              <span class="mf-popular-period">3Y</span>
            </div>
          </div>`;
      }).join("");
    }

    // --- All Funds Table ---
    const tbody = document.getElementById("mf-list-tbody");
    if (tbody) {
      tbody.innerHTML = allMFs.map(mf => `
        <tr style="cursor:pointer;" onclick="loadMFAnalysis('${mf.id}')">
          <td><strong>${mf.name}</strong><div style="font-size:11px;color:#8c8fa6;">${mf.category}</div></td>
          <td class="text-right">₹${mf.nav.toFixed(2)}</td>
          <td class="text-right ${mf.cagr1Y >= 0 ? 'text-bull' : 'text-bear'}">${mf.cagr1Y}%</td>
          <td class="text-right ${mf.cagr3Y >= 0 ? 'text-bull' : 'text-bear'}">${mf.cagr3Y}%</td>
          <td class="text-right"><span class="mf-risk-badge mf-risk-${mf.risk.toLowerCase().replace(' ','-')}">${mf.risk}</span></td>
          <td class="text-right">₹${mf.minSip}/mo</td>
        </tr>`).join("");
    }

    // --- Your Investments (from portfolio MF holdings) ---
    try {
      const portfolio = await api.getPortfolio();
      const holdings = portfolio.mfHoldings || [];
      const totalInvested = holdings.reduce((s, h) => s + (h.investedAmount || 0), 0);
      const totalCurrent  = holdings.reduce((s, h) => s + (h.currentValue || h.investedAmount || 0), 0);
      const totalReturn   = totalCurrent - totalInvested;
      const totalPct      = totalInvested > 0 ? ((totalReturn / totalInvested) * 100).toFixed(2) : "0.00";
      const xirr          = totalInvested > 0 ? (parseFloat(totalPct) * 0.85).toFixed(2) : "0.00";

      const fmt = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
      const setEl = (id, txt, cls) => { const el = document.getElementById(id); if(el){ el.textContent = txt; if(cls) el.className = `mf-invest-val ${cls}`; } };

      setEl("mf-invest-current", fmt(totalCurrent));
      setEl("mf-invest-1d", `${totalReturn >= 0 ? '+' : ''}${fmt(totalReturn*0.01)} (${totalReturn >= 0 ? '+' : ''}0.01%)`, totalReturn >= 0 ? "mf-bull" : "mf-bear");
      setEl("mf-invest-total", `${totalReturn >= 0 ? '+' : ''}${fmt(totalReturn)} (${totalReturn >= 0 ? '+' : ''}${totalPct}%)`, totalReturn >= 0 ? "mf-bull" : "mf-bear");
      setEl("mf-invest-invested", fmt(totalInvested));
      setEl("mf-invest-xirr", `${xirr}%`);
    } catch {}

    // --- MF inner tabs ---
    document.querySelectorAll(".mf-inner-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".mf-inner-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
      });
    });

    // --- Collection chips → filter table ---
    document.querySelectorAll(".mf-collection-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const filter = chip.dataset.filter;
        const rows = document.querySelectorAll("#mf-list-tbody tr");
        rows.forEach(row => {
          const txt = row.textContent.toLowerCase();
          const match = !filter || txt.includes(filter.toLowerCase()) ||
            (filter === "High Return" && parseFloat(row.cells[2]?.textContent) > 30) ||
            (filter === "Best SIP"   && parseFloat(row.cells[5]?.textContent?.replace(/[^\d.]/g,'')) < 1000);
          row.style.display = match ? "" : "none";
        });
      });
    });

    lucide.createIcons();
  } catch(e) { console.error("MF Dashboard error:", e); }
}

async function loadMFAnalysis(id) {
  document.querySelectorAll(".g-app-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".g-view").forEach(v => v.classList.remove("active-view"));
  document.getElementById("view-mf-analysis")?.classList.add("active-view");

  try {
    const mf = await api.getMFDetails(id);
    activeMF = mf;
    
    document.getElementById("mf-banner-name").textContent = mf.name;
    document.getElementById("mf-banner-nav").textContent = `₹${mf.nav.toFixed(2)}`;
    
    document.getElementById("mf-metric-aum").textContent = `₹${(mf.aum/1000).toFixed(1)}k Cr`;
    document.getElementById("mf-metric-category").textContent = mf.category;
    document.getElementById("mf-metric-risk").textContent = mf.risk;
    document.getElementById("mf-metric-min").textContent = `₹${mf.minLumpsum}`;

    // Chart
    if (!state.priceChart) state.priceChart = createPriceChart("mfPriceChart");
    updatePriceChart(state.priceChart, mf.history, mf.name);

    updateMFTradeWidget();
  } catch {}
}

function updateMFTradeWidget() {
  if (!activeMF) return;
  const h = state.portfolio?.mfHoldings?.[activeMF.id];
  document.getElementById("mf-trade-nav").textContent = `₹${activeMF.nav.toFixed(2)}`;
  document.getElementById("mf-trade-units-owned").textContent = h ? h.units.toFixed(4) : "0";
  
  const amt = Number(document.getElementById("mf-trade-amount-input").value) || 0;
  document.getElementById("mf-trade-est-units").textContent = (amt / activeMF.nav).toFixed(4);
  document.getElementById("mf-trade-avail-cash").textContent = formatINR(state.portfolio?.balance || 0);
}

// MF Trade Widget Events
function initMFTradeWidget() {
  const buyTab = document.getElementById("mf-trade-tab-buy");
  const sellTab = document.getElementById("mf-trade-tab-sell");
  const input = document.getElementById("mf-trade-amount-input");
  const btn = document.getElementById("btn-execute-mf-trade");

  if(buyTab) buyTab.onclick = () => { buyTab.classList.add("active"); sellTab.classList.remove("active"); currentMFTradeType="BUY"; btn.className="g-execute-btn g-buy-btn"; btn.textContent="INVEST"; };
  if(sellTab) sellTab.onclick = () => { sellTab.classList.add("active"); buyTab.classList.remove("active"); currentMFTradeType="SELL"; btn.className="g-execute-btn g-sell-btn"; btn.textContent="WITHDRAW"; };
  if(input) input.oninput = updateMFTradeWidget;

  if(btn) btn.onclick = async () => {
    const amt = Number(input.value);
    if (!amt || amt <= 0) { alert("Enter a valid amount"); return; }
    btn.disabled = true; btn.textContent = "PROCESSING...";
    try {
      await api.executeMFTrade(activeMF.id, currentMFTradeType, amt);
      await loadPortfolioData(); updateMFTradeWidget();
      alert(`✅ ${currentMFTradeType} order for ₹${amt} in ${activeMF.name} executed!`);
    } catch(err) { alert(`❌ ${err.message}`); }
    finally { btn.disabled = false; btn.textContent = currentMFTradeType === "BUY" ? "INVEST" : "WITHDRAW"; }
  };

  document.getElementById("btn-brand-home")?.addEventListener("click", () => document.getElementById("btn-nav-dashboard").click());
}

// ──────────────────────────────────────────────
// PROFILE DROPDOWN
// ──────────────────────────────────────────────
function initProfileDropdown() {
  api.getAuthStatus().then(res => {
    state.userProfile = res;
    if (res.name) {
      document.getElementById("profile-initial").textContent = res.name[0].toUpperCase();
      document.getElementById("dropdown-name").textContent = res.name;
      document.getElementById("dropdown-email").textContent = res.email;
      const phoneEl = document.getElementById("dropdown-phone");
      if (phoneEl && res.phone) phoneEl.textContent = res.phone;
    }
  });

  const toggle = document.getElementById("btn-profile-toggle");
  const dropdown = document.getElementById("profile-dropdown");
  toggle.onclick = e => { e.stopPropagation(); dropdown.classList.toggle("hidden"); lucide.createIcons(); };
  document.addEventListener("click", () => dropdown.classList.add("hidden"));
  dropdown.onclick = e => e.stopPropagation();

  document.getElementById("btn-logout").onclick = () => { sessionStorage.clear(); location.reload(); };
  document.getElementById("btn-my-profile")?.addEventListener("click", () => {
    dropdown.classList.add("hidden");
    // Switch to profile view
    document.querySelectorAll(".g-app-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".g-view").forEach(v => v.classList.remove("active-view"));
    document.getElementById("view-profile")?.classList.add("active-view");
    refreshProfileView();
    lucide.createIcons();
  });
}

// ──────────────────────────────────────────────
// SEARCH
// ──────────────────────────────────────────────
function initSearch() {
  const input = document.getElementById("search-input");
  const dropdown = document.getElementById("search-results-dropdown");
  const clearBtn = document.getElementById("clear-search");

  input.oninput = e => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) { dropdown.style.display="none"; clearBtn.style.display="none"; return; }
    clearBtn.style.display = "block";
    const matches = state.stocks.filter(s => s.ticker.toLowerCase().includes(q) || (s.name||"").toLowerCase().includes(q));
    dropdown.innerHTML = matches.length
      ? matches.map(s => `<div class="search-result-item" data-ticker="${s.ticker}"><div><div class="search-result-ticker">${s.ticker}</div><div class="search-result-name">${s.name||""}</div></div><div class="search-result-price">₹${s.price.toFixed(2)}</div></div>`).join("")
      : `<div style="padding:16px;text-align:center;color:#8c8fa6;font-size:13px;">No results</div>`;
    dropdown.querySelectorAll(".search-result-item").forEach(item =>
      item.onclick = () => { loadStockAnalysis(item.dataset.ticker); input.value=""; dropdown.style.display="none"; clearBtn.style.display="none"; }
    );
    dropdown.style.display = "block";
  };
  clearBtn.onclick = () => { input.value=""; dropdown.style.display="none"; clearBtn.style.display="none"; };
  document.addEventListener("click", e => { if(!input.contains(e.target)&&!dropdown.contains(e.target)) dropdown.style.display="none"; });
}

// ──────────────────────────────────────────────
// MARKET STATUS
// ──────────────────────────────────────────────
async function pollMarketStatus() {
  try {
    const res = await api.getMarketStatus();
    state.marketStatus = res.status;
    const dot = document.getElementById("market-status-dot");
    const text = document.getElementById("market-status-text");
    if (dot && text) {
      const open = state.marketStatus === "OPEN";
      dot.className = open ? "g-pulse" : "g-pulse market-closed";
      text.textContent = open ? "Live Markets" : "Market Closed";
    }
    updateTradeButtonState();
  } catch {}
}

function updateTradeButtonState() {
  const btn = document.getElementById("btn-execute-trade");
  if (!btn) return;
  const closed = state.marketStatus === "CLOSED";
  btn.disabled = closed; btn.textContent = closed ? "MARKET CLOSED" : state.currentTradeType;
  btn.style.opacity = closed ? "0.5" : "1";
}

// ──────────────────────────────────────────────
// TICKER TAPE
// ──────────────────────────────────────────────
function buildTickerHTML(stocks) {
  const items = [...stocks, ...stocks];
  return items.map(s => {
    const up = s.changePercent >= 0;
    return `<div class="g-ticker-item"><span class="g-ticker-name">${s.ticker}</span><span>${s.price.toFixed(2)}</span><span class="${up?'g-ticker-up':'g-ticker-down'}">${up?'+':''}${s.changePercent.toFixed(2)}%</span></div>`;
  }).join("");
}

function initLandingTicker() {
  const el = document.getElementById("landing-ticker");
  if (el) el.innerHTML = `<div class="g-ticker-item"><span class="g-ticker-name">Loading market data...</span></div>`;
  api.getStocks().then(stocks => { if (el) el.innerHTML = buildTickerHTML(stocks); }).catch(() => {});
}

// ──────────────────────────────────────────────
// DATA LOADING
// ──────────────────────────────────────────────
async function loadInitialData() {
  await loadPortfolioData();
  const quotes = await api.getStocks();
  state.stocks = quotes;
  if (!state.activeTicker) state.activeTicker = quotes[0]?.ticker || "";

  const watch = await api.getWatchlist();
  state.watchlist = watch.map(w => w.ticker);

  refreshDashboard();
  lucide.createIcons();
}

async function loadPortfolioData() {
  try {
    state.portfolio = await api.getPortfolio();
    const fmt = formatINR(state.portfolio.balance);
    document.getElementById("header-cash-balance").textContent = fmt;
    const cashEls = ["port-cash-balance","trade-avail-cash"];
    cashEls.forEach(id => { const el = document.getElementById(id); if(el) el.textContent = fmt; });
  } catch {}
}

setInterval(updateMarketIndices, 15000);

function connectSSE() {
  api.connectRealtime(quotes => {
    for (const [ticker, q] of Object.entries(quotes)) {
      const i = state.stocks.findIndex(s => s.ticker === ticker);
      if (i !== -1) state.stocks[i] = { ...state.stocks[i], ...q }; else state.stocks.push(q);
    }
    updateLiveDOM(quotes);
  }, () => setTimeout(connectSSE, 5000));
}

// ──────────────────────────────────────────────
// LIVE DOM UPDATES
// ──────────────────────────────────────────────
function updateLiveDOM(quotes) {
  state.stocks.forEach(s => {
    const q = quotes[s.ticker]; if (!q) return;
    const card = document.querySelector(`.g-stock-card[data-ticker="${s.ticker}"]`);
    if (card) {
      const priceEl = card.querySelector(".g-card-price"); if(priceEl) priceEl.textContent = `₹${q.price.toFixed(2)}`;
      const chgEl = card.querySelector(".g-card-change");
      if(chgEl) { const up = q.changePercent >= 0; chgEl.textContent = `${up?'+':''}${q.changePercent.toFixed(2)}%`; chgEl.className = `g-card-change ${up?'text-bull':'text-bear'}`; }
    }
  });
  state.watchlist.forEach(ticker => {
    const q = quotes[ticker]; if (!q) return;
    const row = document.querySelector(`.g-wl-row[data-ticker="${ticker}"]`);
    if (row) {
      row.querySelector(".g-wl-price").textContent = `₹${q.price.toFixed(2)}`;
      const chg = row.querySelector(".g-wl-chg"); const up = q.changePercent >= 0;
      chg.textContent = `${up?'+':''}${q.changePercent.toFixed(2)}%`; chg.className = `g-wl-chg ${up?'text-bull':'text-bear'}`;
    }
  });
  updateMarketIndices();
  const cq = quotes[state.activeTicker];
  if (cq) {
    const pp = document.getElementById("anal-banner-price"); if(pp) pp.textContent = `₹${cq.price.toFixed(2)}`;
    const pc = document.getElementById("anal-banner-change"); if(pc) { const up = cq.changePercent >= 0; pc.textContent = `${up?'+':''}${cq.change.toFixed(2)} (${up?'+':''}${cq.changePercent.toFixed(2)}%)`; pc.className = `g-stock-change ${up?'g-bull':'g-bear'}`; }
    updateMarketDepth(cq); updateEstimatedCost();
  }
}

async function updateMarketIndices() {
  try {
    const indices = await api.getIndices();
    if (!indices || Object.keys(indices).length === 0) return;

    const set = (pid, cid, data) => {
      if (!data) return;
      const p = document.getElementById(pid); 
      if(p) p.textContent = data.price.toLocaleString('en-IN',{maximumFractionDigits:2});
      const c = document.getElementById(cid); 
      if(c) { 
        const sign = data.changePercent >= 0 ? '+' : '';
        const cls = data.changePercent >= 0 ? 'g-bull' : 'g-bear';
        c.textContent = `${sign}${data.changePercent.toFixed(2)}%`; 
        c.className = `g-idx-change ${cls}`; 
      }
    };
    
    set("index-tech-price","index-tech-change", indices.NIFTY);
    set("index-comp-price","index-comp-change", indices.SENSEX);
    set("index-bank-price","index-bank-change", indices.BANKNIFTY);
    set("index-mid-price","index-mid-change", indices.MIDCPNIFTY);
    set("index-fin-price","index-fin-change", indices.FINNIFTY);
  } catch(err) {
    console.error("Failed to fetch market indices:", err);
  }
}

// ──────────────────────────────────────────────
// EXPLORE DASHBOARD
// ──────────────────────────────────────────────
function refreshDashboard() {
  renderStockCards();
  renderGainersLosersList();
  renderWatchlistSidebar();
  renderRecentTransactions();
  updateMarketIndices();
  updateInvestmentsSummary();
  lucide.createIcons();
}

function renderStockCards() {
  const grid = document.getElementById("dashboard-stock-grid"); if (!grid) return;
  const top8 = state.stocks.slice(0,8);
  grid.innerHTML = top8.map(s => {
    const up = s.changePercent >= 0;
    const watched = state.watchlist.includes(s.ticker);
    return `<div class="g-stock-card" data-ticker="${s.ticker}">
      <div class="g-card-logo" style="background:${getLogoColor(s.ticker)}15;color:${getLogoColor(s.ticker)};font-weight:700;width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;margin-bottom:8px;">${s.ticker.slice(0,2)}</div>
      <div class="g-card-name">${s.name||s.ticker}</div>
      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:auto;">
        <div><div class="g-card-price">₹${s.price.toFixed(2)}</div><div class="g-card-change ${up?'text-bull':'text-bear'}">${up?'+':''}${s.change?.toFixed(2)||'0.00'} (${s.changePercent.toFixed(2)}%)</div></div>
        <button class="g-star-btn" data-ticker="${s.ticker}" onclick="event.stopPropagation();toggleWatchlist('${s.ticker}')" style="background:none;border:none;cursor:pointer;font-size:18px;color:${watched?'#f59e0b':'#ccc'}">★</button>
      </div>
    </div>`;
  }).join("");
  grid.querySelectorAll(".g-stock-card").forEach(card => {
    card.onclick = e => { if (e.target.closest(".g-star-btn")) return; loadStockAnalysis(card.dataset.ticker); };
  });
}

function getLogoColor(ticker) { const colors = ["#3b82f6","#10b981","#f59e0b","#ec4899","#8b5cf6","#06b6d4","#f43f5e","#14b8a6"]; return colors[ticker.charCodeAt(0) % colors.length]; }

function updateInvestmentsSummary() {
  const p = state.portfolio; if (!p) return;
  let invested = 0;
  for (const h of Object.values(p.holdings)) invested += h.shares * h.avgPrice;
  const returns = p.holdingsValue - invested;
  const pct = invested > 0 ? (returns/invested*100).toFixed(2) : "0.00";
  const cls = returns >= 0 ? "g-bull" : "g-bear";

  const el = (id, v) => { const e = document.getElementById(id); if(e) e.textContent = v; };
  el("invest-current-value", formatINR(p.holdingsValue));
  el("invest-invested", formatINR(invested));
  const trEl = document.getElementById("invest-total-returns");
  if(trEl) { trEl.textContent = `${formatINR(returns)} (${pct}%)`; trEl.className = `g-invest-value ${cls}`; }
  const drEl = document.getElementById("invest-1d-returns");
  if(drEl) { drEl.textContent = `${formatINR(returns * 0.05)} (${(pct*0.05).toFixed(2)}%)`; drEl.className = `g-invest-value ${cls}`; }
}

function renderWatchlistSidebar() {
  const panel = document.getElementById("sidebar-watchlist"); if (!panel) return;
  const ws = state.stocks.filter(s => state.watchlist.includes(s.ticker));
  if (!ws.length) { panel.innerHTML=`<div class="g-empty">No stocks on your watchlist</div>`; return; }
  panel.innerHTML = ws.map(s => {
    const up = s.changePercent >= 0;
    return `<div class="g-wl-row" data-ticker="${s.ticker}"><div><div class="g-wl-ticker">${s.ticker}</div><div class="g-wl-name">${s.name||""}</div></div><div class="g-wl-right"><div class="g-wl-price">₹${s.price.toFixed(2)}</div><div class="g-wl-chg ${up?'text-bull':'text-bear'}">${up?'+':''}${s.changePercent.toFixed(2)}%</div></div></div>`;
  }).join("");
  panel.querySelectorAll(".g-wl-row").forEach(row => row.onclick = () => loadStockAnalysis(row.dataset.ticker));
}

function renderRecentTransactions() {
  const list = document.getElementById("dashboard-transactions-list"); if (!list||!state.portfolio) return;
  const txs = state.portfolio.transactions.slice(0,5);
  if (!txs.length) { list.innerHTML=`<div class="g-empty">No transactions yet</div>`; return; }
  list.innerHTML = txs.map(t => {
    const buy = t.type==="BUY";
    return `<div class="g-txn-row"><span class="g-txn-type ${buy?'g-txn-buy':'g-txn-sell'}">${t.type}</span><span class="g-txn-ticker">${t.ticker}</span><span style="font-size:11px;color:#8c8fa6;">${t.shares} sh</span><span class="g-txn-val ${buy?'g-bear':'g-bull'}">${buy?'-':'+'}₹${(t.price*t.shares).toLocaleString('en-IN',{maximumFractionDigits:0})}</span></div>`;
  }).join("");
}

function renderGainersLosersList() {
  const tbody = document.getElementById("market-list-tbody"); if (!tbody) return;
  let sorted;
  if (state.currentListTab === "volume") {
    sorted = [...state.stocks].sort((a,b) => (b.volume||0) - (a.volume||0));
  } else {
    sorted = [...state.stocks].sort((a,b) => state.currentListTab === "gainers" ? b.changePercent - a.changePercent : a.changePercent - b.changePercent);
  }
  const top = sorted.slice(0,10);
  tbody.innerHTML = top.map(s => {
    const up = s.changePercent >= 0;
    return `<tr class="g-movers-row" data-ticker="${s.ticker}" style="cursor:pointer;"><td><strong>${s.ticker}</strong><div style="font-size:11px;color:#8c8fa6;">${s.name||''}</div></td><td class="text-right">₹${s.price.toFixed(2)}<div style="font-size:11px" class="${up?'text-bull':'text-bear'}">${up?'+':''}${s.changePercent.toFixed(2)}%</div></td><td class="text-right ${up?'text-bull':'text-bear'}">${up?'+':''}${s.change?.toFixed(2)||'0.00'}</td></tr>`;
  }).join("");
  tbody.querySelectorAll(".g-movers-row").forEach(row => row.onclick = () => loadStockAnalysis(row.dataset.ticker));
}

function initListTabs() {
  document.getElementById("btn-tab-gainers").onclick = () => { setListTab("gainers"); };
  document.getElementById("btn-tab-losers").onclick = () => { setListTab("losers"); };
  document.getElementById("btn-tab-volume")?.addEventListener("click", () => { setListTab("volume"); });
}
function setListTab(tab) {
  state.currentListTab = tab;
  document.querySelectorAll(".g-list-tab").forEach(t => t.classList.remove("active"));
  const btn = document.getElementById(`btn-tab-${tab}`); if(btn) btn.classList.add("active");
  renderGainersLosersList();
}

// ──────────────────────────────────────────────
// STOCK ANALYSIS
// ──────────────────────────────────────────────
async function loadStockAnalysis(ticker) {
  state.activeTicker = ticker;
  // Navigate to analysis view (hidden tab)
  document.querySelectorAll(".g-app-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".g-view").forEach(v => v.classList.remove("active-view"));
  document.getElementById("view-analysis")?.classList.add("active-view");

  const s = state.stocks.find(s => s.ticker === ticker);
  if (s) {
    document.getElementById("anal-banner-name").textContent = s.name || ticker;
    document.getElementById("anal-banner-price").textContent = `₹${s.price.toFixed(2)}`;
    const up = s.changePercent >= 0;
    const chgEl = document.getElementById("anal-banner-change");
    chgEl.textContent = `${up?'+':''}${s.change?.toFixed(2)||'0.00'} (${up?'+':''}${s.changePercent.toFixed(2)}%)`; chgEl.className = `g-stock-change ${up?'g-bull':'g-bear'}`;
    document.getElementById("metric-open").textContent = `₹${s.open?.toFixed(2)||'--'}`;
    document.getElementById("metric-volume").textContent = (s.volume||0).toLocaleString('en-IN');
    document.getElementById("metric-mcap").textContent = s.marketCap ? `₹${(s.marketCap/1e12).toFixed(2)}T` : '--';
    document.getElementById("metric-pe").textContent = s.peRatio?.toFixed(2) || '--';
    document.getElementById("metric-yield").textContent = s.dividendYield ? `${s.dividendYield.toFixed(2)}%` : '--';
    updateMarketDepth(s); updatePerformanceSlider(s); updateTradeWidgetDetails();
  }
  loadChartData(ticker, state.activeInterval);
  try { const a = await api.getStockAnalysis(ticker); renderAnalysis(a); } catch {}
  lucide.createIcons();
}

function refreshAnalysis() { if (state.activeTicker) loadStockAnalysis(state.activeTicker); }

async function loadChartData(ticker, range) {
  try {
    const history = await api.getStockHistory(ticker, range);
    if (!state.priceChart) state.priceChart = createPriceChart("mainPriceChart");
    updatePriceChart(state.priceChart, history, ticker);
  } catch {}
}

function renderAnalysis(a) {
  if (!a) return;
  const el = (id,v) => { const e = document.getElementById(id); if(e) e.textContent = v; };
  el("anal-rating-score", a.score ?? 50);
  el("anal-rating-signal", a.signal || "Hold");
  el("anal-rating-description", a.description || "");
  if (a.indicators) {
    el("ind-rsi", a.indicators.rsi?.toFixed(2) ?? "--");
    el("ind-macd", a.indicators.macd?.toFixed(4) ?? "--");
    el("ind-macd-signal", a.indicators.macdSignal?.toFixed(4) ?? "--");
    el("ind-sma20", a.indicators.sma20 ? `₹${a.indicators.sma20.toFixed(2)}` : "--");
    el("ind-sma50", a.indicators.sma50 ? `₹${a.indicators.sma50.toFixed(2)}` : "--");
  }
}

function updatePerformanceSlider(s) {
  const low = s.low || s.price*0.98, high = s.high || s.price*1.02;
  const low52 = s.yearLow || s.price*0.8, high52 = s.yearHigh || s.price*1.2;
  document.getElementById("perf-today-low").textContent = `₹${low.toFixed(2)}`;
  document.getElementById("perf-today-high").textContent = `₹${high.toFixed(2)}`;
  document.getElementById("perf-52w-low").textContent = `₹${low52.toFixed(2)}`;
  document.getElementById("perf-52w-high").textContent = `₹${high52.toFixed(2)}`;
  document.getElementById("perf-today-pointer").style.left = `${Math.min(100,Math.max(0,((s.price-low)/(high-low))*100))}%`;
  document.getElementById("perf-52w-pointer").style.left = `${Math.min(100,Math.max(0,((s.price-low52)/(high52-low52))*100))}%`;
}

function updateMarketDepth(s) {
  const buyBody = document.getElementById("depth-buy-tbody"), sellBody = document.getElementById("depth-sell-tbody");
  if (!buyBody||!sellBody) return;
  const p = s.price;
  buyBody.innerHTML = Array.from({length:5},(_,i)=>`<tr><td class="g-bull">₹${(p*(1-0.002*(i+1))).toFixed(2)}</td><td class="text-right">${Math.floor(Math.random()*500+100)}</td></tr>`).join("");
  sellBody.innerHTML = Array.from({length:5},(_,i)=>`<tr><td class="g-bear">₹${(p*(1+0.002*(i+1))).toFixed(2)}</td><td class="text-right">${Math.floor(Math.random()*500+100)}</td></tr>`).join("");
}

// ──────────────────────────────────────────────
// TRADE WIDGET
// ──────────────────────────────────────────────
function initTradeWidget() {
  const buyTab = document.getElementById("trade-tab-buy"), sellTab = document.getElementById("trade-tab-sell");
  const input = document.getElementById("trade-shares-input"), btn = document.getElementById("btn-execute-trade");

  buyTab.onclick = () => { buyTab.classList.add("active"); sellTab.classList.remove("active"); state.currentTradeType="BUY"; btn.className="g-execute-btn g-buy-btn"; updateTradeButtonState(); updateEstimatedCost(); };
  sellTab.onclick = () => { sellTab.classList.add("active"); buyTab.classList.remove("active"); state.currentTradeType="SELL"; btn.className="g-execute-btn g-sell-btn"; updateTradeButtonState(); updateEstimatedCost(); };
  input.oninput = updateEstimatedCost;

  btn.onclick = async () => {
    const qty = parseInt(input.value);
    if (!qty||qty<=0) { alert("Enter a valid quantity"); return; }
    btn.disabled = true; btn.textContent = "EXECUTING...";
    try {
      await api.executeTrade(state.activeTicker, state.currentTradeType, qty);
      await loadPortfolioData(); updateTradeWidgetDetails();
      alert(`✅ ${state.currentTradeType} ${qty} shares of ${state.activeTicker} executed!`);
    } catch(err) { alert(`❌ ${err.message}`); }
    finally { btn.disabled = false; updateTradeButtonState(); }
  };

  document.getElementById("btn-toggle-watchlist")?.addEventListener("click", () => toggleWatchlist(state.activeTicker));
}

function updateEstimatedCost() {
  const q = state.stocks.find(s => s.ticker === state.activeTicker); if (!q) return;
  const qty = parseInt(document.getElementById("trade-shares-input")?.value)||0;
  document.getElementById("trade-est-total").textContent = formatINR(q.price * qty);
}

function updateTradeWidgetDetails() {
  const h = state.portfolio?.holdings?.[state.activeTicker];
  document.getElementById("trade-shares-owned").textContent = h?.shares || 0;
  updateEstimatedCost();
  const wt = document.getElementById("text-watchlist-btn");
  if(wt) wt.textContent = state.watchlist.includes(state.activeTicker) ? "Remove from Watchlist" : "Add to Watchlist";
}

function initIntervalSelectors() {
  document.querySelectorAll(".g-pill").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".g-pill").forEach(b => b.classList.remove("g-pill-active"));
      btn.classList.add("g-pill-active");
      state.activeInterval = btn.dataset.interval;
      loadChartData(state.activeTicker, state.activeInterval);
    };
  });
}

// ──────────────────────────────────────────────
// ADD FUNDS MODAL
// ──────────────────────────────────────────────
function initAddFundsModal() {
  const modal = document.getElementById("add-funds-modal");
  const openBtns = [document.getElementById("btn-add-funds"), document.getElementById("btn-wallet-chip")];
  openBtns.forEach(btn => { if(btn) btn.onclick = () => { modal.classList.remove("hidden"); lucide.createIcons(); }; });
  document.getElementById("btn-close-funds-modal").onclick = () => modal.classList.add("hidden");

  // Quick amount buttons
  document.querySelectorAll(".g-quick-amt").forEach(btn => {
    btn.onclick = () => document.getElementById("funds-amount").value = btn.dataset.amount;
  });

  document.getElementById("btn-submit-funds").onclick = async () => {
    const amount = Number(document.getElementById("funds-amount").value);
    const bank = document.getElementById("funds-bank").value.trim();
    const upi = document.getElementById("funds-upi-ref").value.trim();
    const errEl = document.getElementById("funds-error");
    const sucEl = document.getElementById("funds-success");

    errEl.classList.add("hidden"); sucEl.classList.add("hidden");
    if (!amount || amount <= 0 || !bank || !upi) { errEl.textContent = "Please fill all fields with valid values"; errEl.classList.remove("hidden"); return; }

    const btn = document.getElementById("btn-submit-funds");
    btn.disabled = true; btn.textContent = "Processing...";
    try {
      const res = await api.addFunds(amount, upi, bank);
      sucEl.textContent = `✅ ₹${amount.toLocaleString('en-IN')} added successfully!`; sucEl.classList.remove("hidden");
      await loadPortfolioData();
      updateInvestmentsSummary();
      document.getElementById("funds-amount").value = "";
      document.getElementById("funds-bank").value = "";
      document.getElementById("funds-upi-ref").value = "";
      setTimeout(() => { modal.classList.add("hidden"); sucEl.classList.add("hidden"); }, 2000);
    } catch(err) { errEl.textContent = err.message; errEl.classList.remove("hidden"); }
    finally { btn.disabled = false; btn.textContent = "Add Funds"; }
  };
}

// ──────────────────────────────────────────────
// HOLDINGS VIEW
// ──────────────────────────────────────────────
async function refreshHoldings() {
  await loadPortfolioData();
  const p = state.portfolio; if (!p) return;
  let invested = 0;
  for (const h of Object.values(p.holdings)) invested += h.shares * h.avgPrice;
  const returns = p.holdingsValue - invested;
  const pct = invested > 0 ? (returns/invested*100).toFixed(2) : "0.00";

  const el = (id,v) => { const e = document.getElementById(id); if(e) e.textContent = v; };
  el("holdings-current-value", formatINR(p.holdingsValue));
  el("holdings-invested-val", formatINR(invested));
  const retEl = document.getElementById("holdings-returns-val");
  if(retEl) { retEl.textContent = `${formatINR(returns)} (${pct}%)`; retEl.className = `g-tile-val ${returns>=0?'g-bull':'g-bear'}`; }

  const tbody = document.getElementById("holdings-table-tbody");
  const entries = Object.entries(p.holdings);
  if (!entries.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="g-empty"><div class="g-empty-state" style="padding:40px 0;"><div style="font-size:48px;color:#ccc;margin-bottom:12px;">📦</div><div style="font-size:16px;font-weight:600;color:#44475b;margin-bottom:6px;">No holdings yet</div><div style="font-size:13px;color:#8c8fa6;">Add funds and start investing from Explore</div></div></td></tr>`;
  } else {
    tbody.innerHTML = entries.map(([ticker, h]) => {
      const up = (h.profitLoss||0) >= 0;
      return `<tr><td><strong>${ticker}</strong></td><td class="text-right">${h.shares}</td><td class="text-right">₹${h.avgPrice.toFixed(2)}</td><td class="text-right">₹${h.currentPrice?.toFixed(2)||'--'}</td><td class="text-right">₹${h.totalValue?.toFixed(2)||'--'}</td><td class="text-right ${up?'g-bull':'g-bear'}">₹${h.profitLoss?.toFixed(2)||'--'} (${h.profitLossPercent?.toFixed(2)||0}%)</td><td><button onclick="loadStockAnalysis('${ticker}')" style="background:var(--green);color:#fff;border:none;padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;">Trade</button></td></tr>`;
    }).join("");
  }
  lucide.createIcons();
}

// ──────────────────────────────────────────────
// PORTFOLIO / ORDERS VIEW
// ──────────────────────────────────────────────
async function refreshPortfolio() {
  await loadPortfolioData();
  const p = state.portfolio; if (!p) return;
  let invested = 0;
  for (const h of Object.values(p.holdings)) invested += h.shares * h.avgPrice;
  const returns = p.holdingsValue - invested;
  const pct = invested > 0 ? (returns/invested*100).toFixed(2) : "0.00";

  const el = (id,v) => { const e = document.getElementById(id); if(e) e.textContent = v; };
  el("port-invested-val", formatINR(invested));
  el("port-holdings-value", formatINR(p.holdingsValue));
  const retEl = document.getElementById("port-returns-val");
  if(retEl) { retEl.textContent = `${formatINR(returns)} (${pct}%)`; retEl.className = `g-tile-val ${returns>=0?'g-bull':'g-bear'}`; }

  const tbody = document.getElementById("portfolio-holdings-tbody");
  const entries = Object.entries(p.holdings);
  if (!entries.length) tbody.innerHTML = `<tr><td colspan="7" class="g-empty">No holdings</td></tr>`;
  else tbody.innerHTML = entries.map(([ticker, h]) => {
    const up = (h.profitLoss||0) >= 0;
    return `<tr><td><strong>${ticker}</strong></td><td class="text-right">${h.shares}</td><td class="text-right">₹${h.avgPrice.toFixed(2)}</td><td class="text-right">₹${h.currentPrice?.toFixed(2)||'--'}</td><td class="text-right">₹${h.totalValue?.toFixed(2)||'--'}</td><td class="text-right ${up?'g-bull':'g-bear'}">₹${h.profitLoss?.toFixed(2)||'--'} (${h.profitLossPercent?.toFixed(2)||0}%)</td><td><button onclick="loadStockAnalysis('${ticker}')" style="background:var(--green);color:#fff;border:none;padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;">Trade</button></td></tr>`;
  }).join("");

  const txbody = document.getElementById("portfolio-transactions-tbody");
  if (!p.transactions?.length) txbody.innerHTML = `<tr><td colspan="7" class="g-empty">No orders</td></tr>`;
  else txbody.innerHTML = p.transactions.map(t => {
    const buy = t.type==="BUY";
    return `<tr><td style="font-size:11px;color:#8c8fa6;">${t.id.slice(0,10)}...</td><td>${new Date(t.date).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</td><td><span class="g-txn-type ${buy?'g-txn-buy':'g-txn-sell'}">${t.type}</span></td><td><strong>${t.ticker}</strong></td><td class="text-right">${t.shares}</td><td class="text-right">₹${t.price.toFixed(2)}</td><td class="text-right ${buy?'g-bear':'g-bull'}">${buy?'-':'+'}₹${(t.price*t.shares).toLocaleString('en-IN',{maximumFractionDigits:2})}</td></tr>`;
  }).join("");

  const mfBody = document.getElementById("portfolio-mf-holdings-tbody");
  const mfEntries = Object.entries(p.mfHoldings || {});
  if (!mfEntries.length) mfBody.innerHTML = `<tr><td colspan="7" class="g-empty">No mutual fund holdings.</td></tr>`;
  else mfBody.innerHTML = mfEntries.map(([mfId, h]) => {
    return `<tr><td><strong>${mfId}</strong></td><td class="text-right">${h.units.toFixed(4)}</td><td class="text-right">₹${h.avgNav.toFixed(2)}</td><td class="text-right">--</td><td class="text-right">--</td><td class="text-right">--</td><td><button onclick="loadMFAnalysis('${mfId}')" style="background:var(--green);color:#fff;border:none;padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;">Trade</button></td></tr>`;
  }).join("");

  if (!state.portfolioChart) state.portfolioChart = createPortfolioChart("portfolioChart");
  updatePortfolioChart(state.portfolioChart, p);
}

// ──────────────────────────────────────────────
// WATCHLIST VIEW
// ──────────────────────────────────────────────
function refreshWatchlistView() {
  const tbody = document.getElementById("watchlist-table-tbody"); if (!tbody) return;
  const ws = state.stocks.filter(s => state.watchlist.includes(s.ticker));
  if (!ws.length) { tbody.innerHTML = `<tr><td colspan="5" class="g-empty">No stocks in your watchlist. Add from Explore!</td></tr>`; return; }
  tbody.innerHTML = ws.map(s => {
    const up = s.changePercent >= 0;
    return `<tr style="cursor:pointer;" onclick="loadStockAnalysis('${s.ticker}')"><td><strong>${s.ticker}</strong><div style="font-size:11px;color:#8c8fa6;">${s.name||''}</div></td><td class="text-right">₹${s.price.toFixed(2)}</td><td class="text-right ${up?'text-bull':'text-bear'}">${up?'+':''}${s.changePercent.toFixed(2)}%</td><td class="text-right">${(s.volume||0).toLocaleString('en-IN')}</td><td><button onclick="event.stopPropagation();toggleWatchlist('${s.ticker}')" style="background:none;border:1px solid #eb5757;color:#eb5757;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;">Remove</button></td></tr>`;
  }).join("");
}

// ──────────────────────────────────────────────
// NEWS
// ──────────────────────────────────────────────
async function refreshNews() {
  const grid = document.getElementById("market-news-grid"); if (!grid) return;
  try {
    const news = await api.getNews();
    grid.innerHTML = news.map(n => {
      const sc = n.sentiment==="Bullish"?"g-sentiment-bull":n.sentiment==="Bearish"?"g-sentiment-bear":"g-sentiment-neutral";
      return `<div class="g-news-card"><div class="g-news-source">${n.source}</div><div class="g-news-title">${n.title}</div><div class="g-news-summary">${n.summary}</div><div class="g-news-footer"><span class="g-news-time">${n.time}</span><span class="g-news-sentiment ${sc}">${n.sentiment}</span></div></div>`;
    }).join("");
  } catch {}
}

// ──────────────────────────────────────────────
// PROFILE PAGE
// ──────────────────────────────────────────────
function initProfilePage() {
  document.getElementById("btn-save-profile")?.addEventListener("click", async () => {
    const phone = document.getElementById("profile-phone-input")?.value.trim();
    const dob = document.getElementById("profile-dob")?.value.trim();
    const pan = document.getElementById("profile-pan")?.value.trim().toUpperCase();
    const address = document.getElementById("profile-address")?.value.trim();
    const statusEl = document.getElementById("profile-save-status");
    try {
      await api.updateProfile({ phone, dob, panNumber: pan, address });
      if(statusEl) { statusEl.textContent = "✅ Saved!"; statusEl.style.color = "#00d09c"; setTimeout(() => statusEl.textContent = "", 3000); }
      // Update dropdown
      state.userProfile = await api.getAuthStatus();
      if(state.userProfile.phone) { const pe = document.getElementById("dropdown-phone"); if(pe) pe.textContent = state.userProfile.phone; }
    } catch(err) { if(statusEl) { statusEl.textContent = `❌ ${err.message}`; statusEl.style.color = "#eb5757"; } }
  });
}

function refreshProfileView() {
  api.getAuthStatus().then(res => {
    state.userProfile = res;
    const el = (id,v) => { const e = document.getElementById(id); if(e) e.value = v||""; };
    el("profile-name", res.name);
    el("profile-email", res.email);
    el("profile-phone-input", res.phone);
    el("profile-dob", res.dob);
    el("profile-pan", res.panNumber);
    el("profile-address", res.address);
    el("profile-created", res.createdAt ? new Date(res.createdAt).toLocaleDateString('en-IN',{year:'numeric',month:'long',day:'numeric'}) : "N/A");
    const init = document.getElementById("profile-large-initial");
    if(init && res.name) init.textContent = res.name[0].toUpperCase();
  });
  lucide.createIcons();
}

// ──────────────────────────────────────────────
// WATCHLIST TOGGLE
// ──────────────────────────────────────────────
async function toggleWatchlist(ticker) {
  const watched = state.watchlist.includes(ticker);
  try {
    if (watched) { await api.removeFromWatchlist(ticker); state.watchlist = state.watchlist.filter(t=>t!==ticker); }
    else { await api.addToWatchlist(ticker); state.watchlist.push(ticker); }
    updateTradeWidgetDetails(); renderWatchlistSidebar(); renderStockCards(); refreshWatchlistView();
  } catch(err) { console.error("Watchlist toggle failed", err); }
}

window.loadStockAnalysis = loadStockAnalysis;
window.toggleWatchlist = toggleWatchlist;
