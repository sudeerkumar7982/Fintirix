package com.fintrix.repository;

import com.fintrix.entity.MFHolding;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MFHoldingRepository extends JpaRepository<MFHolding, Long> {
    List<MFHolding> findByUserId(String userId);
    Optional<MFHolding> findByUserIdAndMfId(String userId, String mfId);
}
