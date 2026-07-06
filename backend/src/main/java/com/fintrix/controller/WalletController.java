package com.fintrix.controller;

import com.fintrix.entity.FundTransaction;
import com.fintrix.service.WalletService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wallet")
public class WalletController {

    @Autowired
    private WalletService walletService;

    @PostMapping("/add-funds")
    public ResponseEntity<Map<String, Object>> addFunds(@RequestHeader(value = "Authorization", required = false) String authHeader, @RequestBody Map<String, Object> body) {
        Map<String, Object> response = new HashMap<>();
        String userId = getUserId(authHeader);
        if (userId == null) {
            response.put("error", "Unauthorized");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        try {
            Object amtObj = body.get("amount");
            if (amtObj == null) {
                response.put("error", "Invalid amount");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            BigDecimal amount = new BigDecimal(amtObj.toString());
            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                response.put("error", "Invalid amount");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            String upiRef = (String) body.get("upiRef");
            String bankName = (String) body.get("bankName");
            if (upiRef == null || bankName == null) {
                response.put("error", "Missing upiRef or bankName");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            BigDecimal balance = walletService.addFunds(userId, amount, upiRef, bankName);
            response.put("success", true);
            response.put("balance", balance.doubleValue());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> getTransactions(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String userId = getUserId(authHeader);
        if (userId == null) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Unauthorized");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        List<FundTransaction> transactions = walletService.getWalletTransactions(userId);
        return ResponseEntity.ok(transactions);
    }

    private String getUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        return authHeader.replace("Bearer ", "").trim();
    }
}
