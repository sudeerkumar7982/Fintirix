package com.fintrix.repository;

import com.fintrix.entity.Watchlist;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface WatchlistRepository extends JpaRepository<Watchlist, Long> {
    List<Watchlist> findByUserId(String userId);
    Optional<Watchlist> findByUserIdAndTicker(String userId, String ticker);
}
