import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SearchService } from '../../../services/search.service';
import { Subscription } from 'rxjs';
import { PartnerVehicleService, PartnerVehicle } from '../../services/partner-vehicle.service';
import { vehiclePhotoFallback } from '../../../shared/utils/vehicle-image.util';

@Component({
  selector: 'app-partner-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-vehicles.component.html',
  styleUrls: ['./partner-vehicles.component.css']
})
export class PartnerVehiclesComponent implements OnInit, OnDestroy {
  vehicles: PartnerVehicle[] = [];
  filteredVehicles: PartnerVehicle[] = [];
  isLoading = true;
  searchTerm = '';
  sortBy = 'PRICE_ASC';
  
  // Modal States
  showDetailsModal = false;
  showConfirmModal = false;
  selectedVehicle: PartnerVehicle | null = null;
  isProcessing = false;

  private searchSub?: Subscription;

  constructor(
    private partnerService: PartnerVehicleService,
    private router: Router,
    private route: ActivatedRoute,
    private searchService: SearchService
  ) {}

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  ngOnInit(): void {
    this.searchSub = this.searchService.bindPage(this.route, term => {
      if (this.searchTerm !== term) {
        this.searchTerm = term;
        this.applyFilters();
      }
    });
    this.loadVehicles();
  }

  loadVehicles(): void {
    this.isLoading = true;
    this.partnerService.getAvailableVehicles().subscribe({
      next: (data) => {
        console.log('Partner vehicles API response:', data);
        this.vehicles = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement véhicules:', err);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    let result = [...this.vehicles];

    // Search on brand, model, city, agency, category
    const q = this.searchTerm.toLowerCase().trim();
    if (q) {
      result = result.filter(v => 
        v.name.toLowerCase().includes(q) || 
        v.category.toLowerCase().includes(q) || 
        v.location.toLowerCase().includes(q) ||
        v.agency.toLowerCase().includes(q)
      );
    }

    // Sort by driver price, rating, or recency
    if (this.sortBy === 'PRICE_ASC') {
      result.sort((a, b) => a.driverPrice - b.driverPrice);
    } else if (this.sortBy === 'PRICE_DESC') {
      result.sort((a, b) => b.driverPrice - a.driverPrice);
    } else if (this.sortBy === 'RATING') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (this.sortBy === 'RECENT') {
      result.sort((a, b) => Number(b.id) - Number(a.id));
    }

    this.filteredVehicles = result;
  }

  openDetails(v: PartnerVehicle): void {
    this.selectedVehicle = v;
    this.showDetailsModal = true;
  }

  closeDetails(): void {
    this.showDetailsModal = false;
  }

  openConfirm(v: PartnerVehicle): void {
    this.selectedVehicle = v;
    this.showConfirmModal = true;
    this.showDetailsModal = false;
  }

  closeConfirm(): void {
    this.showConfirmModal = false;
  }

  onImageError(v: PartnerVehicle, event?: Event): void {
    const img = event?.target as HTMLImageElement | null;
    const fallback = vehiclePhotoFallback(undefined, v.licensePlate, img?.src || v.image);
    v.image = fallback || '';
    if (fallback && img) {
      img.src = fallback;
    }
  }

  confirmRent(): void {
    if (!this.selectedVehicle) return;
    
    this.isProcessing = true;
    this.partnerService.selectVehicle(this.selectedVehicle).subscribe(() => {
      this.isProcessing = false;
      this.showConfirmModal = false;
      // Redirection vers Mon véhicule après succès
      this.router.navigate(['/driver/my-vehicle']);
    });
  }
}
