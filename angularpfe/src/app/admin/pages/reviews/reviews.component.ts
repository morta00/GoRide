import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-reviews',
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.css']
})
export class ReviewsComponent implements OnInit {
  reviews: any[] = [];
  filteredReviews: any[] = [];
  
  searchTerm: string = '';
  statusFilter: string = 'ALL';
  targetFilter: string = 'ALL';
  ratingFilter: string = 'ALL';
  currentSort: string = 'NEWEST';

  stats = {
    total: 0,
    avgRating: 0,
    reported: 0,
    toVerify: 0,
    lowRating: 0,
    hidden: 0
  };

  selectedReview: any = null;
  showDetailsModal: boolean = false;

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.http.get<any[]>(`${environment.apiUrl}/admin/reviews`).subscribe({
      next: (data) => {
        this.reviews = (data || []).map(r => {
          return {
            id: 'REV-' + r.id,
            reviewerName: r.client ? ((r.client.firstName || '') + ' ' + (r.client.lastName || '')) : 'Client GoRide',
            reviewerRole: 'CLIENT',
            targetName: r.vehicle ? ((r.vehicle.brand || '') + ' ' + (r.vehicle.model || '')) : 'Véhicule',
            targetRole: 'VEHICLE',
            serviceType: 'VEHICLE_RENTAL',
            rating: r.vehicleRating || 5,
            comment: r.comment || 'Sans commentaire.',
            status: 'VISIBLE',
            isReported: false,
            createdAt: r.createdAt || new Date().toISOString()
          };
        });
        this.calculateStats();
        this.applyFilters();
      },
      error: (err) => console.error('Error loading reviews:', err)
    });
  }

  resetToMocks(): void {
    this.reviews = [];
    this.calculateStats();
    this.applyFilters();
  }

  saveData(): void {
    localStorage.setItem('admin_reviews', JSON.stringify(this.reviews));
  }

  calculateStats(): void {
    const total = this.reviews.length;
    const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0);
    this.stats = {
      total,
      avgRating: total > 0 ? parseFloat((sum / total).toFixed(1)) : 0,
      reported: this.reviews.filter(r => r.isReported).length,
      toVerify: this.reviews.filter(r => r.status === 'PENDING_REVIEW').length,
      lowRating: this.reviews.filter(r => r.rating <= 2).length,
      hidden: this.reviews.filter(r => r.status === 'HIDDEN').length
    };
  }

  applyFilters(): void {
    let result = [...this.reviews];

    if (this.statusFilter === 'VISIBLE') result = result.filter(r => r.status === 'VISIBLE');
    else if (this.statusFilter === 'REPORTED') result = result.filter(r => r.isReported);
    else if (this.statusFilter === 'TO_VERIFY') result = result.filter(r => r.status === 'PENDING_REVIEW');
    else if (this.statusFilter === 'LOW_RATING') result = result.filter(r => r.rating <= 2);
    else if (this.statusFilter === 'HIDDEN') result = result.filter(r => r.status === 'HIDDEN');

    if (this.targetFilter !== 'ALL') result = result.filter(r => r.targetRole === this.targetFilter);
    if (this.ratingFilter !== 'ALL') result = result.filter(r => r.rating === parseInt(this.ratingFilter));

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(r => 
        r.reviewerName.toLowerCase().includes(term) ||
        r.targetName.toLowerCase().includes(term) ||
        r.comment.toLowerCase().includes(term) ||
        r.id.toLowerCase().includes(term)
      );
    }

    if (this.currentSort === 'NEWEST') result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (this.currentSort === 'OLDEST') result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (this.currentSort === 'RATING_DESC') result.sort((a, b) => b.rating - a.rating);
    else if (this.currentSort === 'RATING_ASC') result.sort((a, b) => a.rating - b.rating);
    else if (this.currentSort === 'REPORTED') result.sort((a, b) => (b.isReported ? 1 : 0) - (a.isReported ? 1 : 0));

    this.filteredReviews = result;
  }

  syncNotifications(): void {
    const notifs = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
    this.reviews.filter(r => r.isReported || r.rating <= 2).forEach(r => {
      const exists = notifs.find((n: any) => n.type === 'REPORT' && n.relatedEntityId === r.id);
      if (!exists) {
        notifs.unshift({
          id: 'NOT-REV-' + r.id,
          title: r.isReported ? 'Avis signalé' : 'Note faible reçue',
          message: `${r.reviewerName} a laissé un avis : ${r.comment.substring(0, 50)}...`,
          type: 'REPORT',
          priority: r.rating === 1 ? 'HIGH' : 'MEDIUM',
          status: 'NEW',
          isRead: false,
          createdAt: new Date().toISOString(),
          actionRoute: '/admin/reviews',
          relatedEntityId: r.id
        });
      }
    });
    localStorage.setItem('admin_notifications', JSON.stringify(notifs));
  }

  // Actions
  openDetails(rev: any): void {
    this.selectedReview = rev;
    this.showDetailsModal = true;
  }

  closeDetails(): void {
    this.selectedReview = null;
    this.showDetailsModal = false;
  }

  hideReview(rev: any, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm('Masquer cet avis ? Il ne sera plus visible par les autres utilisateurs.')) {
      rev.status = 'HIDDEN';
      rev.moderationNote = 'Masqué par admin le ' + new Date().toLocaleDateString();
      this.saveAndRefresh();
    }
  }

  restoreReview(rev: any, event?: Event): void {
    if (event) event.stopPropagation();
    rev.status = 'VISIBLE';
    this.saveAndRefresh();
  }

  markVerified(rev: any, event?: Event): void {
    if (event) event.stopPropagation();
    rev.status = 'VISIBLE';
    rev.moderationNote = 'Avis vérifié par admin';
    this.saveAndRefresh();
  }

  deleteReview(rev: any, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm('Supprimer définitivement cet avis ?')) {
      this.reviews = this.reviews.filter(r => r.id !== rev.id);
      this.saveAndRefresh();
    }
  }

  createComplaint(rev: any): void {
    const complaints = JSON.parse(localStorage.getItem('admin_complaints') || '[]');
    const exists = complaints.find((c: any) => c.relatedEntityId === rev.id);
    
    if (exists) {
      alert('Une réclamation existe déjà pour cet avis.');
      this.router.navigate(['/admin/complaints']);
      return;
    }

    complaints.unshift({
      id: 'CMP-REV-' + rev.id,
      title: 'Réclamation liée à un avis',
      complainantName: rev.reviewerName,
      complainantRole: rev.reviewerRole,
      accusedName: rev.targetName,
      accusedRole: rev.targetRole,
      category: 'BEHAVIOR',
      priority: rev.rating <= 2 ? 'HIGH' : 'MEDIUM',
      status: 'OPEN',
      relatedServiceId: rev.relatedServiceId,
      description: `Review ID: ${rev.id}\nCommentaire: ${rev.comment}\nSignalement: ${rev.reportReason || 'N/A'}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    localStorage.setItem('admin_complaints', JSON.stringify(complaints));
    alert('Réclamation créée avec succès !');
    this.router.navigate(['/admin/complaints']);
  }

  goToService(id: string): void {
    this.router.navigate(['/admin/services'], { queryParams: { searchTerm: id } });
  }

  saveAndRefresh(): void {
    this.saveData();
    this.calculateStats();
    this.applyFilters();
  }

  // Helpers
  getStars(rating: number): number[] {
    return Array(rating).fill(0);
  }

  getEmptyStars(rating: number): number[] {
    return Array(5 - rating).fill(0);
  }

  getRoleLabel(role: string): string {
    const roles: any = { 'CLIENT': 'Passager / Locataire', 'DRIVER': 'Chauffeur', 'FLEET_OWNER': 'Propriétaire', 'COMPANY': 'Entreprise', 'SERVICE': 'Service', 'VEHICLE': 'Véhicule' };
    return roles[role] || role;
  }

  getServiceLabel(type: string): string {
    const labels: any = {
      'PASSENGER_RIDE': 'Course passager',
      'SHARED_TRIP': 'Trajet collaboratif',
      'VEHICLE_RENTAL': 'Location véhicule',
      'COMPANY_DRIVER_SERVICE': 'Chauffeur entreprise',
      'COMPANY_VEHICLE_RENTAL': 'Location entreprise',
      'COMPANY_MIXED_SERVICE': 'Service mixte'
    };
    return labels[type] || type;
  }

  getStatusLabel(s: string): string {
    const labels: any = { 'VISIBLE': 'Visible', 'HIDDEN': 'Masqué', 'PENDING_REVIEW': 'À vérifier', 'DELETED': 'Supprimé' };
    return labels[s] || s;
  }

  getStatusClass(s: string): string {
    if (s === 'VISIBLE') return 'bg-success-soft text-success';
    if (s === 'PENDING_REVIEW') return 'bg-warning-soft text-warning';
    if (s === 'HIDDEN') return 'bg-light text-muted border';
    return 'bg-light';
  }
}
