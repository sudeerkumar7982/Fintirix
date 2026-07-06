package com.fintrix.service;

import com.fintrix.entity.User;
import com.fintrix.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    public User register(String name, String email, String password, String phone, String dob, String panNumber, String address) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        User user = new User();
        user.setId(UUID.randomUUID().toString());
        user.setName(name);
        user.setEmail(email);
        // Storing plain passwords as in the original Deno backend
        user.setPassword(password);
        user.setPhone(phone);
        user.setDob(dob);
        user.setPanNumber(panNumber);
        user.setAddress(address != null ? address : "");
        user.setBalance(BigDecimal.ZERO);
        user.setCreatedAt(LocalDateTime.now());

        return userRepository.save(user);
    }

    public User login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        if (!user.getPassword().equals(password)) {
            throw new RuntimeException("Incorrect password");
        }

        return user;
    }

    public User googleLogin(String email, String name) {
        Optional<User> optionalUser = userRepository.findByEmail(email);
        if (optionalUser.isPresent()) {
            return optionalUser.get();
        }

        User user = new User();
        user.setId(UUID.randomUUID().toString());
        user.setName(name);
        user.setEmail(email);
        user.setPassword(UUID.randomUUID().toString()); // random password
        user.setPhone("");
        user.setDob("");
        user.setPanNumber("");
        user.setAddress("");
        user.setBalance(BigDecimal.ZERO);
        user.setCreatedAt(LocalDateTime.now());

        return userRepository.save(user);
    }

    public User getUserById(String id) {
        return userRepository.findById(id).orElse(null);
    }

    public void setupPin(String userId, String pin) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setPin(pin);
        userRepository.save(user);
    }

    public boolean verifyPin(String userId, String pin) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return pin.equals(user.getPin());
    }

    public void updateProfile(String userId, String phone, String dob, String panNumber, String address) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (phone != null) user.setPhone(phone);
        if (dob != null) user.setDob(dob);
        if (panNumber != null) user.setPanNumber(panNumber);
        if (address != null) user.setAddress(address);
        
        userRepository.save(user);
    }
}
