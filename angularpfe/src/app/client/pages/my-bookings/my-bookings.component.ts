import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RideRequestService } from '../../../services/ride-request.service';
import { PassengerBookingDto, TripService } from '../../../services/trip.service';
import { passengerBookingToRideCard } from '../../utils/shared-booking.utils';
import { RoleService } from '../../../auth/role.service';
import { ReservationService } from '../../../services/reservation.service';
import { MessagingService } from '../../../services/messaging.service';
import { SearchService } from '../../../services/search.service';
import { Subscription } from 'rxjs';

interface Ride {
  id: any;
  /** Numeric id for API (cancel, chat). */
  bookingId?: number;
  tripId?: number;
  sourceType: 'REQUEST' | 'SHARED_RIDE' | 'COMPLETED_RIDE';
  passengerId: string;
  passengerName: string;
  departure: string;
  destination: string;
  rideType: string;
  date: string;
  time: string;
  passengers: number;
  extras: string[];
  price: number;
  paymentMethod: string;
  driverId?: string;
  driverName?: string;
  driverRating?: number;
  vehicleName?: string;
  status: string;
  createdAt: string;
}

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="rides-page">
  <!-- Header LOCATAIRE -->
  <header class="page-header mb-4" *ngIf="isTenantMode">
    <div class="header-content">
      <h1 class="fw-bold text-primary">Mes réservations de véhicules</h1>
      <p class="text-muted">Suivez vos demandes de location, contrats acceptés et locations terminées.</p>
    </div>
  </header>

  <!-- Header PASSAGER -->
  <header class="page-header mb-4" *ngIf="!isTenantMode">
    <div class="header-content">
      <h1 class="fw-bold text-primary">Mes trajets</h1>
      <p class="text-muted">Suivez vos demandes de course, trajets acceptés, trajets partagés et courses terminées.</p>
    </div>
  </header>

  <!-- Success Message -->
  <div class="alert alert-success animate__animated animate__fadeInDown" *ngIf="successMessage">
    <span class="ion-md-checkmark-circle me-2"></span>
    {{ successMessage }}
  </div>

  <!-- Statistics Cards -->
  <section class="stats-grid mb-4">
    <div class="stat-card" [class.active]="activeFilter === 'Tous'" (click)="setFilter('Tous')">
      <div class="stat-icon all"><span class="ion-md-apps"></span></div>
      <div class="stat-info">
        <span class="stat-label">Tous</span>
        <span class="stat-value">{{ stats.all }}</span>
      </div>
    </div>
    <div class="stat-card" [class.active]="activeFilter === 'En attente chauffeur' || activeFilter === 'En attente'" (click)="isTenantMode ? setFilter('En attente') : setFilter('En attente chauffeur')">
      <div class="stat-icon pending"><span class="ion-md-time"></span></div>
      <div class="stat-info">
        <span class="stat-label">En attente</span>
        <span class="stat-value">{{ stats.pending }}</span>
      </div>
    </div>
    <div class="stat-card" [class.active]="activeFilter === 'Acceptée'" (click)="setFilter('Acceptée')">
      <div class="stat-icon accepted"><span class="ion-md-checkmark-circle"></span></div>
      <div class="stat-info">
        <span class="stat-label">Acceptés</span>
        <span class="stat-value">{{ stats.accepted }}</span>
      </div>
    </div>
    <div class="stat-card" [class.active]="activeFilter === 'En cours' || activeFilter === 'Active'" (click)="isTenantMode ? setFilter('Active') : setFilter('En cours')">
      <div class="stat-icon ongoing"><span class="ion-md-car"></span></div>
      <div class="stat-info">
        <span class="stat-label">En cours</span>
        <span class="stat-value">{{ stats.ongoing }}</span>
      </div>
    </div>
    <div class="stat-card" [class.active]="activeFilter === 'Terminée'" (click)="setFilter('Terminée')">
      <div class="stat-icon completed"><span class="ion-md-done-all"></span></div>
      <div class="stat-info">
        <span class="stat-label">Terminés</span>
        <span class="stat-value">{{ stats.completed }}</span>
      </div>
    </div>
  </section>

  <!-- Controls Section -->
  <section class="controls-section mb-4 card p-3 shadow-sm border-0">
    <div class="row align-items-center g-3">
      <div class="col-lg-6">
        <div class="filters-scroll">
          <div class="tabs-container d-flex gap-2">
            <button 
              *ngFor="let f of filters" 
              [class.active]="activeFilter === f"
              (click)="setFilter(f)"
              class="btn-tab">
              {{ f }}
            </button>
          </div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="search-input-wrapper">
          <span class="ion-md-search icon"></span>
          <input type="text" [(ngModel)]="searchQuery" (input)="onSearchInput()" [placeholder]="isTenantMode ? 'Rechercher une réservation, propriétaire...' : 'Rechercher un trajet, chauffeur, destination...'">
        </div>
      </div>
      <div class="col-lg-2">
        <select class="form-select-custom w-100" [(ngModel)]="sortBy" (change)="onSearchInput()">
          <option value="recent">Plus récents</option>
          <option value="oldest">Plus anciens</option>
          <option value="price-asc">Prix croissant</option>
          <option value="price-desc">Prix décroissant</option>
        </select>
      </div>
    </div>
  </section>

  <!-- Vehicle Rentals List (Tenant Mode) -->
  <main class="rides-list" *ngIf="isTenantMode && filteredRentals.length > 0; else passengerOrEmpty">
    <div class="ride-card animate__animated animate__fadeInUp" *ngFor="let r of filteredRentals">
      <div class="ride-card-content p-4">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div class="route-info flex-grow-1">
            <div class="d-flex align-items-center mb-1">
              <span class="dot-start"></span>
              <h5 class="mb-0 fw-bold">{{ r.pickupLocation }}</h5>
            </div>
            <div class="route-line"></div>
            <div class="d-flex align-items-center">
              <span class="dot-end"></span>
              <h5 class="mb-0 fw-bold">{{ r.returnLocation }}</h5>
            </div>
          </div>
          <div class="text-end">
            <span class="status-badge d-block mb-1" [ngClass]="getRentalStatusClass(r.status)">{{ getRentalStatusLabel(r.status) }}</span>
            <small class="text-muted fw-bold" style="font-size: 0.7rem;">RÉSERVATION #{{ r.id }}</small>
          </div>
        </div>

        <div class="ride-details-grid mb-4">
          <div class="detail-item">
            <span class="label">Date Début</span>
            <span class="val"><i class="ion-md-calendar me-1 text-primary"></i> {{ r.startDate | date:'dd/MM/yyyy' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Date Fin</span>
            <span class="val"><i class="ion-md-calendar-outline me-1 text-primary"></i> {{ r.endDate | date:'dd/MM/yyyy' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Véhicule</span>
            <span class="val"><i class="ion-md-car me-1 text-primary"></i> {{ r.vehicle?.brand }} {{ r.vehicle?.model }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Prix Total</span>
            <span class="val text-primary fw-bold" style="font-size: 1.1rem;">{{ r.totalPrice }} DT</span>
          </div>
        </div>

        <div class="driver-snippet mb-4 p-3 bg-light rounded-4 d-flex align-items-center justify-content-between" *ngIf="r.owner">
          <div class="d-flex align-items-center">
            <div class="avatar-sm me-3">{{ r.owner.firstName?.charAt(0) }}</div>
            <div>
              <div class="fw-bold">Propriétaire : {{ r.owner.firstName }} {{ r.owner.lastName }}</div>
              <div class="small text-muted">Contrat de location GoRide</div>
            </div>
          </div>
        </div>

        <div class="actions-footer pt-3 border-top d-flex gap-2 flex-wrap align-items-center">
          <div class="text-muted small">
            <i class="ion-md-wallet me-1"></i> {{ r.paymentStatus === 'PAID' ? 'Payée' : 'Paiement en attente' }}
          </div>
          
          <div class="ms-auto d-flex gap-2">
            <button class="btn-action-outline" (click)="openRentalDetails(r)">Détails</button>
            <button class="btn-action-soft" (click)="contactOwner(r)">Contacter propriétaire</button>

            <!-- Annuler -->
            <button *ngIf="r.status === 'PENDING' || r.status === 'ACCEPTED'" class="btn-action-danger" (click)="confirmCancelRental(r)">Annuler</button>
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- Passenger Rides List (Passenger Mode) -->
  <ng-template #passengerOrEmpty>
    <main class="rides-list" *ngIf="!isTenantMode && filteredRides.length > 0; else emptyState">
      <div class="ride-card animate__animated animate__fadeInUp" *ngFor="let r of filteredRides; trackBy: trackRide">
        <div class="ride-card-content p-4">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="route-info flex-grow-1">
              <div class="d-flex align-items-center mb-1">
                <span class="dot-start"></span>
                <h5 class="mb-0 fw-bold">{{ r.departure }}</h5>
              </div>
              <div class="route-line"></div>
              <div class="d-flex align-items-center">
                <span class="dot-end"></span>
                <h5 class="mb-0 fw-bold">{{ r.destination }}</h5>
              </div>
            </div>
            <div class="text-end">
              <span class="status-badge d-block mb-1" [ngClass]="getStatusClass(r.status)">{{ getStatusLabel(r.status) }}</span>
              <small class="text-muted fw-bold" style="font-size: 0.7rem;">
                {{ r.sourceType === 'SHARED_RIDE' ? 'COVOITURAGE #' + (r.bookingId ?? r.id) : 'COURSE #' + r.id }}
              </small>
            </div>
          </div>

          <div class="ride-details-grid mb-4">
            <div class="detail-item">
              <span class="label">Date & Heure</span>
              <span class="val"><i class="ion-md-calendar me-1 text-primary"></i> {{ r.date }} à {{ r.time }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Type de trajet</span>
              <span class="val text-capitalize">
                <i class="ion-md-git-network me-1 text-primary"></i> 
                {{ r.sourceType === 'SHARED_RIDE' ? 'Trajet partagé' : (r.rideType === 'INDIVIDUAL' ? 'Individuel' : 'Collaboratif') }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">{{ r.sourceType === 'SHARED_RIDE' ? 'Places' : 'Passagers' }}</span>
              <span class="val"><i class="ion-md-people me-1 text-primary"></i> {{ r.passengers }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Prix</span>
              <span class="val text-primary fw-bold" style="font-size: 1.1rem;">{{ r.price }} DT</span>
            </div>
          </div>

          <div class="driver-snippet mb-4 p-3 bg-light rounded-4 d-flex align-items-center justify-content-between" *ngIf="r.driverName">
            <div class="d-flex align-items-center">
              <div class="avatar-sm me-3">{{ r.driverName.charAt(0) }}</div>
              <div>
                <div class="fw-bold">{{ r.driverName }}</div>
                <div class="small text-muted">{{ r.vehicleName || 'Véhicule GoRide' }}</div>
              </div>
            </div>
            <div class="text-warning fw-bold"><i class="ion-md-star me-1"></i>{{ r.driverRating || '4.9' }}</div>
          </div>

          <div class="extras-row mb-4" *ngIf="r.extras && r.extras.length > 0">
            <div class="d-flex flex-wrap gap-2">
              <span class="badge bg-soft-primary text-primary" *ngFor="let ex of r.extras">
                <i class="ion-md-add-circle-outline me-1"></i>{{ ex }}
              </span>
            </div>
          </div>

          <div class="actions-footer pt-3 border-top d-flex gap-2 flex-wrap align-items-center">
            <div class="text-muted small">
              <i class="ion-md-wallet me-1"></i> {{ r.paymentMethod }}
            </div>
            
            <div class="ms-auto d-flex gap-2">
              <button class="btn-action-outline" (click)="openDetails(r)">Détails</button>

              <!-- PENDING -->
              <ng-container *ngIf="r.status === 'PENDING'">
                <button class="btn-action-primary" (click)="openDetails(r)">Voir ma demande</button>
                <button class="btn-action-danger" (click)="confirmCancel(r)">Annuler</button>
              </ng-container>

              <!-- ACCEPTED or ARRIVING (course individuelle) -->
              <ng-container *ngIf="(r.status === 'ACCEPTED' || r.status === 'DRIVER_ARRIVING') && r.sourceType !== 'SHARED_RIDE'">
                <button class="btn-action-primary" (click)="goToCurrentRide()">Suivre chauffeur</button>
                <button class="btn-action-soft" (click)="contactDriver(r)">Contacter</button>
                <button class="btn-action-danger" (click)="confirmCancel(r)">Annuler</button>
              </ng-container>

              <!-- Covoiturage confirmé (même carte que course acceptée) -->
              <ng-container *ngIf="r.sourceType === 'SHARED_RIDE' && (r.status === 'CONFIRMED' || r.status === 'ACCEPTED')">
                <button class="btn-action-primary" (click)="viewSharedTrip(r)">Voir le trajet</button>
                <button class="btn-action-soft" (click)="contactDriver(r)">Contacter</button>
                <button class="btn-action-danger" (click)="confirmCancel(r)">Annuler réservation</button>
              </ng-container>

              <!-- IN_PROGRESS -->
              <ng-container *ngIf="r.status === 'IN_PROGRESS'">
                <button class="btn-action-primary" (click)="goToCurrentRide()">Suivre trajet</button>
                <button class="btn-action-soft" (click)="contactDriver(r)">Contacter</button>
              </ng-container>

              <!-- COMPLETED -->
              <ng-container *ngIf="r.status === 'COMPLETED'">
                <button class="btn-action-soft" (click)="viewReceipt(r)">Voir reçu</button>
                <button class="btn-action-warning" (click)="leaveReview(r)">Laisser un avis</button>
              </ng-container>

              <!-- REJECTED or CANCELLED -->
              <ng-container *ngIf="r.status === 'REJECTED' || r.status === 'CANCELLED'">
                <button class="btn-action-primary" routerLink="/client/request-ride">Commander à nouveau</button>
              </ng-container>
            </div>
          </div>
        </div>
      </div>
    </main>
  </ng-template>

  <!-- Empty State -->
  <ng-template #emptyState>
    <div class="empty-state text-center py-5">
      <div class="empty-icon mb-4">
        <span class="ion-md-map text-muted"></span>
      </div>
      <h3 class="fw-bold">{{ isTenantMode ? 'Aucune réservation de véhicule' : 'Aucun trajet trouvé' }}</h3>
      <p class="text-muted mb-4">{{ isTenantMode ? 'Vous n\\'avez pas encore de demande de réservation de véhicule.' : 'Vous n\\'avez pas encore de demande de trajet correspondant à ce filtre.' }}</p>
      <button class="btn btn-primary px-5 py-3 rounded-pill shadow" [routerLink]="isTenantMode ? '/client/explore' : '/client/request-ride'">
        {{ isTenantMode ? 'Explorer les véhicules' : 'Commander une course' }}
      </button>
    </div>
  </ng-template>

</div>

  <!-- PASSENGER DETAILS MODAL (outside .rides-page for correct centering) -->
  <div class="app-modal-overlay" *ngIf="showDetailsModal && selectedRide" (click)="closeDetails()">
    <div class="modal-card modal-card-compact" (click)="$event.stopPropagation()">
      <div class="modal-header modal-header-compact d-flex justify-content-between align-items-center border-bottom bg-light">
        <h5 class="mb-0 fw-bold">Récapitulatif du trajet</h5>
        <button class="btn-close-custom" (click)="closeDetails()"><i class="ion-md-close"></i></button>
      </div>
      <div class="modal-body modal-body-compact">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div class="small-badge">{{ selectedRide?.sourceType === 'SHARED_RIDE' ? 'Trajet Partagé' : 'Course' }}</div>
          <span class="status-badge" [ngClass]="getStatusClass(selectedRide?.status || '')">{{ getStatusLabel(selectedRide?.status || '') }}</span>
        </div>

        <div class="route-box-modal mb-2 p-2 bg-light rounded-3">
          <div class="route-item mb-2">
            <span class="label text-success small fw-bold">DÉPART</span>
            <div class="val fw-bold small-route-val">{{ selectedRide?.departure }}</div>
          </div>
          <div class="route-item">
            <span class="label text-danger small fw-bold">DESTINATION</span>
            <div class="val fw-bold small-route-val">{{ selectedRide?.destination }}</div>
          </div>
        </div>

        <div class="details-grid-modal mb-2">
          <div class="detail-row">
            <span class="label">Identifiant</span>
            <span class="val">#{{ selectedRide?.id }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Date & Heure</span>
            <span class="val">{{ selectedRide?.date }} à {{ selectedRide?.time }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Type de service</span>
            <span class="val text-capitalize">{{ selectedRide?.rideType === 'INDIVIDUAL' ? 'Individuel' : 'Collaboratif' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Passagers / Places</span>
            <span class="val">{{ selectedRide?.passengers }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Méthode de paiement</span>
            <span class="val">{{ selectedRide?.paymentMethod }}</span>
          </div>
          <div class="detail-row" *ngIf="selectedRide?.driverName">
            <span class="label">Chauffeur</span>
            <span class="val">{{ selectedRide?.driverName }}</span>
          </div>
          <div class="detail-row" *ngIf="selectedRide?.vehicleName">
            <span class="label">Véhicule</span>
            <span class="val">{{ selectedRide?.vehicleName }}</span>
          </div>
        </div>

        <div class="price-box price-box-compact p-2 bg-primary text-white rounded-3 shadow-sm text-center">
          <div class="text-uppercase small fw-bold mb-0 opacity-75">Montant</div>
          <div class="fs-5 fw-bold">{{ selectedRide?.price }} DT</div>
        </div>
      </div>
      <div class="modal-footer modal-footer-compact border-top">
        <button class="btn btn-light w-100 py-2 rounded-3 fw-bold" (click)="closeDetails()">Fermer</button>
      </div>
    </div>
  </div>

  <!-- TENANT DETAILS MODAL -->
  <div class="app-modal-overlay" *ngIf="showDetailsModal && selectedRental" (click)="closeDetails()">
    <div class="modal-card modal-card-scroll" (click)="$event.stopPropagation()">
      <div class="modal-header d-flex justify-content-between align-items-center p-4 border-bottom bg-light">
        <h4 class="mb-0 fw-bold">Récapitulatif de la location</h4>
        <button class="btn-close-custom" (click)="closeDetails()"><i class="ion-md-close"></i></button>
      </div>
      <div class="modal-body p-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div class="small-badge">Location Véhicule</div>
          <span class="status-badge" [ngClass]="getRentalStatusClass(selectedRental?.status || '')">{{ getRentalStatusLabel(selectedRental?.status || '') }}</span>
        </div>

        <div class="route-box-modal mb-4 p-3 bg-light rounded-4">
          <div class="route-item mb-3">
            <span class="label text-success small fw-bold">LIEU RÉCUPÉRATION</span>
            <div class="val fw-bold">{{ selectedRental?.pickupLocation }}</div>
          </div>
          <div class="route-item">
            <span class="label text-danger small fw-bold">LIEU RETOUR</span>
            <div class="val fw-bold">{{ selectedRental?.returnLocation }}</div>
          </div>
        </div>

        <div class="details-grid-modal mb-4">
          <div class="detail-row">
            <span class="label">Identifiant</span>
            <span class="val">#{{ selectedRental?.id }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Date de début</span>
            <span class="val">{{ selectedRental?.startDate | date:'dd/MM/yyyy' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Date de fin</span>
            <span class="val">{{ selectedRental?.endDate | date:'dd/MM/yyyy' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Véhicule</span>
            <span class="val">{{ selectedRental?.vehicle?.brand }} {{ selectedRental?.vehicle?.model }}</span>
          </div>
          <div class="detail-row" *ngIf="selectedRental?.owner">
            <span class="label">Propriétaire</span>
            <span class="val">{{ selectedRental?.owner?.firstName }} {{ selectedRental?.owner?.lastName }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Statut Paiement</span>
            <span class="val">{{ selectedRental?.paymentStatus === 'PAID' ? 'Payée' : 'Non payée' }}</span>
          </div>
        </div>

        <div class="price-box p-4 bg-primary text-white rounded-4 shadow-sm text-center">
          <div class="text-uppercase small fw-bold mb-1 opacity-75">Montant Total</div>
          <div class="fs-2 fw-bold">{{ selectedRental?.totalPrice }} DT</div>
        </div>
      </div>
      <div class="modal-footer p-4 border-top">
        <button class="btn btn-light w-100 py-3 rounded-pill fw-bold" (click)="closeDetails()">Fermer l'aperçu</button>
      </div>
    </div>
  </div>

  <!-- CANCEL MODAL -->
  <div class="app-modal-overlay" *ngIf="showCancelModal && (selectedRide || selectedRental)" (click)="showCancelModal = false">
    <div class="modal-card mini" (click)="$event.stopPropagation()">
      <div class="p-4 text-center">
        <div class="icon-circle bg-danger bg-opacity-10 text-danger mb-3 mx-auto">
          <i class="ion-md-alert fs-2"></i>
        </div>
        <h4 class="fw-bold mb-3">Annuler la réservation ?</h4>
        <p class="text-muted mb-4">Voulez-vous vraiment annuler votre réservation ? Cette action est irréversible.</p>
        <div class="d-flex gap-3">
          <button class="btn btn-light flex-grow-1 py-3 rounded-pill fw-bold" (click)="showCancelModal = false">Garder</button>
          <button class="btn btn-danger flex-grow-1 py-3 rounded-pill fw-bold" (click)="isTenantMode ? cancelRental() : cancelRide()">Confirmer l'annulation</button>
        </div>
      </div>
    </div>
  </div>

<style>
  .rides-page { padding: 20px; max-width: 1200px; margin: 0 auto; background: #f8fafc; min-height: 100vh; }
  .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; }
  .stat-card { 
    background: white; padding: 20px; border-radius: 24px; display: flex; align-items: center; 
    gap: 15px; cursor: pointer; transition: all 0.3s; border: 2px solid transparent;
    box-shadow: 0 4px 6px rgba(0,0,0,0.02);
  }
  .stat-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
  .stat-card.active { border-color: #2563eb; background: #f0f7ff; }
  .stat-icon { 
    width: 48px; height: 48px; border-radius: 16px; display: flex; align-items: center; 
    justify-content: center; font-size: 1.5rem;
  }
  .stat-icon.all { background: #f1f5f9; color: #475569; }
  .stat-icon.pending { background: #fff7ed; color: #ea580c; }
  .stat-icon.accepted { background: #f0fdf4; color: #16a34a; }
  .stat-icon.ongoing { background: #eff6ff; color: #2563eb; }
  .stat-icon.completed { background: #faf5ff; color: #7c3aed; }
  
  .stat-info { display: flex; flex-direction: column; }
  .stat-label { font-size: 0.85rem; color: #64748b; font-weight: 600; }
  .stat-value { font-size: 1.25rem; font-weight: 800; color: #1e293b; }

  .btn-tab { 
    background: white; color: #64748b; border: 1px solid #e2e8f0; padding: 8px 18px; 
    border-radius: 12px; font-weight: 700; font-size: 0.85rem; transition: 0.2s; white-space: nowrap;
  }
  .btn-tab.active { background: #2563eb; color: white; border-color: #2563eb; }
  .search-input-wrapper { position: relative; width: 100%; }
  .search-input-wrapper .icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 1.2rem; }
  .search-input-wrapper input { width: 100%; padding: 12px 16px 12px 48px; border: 1px solid #e2e8f0; border-radius: 16px; font-size: 0.9rem; font-weight: 600; outline: none; transition: 0.2s; }
  .search-input-wrapper input:focus { border-color: #2563eb; box-shadow: 0 0 0 4px rgba(37,99,235,0.1); }
  
  .form-select-custom { padding: 12px; border: 1px solid #e2e8f0; border-radius: 16px; font-size: 0.9rem; font-weight: 600; outline: none; }

  .rides-list { display: flex; flex-direction: column; gap: 20px; }
  .ride-card { background: white; border-radius: 28px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); border: 1px solid #f1f5f9; transition: all 0.3s; }
  .ride-card:hover { transform: translateY(-3px); box-shadow: 0 12px 25px rgba(0,0,0,0.05); }
  
  .dot-start { width: 12px; height: 12px; background: #2563eb; border-radius: 50%; margin-right: 12px; display: inline-block; }
  .dot-end { width: 12px; height: 12px; background: #ef4444; border-radius: 50%; margin-right: 12px; display: inline-block; }
  .route-line { width: 2px; height: 20px; background: #cbd5e1; margin-left: 5px; }

  .status-badge { padding: 6px 12px; border-radius: 8px; font-weight: 800; font-size: 0.75rem; text-transform: uppercase; }
  .badge-pending { background: #fff7ed; color: #ea580c; }
  .badge-accepted { background: #f0fdf4; color: #16a34a; }
  .badge-ongoing { background: #eff6ff; color: #2563eb; }
  .badge-completed { background: #faf5ff; color: #7c3aed; }
  .badge-cancelled { background: #f1f5f9; color: #64748b; }
  .badge-rejected { background: #fef2f2; color: #dc2626; }

  .ride-details-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; background: #f8fafc; padding: 15px; border-radius: 20px; }
  .detail-item { display: flex; flex-direction: column; }
  .detail-item .label { font-size: 0.75rem; color: #64748b; font-weight: 600; margin-bottom: 4px; }
  .detail-item .val { font-weight: 700; color: #1e293b; font-size: 0.9rem; }

  .avatar-sm { width: 36px; height: 36px; border-radius: 50%; background: #2563eb; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; }
  .btn-action-outline { border: 1px solid #e2e8f0; background: white; color: #475569; padding: 10px 18px; border-radius: 12px; font-weight: 700; font-size: 0.85rem; transition: 0.3s; }
  .btn-action-outline:hover { background: #f8fafc; border-color: #cbd5e1; }
  .btn-action-primary { background: #2563eb; color: white; border: none; padding: 10px 18px; border-radius: 12px; font-weight: 700; font-size: 0.85rem; transition: 0.3s; box-shadow: 0 4px 10px rgba(37,99,235,0.2); }
  .btn-action-primary:hover { background: #1d4ed8; transform: translateY(-2px); }
  .btn-action-danger { background: #fff1f2; color: #e11d48; border: 1px solid #fee2e2; padding: 10px 18px; border-radius: 12px; font-weight: 700; font-size: 0.85rem; transition: 0.3s; }
  .btn-action-danger:hover { background: #ffe4e6; }
  .btn-action-soft { background: #f1f5f9; color: #475569; border: none; padding: 10px 18px; border-radius: 12px; font-weight: 700; font-size: 0.85rem; }
  .btn-action-warning { background: #fffbeb; color: #d97706; border: 1px solid #fef3c7; padding: 10px 18px; border-radius: 12px; font-weight: 700; font-size: 0.85rem; }

  .modal-card { background: white; border-radius: 32px; width: 100%; max-width: 550px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); margin: auto; }
  .modal-card.modal-card-scroll { max-width: 520px; max-height: min(90vh, 720px); display: flex; flex-direction: column; overflow: hidden; }
  .modal-card.modal-card-scroll .modal-body { overflow-y: auto; flex: 1 1 auto; }
  .modal-card.modal-card-compact { max-width: 400px; border-radius: 16px; max-height: min(88vh, 640px); overflow-y: auto; }
  .modal-header-compact { padding: 0.75rem 1rem; }
  .modal-body-compact { padding: 0.85rem 1rem; }
  .modal-footer-compact { padding: 0.65rem 1rem; }
  .modal-card.mini { max-width: 400px; }
  .details-grid-modal .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 0.88rem; }
  .details-grid-modal .label { color: #64748b; font-size: 0.8rem; }
  .details-grid-modal .val { font-weight: 700; color: #1e293b; font-size: 0.88rem; }
  .small-route-val { font-size: 0.95rem; }
  .price-box-compact { margin-top: 0.25rem; }
  .small-badge { background: #f1f5f9; color: #64748b; padding: 4px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }

  @media (max-width: 992px) {
    .stats-grid { grid-template-columns: repeat(3, 1fr); }
    .ride-details-grid { grid-template-columns: repeat(2, 1fr); }
  }
</style>
`
})
export class MyBookingsComponent implements OnInit {
  isTenantMode = false;
  
  // Passenger variables
  allRides: Ride[] = [];
  filteredRides: Ride[] = [];
  
  // Tenant variables
  allRentals: any[] = [];
  filteredRentals: any[] = [];
  
  successMessage = '';
  
  // Filters & State
  activeFilter = 'Tous';
  searchQuery = '';
  sortBy = 'recent';
  stats = { all: 0, pending: 0, accepted: 0, ongoing: 0, completed: 0 };
  filters = ['Tous', 'En attente chauffeur', 'Acceptée', 'En cours', 'Terminée', 'Refusée', 'Annulée', 'Trajets partagés'];
  tenantFilters = ['Tous', 'En attente', 'Acceptée', 'Active', 'Terminée', 'Annulée', 'Refusée'];

  // Modal State
  showDetailsModal = false;
  showCancelModal = false;
  selectedRide: Ride | null = null;
  selectedRental: any | null = null;

  private searchSub?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private rideRequestService: RideRequestService,
    private tripService: TripService,
    private roleService: RoleService,
    private reservationService: ReservationService,
    private messagingService: MessagingService,
    private searchService: SearchService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.searchSub = this.searchService.bindPage(this.route, term => {
      if (this.searchQuery !== term) {
        this.searchQuery = term;
        this.applyFilters();
      }
    });

    this.roleService.activeRole$.subscribe(role => {
      // ROLE_CLIENT = locataire (location véhicule). Passager covoiturage = ROLE_USER.
      this.isTenantMode = role === 'ROLE_CLIENT';
      if (this.isTenantMode) {
        this.filters = this.tenantFilters;
      } else {
        this.filters = ['Tous', 'En attente chauffeur', 'Acceptée', 'En cours', 'Terminée', 'Refusée', 'Annulée', 'Trajets partagés'];
      }
      this.activeFilter = 'Tous';
      this.searchQuery = '';
      this.loadData();
    });

    window.addEventListener('rideRequestCreated', () => {
      if (!this.isTenantMode) this.loadRides();
    });

    this.route.queryParams.subscribe(params => {
      if (params['sharedBooked'] === '1') {
        this.onSharedBookingArrived();
      }
    });
  }

  /** Ouverture depuis une notification (Mes trajets). */
  private openReservationFromQuery(tripId?: string | null, bookingId?: string | null): void {
    if (this.isTenantMode) return;
    let ride: Ride | undefined;
    if (bookingId) {
      ride = this.allRides.find(r => String(r.bookingId ?? r.id) === String(bookingId));
    }
    if (!ride && tripId) {
      ride = this.allRides.find(r => String(r.tripId ?? r.id) === String(tripId));
    }
    if (ride) {
      this.openDetails(ride);
      return;
    }
    if (tripId) {
      this.router.navigate(['/client/available-rides'], { queryParams: { tripId } });
    }
  }

  /** Après réservation covoiturage : carte immédiate puis sync API. */
  private onSharedBookingArrived(): void {
    this.successMessage = 'Réservation confirmée ! Vous êtes inscrit à ce trajet partagé.';
    const fromState = (history.state as { newBooking?: PassengerBookingDto })?.newBooking;
    if (fromState?.id) {
      this.upsertSharedRide(passengerBookingToRideCard(fromState) as Ride);
    }
    if (!this.isTenantMode) {
      this.loadRides();
    }
    setTimeout(() => this.successMessage = '', 6000);
  }

  private upsertSharedRide(ride: Ride): void {
    const key = `SHARED_RIDE-${ride.bookingId ?? ride.id}`;
    const map = new Map(this.allRides.map(r => [`${r.sourceType}-${r.bookingId ?? r.id}`, r]));
    map.set(key, ride);
    this.allRides = Array.from(map.values());
    this.calculateStats();
    this.applyFilters();
    this.cdr.detectChanges();
  }
  
  loadData(): void {
    if (this.isTenantMode) {
      this.loadRentals();
    } else {
      this.loadRides();
    }
  }
  
  loadRentals(): void {
    this.reservationService.getClientRentals().subscribe({
      next: (rentals) => {
        this.allRentals = rentals || [];
        this.calculateTenantStats();
        this.applyTenantFilters();
      },
      error: (err) => console.error('Error loading vehicle rentals', err)
    });
  }

  loadRides(): void {
    forkJoin({
      requests: this.rideRequestService.getMyRideRequests().pipe(
        catchError(err => {
          console.error('Error loading ride requests', err);
          return of([] as any[]);
        })
      ),
      shared: this.tripService.getMyBookings().pipe(
        catchError(err => {
          console.error('Error loading shared bookings', err);
          return of([] as PassengerBookingDto[]);
        })
      )
    }).subscribe(({ requests, shared }) => {
      const requestRides = (requests || []).map((r: any) => this.normalizeRide(r, 'REQUEST'));
      const sharedRides = (shared || []).map(b => passengerBookingToRideCard(b) as Ride);
      const map = new Map<string, Ride>();
      [...requestRides, ...sharedRides].forEach(r =>
        map.set(`${r.sourceType}-${r.bookingId ?? r.id}`, r)
      );
      this.allRides = Array.from(map.values());
      this.calculateStats();
      this.applyFilters();
      this.cdr.detectChanges();
      this.openReservationFromQuery(
        this.route.snapshot.queryParamMap.get('tripId'),
        this.route.snapshot.queryParamMap.get('bookingId')
      );
    });
  }

  private normalizeRide(r: any, sourceType: 'REQUEST' | 'SHARED_RIDE' | 'COMPLETED_RIDE'): Ride {
    let finalPrice = r.estimatedPrice || r.price || 0;
    return {
      id: r.id,
      sourceType: sourceType,
      passengerId: r.client?.id || r.passengerId || '0',
      passengerName: r.client ? `${r.client.firstName} ${r.client.lastName}` : (r.passengerName || 'Utilisateur'),
      departure: r.departure,
      destination: r.destination,
      rideType: r.rideType,
      date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : (r.date || ''),
      time: r.createdAt ? new Date(r.createdAt).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}) : (r.time || ''),
      passengers: r.passengers || 1,
      extras: r.extras || [],
      price: finalPrice,
      paymentMethod: r.paymentMethod || 'Espèces',
      driverId: r.driver?.id || r.driverId,
      driverName: r.driver ? `${r.driver.firstName} ${r.driver.lastName}` : r.driverName,
      driverRating: 4.9,
      vehicleName: r.driver?.vehicle?.model || r.vehicleName || 'Véhicule standard',
      status: r.status,
      createdAt: r.createdAt || new Date().toISOString()
    };
  }

  calculateStats(): void {
    this.stats = {
      all: this.allRides.length,
      pending: this.allRides.filter(r => r.status === 'PENDING').length,
      accepted: this.allRides.filter(r =>
        r.status === 'ACCEPTED' || r.status === 'DRIVER_ARRIVING' || r.status === 'CONFIRMED'
      ).length,
      ongoing: this.allRides.filter(r => r.status === 'IN_PROGRESS').length,
      completed: this.allRides.filter(r => r.status === 'COMPLETED').length
    };
  }

  calculateTenantStats(): void {
    this.stats = {
      all: this.allRentals.length,
      pending: this.allRentals.filter(r => r.status === 'PENDING').length,
      accepted: this.allRentals.filter(r => r.status === 'ACCEPTED').length,
      ongoing: this.allRentals.filter(r => r.status === 'ACTIVE').length,
      completed: this.allRentals.filter(r => r.status === 'COMPLETED').length
    };
  }

  trackRide(_index: number, r: Ride): string {
    return `${r.sourceType}-${r.bookingId ?? r.tripId ?? r.id}`;
  }

  private parseNumericId(value: unknown): number | undefined {
    if (value == null) return undefined;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
    return undefined;
  }

  applyFilters(): void {
    let result = [...this.allRides];

    if (this.activeFilter !== 'Tous') {
      if (this.activeFilter === 'Trajets partagés') {
        result = result.filter(r => r.sourceType === 'SHARED_RIDE');
      } else if (this.activeFilter === 'Acceptée') {
        result = result.filter(r =>
          this.getStatusLabel(r.status) === this.activeFilter ||
          (r.sourceType === 'SHARED_RIDE' && r.status === 'CONFIRMED')
        );
      } else {
        result = result.filter(r => this.getStatusLabel(r.status) === this.activeFilter);
      }
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(r => 
        r.departure.toLowerCase().includes(q) || 
        r.destination.toLowerCase().includes(q) || 
        (r.driverName || '').toLowerCase().includes(q) ||
        (r.vehicleName || '').toLowerCase().includes(q) ||
        r.paymentMethod.toLowerCase().includes(q) ||
        String(r.id).toLowerCase().includes(q) ||
        this.getStatusLabel(r.status).toLowerCase().includes(q)
      );
    }

    switch (this.sortBy) {
      case 'recent': result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case 'oldest': result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      case 'price-asc': result.sort((a, b) => a.price - b.price); break;
      case 'price-desc': result.sort((a, b) => b.price - a.price); break;
    }

    this.filteredRides = result;
  }

  applyTenantFilters(): void {
    let result = [...this.allRentals];

    if (this.activeFilter !== 'Tous') {
      const filterMap: any = {
        'En attente': 'PENDING',
        'Acceptée': 'ACCEPTED',
        'Active': 'ACTIVE',
        'Terminée': 'COMPLETED',
        'Annulée': 'CANCELLED',
        'Refusée': 'REJECTED'
      };
      const targetStatus = filterMap[this.activeFilter];
      if (targetStatus) {
        result = result.filter(r => r.status === targetStatus);
      }
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(r => 
        (r.vehicle?.brand || '').toLowerCase().includes(q) || 
        (r.vehicle?.model || '').toLowerCase().includes(q) || 
        (r.owner?.firstName || '').toLowerCase().includes(q) ||
        (r.owner?.lastName || '').toLowerCase().includes(q) ||
        (r.pickupLocation || '').toLowerCase().includes(q) ||
        (r.returnLocation || '').toLowerCase().includes(q) ||
        String(r.id).toLowerCase().includes(q)
      );
    }

    switch (this.sortBy) {
      case 'recent': result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case 'oldest': result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      case 'price-asc': result.sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0)); break;
      case 'price-desc': result.sort((a, b) => (b.totalPrice || 0) - (a.totalPrice || 0)); break;
    }

    this.filteredRentals = result;
  }

  setFilter(f: string): void {
    this.activeFilter = f;
    if (this.isTenantMode) {
      this.applyTenantFilters();
    } else {
      this.applyFilters();
    }
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  onSearchInput(): void {
    this.searchService.setSearchTerm(this.searchQuery);
    if (this.isTenantMode) {
      this.applyTenantFilters();
    } else {
      this.applyFilters();
    }
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      'PENDING': 'En attente chauffeur',
      'ACCEPTED': 'Acceptée',
      'DRIVER_ARRIVING': 'Chauffeur en route',
      'IN_PROGRESS': 'En cours',
      'COMPLETED': 'Terminée',
      'REJECTED': 'Refusée',
      'CANCELLED': 'Annulée',
      'CONFIRMED': 'Acceptée',
      'PENDING_DRIVER': 'En attente chauffeur'
    };
    return labels[status] || status;
  }

  getRentalStatusLabel(status: string): string {
    const labels: any = {
      'PENDING': 'En attente',
      'ACCEPTED': 'Acceptée',
      'ACTIVE': 'Active',
      'COMPLETED': 'Terminée',
      'CANCELLED': 'Annulée',
      'REJECTED': 'Refusée'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: any = {
      'PENDING': 'badge-pending',
      'ACCEPTED': 'badge-accepted',
      'DRIVER_ARRIVING': 'badge-accepted',
      'IN_PROGRESS': 'badge-ongoing',
      'COMPLETED': 'badge-completed',
      'REJECTED': 'badge-rejected',
      'CANCELLED': 'badge-cancelled',
      'CONFIRMED': 'badge-accepted',
      'PENDING_DRIVER': 'badge-pending'
    };
    return classes[status] || '';
  }

  getRentalStatusClass(status: string): string {
    const classes: any = {
      'PENDING': 'badge-pending',
      'ACCEPTED': 'badge-accepted',
      'ACTIVE': 'badge-ongoing',
      'COMPLETED': 'badge-completed',
      'CANCELLED': 'badge-cancelled',
      'REJECTED': 'badge-rejected'
    };
    return classes[status] || '';
  }

  openDetails(r: Ride): void {
    this.selectedRide = r;
    this.selectedRental = null;
    this.showDetailsModal = true;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }

  openRentalDetails(r: any): void {
    this.selectedRental = r;
    this.selectedRide = null;
    this.showDetailsModal = true;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }

  closeDetails(): void {
    this.showDetailsModal = false;
    this.selectedRide = null;
    this.selectedRental = null;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  confirmCancel(r: Ride): void {
    this.selectedRide = r;
    this.showCancelModal = true;
  }

  confirmCancelRental(r: any): void {
    this.selectedRental = r;
    this.showCancelModal = true;
  }

  cancelRide(): void {
    if (!this.selectedRide) return;

    const ride = this.selectedRide;
    const onSuccess = () => {
      this.successMessage = ride.sourceType === 'SHARED_RIDE'
        ? 'Réservation annulée avec succès.'
        : 'Trajet annulé avec succès.';
      this.showCancelModal = false;
      this.selectedRide = null;
      this.loadRides();
      setTimeout(() => this.successMessage = '', 3000);
    };

    if (ride.sourceType === 'SHARED_RIDE') {
      const bookingId = ride.bookingId ?? this.parseNumericId(ride.id);
      const tripId = ride.tripId;
      const request$ = bookingId != null
        ? this.tripService.cancelBooking(bookingId)
        : tripId != null
          ? this.tripService.cancelBookingByTrip(tripId)
          : null;

      if (!request$) {
        alert('Impossible d\'annuler : identifiant de réservation manquant. Rechargez la page.');
        return;
      }

      request$.subscribe({
        next: onSuccess,
        error: (err) => {
          console.error('Error cancelling shared ride booking', err);
          alert(this.tripService.toApiError(err).message);
        }
      });
      return;
    }

    const requestId = this.parseNumericId(ride.id);
    if (requestId == null) {
      alert('Impossible d\'annuler ce trajet.');
      return;
    }

    this.rideRequestService.cancelRideRequest(requestId).subscribe({
      next: onSuccess,
      error: (err) => {
        console.error('Error cancelling ride', err);
        alert(err?.error?.message || 'Une erreur est survenue.');
      }
    });
  }

  cancelRental(): void {
    if (!this.selectedRental || !this.selectedRental.id) return;
    
    this.reservationService.cancelRental(this.selectedRental.id).subscribe({
      next: () => {
        this.successMessage = 'Réservation annulée avec succès.';
        this.showCancelModal = false;
        this.loadRentals();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => console.error('Error cancelling rental', err)
    });
  }

  viewSharedTrip(r: Ride): void {
    const tripId = r.tripId ?? this.parseNumericId(r.id);
    if (tripId != null) {
      this.router.navigate(['/client/available-rides'], { queryParams: { tripId } });
      return;
    }
    this.openDetails(r);
  }

  goToCurrentRide(): void {
    this.router.navigate(['/client/current-ride']);
  }

  contactDriver(r: Ride): void {
    if (!r.driverId) {
      alert('Chauffeur indisponible pour ce trajet.');
      return;
    }
    const params: Record<string, string> = { driverId: String(r.driverId) };
    if (r.sourceType === 'SHARED_RIDE') {
      params['context'] = 'RIDE_REQUEST';
      const bid = r.bookingId ?? this.parseNumericId(r.id);
      if (bid != null) params['rideId'] = String(bid);
      else if (r.tripId != null) params['rideId'] = String(r.tripId);
    } else {
      const rid = this.parseNumericId(r.id);
      if (rid != null) params['rideId'] = String(rid);
    }
    this.router.navigate(['/client/conversations'], { queryParams: params });
  }

  contactOwner(r: any): void {
    const ownerId = r.ownerId || r.owner?.id;
    if (!ownerId) {
      alert("Propriétaire indisponible pour cette réservation");
      return;
    }

    // Force client mode to LOCATAIRE (ROLE_CLIENT)
    this.roleService.setActiveRole('ROLE_CLIENT', false);

    this.messagingService.startConversation({
      participantId: Number(ownerId),
      context: 'RENTAL',
      vehicleId: r.vehicleId || r.vehicle?.id,
      bookingId: r.id
    }).subscribe({
      next: (conversation) => {
        this.router.navigate(['/client/conversations'], {
          queryParams: { 
            context: 'RENTAL',
            conversationId: conversation.id 
          }
        });
      },
      error: (err) => {
        console.error('Error starting conversation:', err);
        alert("Impossible de démarrer la conversation avec le propriétaire");
      }
    });
  }

  viewReceipt(r: Ride): void {
    this.router.navigate(['/client/payments'], { queryParams: { rideId: r.id } });
  }

  leaveReview(r: Ride): void {
    this.router.navigate(['/client/reviews'], { queryParams: { rideId: r.id } });
  }
}
