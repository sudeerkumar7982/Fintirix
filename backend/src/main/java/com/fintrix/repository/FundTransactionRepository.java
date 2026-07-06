package com.fintrix.repository;

import com.fintrix.entity.FundTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FundTransactionRepository extends JpaRepository<FundTransaction, String> {
    List<FundTransaction> findByUserIdOrderByDateDesc(String userId);
}
