package com.fintrix.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "holdings", uniqueConstraints = {
    @UniqueConstraint(name = "user_ticker", columnNames = {"user_id", "ticker"})
})
public class Holding {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, length = 50)
    private String userId;

    @Column(nullable = false, length = 20)
    private String ticker;

    @Column(nullable = false)
    private Integer shares;

    @Column(name = "avg_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal avgPrice;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }

    public Integer getShares() { return shares; }
    public void setShares(Integer shares) { this.shares = shares; }

    public BigDecimal getAvgPrice() { return avgPrice; }
    public void setAvgPrice(BigDecimal avgPrice) { this.avgPrice = avgPrice; }
}
