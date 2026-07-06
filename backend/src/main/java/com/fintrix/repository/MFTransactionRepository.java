package com.fintrix.repository;

import com.fintrix.entity.MFTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MFTransactionRepository extends JpaRepository<MFTransaction, String> {
    List<MFTransaction> findByUserIdOrderByDateDesc(String userId);
}
