package com.fintrix.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "fund_transactions")
public class FundTransaction {
    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "user_id", nullable = false, length = 50)
    private String userId;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 10)
    private String type;

    @Column(name = "upi_ref", length = 100)
    private String upiRef = "";

    @Column(name = "bank_name", length = 100)
    private String bankName = "";

    @Column(nullable = false, length = 30)
    private String date;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getUpiRef() { return upiRef; }
    public void setUpiRef(String upiRef) { this.upiRef = upiRef; }

    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
}
