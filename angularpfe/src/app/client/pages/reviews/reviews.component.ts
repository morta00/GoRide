import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth/auth.service';
import { ReviewService } from '../../../services/review.service';
import { ProfileAvatarComponent } from '../../../header/profile-avatar/profile-avatar.component';

interface Ride {
  rideId: string;
  driverName: string;
  vehicle: string;
  date: string;
}

interface Review {
  id: string;
  rideId: string;
  driverId: string;
  driverName: string;
  rating: number;
  comment: string;
  punctuality: boolean;
  drivingQuality: boolean;
  vehicleCleanliness: boolean;
  recommendDriver: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProfileAvatarComponent],
  template: `
<div class="reviews-container animate__animated animate__fadeIn">
  
  <header class="page-header mb-5">
    <div>
      <h1 class="fw-bold text-dark">Mes Avis</h1>
      <p class="text-muted">Partagez votre expérience et aidez la communauté GoRide à s'améliorer.</p>
    </div>
  </header>

  <div class="alert alert-success animate__animated animate__fadeInDown mb-4" *ngIf="successMessage">
    <div class="d-flex align-items-center">
      <span class="ion-md-checkmark-circle fs-4 me-2"></span>
      <span class="fw-bold">{{ successMessage }}</span>
    </div>
  </div>

  <div class="reviews-grid">
    
    <!-- Section: Avis à laisser -->
    <section class="reviews-section">
      <div class="section-header">
        <h3><span class="ion-md-time"></span> Avis à laisser</h3>
        <span class="badge bg-primary ms-2">{{ pendingRides.length }}</span>
      </div>

      <div class="rides-list mt-3">
        <div class="ride-card" *ngFor="let ride of pendingRides" [class.highlight]="selectedRide?.rideId === ride.rideId">
          <div class="ride-info">
            <div class="driver-info">
              <app-profile-avatar [name]="ride.driverName" [size]="40" [showStatus]="false"></app-profile-avatar>
              <div class="ms-3">
                <h5 class="mb-0 fw-bold">{{ ride.driverName }}</h5>
                <p class="text-muted small mb-0">{{ ride.vehicle }}</p>
              </div>
            </div>
            <div class="date-info text-end">
              <span class="text-muted small">{{ ride.date }}</span>
            </div>
          </div>
          <button class="btn-primary w-100 mt-3" (click)="openReviewModal(ride)">Laisser un avis</button>
        </div>

        <div class="empty-state p-4 text-center bg-light rounded-4" *ngIf="pendingRides.length === 0">
          <span class="ion-md-checkmark-circle text-success fs-1 mb-3 d-block"></span>
          <h5 class="fw-bold">Aucune location à noter pour l'instant</h5>
          <p class="text-muted small mb-0">Les avis s'activent après la <strong>date de fin</strong> d'une location acceptée ou terminée.</p>
        </div>

        <div class="platform-feedback-card mt-4 p-4 bg-white border rounded-4 shadow-sm border-warning-subtle">
          <h5 class="fw-bold mb-2"><span class="ion-md-chatbubbles text-warning me-2"></span>Avis sur l'application GoRide</h5>
          <p class="text-muted small mb-2">Pour les retours généraux sur l'app uniquement.</p>
          <div class="alert alert-warning py-2 px-3 small mb-3 mb-0">
            <strong>Ne s'affiche pas chez le chauffeur.</strong> Pour qu'un chauffeur reçoive votre note, cliquez
            <strong>« Laisser un avis »</strong> sur une location terminée ci-dessus (pas ce formulaire).
          </div>
          <div class="text-center mb-3 mt-3">
            <span class="ion-md-star fs-2 mx-1 cursor-pointer" *ngFor="let i of [1,2,3,4,5]"
                  [class.text-warning]="platformRating >= i" [class.text-muted]="platformRating < i"
                  (click)="platformRating = i"></span>
          </div>
          <textarea class="form-control rounded-3 mb-3" rows="3" [(ngModel)]="platformComment"
                    placeholder="Qu'avez-vous aimé ou améliorer sur GoRide ? (min. 10 caractères)"></textarea>
          <button class="btn btn-primary w-100 rounded-pill fw-bold" (click)="submitPlatformFeedback()" [disabled]="platformSubmitting">
            Envoyer mon avis plateforme
          </button>
        </div>
      </div>
    </section>

    <!-- Section: Mes avis envoyés -->
    <section class="reviews-section">
      <div class="section-header">
        <h3><span class="ion-md-star"></span> Mes avis envoyés</h3>
        <span class="badge bg-secondary ms-2">{{ sentReviews.length }}</span>
      </div>

      <div class="reviews-history-list mt-3">
        <div class="review-card-history" *ngFor="let review of sentReviews.slice().reverse()">
          <div class="review-header">
            <div class="driver-info">
              <h6 class="mb-0 fw-bold">{{ review.driverName }}</h6>
              <div class="stars mt-1">
                <span class="ion-md-star text-warning small" *ngFor="let s of getStars(review.rating)"></span>
              </div>
            </div>
            <span class="text-muted x-small">{{ review.createdAt | date:'dd MMM yyyy' }}</span>
          </div>
          <p class="review-comment mt-2 small text-dark">{{ review.comment }}</p>
          <div class="review-badges mt-2">
            <span class="badge bg-light text-dark border me-1" *ngIf="review.punctuality">Ponctuel</span>
            <span class="badge bg-light text-dark border me-1" *ngIf="review.drivingQuality">Bonne conduite</span>
            <span class="badge bg-light text-dark border" *ngIf="review.recommendDriver">Recommandé</span>
          </div>
        </div>

        <div class="review-card-history mb-3 border-warning-subtle" *ngFor="let fb of platformFeedbacks">
          <div class="review-header">
            <h6 class="mb-0 fw-bold">Avis application GoRide <span class="badge bg-warning text-dark ms-1">hors chauffeur</span></h6>
            <div class="stars mt-1">
              <span class="ion-md-star text-warning small" *ngFor="let s of getStars(fb.rating)"></span>
            </div>
          </div>
          <p class="review-comment mt-2 small text-dark">{{ fb.comment }}</p>
          <span class="text-muted x-small">{{ fb.createdAt | date:'dd MMM yyyy' }}</span>
        </div>

        <div class="empty-state p-5 text-center bg-light rounded-4" *ngIf="sentReviews.length === 0 && platformFeedbacks.length === 0">
          <span class="ion-md-chatbubbles text-muted fs-1 mb-3 d-block"></span>
          <h5 class="fw-bold">Aucun avis encore</h5>
          <p class="text-muted">Vos avis sur locations ou la plateforme apparaîtront ici.</p>
        </div>
      </div>
    </section>

  </div>
</div>

<!-- Modal: Laisser un avis -->
<div class="modal-overlay" *ngIf="showReviewModal" (click)="closeModal()">
  <div class="modal-content animate__animated animate__zoomIn" (click)="$event.stopPropagation()">
    <div class="modal-header">
      <h3>Avis pour {{ selectedRide?.driverName }}</h3>
      <button class="btn-close-modal" (click)="closeModal()"><span class="ion-md-close"></span></button>
    </div>
    
    <div class="modal-body py-4">
      <!-- Error Messages -->
      <div class="alert alert-danger mb-3 py-2" *ngIf="reviewErrors.length > 0">
        <ul class="mb-0 small ps-3">
          <li *ngFor="let error of reviewErrors">{{ error }}</li>
        </ul>
      </div>

      <div class="text-center mb-4">
        <h5 class="fw-bold">Quelle note donneriez-vous ?</h5>
        <div class="stars-input">
          <span class="ion-md-star fs-1 mx-1 cursor-pointer" 
                *ngFor="let i of [1,2,3,4,5]" 
                [class.text-warning]="reviewData.note >= i"
                [class.text-muted]="reviewData.note < i"
                (click)="reviewData.note = i">
          </span>
        </div>
      </div>

      <div class="form-group mb-4">
        <label class="fw-bold small mb-2">Votre commentaire</label>
        <textarea class="form-control rounded-3" rows="4" [(ngModel)]="reviewData.comment" placeholder="Racontez-nous votre expérience... (min. 10 caractères)"></textarea>
      </div>

      <div class="criteria-grid">
        <div class="criteria-item">
          <label>Chauffeur ponctuel</label>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" [(ngModel)]="reviewData.punctuality">
          </div>
        </div>
        <div class="criteria-item">
          <label>Conduite agréable</label>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" [(ngModel)]="reviewData.driving">
          </div>
        </div>
        <div class="criteria-item">
          <label>Véhicule propre</label>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" [(ngModel)]="reviewData.cleanliness">
          </div>
        </div>
        <div class="criteria-item">
          <label>Recommander ce chauffeur</label>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" [(ngModel)]="reviewData.recommend">
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer border-0 p-0">
      <button class="btn-primary w-100 py-3 rounded-3 fw-bold" (click)="submitReview()">Envoyer mon avis</button>
    </div>
  </div>
</div>
`,
  styleUrls: ['./reviews.component.css']
})
export class ReviewsComponent implements OnInit {

  pendingRides: Ride[] = [];
  sentReviews: Review[] = [];

  // Modal State
  showReviewModal = false;
  selectedRide: Ride | null = null;
  
  reviewData = {
    note: 0,
    comment: '',
    punctuality: true,
    driving: true,
    cleanliness: true,
    recommend: true
  };

  reviewErrors: string[] = [];
  successMessage: string | null = null;
  platformRating = 0;
  platformComment = '';
  platformSubmitting = false;
  platformFeedbacks: { rating: number; comment: string; createdAt: string }[] = [];

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private reviewService: ReviewService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.route.queryParams.subscribe((params: any) => {
      const rideId = params['rideId'];
      if (rideId) {
        this.tryOpenPendingByRideId(String(rideId));
      }
    });
  }

  private tryOpenPendingByRideId(rideId: string): void {
    const ride = this.pendingRides.find(r => r.rideId === rideId);
    if (ride) {
      this.openReviewModal(ride);
    }
  }

  loadData(): void {
    this.reviewService.getPendingReviews().subscribe({
      next: (pending) => {
        this.pendingRides = (pending || []).map((p: any) => ({
          rideId: String(p.reservationId),
          driverName: p.ownerName || 'Propriétaire GoRide',
          vehicle: p.vehicleName || 'Véhicule GoRide',
          date: 'Location terminée',
          reservationId: p.reservationId
        }));
        const rideId = this.route.snapshot.queryParamMap.get('rideId');
        if (rideId) {
          this.tryOpenPendingByRideId(rideId);
        }
      },
      error: (err) => console.error("Pending reviews error", err)
    });

    this.reviewService.getPlatformFeedbacks().subscribe({
      next: (list) => {
        this.platformFeedbacks = (list || []).map((f: any) => ({
          rating: f.rating,
          comment: f.comment,
          createdAt: f.createdAt
        }));
      },
      error: () => { this.platformFeedbacks = []; }
    });

    this.reviewService.getSentReviews().subscribe({
      next: (sent) => {
        this.sentReviews = (sent || []).map((s: any) => ({
          id: String(s.id),
          rideId: String(s.reservationId),
          driverId: String(s.ownerId),
          driverName: s.ownerName || 'Propriétaire GoRide',
          rating: s.vehicleRating || 5,
          comment: s.comment || '',
          punctuality: true,
          drivingQuality: true,
          vehicleCleanliness: true,
          recommendDriver: true,
          createdAt: s.createdAt || new Date().toISOString()
        }));
      },
      error: (err) => console.error("Sent reviews error", err)
    });
  }

  openReviewModal(ride: Ride): void {
    this.selectedRide = ride;
    this.reviewErrors = [];
    this.reviewData = {
      note: 0,
      comment: '',
      punctuality: true,
      driving: true,
      cleanliness: true,
      recommend: true
    };
    this.showReviewModal = true;
  }

  closeModal(): void {
    this.showReviewModal = false;
    this.selectedRide = null;
  }

  validate(): boolean {
    this.reviewErrors = [];
    if (!this.reviewData.note) this.reviewErrors.push('Veuillez choisir une note.');
    if (!this.reviewData.comment.trim()) {
      this.reviewErrors.push('Veuillez écrire un commentaire.');
    } else if (this.reviewData.comment.trim().length < 10) {
      this.reviewErrors.push('Le commentaire doit contenir au moins 10 caractères.');
    }
    return this.reviewErrors.length === 0;
  }

  submitReview(): void {
    if (!this.validate() || !this.selectedRide) return;

    const newReview: any = {
      reservationId: (this.selectedRide as any).reservationId,
      vehicleRating: this.reviewData.note,
      ownerRating: this.reviewData.note,
      comment: this.reviewData.comment
    };

    this.reviewService.createReview(newReview).subscribe({
      next: () => {
        this.successMessage = 'Votre avis chauffeur a été envoyé ! Il sera visible sur le profil du chauffeur assigné au véhicule.';
        setTimeout(() => this.successMessage = null, 5000);
        this.closeModal();
        this.loadData();
      },
      error: (err) => {
        alert(err?.error?.message || "Erreur lors de l'envoi de l'avis.");
      }
    });
  }

  submitPlatformFeedback(): void {
    if (!this.platformRating) {
      alert('Choisissez une note entre 1 et 5.');
      return;
    }
    if (!this.platformComment.trim() || this.platformComment.trim().length < 10) {
      alert('Le commentaire doit contenir au moins 10 caractères.');
      return;
    }
    this.platformSubmitting = true;
    this.reviewService.submitPlatformFeedback(this.platformRating, this.platformComment.trim()).subscribe({
      next: () => {
        this.successMessage = 'Merci ! Votre avis plateforme a été enregistré (visible uniquement dans votre historique, pas côté chauffeur).';
        this.platformRating = 0;
        this.platformComment = '';
        this.platformSubmitting = false;
        this.loadData();
        setTimeout(() => this.successMessage = null, 5000);
      },
      error: (err) => {
        this.platformSubmitting = false;
        alert(err?.error?.message || err?.error || "Erreur lors de l'envoi.");
      }
    });
  }

  getStars(rating: number): number[] {
    return Array(rating).fill(0);
  }
}
