package com.fintrix.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "mf_holdings", uniqueConstraints = {
    @UniqueConstraint(name = "user_mf", columnNames = {"user_id", "mf_id"})
})
public class MFHolding {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, length = 50)
    private String userId;

    @Column(name = "mf_id", nullable = false, length = 50)
    private String mfId;

    @Column(nullable = false, precision = 15, scale = 4)
    private BigDecimal units;

    @Column(name = "avg_nav", nullable = false, precision = 10, scale = 2)
    private BigDecimal avgNav;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getMfId() { return mfId; }
    public void setMfId(String mfId) { this.mfId = mfId; }

    public BigDecimal getUnits() { return units; }
    public void setUnits(BigDecimal units) { this.units = units; }

    public BigDecimal getAvgNav() { return avgNav; }
    public void setAvgNav(BigDecimal avgNav) { this.avgNav = avgNav; }
}
