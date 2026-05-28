package com.pfeproject.GoRide.dto;

import java.time.LocalDateTime;

public class RecentActivityDTO {
    private String title;
    private String description;
    private String type;
    private String category; // success, info, warning, danger
    private LocalDateTime createdAt;

    public RecentActivityDTO() {}

    public RecentActivityDTO(String title, String description, String type, String category, LocalDateTime createdAt) {
        this.title = title;
        this.description = description;
        this.type = type;
        this.category = category;
        this.createdAt = createdAt;
    }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
