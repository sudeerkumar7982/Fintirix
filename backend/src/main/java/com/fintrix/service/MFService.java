package com.fintrix.service;

import com.fintrix.entity.MFHolding;
import com.fintrix.entity.MFTransaction;
import com.fintrix.entity.User;
import com.fintrix.repository.MFHoldingRepository;
import com.fintrix.repository.MFTransactionRepository;
import com.fintrix.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class MFService {

    public static class MutualFund {
        public String id;
        public String name;
        public String category;
        public double nav;
        public double cagr1Y;
        public double cagr3Y;
        public double aum;
        public String risk;
        public double minSip;
        public double minLumpsum;

        public MutualFund(String id, String name, String category, double nav, double cagr1Y, double cagr3Y, double aum, String risk, double minSip, double minLumpsum) {
            this.id = id;
            this.name = name;
            this.category = category;
            this.nav = nav;
            this.cagr1Y = cagr1Y;
            this.cagr3Y = cagr3Y;
            this.aum = aum;
            this.risk = risk;
            this.minSip = minSip;
            this.minLumpsum = minLumpsum;
        }
    }

    public static class MFHistoryBar {
        public String date;
        public double price;

        public MFHistoryBar(String date, double price) {
            this.date = date;
            this.price = price;
        }
    }

    private final List<MutualFund> mutualFunds = new ArrayList<>();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MFHoldingRepository mfHoldingRepository;

    @Autowired
    private MFTransactionRepository mfTransactionRepository;

    @Autowired
    private EmailService emailService;

    public MFService() {
        mutualFunds.add(new MutualFund("MF_PARAG_FLEXI", "Parag Parikh Flexi Cap Fund", "Flexi Cap", 69.84, 34.5, 22.1, 52000, "Very High", 1000, 1000));
        mutualFunds.add(new MutualFund("MF_QUANT_SMALL", "Quant Small Cap Fund", "Small Cap", 225.40, 52.3, 41.5, 15400, "Very High", 1000, 5000));
        mutualFunds.add(new MutualFund("MF_SBI_NIFTY", "SBI Nifty 50 Index Fund", "Index Fund", 195.20, 26.5, 16.2, 178000, "High", 500, 500));
        mutualFunds.add(new MutualFund("MF_AXIS_MID", "Axis Midcap Fund", "Mid Cap", 92.15, 31.2, 21.0, 23000, "Very High", 100, 100));
        mutualFunds.add(new MutualFund("MF_HDFC_LARGE", "HDFC Top 100 Fund", "Large Cap", 852.30, 28.1, 18.5, 31000, "High", 1000, 1000));
    }

    public List<MutualFund> getAllMutualFunds() {
        return mutualFunds;
    }

    public MutualFund getMutualFund(String id) {
        return mutualFunds.stream().filter(m -> m.id.equalsIgnoreCase(id)).findFirst().orElse(null);
    }

    public List<MFHistoryBar> getMFHistory(String id, String range) {
        MutualFund mf = getMutualFund(id);
        if (mf == null) return new ArrayList<>();

        int days = 30;
        String upperRange = range.toUpperCase();
        if ("6M".equals(upperRange)) days = 180;
        else if ("1Y".equals(upperRange)) days = 365;
        else if ("3Y".equals(upperRange)) days = 1095;
        else if ("5Y".equals(upperRange)) days = 1825;

        List<MFHistoryBar> history = new ArrayList<>();
        double annualGrowth = mf.cagr1Y / 100.0;
        double dailyGrowth = Math.pow(1.0 + annualGrowth, 1.0 / 365.0) - 1.0;

        double currentNav = mf.nav;
        Random random = new Random();
        Calendar cal = Calendar.getInstance();

        for (int i = 0; i < days; i++) {
            Date date = cal.getTime();
            String dateStr = new java.text.SimpleDateFormat("yyyy-MM-dd").format(date);
            
            double volatility = (random.nextDouble() - 0.45) * 0.015;
            double priceModifier = 1.0 - dailyGrowth - volatility;

            if (i > 0) {
                currentNav = currentNav * priceModifier;
            }

            history.add(0, new MFHistoryBar(dateStr, BigDecimal.valueOf(currentNav).setScale(2, RoundingMode.HALF_UP).doubleValue()));
            cal.add(Calendar.DAY_OF_YEAR, -1);
        }

        return history;
    }

    @Transactional
    public void invest(String userId, String mfId, BigDecimal amount) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        MutualFund mf = getMutualFund(mfId);
        if (mf == null) {
            throw new RuntimeException("Mutual Fund not found");
        }

        if (amount.compareTo(BigDecimal.valueOf(mf.minLumpsum)) < 0) {
            throw new RuntimeException("Investment is below minimum lumpsum of ₹" + mf.minLumpsum);
        }

        if (user.getBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient wallet balance");
        }

        BigDecimal nav = BigDecimal.valueOf(mf.nav);
        BigDecimal units = amount.divide(nav, 4, RoundingMode.HALF_UP);

        // Deduct balance
        user.setBalance(user.getBalance().subtract(amount));
        userRepository.save(user);

        // Update MF holding
        MFHolding holding = mfHoldingRepository.findByUserIdAndMfId(userId, mfId).orElse(null);
        if (holding == null) {
            holding = new MFHolding();
            holding.setUserId(userId);
            holding.setMfId(mfId);
            holding.setUnits(units);
            holding.setAvgNav(nav);
        } else {
            BigDecimal totalUnits = holding.getUnits().add(units);
            BigDecimal totalCost = (holding.getUnits().multiply(holding.getAvgNav())).add(amount);
            BigDecimal avgNav = totalCost.divide(totalUnits, 2, RoundingMode.HALF_UP);
            holding.setUnits(totalUnits);
            holding.setAvgNav(avgNav);
        }
        mfHoldingRepository.save(holding);

        // Add Transaction
        MFTransaction mft = new MFTransaction();
        mft.setId(UUID.randomUUID().toString());
        mft.setUserId(userId);
        mft.setMfId(mfId);
        mft.setType("BUY");
        mft.setUnits(units);
        mft.setNav(nav);
        mft.setAmount(amount);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        mft.setDate(LocalDateTime.now().format(formatter));
        mfTransactionRepository.save(mft);

        // Send Email
        String emailContent = emailService.generateMFTradeEmailHtml(user.getName(), "BUY", mf.name, amount, nav, units);
        emailService.sendTransactionEmail(user.getEmail(), user.getName(), "Mutual Fund Purchase Confirmed", emailContent);
    }

    @Transactional
    public void redeem(String userId, String mfId, BigDecimal units) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        MutualFund mf = getMutualFund(mfId);
        if (mf == null) {
            throw new RuntimeException("Mutual Fund not found");
        }

        MFHolding holding = mfHoldingRepository.findByUserIdAndMfId(userId, mfId)
                .orElseThrow(() -> new RuntimeException("No holdings found for this mutual fund"));

        if (holding.getUnits().compareTo(units) < 0) {
            throw new RuntimeException("Insufficient units to redeem");
        }

        BigDecimal nav = BigDecimal.valueOf(mf.nav);
        BigDecimal amount = units.multiply(nav).setScale(2, RoundingMode.HALF_UP);

        // Add balance
        user.setBalance(user.getBalance().add(amount));
        userRepository.save(user);

        // Update units
        BigDecimal remainingUnits = holding.getUnits().subtract(units);
        if (remainingUnits.compareTo(BigDecimal.ZERO) <= 0) {
            mfHoldingRepository.delete(holding);
        } else {
            holding.setUnits(remainingUnits);
            mfHoldingRepository.save(holding);
        }

        // Add Transaction
        MFTransaction mft = new MFTransaction();
        mft.setId(UUID.randomUUID().toString());
        mft.setUserId(userId);
        mft.setMfId(mfId);
        mft.setType("SELL");
        mft.setUnits(units);
        mft.setNav(nav);
        mft.setAmount(amount);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        mft.setDate(LocalDateTime.now().format(formatter));
        mfTransactionRepository.save(mft);

        // Send Email
        String emailContent = emailService.generateMFTradeEmailHtml(user.getName(), "SELL", mf.name, amount, nav, units);
        emailService.sendTransactionEmail(user.getEmail(), user.getName(), "Mutual Fund Redemption Successful", emailContent);
    }

    public List<MFHolding> getHoldings(String userId) {
        return mfHoldingRepository.findByUserId(userId);
    }

    public List<MFTransaction> getTransactions(String userId) {
        return mfTransactionRepository.findByUserIdOrderByDateDesc(userId);
    }
}
