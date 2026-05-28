import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CompanyService } from '../../../services/company.service';

@Component({
  selector: 'app-company-reviews',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.css']
})
export class CompanyReviewsComponent implements OnInit {
  pendingReviews: any[] = [];
  sentReviews: any[] = [];
  
  stats = {
    toLeave: 0,
    sent: 0,
    avgRating: 0,
    targets: 'Chauffeurs / Proprio'
  };

  showReviewModal = false;
  showDetailsModal = false;
  selectedService: any = null;
  selectedReview: any = null;
  
  reviewForm = {
    rating: 5,
    driverRating: 5,
    ownerRating: 5,
    vehicleRating: 5,
    comment: '',
    punctuality: true,
    professionalism: true,
    cleanliness: true,
    recommend: true,
    communication: true,
    vehicleState: true,
    professionalService: true,
    conformance: true
  };

  errors: string[] = [];
  successMessage = '';

  constructor(private router: Router, private companyService: CompanyService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.companyService.getReviews().subscribe({
      next: (data) => {
        if (data) {
          this.pendingReviews = (data.pendingReviews || []).map((s: any) => ({
            id: s.id,
            requestId: s.requestId || s.id,
            type: s.type || s.serviceType,
            title: s.type === 'VEHICLE_RENTAL' ? 'Location véhicule' : 'Mission chauffeur',
            driverId: s.driverId,
            driverName: s.driverName || 'Chauffeur',
            vehicleName: s.vehicleName || 'Véhicule',
            city: s.city || 'Tunis',
            amount: s.budget || s.pricePerDay || 0,
            status: s.status,
            date: s.createdAt
          }));

          this.sentReviews = (data.sentReviews || []).map((r: any) => ({
            id: r.id,
            rating: r.vehicleRating != null ? r.vehicleRating : 5.0,
            comment: r.comment || 'Avis sur service',
            driverName: r.driver ? (r.driver.firstName + ' ' + r.driver.lastName) : (r.driverName || 'Chauffeur'),
            ownerName: r.ownerName || 'Partenaire',
            vehicleName: r.vehicleName || 'Véhicule',
            serviceType: this.getTypeText(r.serviceType),
            city: r.city || 'Tunis',
            createdAt: r.createdAt
          }));

          const stats = data.stats || { pending: 0, sent: 0, averageGiven: 0 };
          this.stats = {
            toLeave: stats.pending || this.pendingReviews.length,
            sent: stats.sent || this.sentReviews.length,
            avgRating: stats.averageGiven || 0,
            targets: 'Chauffeurs / Proprio'
          };
        }
      },
      error: (err) => {
        console.error('Erreur lors du chargement des avis', err);
      }
    });
  }

  calculateStats(): void {
    const totalRating = this.sentReviews.reduce((acc, curr) => acc + (curr.rating || 0), 0);
    this.stats = {
      toLeave: this.pendingReviews.length,
      sent: this.sentReviews.length,
      avgRating: this.sentReviews.length > 0 ? Number((totalRating / this.sentReviews.length).toFixed(1)) : 0,
      targets: 'Chauffeurs / Proprio'
    };
  }

  openReviewModal(service: any): void {
    this.selectedService = service;
    this.errors = [];
    this.reviewForm = {
      rating: 5,
      driverRating: 5,
      ownerRating: 5,
      vehicleRating: 5,
      comment: '',
      punctuality: true,
      professionalism: true,
      cleanliness: true,
      recommend: true,
      communication: true,
      vehicleState: true,
      professionalService: true,
      conformance: true
    };
    this.showReviewModal = true;
  }

  closeModals(): void {
    this.showReviewModal = false;
    this.showDetailsModal = false;
    this.selectedService = null;
    this.selectedReview = null;
  }

  submitReview(): void {
    this.errors = [];
    
    if (!this.reviewForm.comment || this.reviewForm.comment.length < 10) {
      this.errors.push('Le commentaire doit faire au moins 10 caractères.');
    }

    if (this.errors.length > 0) return;

    this.successMessage = 'Votre avis a été envoyé avec succès !';
    setTimeout(() => {
      this.successMessage = '';
      this.closeModals();
    }, 2000);
  }

  openDetails(review: any): void {
    this.selectedReview = review;
    this.showDetailsModal = true;
  }

  getTypeText(type: string): string {
    switch(type) {
      case 'DRIVER_WITH_CAR': return 'Chauffeur avec voiture';
      case 'VEHICLE_RENTAL': return 'Location de véhicule';
      case 'MIXED_SERVICE': return 'Service mixte';
      case 'CUSTOM_REQUEST': return 'Demande personnalisée';
      default: return type || 'Service';
    }
  }
}
