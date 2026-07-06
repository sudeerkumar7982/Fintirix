package com.fintrix.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "transactions")
public class Transaction {
    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "user_id", nullable = false, length = 50)
    private String userId;

    @Column(nullable = false, length = 20)
    private String ticker;

    @Column(nullable = false, length = 10)
    private String type;

    @Column(nullable = false)
    private Integer shares;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(nullable = false, length = 30)
    private String date;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Integer getShares() { return shares; }
    public void setShares(Integer shares) { this.shares = shares; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
}
