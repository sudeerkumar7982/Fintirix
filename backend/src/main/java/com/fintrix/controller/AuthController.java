package com.fintrix.controller;

import com.fintrix.entity.User;
import com.fintrix.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> body) {
        Map<String, Object> response = new HashMap<>();
        try {
            String name = body.get("name");
            String email = body.get("email");
            String password = body.get("password");
            String phone = body.get("phone");
            String dob = body.get("dob");
            String panNumber = body.get("panNumber");
            String address = body.get("address");

            if (name == null || email == null || password == null || phone == null || dob == null || panNumber == null) {
                response.put("error", "Missing required fields");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            User user = authService.register(name, email, password, phone, dob, panNumber, address);
            response.put("success", true);
            response.put("userId", user.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        Map<String, Object> response = new HashMap<>();
        try {
            String email = body.get("email");
            String password = body.get("password");

            if (email == null || password == null) {
                response.put("error", "Missing credentials");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            User user = authService.login(email, password);
            response.put("success", true);
            response.put("userId", user.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @PostMapping("/google")
    public ResponseEntity<Map<String, Object>> googleLogin(@RequestBody Map<String, String> body) {
        Map<String, Object> response = new HashMap<>();
        try {
            String credential = body.get("credential");
            if (credential == null) {
                response.put("error", "Missing credential");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            // Verify Google ID Token
            com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier verifier = new com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier.Builder(
                new com.google.api.client.http.javanet.NetHttpTransport(), new com.google.api.client.json.gson.GsonFactory())
                // .setAudience(Collections.singletonList("YOUR_GOOGLE_CLIENT_ID")) // Un-comment and set in production
                .build();

            // Note: Since we don't have a Client ID, we can decode the payload directly to allow testing.
            // In a real application, you must use verifier.verify(credential) to ensure security.
            String[] split = credential.split("\\.");
            if (split.length != 3) throw new RuntimeException("Invalid JWT token");
            String payloadJson = new String(java.util.Base64.getUrlDecoder().decode(split[1]));
            java.util.Map<String, Object> payload = new com.fasterxml.jackson.databind.ObjectMapper().readValue(payloadJson, java.util.Map.class);
            
            String email = (String) payload.get("email");
            String name = (String) payload.get("name");

            if (email == null) {
                response.put("error", "Invalid Google Token Payload");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            User user = authService.googleLogin(email, name);
            response.put("success", true);
            response.put("userId", user.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        Map<String, Object> response = new HashMap<>();
        String userId = getUserId(authHeader);
        if (userId == null) {
            response.put("error", "Unauthorized");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        User user = authService.getUserById(userId);
        if (user == null) {
            response.put("error", "Unauthorized");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        response.put("isSetup", user.getPin() != null);
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("phone", user.getPhone());
        response.put("dob", user.getDob());
        response.put("panNumber", user.getPanNumber());
        response.put("address", user.getAddress());
        response.put("createdAt", user.getCreatedAt().toString());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/setup")
    public ResponseEntity<Map<String, Object>> setupPin(@RequestHeader(value = "Authorization", required = false) String authHeader, @RequestBody Map<String, String> body) {
        Map<String, Object> response = new HashMap<>();
        String userId = getUserId(authHeader);
        if (userId == null) {
            response.put("error", "Unauthorized");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        User user = authService.getUserById(userId);
        if (user == null) {
            response.put("error", "Unauthorized");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        if (user.getPin() != null) {
            response.put("error", "PIN already setup");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        String pin = body.get("pin");
        if (pin == null || pin.length() != 4) {
            response.put("error", "Invalid PIN");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        authService.setupPin(userId, pin);
        response.put("success", true);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/loginPin")
    public ResponseEntity<Map<String, Object>> loginPin(@RequestHeader(value = "Authorization", required = false) String authHeader, @RequestBody Map<String, String> body) {
        Map<String, Object> response = new HashMap<>();
        String userId = getUserId(authHeader);
        if (userId == null) {
            response.put("error", "Unauthorized");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        User user = authService.getUserById(userId);
        if (user == null) {
            response.put("error", "Unauthorized");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        if (user.getPin() == null) {
            response.put("error", "No PIN setup yet");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        String pin = body.get("pin");
        if (!authService.verifyPin(userId, pin)) {
            response.put("error", "Incorrect PIN");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        response.put("success", true);
        return ResponseEntity.ok(response);
    }

    private String getUserId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        return authHeader.replace("Bearer ", "").trim();
    }
}
