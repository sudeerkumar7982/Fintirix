package com.fintrix.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.*;

@Service
public class StockService {

    public static class StockMetadata {
        public String ticker;
        public String name;
        public String category;
        public double basePrice;
        public double volatility;
        public double drift;
        public double marketCap;
        public double peRatio;
        public double dividendYield;

        public StockMetadata(String ticker, String name, String category, double basePrice, double volatility, double drift, double marketCap, double peRatio, double dividendYield) {
            this.ticker = ticker;
            this.name = name;
            this.category = category;
            this.basePrice = basePrice;
            this.volatility = volatility;
            this.drift = drift;
            this.marketCap = marketCap;
            this.peRatio = peRatio;
            this.dividendYield = dividendYield;
        }
    }

    public static class HistoricalBar {
        public String time;
        public double open;
        public double high;
        public double low;
        public double close;
        public long volume;

        public HistoricalBar(String time, double open, double high, double low, double close, long volume) {
            this.time = time;
            this.open = open;
            this.high = high;
            this.low = low;
            this.close = close;
            this.volume = volume;
        }
    }

    public static class StockQuote {
        public String ticker;
        public double price;
        public double change;
        public double changePercent;
        public double high;
        public double low;
        public double open;
        public long volume;

        public StockQuote() {}
        public StockQuote(String ticker, double price, double change, double changePercent, double high, double low, double open, long volume) {
            this.ticker = ticker;
            this.price = price;
            this.change = change;
            this.changePercent = changePercent;
            this.high = high;
            this.low = low;
            this.open = open;
            this.volume = volume;
        }
    }

    public static class TechnicalIndicators {
        public double sma20;
        public double sma50;
        public double ema12;
        public double ema26;
        public double rsi;
        public double macd;
        public double macdSignal;
        public double macdHist;
    }

    public static class Recommendation {
        public int score;
        public String signal;
        public String description;
    }

    public static class AnalysisResult {
        public String ticker;
        public double price;
        public TechnicalIndicators indicators;
        public Recommendation recommendation;
    }

    private final Map<String, StockMetadata> stockMetadata = new ConcurrentHashMap<>();
    private final Map<String, List<HistoricalBar>> historyStore = new ConcurrentHashMap<>();
    private final Map<String, StockQuote> currentQuotes = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> currentIndices = new ConcurrentHashMap<>();
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();
    private final RestTemplate restTemplate = new RestTemplate();
    private final Random random = new Random();

    @PostConstruct
    public void init() {
        // Initialize Metadata
        addMeta("RELIANCE", "Reliance Industries Ltd.", "Energy & Conglomerate", 2450.00, 0.14, 0.00022, 16500, 25.5, 0.38);
        addMeta("TCS", "Tata Consultancy Services Ltd.", "Technology", 3850.00, 0.13, 0.0002, 14100, 28.2, 1.25);
        addMeta("HDFCBANK", "HDFC Bank Ltd.", "Banking & Finance", 1420.00, 0.17, 0.00015, 10800, 18.5, 1.10);
        addMeta("INFY", "Infosys Ltd.", "Technology", 1550.00, 0.15, 0.00018, 6400, 24.3, 2.25);
        addMeta("ICICIBANK", "ICICI Bank Ltd.", "Banking & Finance", 1080.00, 0.15, 0.0002, 7600, 17.8, 0.90);
        addMeta("SBIN", "State Bank of India", "Banking & Finance", 780.00, 0.20, 0.00025, 6900, 10.5, 1.50);
        addMeta("WIPRO", "Wipro Ltd.", "Technology", 450.00, 0.14, 0.00018, 2400, 20.8, 0.22);
        addMeta("ITC", "ITC Ltd.", "FMCG & Conglomerate", 430.00, 0.11, 0.00015, 5400, 26.8, 3.60);
        addMeta("LT", "Larsen & Toubro Ltd.", "Engineering & Infra", 3350.00, 0.15, 0.0002, 4600, 32.5, 0.85);
        addMeta("BHARTIARTL", "Bharti Airtel Ltd.", "Telecommunications", 1120.00, 0.14, 0.00022, 6300, 45.2, 0.35);
        
        addMeta("HCLTECH", "HCL Technologies Ltd.", "Technology", 1320.00, 0.15, 0.00015, 3500, 22.4, 1.50);
        addMeta("TECHM", "Tech Mahindra Ltd.", "Technology", 1220.00, 0.17, 0.00015, 1180, 25.1, 2.10);
        addMeta("LTIM", "LTIMindtree Ltd.", "Technology", 4750.00, 0.18, 0.00015, 1400, 34.6, 1.10);
        
        addMeta("AXISBANK", "Axis Bank Ltd.", "Banking & Finance", 1150.00, 0.16, 0.0002, 3500, 12.8, 0.20);
        addMeta("KOTAKBANK", "Kotak Mahindra Bank Ltd.", "Banking & Finance", 1720.00, 0.15, 0.00018, 3400, 18.9, 0.12);
        addMeta("INDUSINDBK", "IndusInd Bank Ltd.", "Banking & Finance", 1450.00, 0.18, 0.00015, 1100, 13.5, 1.00);
        addMeta("BAJFINANCE", "Bajaj Finance Ltd.", "Banking & Finance", 6850.00, 0.18, 0.0002, 4100, 30.5, 0.50);
        addMeta("BAJAJFINSV", "Bajaj Finserv Ltd.", "Banking & Finance", 1580.00, 0.16, 0.00018, 2500, 28.5, 0.10);
        addMeta("SHRIRAMFIN", "Shriram Finance Ltd.", "Banking & Finance", 2350.00, 0.19, 0.0002, 880, 14.8, 1.20);
        addMeta("JIOFIN", "Jio Financial Services Ltd.", "Banking & Finance", 350.00, 0.22, 0.0003, 2200, 85.0, 0.00);
        
        addMeta("HDFCLIFE", "HDFC Life Insurance Co. Ltd.", "Insurance", 580.00, 0.15, 0.00015, 1250, 80.2, 0.35);
        addMeta("SBILIFE", "SBI Life Insurance Co. Ltd.", "Insurance", 1450.00, 0.14, 0.00015, 1450, 85.4, 0.20);
        
        addMeta("NTPC", "NTPC Ltd.", "Utilities & Power", 360.00, 0.16, 0.00025, 3400, 15.6, 2.10);
        addMeta("ONGC", "Oil & Natural Gas Corp Ltd.", "Energy & Drilling", 270.00, 0.18, 0.0002, 3300, 8.5, 4.25);
        addMeta("POWERGRID", "Power Grid Corp of India Ltd.", "Utilities & Power", 280.00, 0.14, 0.0002, 2600, 16.5, 4.00);
        addMeta("COALINDIA", "Coal India Ltd.", "Metal & Mining", 450.00, 0.17, 0.00022, 2700, 9.2, 5.50);
        addMeta("BPCL", "Bharat Petroleum Corp Ltd.", "Energy & Conglomerate", 620.00, 0.18, 0.0002, 1300, 5.4, 5.10);
        
        addMeta("TATAMOTORS", "Tata Motors Ltd.", "Automotive", 950.00, 0.26, 0.0003, 3100, 15.6, 0.60);
        addMeta("MARUTI", "Maruti Suzuki India Ltd.", "Automotive", 12200.00, 0.14, 0.0002, 3800, 28.5, 1.00);
        addMeta("HEROMOTOCO", "Hero MotoCorp Ltd.", "Automotive", 4600.00, 0.15, 0.00018, 920, 24.5, 2.10);
        addMeta("M_M", "Mahindra & Mahindra Ltd.", "Automotive", 2550.00, 0.16, 0.0002, 3100, 18.6, 0.90);
        addMeta("EICHERMOT", "Eicher Motors Ltd.", "Automotive", 4450.00, 0.16, 0.0002, 1200, 28.9, 0.95);
        
        addMeta("HINDUNILVR", "Hindustan Unilever Ltd.", "FMCG", 2350.00, 0.11, 0.00015, 5500, 55.4, 1.80);
        addMeta("NESTLEIND", "Nestle India Ltd.", "FMCG", 2500.00, 0.11, 0.00015, 2400, 75.2, 1.10);
        addMeta("TATACONSUM", "Tata Consumer Products Ltd.", "FMCG", 1150.00, 0.13, 0.00015, 1100, 68.4, 0.70);
        addMeta("BRITANNIA", "Britannia Industries Ltd.", "FMCG", 5200.00, 0.12, 0.00015, 1250, 52.8, 1.45);
        addMeta("TITAN", "Titan Company Ltd.", "Consumer Goods", 3400.00, 0.14, 0.0002, 3000, 88.5, 0.32);
        addMeta("ASIANPAINT", "Asian Paints Ltd.", "Consumer Goods", 2850.00, 0.13, 0.00015, 2700, 55.1, 1.05);
        
        addMeta("ADANIENT", "Adani Enterprises Ltd.", "Infrastructure & Utilities", 3150.00, 0.28, 0.0003, 3600, 90.5, 0.04);
        addMeta("ADANIPORTS", "Adani Ports & SEZ Ltd.", "Infrastructure & Transport", 1250.00, 0.22, 0.00025, 2700, 35.8, 0.40);
        addMeta("ULTRACEMCO", "UltraTech Cement Ltd.", "Cement & Materials", 9700.00, 0.13, 0.0002, 2800, 42.1, 0.35);
        addMeta("GRASIM", "Grasim Industries Ltd.", "Materials & Cement", 2250.00, 0.14, 0.0002, 1500, 28.5, 0.50);
        addMeta("TATASTEEL", "Tata Steel Ltd.", "Metal & Mining", 160.00, 0.22, 0.0002, 2000, 14.5, 2.25);
        addMeta("JSWSTEEL", "JSW Steel Ltd.", "Metal & Mining", 850.00, 0.18, 0.0002, 2000, 22.5, 0.50);
        addMeta("HINDALCO", "Hindalco Industries Ltd.", "Metal & Mining", 620.00, 0.21, 0.0002, 1400, 15.2, 0.55);
        
        addMeta("SUNPHARMA", "Sun Pharmaceutical Industries Ltd.", "Healthcare & Pharma", 1480.00, 0.13, 0.0002, 3500, 32.5, 0.80);
        addMeta("CIPLA", "Cipla Ltd.", "Healthcare & Pharma", 1380.00, 0.14, 0.00018, 1100, 28.6, 0.60);
        addMeta("DRREDDY", "Dr. Reddy's Laboratories Ltd.", "Healthcare & Pharma", 6200.00, 0.13, 0.00018, 1030, 18.5, 0.65);
        addMeta("APOLLOHOSP", "Apollo Hospitals Enterprise Ltd.", "Healthcare & Pharma", 6150.00, 0.16, 0.0002, 880, 65.4, 0.25);
        addMeta("DIVISLAB", "Divi's Laboratories Ltd.", "Healthcare & Pharma", 3850.00, 0.16, 0.00018, 1020, 52.4, 0.78);

        // Fetch / generate mock histories in parallel using an executor
        ExecutorService executor = Executors.newFixedThreadPool(10);
        List<CompletableFuture<Void>> futures = new ArrayList<>();
        for (String ticker : stockMetadata.keySet()) {
            futures.add(CompletableFuture.runAsync(() -> {
                boolean success = fetchStockHistoryFromYahoo(ticker);
                if (!success) {
                    generateMockHistory(ticker);
                }
            }, executor));
        }
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        executor.shutdown();
        System.out.println("✅ Loaded stock data.");

        fetchIndicesFromYahoo();

        // Background Thread for Polling Yahoo and Simulation
        ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);
        scheduler.scheduleAtFixedRate(() -> {
            if (isMarketOpen()) {
                pollRealPricesFromYahoo();
                fetchIndicesFromYahoo();
            }
        }, 15, 15, TimeUnit.SECONDS);

        scheduler.scheduleAtFixedRate(() -> {
            simulateRealtimeTick();
        }, 1500, 1500, TimeUnit.MILLISECONDS);
    }

    private void addMeta(String ticker, String name, String category, double basePrice, double volatility, double drift, double marketCap, double peRatio, double dividendYield) {
        stockMetadata.put(ticker, new StockMetadata(ticker, name, category, basePrice, volatility, drift, marketCap, peRatio, dividendYield));
    }

    public boolean isMarketOpen() {
        ZonedDateTime ist = ZonedDateTime.now(ZoneId.of("Asia/Kolkata"));
        DayOfWeek day = ist.getDayOfWeek();
        if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) return false;
        int timeVal = ist.getHour() * 100 + ist.getMinute();
        return timeVal >= 915 && timeVal <= 1530;
    }

    private String getYahooSymbol(String ticker) {
        if ("M_M".equals(ticker)) return "M&M.NS";
        return ticker + ".NS";
    }

    private double getDouble(Object obj) {
        if (obj instanceof Number) return ((Number) obj).doubleValue();
        return 0.0;
    }

    @SuppressWarnings("unchecked")
    private boolean fetchStockHistoryFromYahoo(String ticker) {
        String symbol = getYahooSymbol(ticker);
        String url = "https://query1.finance.yahoo.com/v8/finance/chart/" + symbol + "?interval=1d&range=1y";
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            Map<String, Object> data = response.getBody();
            Map<String, Object> chart = (Map<String, Object>) data.get("chart");
            List<Object> resultList = (List<Object>) chart.get("result");
            Map<String, Object> result = (Map<String, Object>) resultList.get(0);
            
            List<Number> timestamps = (List<Number>) result.get("timestamp");
            Map<String, Object> indicators = (Map<String, Object>) result.get("indicators");
            List<Object> quoteList = (List<Object>) indicators.get("quote");
            Map<String, Object> quote = (Map<String, Object>) quoteList.get(0);

            List<Number> opens = (List<Number>) quote.get("open");
            List<Number> highs = (List<Number>) quote.get("high");
            List<Number> lows = (List<Number>) quote.get("low");
            List<Number> closes = (List<Number>) quote.get("close");
            List<Number> volumes = (List<Number>) quote.get("volume");

            List<HistoricalBar> bars = new ArrayList<>();
            for (int i = 0; i < timestamps.size(); i++) {
                if (closes.get(i) == null) continue;
                long ts = timestamps.get(i).longValue();
                Date date = new Date(ts * 1000);
                String timeStr = new java.text.SimpleDateFormat("yyyy-MM-dd").format(date);
                
                double open = opens.get(i) != null ? opens.get(i).doubleValue() : closes.get(i).doubleValue();
                double high = highs.get(i) != null ? highs.get(i).doubleValue() : closes.get(i).doubleValue();
                double low = lows.get(i) != null ? lows.get(i).doubleValue() : closes.get(i).doubleValue();
                double close = closes.get(i).doubleValue();
                long vol = volumes.get(i) != null ? volumes.get(i).longValue() : 0L;

                bars.add(new HistoricalBar(timeStr, round(open), round(high), round(low), round(close), vol));
            }

            if (bars.isEmpty()) return false;
            historyStore.put(ticker, bars);

            HistoricalBar lastBar = bars.get(bars.size() - 1);
            HistoricalBar prevBar = bars.size() > 1 ? bars.get(bars.size() - 2) : lastBar;

            Map<String, Object> meta = (Map<String, Object>) result.get("meta");
            double currentPrice = meta.get("regularMarketPrice") != null ? getDouble(meta.get("regularMarketPrice")) : lastBar.close;
            double prevClose = meta.get("chartPreviousClose") != null ? getDouble(meta.get("chartPreviousClose")) :
                    (meta.get("previousClose") != null ? getDouble(meta.get("previousClose")) : prevBar.close);
            
            double change = currentPrice - prevClose;
            double changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

            double high = meta.get("high") != null ? getDouble(meta.get("high")) : lastBar.high;
            double low = meta.get("low") != null ? getDouble(meta.get("low")) : lastBar.low;
            double open = meta.get("open") != null ? getDouble(meta.get("open")) : lastBar.open;
            long volume = meta.get("volume") != null ? ((Number) meta.get("volume")).longValue() : lastBar.volume;

            currentQuotes.put(ticker, new StockQuote(ticker, round(currentPrice), round(change), round(changePercent), round(high), round(low), round(open), volume));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private void generateMockHistory(String ticker) {
        StockMetadata meta = stockMetadata.get(ticker);
        List<HistoricalBar> bars = new ArrayList<>();
        double currentPrice = meta.basePrice;
        int numDays = 365;
        long now = System.currentTimeMillis();
        long ONE_DAY = 24 * 60 * 60 * 1000L;

        for (int i = numDays; i > 0; i--) {
            Date date = new Date(now - i * ONE_DAY);
            Calendar cal = Calendar.getInstance();
            cal.setTime(date);
            int dayOfWeek = cal.get(Calendar.DAY_OF_WEEK);
            if (dayOfWeek == Calendar.SUNDAY || dayOfWeek == Calendar.SATURDAY) continue;

            double open = currentPrice;
            double changePercent = meta.drift + (meta.volatility / Math.sqrt(252)) * boxMullerRandom();
            double close = Math.max(0.01, open * (1 + changePercent));
            double dailyVolatility = meta.volatility / Math.sqrt(252);
            double high = Math.max(open, close) * (1 + Math.abs(boxMullerRandom()) * dailyVolatility * 0.4);
            double low = Math.min(open, close) * (1 - Math.abs(boxMullerRandom()) * dailyVolatility * 0.4);
            long volume = Math.round((500000 + random.nextDouble() * 2500000) * (meta.marketCap / 500.0));

            String timeStr = new java.text.SimpleDateFormat("yyyy-MM-dd").format(date);
            bars.add(new HistoricalBar(timeStr, round(open), round(high), round(low), round(close), volume));
            currentPrice = close;
        }

        historyStore.put(ticker, bars);

        HistoricalBar lastBar = bars.get(bars.size() - 1);
        HistoricalBar prevBar = bars.get(bars.size() - 2);
        double change = lastBar.close - prevBar.close;
        double changePercent = (change / prevBar.close) * 100;

        currentQuotes.put(ticker, new StockQuote(ticker, lastBar.close, round(change), round(changePercent), lastBar.high, lastBar.low, lastBar.open, lastBar.volume));
    }

    private double boxMullerRandom() {
        double u = 0, v = 0;
        while (u == 0) u = random.nextDouble();
        while (v == 0) v = random.nextDouble();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    @SuppressWarnings("unchecked")
    private void fetchIndicesFromYahoo() {
        Map<String, String> indicesMap = new HashMap<>();
        indicesMap.put("NIFTY", "^NSEI");
        indicesMap.put("SENSEX", "^BSESN");
        indicesMap.put("BANKNIFTY", "^NSEBANK");
        indicesMap.put("MIDCPNIFTY", "^CRSLMID");
        indicesMap.put("FINNIFTY", "^CNXFIN");

        for (Map.Entry<String, String> entry : indicesMap.entrySet()) {
            String name = entry.getKey();
            String symbol = entry.getValue();
            String url = "https://query1.finance.yahoo.com/v8/finance/chart/" + symbol + "?interval=1d&range=1d";
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.set("User-Agent", "Mozilla/5.0");
                HttpEntity<String> entity = new HttpEntity<>(headers);
                ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
                Map<String, Object> data = response.getBody();
                Map<String, Object> chart = (Map<String, Object>) data.get("chart");
                List<Object> resultList = (List<Object>) chart.get("result");
                Map<String, Object> result = (Map<String, Object>) resultList.get(0);
                Map<String, Object> meta = (Map<String, Object>) result.get("meta");

                double currentPrice = meta.get("regularMarketPrice") != null ? getDouble(meta.get("regularMarketPrice")) : 0.0;
                double prevClose = meta.get("chartPreviousClose") != null ? getDouble(meta.get("chartPreviousClose")) :
                        (meta.get("previousClose") != null ? getDouble(meta.get("previousClose")) : currentPrice);
                
                double change = currentPrice - prevClose;
                double changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

                Map<String, Object> idxInfo = new HashMap<>();
                idxInfo.put("price", round(currentPrice));
                idxInfo.put("change", round(change));
                idxInfo.put("changePercent", round(changePercent));
                currentIndices.put(name, idxInfo);
            } catch (Exception e) {
                // Fail silently
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void pollRealPricesFromYahoo() {
        for (String ticker : stockMetadata.keySet()) {
            String symbol = getYahooSymbol(ticker);
            String url = "https://query1.finance.yahoo.com/v8/finance/chart/" + symbol + "?interval=1d&range=1d";
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.set("User-Agent", "Mozilla/5.0");
                HttpEntity<String> entity = new HttpEntity<>(headers);
                ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
                Map<String, Object> data = response.getBody();
                Map<String, Object> chart = (Map<String, Object>) data.get("chart");
                List<Object> resultList = (List<Object>) chart.get("result");
                Map<String, Object> result = (Map<String, Object>) resultList.get(0);
                Map<String, Object> meta = (Map<String, Object>) result.get("meta");

                StockQuote quote = currentQuotes.get(ticker);
                if (quote == null) continue;

                double currentPrice = meta.get("regularMarketPrice") != null ? getDouble(meta.get("regularMarketPrice")) : quote.price;
                double prevClose = meta.get("previousClose") != null ? getDouble(meta.get("previousClose")) : (currentPrice - quote.change);
                
                double change = currentPrice - prevClose;
                double changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

                double high = meta.get("high") != null ? getDouble(meta.get("high")) : quote.high;
                double low = meta.get("low") != null ? getDouble(meta.get("low")) : quote.low;
                double open = meta.get("open") != null ? getDouble(meta.get("open")) : quote.open;
                long volume = meta.get("volume") != null ? ((Number) meta.get("volume")).longValue() : quote.volume;

                currentQuotes.put(ticker, new StockQuote(ticker, round(currentPrice), round(change), round(changePercent), round(high), round(low), round(open), volume));
            } catch (Exception e) {
                // Fail silently
            }
        }
    }

    private void simulateRealtimeTick() {
        if (!isMarketOpen()) return;

        Map<String, StockQuote> updatedQuotes = new HashMap<>();

        for (String ticker : stockMetadata.keySet()) {
            StockMetadata meta = stockMetadata.get(ticker);
            StockQuote quote = currentQuotes.get(ticker);
            if (quote == null) continue;

            double oldPrice = quote.price;
            double tickVolatility = meta.volatility * 0.0006;
            double changePercent = tickVolatility * boxMullerRandom();
            double newPrice = round(Math.max(0.01, oldPrice * (1 + changePercent)));

            double newHigh = round(Math.max(quote.high, newPrice));
            double newLow = round(Math.min(quote.low, newPrice));
            long newVolume = quote.volume + (long) (50 + random.nextInt(201));

            double todayOpen = quote.open;
            double dailyChange = newPrice - todayOpen;
            double dailyChangePercent = (dailyChange / todayOpen) * 100;

            StockQuote newQuote = new StockQuote(ticker, newPrice, round(dailyChange), round(dailyChangePercent), newHigh, newLow, todayOpen, newVolume);
            currentQuotes.put(ticker, newQuote);
            updatedQuotes.put(ticker, newQuote);

            List<HistoricalBar> hist = historyStore.get(ticker);
            if (hist != null && !hist.isEmpty()) {
                HistoricalBar lastBar = hist.get(hist.size() - 1);
                lastBar.close = newPrice;
                lastBar.high = newHigh;
                lastBar.low = newLow;
                lastBar.volume = newVolume;
            }
        }

        broadcastQuotes(updatedQuotes);
    }

    public void addEmitter(SseEmitter emitter) {
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
    }

    private void broadcastQuotes(Map<String, StockQuote> quotes) {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().data(quotes));
            } catch (Exception e) {
                emitters.remove(emitter);
            }
        }
    }

    public StockQuote getStockQuote(String ticker) {
        return currentQuotes.get(ticker.toUpperCase());
    }

    public List<StockQuote> getAllStockQuotes() {
        return new ArrayList<>(currentQuotes.values());
    }

    public Map<String, Map<String, Object>> getMarketIndices() {
        return currentIndices;
    }

    public List<HistoricalBar> getStockHistory(String ticker, String range) {
        List<HistoricalBar> bars = historyStore.get(ticker.toUpperCase());
        if (bars == null || bars.isEmpty()) return new ArrayList<>();

        String upperRange = range.toUpperCase();
        switch (upperRange) {
            case "1D":
                return simulateIntradayData(bars.get(bars.size() - 1), 24);
            case "1W":
                return bars.subList(Math.max(0, bars.size() - 5), bars.size());
            case "1M":
                return bars.subList(Math.max(0, bars.size() - 21), bars.size());
            case "1Y":
            default:
                return bars;
        }
    }

    private List<HistoricalBar> simulateIntradayData(HistoricalBar lastDailyBar, int pointsCount) {
        List<HistoricalBar> bars = new ArrayList<>();
        double startPrice = lastDailyBar.open;
        double targetPrice = lastDailyBar.close;

        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 9);
        cal.set(Calendar.MINUTE, 15);
        cal.set(Calendar.SECOND, 0);

        for (int i = 0; i < pointsCount; i++) {
            double progress = (double) i / (pointsCount - 1);
            double trend = startPrice + (targetPrice - startPrice) * progress;
            double noise = startPrice * 0.008 * boxMullerRandom();

            double close = round(trend + noise);
            if (i == pointsCount - 1) close = targetPrice;

            double open = (i == 0) ? startPrice : bars.get(i - 1).close;
            double high = round(Math.max(open, Math.max(close, trend + Math.abs(noise))));
            double low = round(Math.min(open, Math.min(close, trend - Math.abs(noise))));
            long volume = Math.round((lastDailyBar.volume / (double) pointsCount) * (0.5 + random.nextDouble()));
            
            Date time = new Date(cal.getTimeInMillis() + i * 15L * 60L * 1000L); // 15-minute increments
            String timeStr = new java.text.SimpleDateFormat("hh:mm a").format(time);

            bars.add(new HistoricalBar(timeStr, open, high, low, close, volume));
        }

        return bars;
    }

    public Map<String, Object> getFullStockInfo(String ticker) {
        StockMetadata meta = stockMetadata.get(ticker.toUpperCase());
        StockQuote quote = currentQuotes.get(ticker.toUpperCase());
        if (meta == null || quote == null) return null;

        Map<String, Object> result = new HashMap<>();
        result.put("ticker", meta.ticker);
        result.put("name", meta.name);
        result.put("category", meta.category);
        result.put("basePrice", meta.basePrice);
        result.put("volatility", meta.volatility);
        result.put("drift", meta.drift);
        result.put("marketCap", meta.marketCap);
        result.put("peRatio", meta.peRatio);
        result.put("dividendYield", meta.dividendYield);
        result.put("price", quote.price);
        result.put("change", quote.change);
        result.put("changePercent", quote.changePercent);
        result.put("high", quote.high);
        result.put("low", quote.low);
        result.put("open", quote.open);
        result.put("volume", quote.volume);
        return result;
    }

    // Technical Analysis Indicators calculations

    public AnalysisResult performAnalysis(String ticker) {
        List<HistoricalBar> history = getStockHistory(ticker, "1Y");
        if (history.isEmpty()) return null;

        List<Double> prices = new ArrayList<>();
        for (HistoricalBar bar : history) {
            prices.add(bar.close);
        }
        double currentPrice = prices.get(prices.size() - 1);

        TechnicalIndicators indicators = new TechnicalIndicators();
        indicators.sma20 = calculateSMA(prices, 20);
        indicators.sma50 = calculateSMA(prices, 50);
        indicators.ema12 = calculateEMA(prices, 12);
        indicators.ema26 = calculateEMA(prices, 26);
        indicators.rsi = calculateRSI(prices, 14);

        double[] macdArr = calculateMACD(prices);
        indicators.macd = macdArr[0];
        indicators.macdSignal = macdArr[1];
        indicators.macdHist = macdArr[2];

        Recommendation recommendation = generateRecommendation(currentPrice, indicators);

        AnalysisResult res = new AnalysisResult();
        res.ticker = ticker;
        res.price = currentPrice;
        res.indicators = indicators;
        res.recommendation = recommendation;

        return res;
    }

    private double calculateSMA(List<Double> prices, int period) {
        if (prices.size() < period) return prices.get(prices.size() - 1);
        double sum = 0;
        for (int i = prices.size() - period; i < prices.size(); i++) {
            sum += prices.get(i);
        }
        return round(sum / period);
    }

    private double calculateEMA(List<Double> prices, int period) {
        if (prices.isEmpty()) return 0.0;
        double k = 2.0 / (period + 1);
        double ema = prices.get(0);
        for (int i = 1; i < prices.size(); i++) {
            ema = prices.get(i) * k + ema * (1.0 - k);
        }
        return round(ema);
    }

    private double calculateRSI(List<Double> prices, int period) {
        if (prices.size() <= period) return 50.0;

        double gains = 0;
        double losses = 0;

        for (int i = 1; i <= period; i++) {
            double change = prices.get(i) - prices.get(i - 1);
            if (change > 0) {
                gains += change;
            } else {
                losses -= change;
            }
        }

        double avgGain = gains / period;
        double avgLoss = losses / period;

        for (int i = period + 1; i < prices.size(); i++) {
            double change = prices.get(i) - prices.get(i - 1);
            double currentGain = change > 0 ? change : 0;
            double currentLoss = change < 0 ? -change : 0;

            avgGain = (avgGain * (period - 1) + currentGain) / period;
            avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
        }

        if (avgLoss == 0) return 100.0;

        double rs = avgGain / avgLoss;
        double rsi = 100.0 - (100.0 / (1.0 + rs));
        return round(rsi);
    }

    private double[] calculateMACD(List<Double> prices) {
        if (prices.size() < 26) return new double[] { 0.0, 0.0, 0.0 };

        List<Double> macdLineSeries = new ArrayList<>();
        double k12 = 2.0 / (12 + 1);
        double k26 = 2.0 / (26 + 1);

        double ema12 = prices.get(0);
        double ema26 = prices.get(0);

        for (int i = 0; i < prices.size(); i++) {
            ema12 = prices.get(i) * k12 + ema12 * (1.0 - k12);
            ema26 = prices.get(i) * k26 + ema26 * (1.0 - k26);

            if (i >= 25) {
                macdLineSeries.add(ema12 - ema26);
            }
        }

        double macdVal = macdLineSeries.get(macdLineSeries.size() - 1);
        double signalVal = calculateEMA(macdLineSeries, 9);
        double histVal = macdVal - signalVal;

        return new double[] { round(macdVal), round(signalVal), round(histVal) };
    }

    private Recommendation generateRecommendation(double price, TechnicalIndicators indicators) {
        int score = 50;
        List<String> details = new ArrayList<>();

        if (indicators.rsi < 30) {
            score += 20;
            details.add("RSI indicates oversold conditions (Bullish).");
        } else if (indicators.rsi > 70) {
            score -= 20;
            details.add("RSI indicates overbought conditions (Bearish).");
        } else if (indicators.rsi > 50) {
            score += 5;
            details.add("RSI is slightly bullish.");
        } else {
            score -= 5;
            details.add("RSI is slightly bearish.");
        }

        if (price > indicators.sma50) {
            score += 10;
            details.add("Price is trading above 50-day SMA (Long-term Uptrend).");
        } else {
            score -= 10;
            details.add("Price is trading below 50-day SMA (Long-term Downtrend).");
        }

        if (price > indicators.sma20) {
            score += 5;
            if (indicators.sma20 > indicators.sma50) {
                score += 5;
                details.add("Price has SMA-20 crossing above SMA-50 support.");
            } else {
                details.add("Price is trading above 20-day SMA.");
            }
        } else {
            score -= 5;
            details.add("Price is trading below 20-day SMA.");
        }

        if (indicators.macd > indicators.macdSignal) {
            score += 15;
            details.add("MACD line crossed above Signal line (Bullish Momentum).");
        } else {
            score -= 15;
            details.add("MACD line crossed below Signal line (Bearish Momentum).");
        }

        if (indicators.ema12 > indicators.ema26) {
            score += 5;
        } else {
            score -= 5;
        }

        score = Math.max(0, Math.min(100, score));
        Recommendation rec = new Recommendation();
        rec.score = score;

        if (score >= 80) {
            rec.signal = "Strong Buy";
            rec.description = String.join(" ", details) + " Strong upward momentum across short & long term trend lines. Clear bullish indicators.";
        } else if (score >= 60) {
            rec.signal = "Buy";
            rec.description = String.join(" ", details) + " Favorable technical setup. Moving averages and MACD indicate upward trend.";
        } else if (score >= 40) {
            rec.signal = "Hold";
            rec.description = String.join(" ", details) + " Mixed technical indicators. Market consolidated or moving sideways. No clear breakout.";
        } else if (score >= 20) {
            rec.signal = "Sell";
            rec.description = String.join(" ", details) + " Downward trend gaining momentum. Advised caution on long positions.";
        } else {
            rec.signal = "Strong Sell";
            rec.description = String.join(" ", details) + " Heavy bearish indicators. Price trading below major moving averages with declining MACD support.";
        }

        return rec;
    }

    private double round(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
