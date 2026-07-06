package com.fintrix.controller;

import com.fintrix.entity.User;
import com.fintrix.repository.UserRepository;
import com.fintrix.service.MFService;
import com.fintrix.service.MFService.MutualFund;
import com.fintrix.service.MFService.MFHistoryBar;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mf")
public class MFController {

    @Autowired
    private MFService mfService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<MutualFund>> getMutualFunds() {
        return ResponseEntity.ok(mfService.getAllMutualFunds());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getMutualFundInfo(@PathVariable String id, @RequestParam(defaultValue = "1Y") String range) {
        MutualFund mf = mfService.getMutualFund(id);
        if (mf == null) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Mutual Fund not found");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }

        List<MFHistoryBar> history = mfService.getMFHistory(id, range);
        
        Map<String, Object> result = new HashMap<>();
        result.put("id", mf.id);
        result.put("name", mf.name);
        result.put("category", mf.category);
        result.put("nav", mf.nav);
        result.put("cagr1Y", mf.cagr1Y);
        result.put("cagr3Y", mf.cagr3Y);
        result.put("aum", mf.aum);
        result.put("risk", mf.risk);
        result.put("minSip", mf.minSip);
        result.put("minLumpsum", mf.minLumpsum);
        result.put("history", history);

        return ResponseEntity.ok(result);
    }

    @PostMapping("/trade")
    public ResponseEntity<Map<String, Object>> executeMFTrade(@RequestHeader(value = "Authorization", required = false) String authHeader, @RequestBody Map<String, Object> body) {
        Map<String, Object> response = new HashMap<>();
        String userId = getUserId(authHeader);
        if (userId == null) {
            response.put("error", "Unauthorized");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        try {
            String mfId = (String) body.get("mfId");
            String type = (String) body.get("type"); // "BUY" or "SELL"
            Object amtObj = body.get("amount");

            if (mfId == null || type == null || amtObj == null) {
                response.put("error", "Invalid trade parameters");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            BigDecimal amount = new BigDecimal(amtObj.toString());
            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                response.put("error", "Invalid trade parameters");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            MutualFund mf = mfService.getMutualFund(mfId);
            if (mf == null) {
                response.put("error", "Mutual Fund not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            BigDecimal nav = BigDecimal.valueOf(mf.nav);
            if ("BUY".equalsIgnoreCase(type)) {
                mfService.invest(userId, mfId, amount);
            } else if ("SELL".equalsIgnoreCase(type)) {
                BigDecimal units = amount.divide(nav, 4, BigDecimal.ROUND_HALF_UP);
                mfService.redeem(userId, mfId, units);
            } else {
                response.put("error", "Invalid trade type");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            User user = userRepository.findById(userId).orElseThrow();
            List<com.fintrix.entity.MFHolding> holdingsList = mfService.getHoldings(userId);
            Map<String, Object> mfHoldingsDetail = new HashMap<>();
            for (com.fintrix.entity.MFHolding mfh : holdingsList) {
                Map<String, Object> details = new HashMap<>();
                details.put("units", mfh.getUnits().doubleValue());
                details.put("avgNav", mfh.getAvgNav().doubleValue());
                mfHoldingsDetail.put(mfh.getMfId(), details);
            }

            response.put("success", true);
            response.put("balance", user.getBalance().setScale(2, BigDecimal.ROUND_HALF_UP).doubleValue());
            response.put("mfHoldings", mfHoldingsDetail);
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
