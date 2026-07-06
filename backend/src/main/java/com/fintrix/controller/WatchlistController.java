package com.fintrix.controller;

import com.fintrix.entity.User;
import com.fintrix.entity.Watchlist;
import com.fintrix.repository.UserRepository;
import com.fintrix.repository.WatchlistRepository;
import com.fintrix.service.StockService;
import com.fintrix.service.StockService.StockQuote;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/watchlist")
public class WatchlistController {

    @Autowired
    private WatchlistRepository watchlistRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StockService stockService;

    @GetMapping
    public ResponseEntity<?> getWatchlist(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String userId = getUserId(authHeader);
        if (userId == null) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Unauthorized");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        List<Watchlist> watchlists = watchlistRepository.findByUserId(userId);
        List<StockQuote> quotes = watchlists.stream()
                .map(w -> stockService.getStockQuote(w.getTicker()))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        return ResponseEntity.ok(quotes);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> addToWatchlist(@RequestHeader(value = "Authorization", required = false) String authHeader, @RequestBody Map<String, String> body) {
        Map<String, Object> response = new HashMap<>();
        String userId = getUserId(authHeader);
        if (userId == null) {
            response.put("error", "Unauthorized");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        String ticker = body.get("ticker");
        if (ticker == null) {
            response.put("error", "Invalid ticker");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        
        String upperTicker = ticker.toUpperCase().trim();
        StockQuote quote = stockService.getStockQuote(upperTicker);
        if (quote == null) {
            response.put("error", "Invalid ticker");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        Optional<Watchlist> existing = watchlistRepository.findByUserIdAndTicker(userId, upperTicker);
        if (existing.isEmpty()) {
            Watchlist w = new Watchlist();
            w.setUserId(userId);
            w.setTicker(upperTicker);
            watchlistRepository.save(w);
        }

        List<String> updatedList = watchlistRepository.findByUserId(userId).stream()
                .map(Watchlist::getTicker)
                .collect(Collectors.toList());

        response.put("success", true);
        response.put("watchlist", updatedList);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{ticker}")
    public ResponseEntity<Map<String, Object>> removeFromWatchlist(@RequestHeader(value = "Authorization", required = false) String authHeader, @PathVariable String ticker) {
        Map<String, Object> response = new HashMap<>();
        String userId = getUserId(authHeader);
        if (userId == null) {
            response.put("error", "Unauthorized");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        String upperTicker = ticker.toUpperCase().trim();
        Optional<Watchlist> existing = watchlistRepository.findByUserIdAndTicker(userId, upperTicker);
        existing.ifPresent(watchlist -> watchlistRepository.delete(watchlist));

        List<String> updatedList = watchlistRepository.findByUserId(userId).stream()
                .map(Watchlist::getTicker)
                .collect(Collectors.toList());

        response.put("success", true);
        response.put("watchlist", updatedList);
        return ResponseEntity.ok(response);
    }

    private String getUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        return authHeader.replace("Bearer ", "").trim();
    }
}
