package com.fintrix.service;

import com.fintrix.entity.FundTransaction;
import com.fintrix.entity.User;
import com.fintrix.repository.FundTransactionRepository;
import com.fintrix.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
public class WalletService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FundTransactionRepository fundTransactionRepository;

    @Autowired
    private EmailService emailService;

    @Transactional
    public BigDecimal addFunds(String userId, BigDecimal amount, String upiRef, String bankName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setBalance(user.getBalance().add(amount));
        userRepository.save(user);

        FundTransaction ft = new FundTransaction();
        ft.setId(UUID.randomUUID().toString());
        ft.setUserId(userId);
        ft.setAmount(amount);
        ft.setType("DEPOSIT");
        ft.setUpiRef(upiRef);
        ft.setBankName(bankName);
        
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        ft.setDate(LocalDateTime.now().format(formatter));
        fundTransactionRepository.save(ft);

        // Send email asynchronously
        String emailContent = emailService.generateFundEmailHtml(user.getName(), amount, bankName, upiRef);
        emailService.sendTransactionEmail(user.getEmail(), user.getName(), "Funds Added to Fintrix Wallet", emailContent);

        return user.getBalance();
    }

    public List<FundTransaction> getWalletTransactions(String userId) {
        return fundTransactionRepository.findByUserIdOrderByDateDesc(userId);
    }
}
