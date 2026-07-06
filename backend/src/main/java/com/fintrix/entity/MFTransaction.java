package com.fintrix.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "mf_transactions")
public class MFTransaction {
    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "user_id", nullable = false, length = 50)
    private String userId;

    @Column(name = "mf_id", nullable = false, length = 50)
    private String mfId;

    @Column(nullable = false, length = 10)
    private String type;

    @Column(nullable = false, precision = 15, scale = 4)
    private BigDecimal units;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal nav;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 30)
    private String date;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getMfId() { return mfId; }
    public void setMfId(String mfId) { this.mfId = mfId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public BigDecimal getUnits() { return units; }
    public void setUnits(BigDecimal units) { this.units = units; }

    public BigDecimal getNav() { return nav; }
    public void setNav(BigDecimal nav) { this.nav = nav; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
}
