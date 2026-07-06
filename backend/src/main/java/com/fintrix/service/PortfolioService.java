package com.fintrix.service;

import com.fintrix.entity.Holding;
import com.fintrix.entity.Transaction;
import com.fintrix.entity.User;
import com.fintrix.entity.MFHolding;
import com.fintrix.entity.MFTransaction;
import com.fintrix.repository.*;
import com.fintrix.service.StockService.StockQuote;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class PortfolioService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HoldingRepository holdingRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private MFHoldingRepository mfHoldingRepository;

    @Autowired
    private MFTransactionRepository mfTransactionRepository;

    @Autowired
    private StockService stockService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private MFService mfService;

    public Map<String, Object> getPortfolio(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Holding> holdingsList = holdingRepository.findByUserId(userId);
        BigDecimal totalHoldingsValue = BigDecimal.ZERO;
        
        Map<String, Object> holdingsDetail = new HashMap<>();
        for (Holding holding : holdingsList) {
            StockQuote quote = stockService.getStockQuote(holding.getTicker());
            BigDecimal currentPrice = quote != null ? BigDecimal.valueOf(quote.price) : holding.getAvgPrice();
            
            BigDecimal qty = BigDecimal.valueOf(holding.getShares());
            BigDecimal totalValue = qty.multiply(currentPrice).setScale(2, RoundingMode.HALF_UP);
            BigDecimal totalCost = qty.multiply(holding.getAvgPrice()).setScale(2, RoundingMode.HALF_UP);
            BigDecimal profitLoss = totalValue.subtract(totalCost).setScale(2, RoundingMode.HALF_UP);
            BigDecimal profitLossPercent = totalCost.compareTo(BigDecimal.ZERO) > 0 
                ? profitLoss.multiply(BigDecimal.valueOf(100)).divide(totalCost, 2, RoundingMode.HALF_UP) 
                : BigDecimal.ZERO;

            totalHoldingsValue = totalHoldingsValue.add(totalValue);

            Map<String, Object> details = new HashMap<>();
            details.put("id", holding.getId());
            details.put("userId", holding.getUserId());
            details.put("ticker", holding.getTicker());
            details.put("shares", holding.getShares());
            details.put("avgPrice", holding.getAvgPrice().doubleValue());
            details.put("currentPrice", currentPrice.doubleValue());
            details.put("totalValue", totalValue.doubleValue());
            details.put("profitLoss", profitLoss.doubleValue());
            details.put("profitLossPercent", profitLossPercent.doubleValue());

            holdingsDetail.put(holding.getTicker(), details);
        }

        BigDecimal balance = user.getBalance().setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalPortfolioValue = balance.add(totalHoldingsValue).setScale(2, RoundingMode.HALF_UP);

        // Fetch transactions
        List<Transaction> transactions = transactionRepository.findByUserId(userId);
        transactions.sort((a, b) -> b.getDate().compareTo(a.getDate()));

        // Fetch MF Holdings & Transactions
        List<MFHolding> mfHoldingsList = mfHoldingRepository.findByUserId(userId);
        Map<String, Object> mfHoldingsDetail = new HashMap<>();
        for (MFHolding mfh : mfHoldingsList) {
            MFService.MutualFund mf = mfService.getMutualFund(mfh.getMfId());
            double currentNav = mf != null ? mf.nav : mfh.getAvgNav().doubleValue();
            
            Map<String, Object> details = new HashMap<>();
            details.put("units", mfh.getUnits().doubleValue());
            details.put("avgNav", mfh.getAvgNav().doubleValue());
            details.put("currentNav", currentNav);
            mfHoldingsDetail.put(mfh.getMfId(), details);
        }

        List<MFTransaction> mfTransactions = mfTransactionRepository.findByUserIdOrderByDateDesc(userId);

        Map<String, Object> portfolio = new HashMap<>();
        portfolio.put("balance", balance.doubleValue());
        portfolio.put("holdingsValue", totalHoldingsValue.doubleValue());
        portfolio.put("totalValue", totalPortfolioValue.doubleValue());
        portfolio.put("holdings", holdingsDetail);
        portfolio.put("transactions", transactions);
        portfolio.put("mfHoldings", mfHoldingsDetail);
        portfolio.put("mfTransactions", mfTransactions);

        return portfolio;
    }

    @Transactional
    public void executeTrade(String userId, String ticker, String type, int shares) {
        if (!stockService.isMarketOpen()) {
            throw new RuntimeException("Market is CLOSED. Indian stock market trading hours are 9:15 AM to 3:30 PM IST, Monday to Friday.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        StockQuote quote = stockService.getStockQuote(ticker);
        if (quote == null) {
            throw new RuntimeException("Ticker not found");
        }

        BigDecimal currentPrice = BigDecimal.valueOf(quote.price);
        BigDecimal totalCost = currentPrice.multiply(BigDecimal.valueOf(shares)).setScale(2, RoundingMode.HALF_UP);

        if ("BUY".equalsIgnoreCase(type)) {
            if (user.getBalance().compareTo(totalCost) < 0) {
                throw new RuntimeException("Insufficient balance");
            }

            user.setBalance(user.getBalance().subtract(totalCost));
            userRepository.save(user);

            Holding holding = holdingRepository.findByUserIdAndTicker(userId, ticker).orElse(null);
            if (holding == null) {
                holding = new Holding();
                holding.setUserId(userId);
                holding.setTicker(ticker);
                holding.setShares(shares);
                holding.setAvgPrice(currentPrice);
            } else {
                int newShares = holding.getShares() + shares;
                BigDecimal existingCost = holding.getAvgPrice().multiply(BigDecimal.valueOf(holding.getShares()));
                BigDecimal newAvgPrice = existingCost.add(totalCost).divide(BigDecimal.valueOf(newShares), 2, RoundingMode.HALF_UP);
                holding.setShares(newShares);
                holding.setAvgPrice(newAvgPrice);
            }
            holdingRepository.save(holding);

        } else if ("SELL".equalsIgnoreCase(type)) {
            Holding holding = holdingRepository.findByUserIdAndTicker(userId, ticker)
                    .orElseThrow(() -> new RuntimeException("Insufficient shares to sell"));

            if (holding.getShares() < shares) {
                throw new RuntimeException("Insufficient shares to sell");
            }

            user.setBalance(user.getBalance().add(totalCost));
            userRepository.save(user);

            int newShares = holding.getShares() - shares;
            if (newShares == 0) {
                holdingRepository.delete(holding);
            } else {
                holding.setShares(newShares);
                holdingRepository.save(holding);
            }
        } else {
            throw new RuntimeException("Invalid trade type");
        }

        // Record Transaction
        Transaction t = new Transaction();
        t.setId("t_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 5));
        t.setUserId(userId);
        t.setTicker(ticker);
        t.setType(type.toUpperCase());
        t.setShares(shares);
        t.setPrice(currentPrice);
        
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        t.setDate(LocalDateTime.now().format(formatter));
        transactionRepository.save(t);

        // Send Email
        String emailContent = emailService.generateTradeEmailHtml(user.getName(), type.toUpperCase(), ticker, shares, currentPrice);
        emailService.sendTransactionEmail(
                user.getEmail(),
                user.getName(),
                "Trade Executed: " + type.toUpperCase() + " " + shares + " shares of " + ticker,
                emailContent
        );
    }
}
