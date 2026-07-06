package com.fintrix.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "watchlists", uniqueConstraints = {
    @UniqueConstraint(name = "user_ticker", columnNames = {"user_id", "ticker"})
})
public class Watchlist {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, length = 50)
    private String userId;

    @Column(nullable = false, length = 20)
    private String ticker;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }
}
