package com.pfeproject.GoRide.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class VehiclePhotoStorageService {

    private static final Set<String> ALLOWED_EXT = Set.of(".jpg", ".jpeg", ".png", ".webp", ".gif");

    @Value("${goride.upload.vehicle-photos-dir:./data/uploads/vehicle-photos}")
    private String uploadDir;

    public String store(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Fichier image requis");
        }
        String ext = extension(file.getOriginalFilename());
        if (!ALLOWED_EXT.contains(ext)) {
            throw new IllegalArgumentException("Format non supporté. Utilisez JPG, PNG ou WEBP.");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("Image trop volumineuse (max 5 Mo).");
        }

        Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(dir);

        String filename = "vehicle-" + UUID.randomUUID() + ext;
        Path target = dir.resolve(filename);
        Files.copy(file.getInputStream(), target);

        return "/vehicle-photos/" + filename;
    }

    private static String extension(String originalName) {
        if (originalName == null || !originalName.contains(".")) {
            return ".jpg";
        }
        return originalName.substring(originalName.lastIndexOf('.')).toLowerCase(Locale.ROOT);
    }
}
