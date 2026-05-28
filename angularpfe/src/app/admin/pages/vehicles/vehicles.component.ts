import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-vehicles',
  templateUrl: './vehicles.component.html',
  styleUrls: ['./vehicles.component.css']
})
export class VehiclesComponent implements OnInit {
  vehicles: any[] = [];
  filteredVehicles: any[] = [];
  searchTerm: string = '';
  currentFilter: string = 'ALL';
  currentSort: string = 'NEWEST';

  stats = {
    total: 0,
    validated: 0,
    pending: 0,
    available: 0,
    inRide: 0,
    maintenance: 0,
    suspended: 0,
    totalRevenue: 0
  };

  selectedVehicle: any = null;
  isDetailsModalOpen: boolean = false;
  isSuspendModalOpen: boolean = false;
  suspensionReason: string = '';
  suspensionError: string = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.initVehicles();
    this.calculateStats();
    this.applyFilter('ALL');
  }

  initVehicles(): void {
    // Les véhicules seront chargés depuis l'API dans les prochains scénarios.
    this.vehicles = [];
  }

  saveVehicles(): void {
    localStorage.setItem('admin_vehicles', JSON.stringify(this.vehicles));
    this.calculateStats();
  }

  calculateStats(): void {
    this.stats = {
      total: this.vehicles.length,
      validated: this.vehicles.filter(v => v.validationStatus === 'APPROVED').length,
      pending: this.vehicles.filter(v => v.validationStatus === 'PENDING').length,
      available: this.vehicles.filter(v => v.availabilityStatus === 'AVAILABLE').length,
      inRide: this.vehicles.filter(v => v.availabilityStatus === 'IN_RIDE' || v.availabilityStatus === 'RENTED').length,
      maintenance: this.vehicles.filter(v => v.availabilityStatus === 'MAINTENANCE').length,
      suspended: this.vehicles.filter(v => v.availabilityStatus === 'SUSPENDED').length,
      totalRevenue: this.vehicles.reduce((acc, v) => acc + v.totalRevenue, 0)
    };
  }

  onSearch(): void {
    this.applyFilter(this.currentFilter);
  }

  applyFilter(filter: string): void {
    this.currentFilter = filter;
    let filtered = [...this.vehicles];

    // Filter Logic
    if (filter === 'APPROVED') filtered = filtered.filter(v => v.validationStatus === 'APPROVED');
    else if (filter === 'PENDING') filtered = filtered.filter(v => v.validationStatus === 'PENDING');
    else if (filter === 'REJECTED') filtered = filtered.filter(v => v.validationStatus === 'REJECTED');
    else if (filter === 'AVAILABLE') filtered = filtered.filter(v => v.availabilityStatus === 'AVAILABLE');
    else if (filter === 'RENTED') filtered = filtered.filter(v => v.availabilityStatus === 'RENTED' || v.availabilityStatus === 'IN_RIDE');
    else if (filter === 'MAINTENANCE') filtered = filtered.filter(v => v.availabilityStatus === 'MAINTENANCE');
    else if (filter === 'SUSPENDED') filtered = filtered.filter(v => v.availabilityStatus === 'SUSPENDED');
    else if (filter === 'OWNER') filtered = filtered.filter(v => v.ownerRole === 'FLEET_OWNER');
    else if (filter === 'DRIVER') filtered = filtered.filter(v => v.ownerRole === 'DRIVER');
    else if (filter === 'PLATFORM') filtered = filtered.filter(v => v.ownerRole === 'PLATFORM');

    // Search Logic
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(v => 
        v.brand.toLowerCase().includes(term) ||
        v.model.toLowerCase().includes(term) ||
        v.plateNumber.toLowerCase().includes(term) ||
        v.ownerName.toLowerCase().includes(term) ||
        v.city.toLowerCase().includes(term)
      );
    }

    // Sort Logic
    this.sortVehicles(filtered);
  }

  sortVehicles(data: any[]): void {
    if (this.currentSort === 'NEWEST') data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (this.currentSort === 'OLDEST') data.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (this.currentSort === 'REVENUE_DESC') data.sort((a, b) => b.totalRevenue - a.totalRevenue);
    else if (this.currentSort === 'REVENUE_ASC') data.sort((a, b) => a.totalRevenue - b.totalRevenue);
    else if (this.currentSort === 'RATING_DESC') data.sort((a, b) => b.rating - a.rating);
    else if (this.currentSort === 'PRICE_DESC') data.sort((a, b) => (b.pricePerDay || b.pricePerRide) - (a.pricePerDay || a.pricePerRide));
    else if (this.currentSort === 'PRICE_ASC') data.sort((a, b) => (a.pricePerDay || a.pricePerRide) - (b.pricePerDay || b.pricePerRide));

    this.filteredVehicles = data;
  }

  getValidationBadge(status: string): string {
    if (status === 'APPROVED') return 'bg-success-soft text-success';
    if (status === 'PENDING') return 'bg-warning-soft text-warning';
    if (status === 'REJECTED') return 'bg-danger-soft text-danger';
    return 'bg-light text-muted';
  }

  getValidationLabel(status: string): string {
    if (status === 'APPROVED') return 'Validé';
    if (status === 'PENDING') return 'En attente';
    if (status === 'REJECTED') return 'Refusé';
    return status;
  }

  getAvailabilityBadge(status: string): string {
    if (status === 'AVAILABLE') return 'bg-success text-white';
    if (status === 'RENTED' || status === 'IN_RIDE') return 'bg-primary text-white';
    if (status === 'MAINTENANCE') return 'bg-warning text-dark';
    if (status === 'SUSPENDED') return 'bg-danger text-white';
    return 'bg-secondary text-white';
  }

  getAvailabilityLabel(status: string): string {
    if (status === 'AVAILABLE') return 'Disponible';
    if (status === 'RENTED') return 'Loué';
    if (status === 'IN_RIDE') return 'En course';
    if (status === 'MAINTENANCE') return 'Maintenance';
    if (status === 'SUSPENDED') return 'Suspendu';
    return status;
  }

  openDetails(vehicle: any): void {
    this.selectedVehicle = vehicle;
    this.isDetailsModalOpen = true;
  }

  closeDetails(): void {
    this.isDetailsModalOpen = false;
  }

  goToValidations(vehicle: any): void {
    this.router.navigate(['/admin/validations'], { queryParams: { type: 'vehicle', vehicleId: vehicle.id } });
  }

  toggleMaintenance(vehicle: any): void {
    const isMaintenance = vehicle.availabilityStatus === 'MAINTENANCE';
    const action = isMaintenance ? 'remettre en service' : 'mettre en maintenance';
    if (confirm(`Voulez-vous vraiment ${action} le véhicule ${vehicle.brand} ${vehicle.model} ?`)) {
      vehicle.availabilityStatus = isMaintenance ? 'AVAILABLE' : 'MAINTENANCE';
      this.saveVehicles();
      this.applyFilter(this.currentFilter);
    }
  }

  openSuspendModal(vehicle: any): void {
    this.selectedVehicle = vehicle;
    this.suspensionReason = '';
    this.suspensionError = '';
    this.isSuspendModalOpen = true;
  }

  confirmSuspension(): void {
    if (!this.suspensionReason.trim()) {
      this.suspensionError = 'Le motif de suspension est obligatoire.';
      return;
    }
    this.selectedVehicle.availabilityStatus = 'SUSPENDED';
    this.selectedVehicle.suspensionReason = this.suspensionReason;
    this.saveVehicles();
    this.applyFilter(this.currentFilter);
    this.isSuspendModalOpen = false;
  }

  reactivateVehicle(vehicle: any): void {
    if (confirm(`Voulez-vous réactiver le véhicule ${vehicle.brand} ${vehicle.model} ?`)) {
      vehicle.availabilityStatus = 'AVAILABLE';
      this.saveVehicles();
      this.applyFilter(this.currentFilter);
    }
  }
}
