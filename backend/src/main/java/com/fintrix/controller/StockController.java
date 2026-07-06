package com.fintrix.controller;

import com.fintrix.service.StockService;
import com.fintrix.service.StockService.StockQuote;
import com.fintrix.service.StockService.HistoricalBar;
import com.fintrix.service.StockService.AnalysisResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.*;

@RestController
@RequestMapping("/api")
public class StockController {

    @Autowired
    private StockService stockService;

    @GetMapping("/stocks")
    public ResponseEntity<List<StockQuote>> getStocks() {
        return ResponseEntity.ok(stockService.getAllStockQuotes());
    }

    @GetMapping(value = "/stocks/realtime", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamRealtimePrices() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        
        // Enqueue initial quotes immediately
        try {
            Map<String, StockQuote> initialQuotes = new HashMap<>();
            for (StockQuote q : stockService.getAllStockQuotes()) {
                initialQuotes.put(q.ticker, q);
            }
            emitter.send(SseEmitter.event().data(initialQuotes));
        } catch (Exception e) {
            // Log or ignore
        }

        stockService.addEmitter(emitter);
        return emitter;
    }

    @GetMapping("/stocks/{ticker}")
    public ResponseEntity<?> getStockInfo(@PathVariable String ticker) {
        Map<String, Object> info = stockService.getFullStockInfo(ticker);
        if (info == null) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Stock not found");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
        return ResponseEntity.ok(info);
    }

    @GetMapping("/stocks/{ticker}/history")
    public ResponseEntity<?> getStockHistory(@PathVariable String ticker, @RequestParam(defaultValue = "1Y") String range) {
        List<HistoricalBar> history = stockService.getStockHistory(ticker, range);
        if (history.isEmpty()) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Stock not found");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
        return ResponseEntity.ok(history);
    }

    @GetMapping("/stocks/{ticker}/analysis")
    public ResponseEntity<?> getStockAnalysis(@PathVariable String ticker) {
        AnalysisResult result = stockService.performAnalysis(ticker);
        if (result == null) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Stock not found");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/market-status")
    public ResponseEntity<Map<String, Object>> getMarketStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("isOpen", stockService.isMarketOpen());
        return ResponseEntity.ok(status);
    }

    @GetMapping("/market-indices")
    public ResponseEntity<Map<String, Map<String, Object>>> getMarketIndices() {
        return ResponseEntity.ok(stockService.getMarketIndices());
    }

    @GetMapping("/news")
    public ResponseEntity<List<Map<String, String>>> getNews(@RequestParam(required = false) String ticker) {
        List<Map<String, String>> allNews = new ArrayList<>();

        Map<String, String> n1 = new HashMap<>();
        n1.put("id", "n1");
        n1.put("title", "Reliance Industries Announces Major Investment in Green Hydrogen");
        n1.put("summary", "Reliance Industries Chairman announced a fresh capex drive.");
        n1.put("source", "Economic Times");
        n1.put("time", "15 minutes ago");
        n1.put("sentiment", "Bullish");
        n1.put("ticker", "RELIANCE");
        allNews.add(n1);

        Map<String, String> n2 = new HashMap<>();
        n2.put("id", "n2");
        n2.put("title", "TCS Secures Record $750 Million Deal");
        n2.put("summary", "Tata Consultancy Services has won an expansion contract.");
        n2.put("source", "LiveMint");
        n2.put("time", "1 hour ago");
        n2.put("sentiment", "Bullish");
        n2.put("ticker", "TCS");
        allNews.add(n2);

        if (ticker != null && !ticker.trim().isEmpty()) {
            String upperTicker = ticker.toUpperCase().trim();
            List<Map<String, String>> filtered = new ArrayList<>();
            for (Map<String, String> n : allNews) {
                if (upperTicker.equals(n.get("ticker")) || "".equals(n.get("ticker"))) {
                    filtered.add(n);
                }
            }
            return ResponseEntity.ok(filtered);
        }

        return ResponseEntity.ok(allNews);
    }
}
