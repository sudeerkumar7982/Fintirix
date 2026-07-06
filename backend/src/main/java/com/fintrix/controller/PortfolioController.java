package com.fintrix.controller;

import com.fintrix.service.PortfolioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/portfolio")
public class PortfolioController {

    @Autowired
    private PortfolioService portfolioService;

    @GetMapping
    public ResponseEntity<?> getPortfolio(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String userId = getUserId(authHeader);
        if (userId == null) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Unauthorized");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        try {
            Map<String, Object> portfolio = portfolioService.getPortfolio(userId);
            return ResponseEntity.ok(portfolio);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/trade")
    public ResponseEntity<Map<String, Object>> executeTrade(@RequestHeader(value = "Authorization", required = false) String authHeader, @RequestBody Map<String, Object> body) {
        Map<String, Object> response = new HashMap<>();
        String userId = getUserId(authHeader);
        if (userId == null) {
            response.put("error", "Unauthorized");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        try {
            String ticker = (String) body.get("ticker");
            String type = (String) body.get("type");
            Object sharesObj = body.get("shares");

            if (ticker == null || type == null || sharesObj == null) {
                response.put("error", "Invalid trade parameters");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            int shares = Integer.parseInt(sharesObj.toString());
            if (shares <= 0) {
                response.put("error", "Invalid trade parameters");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            portfolioService.executeTrade(userId, ticker, type, shares);
            
            // Return updated portfolio state just like original API
            Map<String, Object> updatedPortfolio = portfolioService.getPortfolio(userId);
            response.put("success", true);
            response.put("balance", updatedPortfolio.get("balance"));
            response.put("holdings", updatedPortfolio.get("holdings"));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    private String getUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        return authHeader.replace("Bearer ", "").trim();
    }
}
