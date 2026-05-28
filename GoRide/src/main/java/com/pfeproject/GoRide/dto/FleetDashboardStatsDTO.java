package com.pfeproject.GoRide.dto;

/**
 * DTO contenant les statistiques du tableau de bord du propriétaire de flotte.
 * Retourné par GET /api/fleet/dashboard/stats
 */
public class FleetDashboardStatsDTO {

    private long totalVehicles;
    private long availableVehicles;
    private long rentedVehicles;
    private long maintenanceVehicles;
    private long pendingBookings;
    private double monthlyRevenue;

    // Évolutions par rapport au mois précédent (en %)
    private double totalVehiclesTrend;
    private double availableVehiclesTrend;
    private double pendingBookingsTrend;
    private double monthlyRevenueTrend;

    public FleetDashboardStatsDTO() {}

    public FleetDashboardStatsDTO(
            long totalVehicles,
            long availableVehicles,
            long rentedVehicles,
            long maintenanceVehicles,
            long pendingBookings,
            double monthlyRevenue,
            double totalVehiclesTrend,
            double availableVehiclesTrend,
            double pendingBookingsTrend,
            double monthlyRevenueTrend) {
        this.totalVehicles = totalVehicles;
        this.availableVehicles = availableVehicles;
        this.rentedVehicles = rentedVehicles;
        this.maintenanceVehicles = maintenanceVehicles;
        this.pendingBookings = pendingBookings;
        this.monthlyRevenue = monthlyRevenue;
        this.totalVehiclesTrend = totalVehiclesTrend;
        this.availableVehiclesTrend = availableVehiclesTrend;
        this.pendingBookingsTrend = pendingBookingsTrend;
        this.monthlyRevenueTrend = monthlyRevenueTrend;
    }

    public long getTotalVehicles() { return totalVehicles; }
    public void setTotalVehicles(long totalVehicles) { this.totalVehicles = totalVehicles; }

    public long getAvailableVehicles() { return availableVehicles; }
    public void setAvailableVehicles(long availableVehicles) { this.availableVehicles = availableVehicles; }

    public long getRentedVehicles() { return rentedVehicles; }
    public void setRentedVehicles(long rentedVehicles) { this.rentedVehicles = rentedVehicles; }

    public long getMaintenanceVehicles() { return maintenanceVehicles; }
    public void setMaintenanceVehicles(long maintenanceVehicles) { this.maintenanceVehicles = maintenanceVehicles; }

    public long getPendingBookings() { return pendingBookings; }
    public void setPendingBookings(long pendingBookings) { this.pendingBookings = pendingBookings; }

    public double getMonthlyRevenue() { return monthlyRevenue; }
    public void setMonthlyRevenue(double monthlyRevenue) { this.monthlyRevenue = monthlyRevenue; }

    public double getTotalVehiclesTrend() { return totalVehiclesTrend; }
    public void setTotalVehiclesTrend(double totalVehiclesTrend) { this.totalVehiclesTrend = totalVehiclesTrend; }

    public double getAvailableVehiclesTrend() { return availableVehiclesTrend; }
    public void setAvailableVehiclesTrend(double availableVehiclesTrend) { this.availableVehiclesTrend = availableVehiclesTrend; }

    public double getPendingBookingsTrend() { return pendingBookingsTrend; }
    public void setPendingBookingsTrend(double pendingBookingsTrend) { this.pendingBookingsTrend = pendingBookingsTrend; }

    public double getMonthlyRevenueTrend() { return monthlyRevenueTrend; }
    public void setMonthlyRevenueTrend(double monthlyRevenueTrend) { this.monthlyRevenueTrend = monthlyRevenueTrend; }
}
