const API_BASE = "";

export async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = sessionStorage.getItem("auth_token");
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Auth
  loginEmail: (email, password) => fetchJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  }),
  loginGoogle: (credential) => fetchJson("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential })
  }),
  registerUser: (name, email, password, phone, dob, panNumber, address) => fetchJson("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, phone, dob, panNumber, address })
  }),
  getAuthStatus: () => fetchJson("/api/auth/status"),
  setupPin: (pin) => fetchJson("/api/auth/setup", {
    method: "POST",
    body: JSON.stringify({ pin })
  }),
  loginPin: (pin) => fetchJson("/api/auth/loginPin", {
    method: "POST",
    body: JSON.stringify({ pin })
  }),

  // Profile
  updateProfile: (data) => fetchJson("/api/profile/update", {
    method: "PUT",
    body: JSON.stringify(data)
  }),

  // Wallet
  addFunds: (amount, upiRef, bankName) => fetchJson("/api/wallet/add-funds", {
    method: "POST",
    body: JSON.stringify({ amount, upiRef, bankName })
  }),
  getWalletTransactions: () => fetchJson("/api/wallet/transactions"),

  // Market
  getMarketStatus: () => fetchJson("/api/market-status"),
  getIndices: () => fetchJson("/api/market-indices"),
  // Stocks Data
  getStocks: () => fetchJson("/api/stocks"),
  getStockInfo: (ticker) => fetchJson(`/api/stocks/${ticker}`),
  getStockHistory: (ticker, range) => fetchJson(`/api/stocks/${ticker}/history?range=${range}`),
  getStockAnalysis: (ticker) => fetchJson(`/api/stocks/${ticker}/analysis`),
  
  // Watchlist
  getWatchlist: () => fetchJson("/api/watchlist"),
  addToWatchlist: (ticker) => fetchJson("/api/watchlist", {
    method: "POST",
    body: JSON.stringify({ ticker })
  }),
  removeFromWatchlist: (ticker) => fetchJson(`/api/watchlist/${ticker}`, {
    method: "DELETE"
  }),

  // Portfolio
  getPortfolio: () => fetchJson("/api/portfolio"),
  executeTrade: (ticker, type, shares) => fetchJson("/api/portfolio/trade", {
    method: "POST",
    body: JSON.stringify({ ticker, type, shares })
  }),

  // Mutual Funds
  getMutualFunds: () => fetchJson("/api/mf"),
  getMFDetails: (id, range = "1Y") => fetchJson(`/api/mf/${id}?range=${range}`),
  executeMFTrade: (mfId, type, amount) => fetchJson("/api/mf/trade", {
    method: "POST",
    body: JSON.stringify({ mfId, type, amount })
  }),

  // News
  getNews: (ticker) => fetchJson(`/api/news${ticker ? `?ticker=${ticker}` : ""}`),

  // SSE Real-time updates connection
  connectRealtime: (onUpdate, onError) => {
    const eventSource = new EventSource(`${API_BASE}/api/stocks/realtime`);
    
    eventSource.onmessage = (event) => {
      try {
        const quotes = JSON.parse(event.data);
        onUpdate(quotes);
      } catch (err) {
        console.error("Failed to parse SSE data", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Error:", err);
      if (onError) onError(err);
    };

    return () => {
      eventSource.close();
    };
  }
};
