import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit {
  reports: any[] = [];
  filteredReports: any[] = [];
  
  searchTerm: string = '';
  statusFilter: string = 'ALL';
  typeFilter: string = 'ALL';
  priorityFilter: string = 'ALL';
  entityFilter: string = 'ALL';
  currentSort: string = 'NEWEST';

  stats = {
    total: 0,
    new: 0,
    inReview: 0,
    highPriority: 0,
    actionsTaken: 0,
    closed: 0
  };

  selectedReport: any = null;
  showDetailsModal: boolean = false;
  showRejectModal: boolean = false;
  rejectReason: string = '';
  errorMsg: string = '';

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.http.get<any[]>(`${environment.apiUrl}/admin/reports`).subscribe({
      next: (data) => {
        this.reports = data || [];
        this.calculateStats();
        this.applyFilters();
      },
      error: (err) => console.error('Error loading reports:', err)
    });
  }

  resetToMocks(): void {
    this.statusFilter = 'ALL';
    this.typeFilter = 'ALL';
    this.priorityFilter = 'ALL';
    this.entityFilter = 'ALL';
    this.searchTerm = '';
    this.loadData();
  }

  saveData(): void {
    localStorage.setItem('admin_reports', JSON.stringify(this.reports));
  }

  calculateStats(): void {
    this.stats = {
      total: this.reports.length,
      new: this.reports.filter(r => r.status === 'NEW').length,
      inReview: this.reports.filter(r => r.status === 'IN_REVIEW').length,
      highPriority: this.reports.filter(r => r.priority === 'HIGH' && r.status !== 'CLOSED' && r.status !== 'DISMISSED').length,
      actionsTaken: this.reports.filter(r => r.status === 'ACTION_TAKEN').length,
      closed: this.reports.filter(r => r.status === 'CLOSED' || r.status === 'DISMISSED').length
    };
  }

  applyFilters(): void {
    let result = [...this.reports];

    if (this.statusFilter !== 'ALL') result = result.filter(r => r.status === this.statusFilter);
    if (this.typeFilter !== 'ALL') result = result.filter(r => r.reportType === this.typeFilter);
    if (this.priorityFilter !== 'ALL') result = result.filter(r => r.priority === this.priorityFilter);
    if (this.entityFilter !== 'ALL') result = result.filter(r => r.relatedEntityType === this.entityFilter);

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(r => 
        r.title.toLowerCase().includes(term) ||
        r.reporterName.toLowerCase().includes(term) ||
        r.reportedName.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        r.id.toLowerCase().includes(term)
      );
    }

    if (this.currentSort === 'NEWEST') result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (this.currentSort === 'OLDEST') result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (this.currentSort === 'PRIORITY') {
      const p: any = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      result.sort((a, b) => p[b.priority] - p[a.priority]);
    }
    else if (this.currentSort === 'UPDATED') result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    this.filteredReports = result;
  }

  syncNotifications(): void {
    const notifs = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
    this.reports.filter(r => r.status === 'NEW' || r.priority === 'HIGH').forEach(r => {
      const exists = notifs.find((n: any) => n.type === 'REPORT' && n.relatedEntityId === r.id);
      if (!exists) {
        notifs.unshift({
          id: 'NOT-REP-' + r.id,
          title: 'Nouveau signalement',
          message: `${r.reporterName} a signalé ${r.reportedName}`,
          type: 'REPORT',
          priority: r.priority,
          status: 'NEW',
          isRead: false,
          createdAt: new Date().toISOString(),
          actionRoute: '/admin/reports',
          relatedEntityId: r.id
        });
      }
    });
    localStorage.setItem('admin_notifications', JSON.stringify(notifs));
  }

  // Actions
  openDetails(rep: any): void {
    this.selectedReport = rep;
    this.showDetailsModal = true;
  }

  closeDetails(): void {
    this.selectedReport = null;
    this.showDetailsModal = false;
  }

  takeCharge(rep: any, event?: Event): void {
    if (event) event.stopPropagation();
    rep.assignedTo = 'Admin GoRide';
    rep.status = 'IN_REVIEW';
    rep.updatedAt = new Date().toISOString();
    this.saveAndRefresh();
  }

  hideContent(rep: any, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm('Voulez-vous masquer ce contenu ?')) {
      rep.adminDecision = "Contenu masqué par l'administrateur";
      rep.status = 'ACTION_TAKEN';
      rep.updatedAt = new Date().toISOString();
      
      if (rep.relatedEntityType === 'REVIEW') {
        const reviews = JSON.parse(localStorage.getItem('admin_reviews') || '[]');
        const review = reviews.find((r: any) => r.id === rep.relatedEntityId);
        if (review) {
          review.status = 'HIDDEN';
          localStorage.setItem('admin_reviews', JSON.stringify(reviews));
        }
      }
      
      this.saveAndRefresh();
    }
  }

  suspendUser(rep: any, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm('Voulez-vous suspendre cet utilisateur ?')) {
      rep.adminDecision = "Utilisateur suspendu suite au signalement";
      rep.status = 'ACTION_TAKEN';
      rep.updatedAt = new Date().toISOString();
      
      // Simulation suspension utilisateur
      const users = JSON.parse(localStorage.getItem('admin_users') || '[]');
      const user = users.find((u: any) => u.id === rep.relatedEntityId);
      if (user) {
        user.status = 'SUSPENDED';
        localStorage.setItem('admin_users', JSON.stringify(users));
      }
      
      this.saveAndRefresh();
    }
  }

  openReject(rep: any, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedReport = rep;
    this.rejectReason = '';
    this.errorMsg = '';
    this.showRejectModal = true;
  }

  confirmReject(): void {
    if (!this.rejectReason.trim()) {
      this.errorMsg = 'Le motif est obligatoire.';
      return;
    }
    const rep = this.reports.find(r => r.id === this.selectedReport.id);
    if (rep) {
      rep.status = 'DISMISSED';
      rep.adminDecision = "REJET : " + this.rejectReason;
      rep.updatedAt = new Date().toISOString();
      this.saveAndRefresh();
      this.showRejectModal = false;
      this.closeDetails();
    }
  }

  createComplaint(rep: any): void {
    const complaints = JSON.parse(localStorage.getItem('admin_complaints') || '[]');
    const exists = complaints.find((c: any) => c.relatedEntityId === rep.id);
    
    if (exists) {
      alert('Une réclamation existe déjà pour ce signalement.');
      this.router.navigate(['/admin/complaints']);
      return;
    }

    complaints.unshift({
      id: 'CMP-REP-' + rep.id,
      title: 'Réclamation liée à un signalement',
      complainantName: rep.reporterName,
      complainantRole: rep.reporterRole,
      accusedName: rep.reportedName,
      accusedRole: rep.reportedRole,
      category: rep.reportType === 'SAFETY' ? 'SAFETY' : 'OTHER',
      priority: rep.priority,
      status: 'OPEN',
      relatedServiceId: rep.relatedServiceId,
      description: `Signalement ID: ${rep.id}\nType: ${this.getTypeLabel(rep.reportType)}\nRaison: ${rep.reason}\nDescription: ${rep.description}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    localStorage.setItem('admin_complaints', JSON.stringify(complaints));
    alert('Réclamation créée avec succès !');
    this.router.navigate(['/admin/complaints']);
  }

  closeReport(rep: any, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm('Clôturer ce signalement ?')) {
      rep.status = 'CLOSED';
      rep.updatedAt = new Date().toISOString();
      this.saveAndRefresh();
      this.closeDetails();
    }
  }

  saveAndRefresh(): void {
    this.saveData();
    this.calculateStats();
    this.applyFilters();
  }

  // Redirections
  goToService(id: string): void {
    this.router.navigate(['/admin/services'], { queryParams: { searchTerm: id } });
  }

  goToReview(id: string): void {
    this.router.navigate(['/admin/reviews'], { queryParams: { searchTerm: id } });
  }

  goToPayment(id: string): void {
    this.router.navigate(['/admin/payments'], { queryParams: { searchTerm: id } });
  }

  // Helpers
  getTypeLabel(t: string): string {
    const types: any = {
      'USER_BEHAVIOR': 'Comportement utilisateur',
      'FAKE_PROFILE': 'Faux profil',
      'REVIEW_ABUSE': 'Avis abusif',
      'MESSAGE_ABUSE': 'Message abusif',
      'FRAUD': 'Fraude',
      'SAFETY': 'Sécurité',
      'SPAM': 'Spam',
      'SERVICE_ISSUE': 'Problème service',
      'SYSTEM_ALERT': 'Alerte système'
    };
    return types[t] || t;
  }

  getRoleLabel(r: string): string {
    const roles: any = { 'CLIENT': 'Passager / Locataire', 'DRIVER': 'Chauffeur', 'FLEET_OWNER': 'Propriétaire', 'COMPANY': 'Entreprise', 'SYSTEM': 'Système', 'REVIEW': 'Avis', 'MESSAGE': 'Message', 'SERVICE': 'Service' };
    return roles[r] || r;
  }

  getStatusLabel(s: string): string {
    const labels: any = { 'NEW': 'Nouveau', 'IN_REVIEW': 'En examen', 'ACTION_TAKEN': 'Action prise', 'DISMISSED': 'Rejeté', 'CLOSED': 'Fermé' };
    return labels[s] || s;
  }

  getStatusClass(s: string): string {
    if (s === 'NEW') return 'bg-danger-soft text-danger';
    if (s === 'IN_REVIEW') return 'bg-warning-soft text-warning';
    if (s === 'ACTION_TAKEN') return 'bg-success-soft text-success';
    return 'bg-light text-muted';
  }

  getPriorityLabel(p: string): string {
    const labels: any = { 'HIGH': 'Haute', 'MEDIUM': 'Moyenne', 'LOW': 'Basse' };
    return labels[p] || p;
  }

  getPriorityClass(p: string): string {
    if (p === 'HIGH') return 'bg-danger text-white';
    if (p === 'MEDIUM') return 'bg-warning text-dark';
    return 'bg-light text-muted';
  }
}
