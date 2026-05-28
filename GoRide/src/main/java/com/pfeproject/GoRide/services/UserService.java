package com.pfeproject.GoRide.services;

import com.pfeproject.GoRide.entities.Activity;
import com.pfeproject.GoRide.entities.Booking;
import com.pfeproject.GoRide.entities.Transaction;
import com.pfeproject.GoRide.entities.UserDocument;
import com.pfeproject.GoRide.entities.UserEntity;
import com.pfeproject.GoRide.repositories.ActivityRepository;
import com.pfeproject.GoRide.repositories.BookingRepository;
import com.pfeproject.GoRide.repositories.TransactionRepository;
import com.pfeproject.GoRide.repositories.UserDocumentRepository;
import com.pfeproject.GoRide.repositories.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Service métier pour la gestion des utilisateurs.
 */
@Service
public class UserService {

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private ActivityRepository activityRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private UserDocumentRepository userDocumentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public Optional<UserEntity> findById(Long id) {
        return userRepo.findById(id);
    }

    public Optional<UserEntity> findByEmail(String email) {
        return userRepo.findByEmail(email);
    }

    public UserEntity updateProfile(Long id, UserEntity updatedData) {
        UserEntity user = userRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'id : " + id));

        if (updatedData.getFirstName() != null) {
            user.setFirstName(updatedData.getFirstName().trim());
        }
        if (updatedData.getLastName() != null) {
            user.setLastName(updatedData.getLastName().trim());
        }
        if (updatedData.getPhone() != null) {
            String phone = updatedData.getPhone().trim();
            user.setPhone(phone.isEmpty() ? null : phone);
        }
        if (updatedData.getAddress() != null) {
            String address = updatedData.getAddress().trim();
            user.setAddress(address.isEmpty() ? null : address);
        }
        if (updatedData.getGender() != null) {
            String gender = updatedData.getGender().trim();
            user.setGender(gender.isEmpty() ? null : gender);
        }
        if (updatedData.getBirthDate() != null) {
            String birthDate = updatedData.getBirthDate().trim();
            user.setBirthDate(birthDate.isEmpty() ? null : birthDate);
        }
        if (updatedData.getPhotoUrl() != null) {
            String photo = updatedData.getPhotoUrl().trim();
            user.setPhotoUrl(photo.isEmpty() ? null : photo);
        }
        if (updatedData.getCity() != null && !updatedData.getCity().isBlank()) {
            user.setCity(updatedData.getCity().trim());
        }
        if (updatedData.getLanguage() != null && !updatedData.getLanguage().isBlank()) {
            user.setLanguage(updatedData.getLanguage().trim().toLowerCase());
        }

        return userRepo.save(user);
    }

    public void deleteUser(Long id) {
        if (!userRepo.existsById(id)) {
            throw new RuntimeException("Utilisateur non trouvé avec l'id : " + id);
        }
        userRepo.deleteById(id);
    }

    public List<Transaction> getUserTransactions(Long userId) {
        return transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Activity> getUserActivities(Long userId) {
        return activityRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Booking> getUserBookings(Long userId) {
        return bookingRepository.findByPassengerId(userId);
    }

    public List<UserDocument> getUserDocuments(Long userId) {
        return userDocumentRepository.findByUserId(userId);
    }

    public void changePassword(Long userId, String currentPassword, String newPassword) {
        UserEntity user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Le mot de passe actuel est incorrect");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setLastPasswordUpdate(java.time.LocalDateTime.now());
        userRepo.save(user);
    }
}
