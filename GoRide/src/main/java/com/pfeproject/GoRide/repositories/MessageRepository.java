package com.pfeproject.GoRide.repositories;

import com.pfeproject.GoRide.entities.Message;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    @EntityGraph(attributePaths = {"sender"})
    List<Message> findByConversationIdOrderByTimestampAsc(Long conversationId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation.id = :convId AND m.isRead = false AND m.sender.id != :userId")
    long countUnreadMessages(@Param("convId") Long convId, @Param("userId") Long userId);

    @Modifying
    @Query("UPDATE Message m SET m.isRead = true WHERE m.conversation.id = :convId AND m.sender.id != :userId")
    void markAsRead(@Param("convId") Long convId, @Param("userId") Long userId);

    Message findFirstByConversationIdOrderByTimestampDesc(Long conversationId);

    @Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("DELETE FROM Message m WHERE m.conversation.vehicle.id = :vehicleId")
    void deleteByConversationVehicleId(@Param("vehicleId") Long vehicleId);
}
