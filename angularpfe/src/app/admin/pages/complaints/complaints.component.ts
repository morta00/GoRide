import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-complaints',
  templateUrl: './complaints.component.html',
  styleUrls: ['./complaints.component.css']
})
export class ComplaintsComponent implements OnInit {
  complaints: any[] = [];
  filteredComplaints: any[] = [];
  
  searchTerm: string = '';
  statusFilter: string = 'ALL';
  categoryFilter: string = 'ALL';
  priorityFilter: string = 'ALL';
  roleFilter: string = 'ALL';
  currentSort: string = 'NEWEST';

  stats = {
    open: 0,
    inReview: 0,
    waitingResponse: 0,
    resolved: 0,
    highPriority: 0,
    avgTreatment: '1j 4h'
  };

  selectedComplaint: any = null;
  showDetailsModal: boolean = false;
  showResolveModal: boolean = false;
  showRejectModal: boolean = false;
  showRequestModal: boolean = false;

  resolutionText: string = '';
  resolutionRefund: number = 0;
  resolutionAction: string = 'NONE';
  rejectReason: string = '';
  requestMessage: string = '';
  requestTarget: string = 'COMPLAINANT';

  errorMsg: string = '';

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.http.get<any[]>(`${environment.apiUrl}/admin/complaints`).subscribe({
      next: (data) => {
        this.complaints = data || [];
        this.calculateStats();
        this.applyFilters();
      },
      error: (err) => console.error('Error loading complaints:', err)
    });
  }

  resetToMocks(): void {
    this.statusFilter = 'ALL';
    this.categoryFilter = 'ALL';
    this.priorityFilter = 'ALL';
    this.roleFilter = 'ALL';
    this.searchTerm = '';
    this.loadData();
  }

  saveData(): void {
    localStorage.setItem('admin_complaints', JSON.stringify(this.complaints));
  }

  calculateStats(): void {
    this.stats = {
      open: this.complaints.filter(c => c.status === 'OPEN').length,
      inReview: this.complaints.filter(c => c.status === 'IN_REVIEW').length,
      waitingResponse: this.complaints.filter(c => c.status === 'WAITING_RESPONSE').length,
      resolved: this.complaints.filter(c => c.status === 'RESOLVED').length,
      highPriority: this.complaints.filter(c => c.priority === 'HIGH' && c.status !== 'CLOSED' && c.status !== 'RESOLVED').length,
      avgTreatment: '1j 4h'
    };
  }

  applyFilters(): void {
    let result = [...this.complaints];

    if (this.statusFilter !== 'ALL') result = result.filter(c => c.status === this.statusFilter);
    if (this.categoryFilter !== 'ALL') result = result.filter(c => c.category === this.categoryFilter);
    if (this.priorityFilter !== 'ALL') result = result.filter(c => c.priority === this.priorityFilter);
    if (this.roleFilter !== 'ALL') result = result.filter(c => c.complainantRole === this.roleFilter);

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(term) ||
        c.complainantName.toLowerCase().includes(term) ||
        c.accusedName.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term) ||
        c.id.toLowerCase().includes(term)
      );
    }

    if (this.currentSort === 'NEWEST') result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (this.currentSort === 'OLDEST') result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (this.currentSort === 'PRIORITY') {
      const p: any = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      result.sort((a, b) => p[b.priority] - p[a.priority]);
    }
    else if (this.currentSort === 'UPDATED') result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    this.filteredComplaints = result;
  }

  syncNotifications(): void {
    const notifs = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
    this.complaints.filter(c => c.status === 'OPEN' && c.priority === 'HIGH').forEach(c => {
      const exists = notifs.find((n: any) => n.type === 'COMPLAINT' && n.relatedEntityId === c.id);
      if (!exists) {
        notifs.unshift({
          id: 'NOT-CMP-' + c.id,
          title: 'Réclamation PRIORITAIRE',
          message: `${c.complainantName} : ${c.title}`,
          type: 'COMPLAINT',
          priority: 'HIGH',
          status: 'NEW',
          isRead: false,
          createdAt: new Date().toISOString(),
          actionRoute: '/admin/complaints',
          relatedEntityId: c.id
        });
      }
    });
    localStorage.setItem('admin_notifications', JSON.stringify(notifs));
  }

  // Actions
  openDetails(cmp: any): void {
    this.selectedComplaint = cmp;
    this.showDetailsModal = true;
  }

  closeDetails(): void {
    this.selectedComplaint = null;
    this.showDetailsModal = false;
  }

  takeCharge(cmp: any, event?: Event): void {
    if (event) event.stopPropagation();
    cmp.assignedTo = 'Admin GoRide';
    cmp.status = 'IN_REVIEW';
    cmp.updatedAt = new Date().toISOString();
    this.saveAndRefresh();
  }

  openRequest(cmp: any, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedComplaint = cmp;
    this.requestMessage = '';
    this.errorMsg = '';
    this.showRequestModal = true;
  }

  sendRequest(): void {
    if (!this.requestMessage.trim()) {
      this.errorMsg = 'Le message est obligatoire.';
      return;
    }
    const cmp = this.complaints.find(c => c.id === this.selectedComplaint.id);
    if (cmp) {
      cmp.status = 'WAITING_RESPONSE';
      cmp.updatedAt = new Date().toISOString();
      this.saveAndRefresh();
      this.showRequestModal = false;
      alert('Demande envoyée au ' + (this.requestTarget === 'COMPLAINANT' ? 'plaignant' : 'concerné'));
    }
  }

  openResolve(cmp: any, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedComplaint = cmp;
    this.resolutionText = '';
    this.resolutionRefund = 0;
    this.resolutionAction = 'NONE';
    this.errorMsg = '';
    this.showResolveModal = true;
  }

  confirmResolve(): void {
    if (!this.resolutionText.trim()) {
      this.errorMsg = 'La résolution est obligatoire.';
      return;
    }
    const cmp = this.complaints.find(c => c.id === this.selectedComplaint.id);
    if (cmp) {
      cmp.status = 'RESOLVED';
      cmp.resolution = this.resolutionText;
      cmp.updatedAt = new Date().toISOString();
      
      if (this.resolutionRefund > 0) {
        this.createRefund(cmp, this.resolutionRefund);
      }
      
      this.saveAndRefresh();
      this.showResolveModal = false;
      this.closeDetails();
    }
  }

  createRefund(cmp: any, amount: number): void {
    const refunds = JSON.parse(localStorage.getItem('admin_refunds') || '[]');
    refunds.push({
      id: 'REF-' + Math.floor(Math.random() * 10000),
      complaintId: cmp.id,
      amount: amount,
      beneficiaryName: cmp.complainantName,
      date: new Date().toISOString(),
      status: 'PENDING'
    });
    localStorage.setItem('admin_refunds', JSON.stringify(refunds));
  }

  openReject(cmp: any, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedComplaint = cmp;
    this.rejectReason = '';
    this.errorMsg = '';
    this.showRejectModal = true;
  }

  confirmReject(): void {
    if (!this.rejectReason.trim()) {
      this.errorMsg = 'Le motif est obligatoire.';
      return;
    }
    const cmp = this.complaints.find(c => c.id === this.selectedComplaint.id);
    if (cmp) {
      cmp.status = 'REJECTED';
      cmp.resolution = 'REJET : ' + this.rejectReason;
      cmp.updatedAt = new Date().toISOString();
      this.saveAndRefresh();
      this.showRejectModal = false;
      this.closeDetails();
    }
  }

  closeComplaint(cmp: any, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm('Fermer cette réclamation ?')) {
      cmp.status = 'CLOSED';
      cmp.updatedAt = new Date().toISOString();
      this.saveAndRefresh();
      this.closeDetails();
    }
  }

  saveAndRefresh(): void {
    this.saveData();
    this.calculateStats();
    this.applyFilters();
  }

  goToService(id: string): void {
    this.router.navigate(['/admin/services'], { queryParams: { searchTerm: id } });
  }

  goToPayment(id: string): void {
    this.router.navigate(['/admin/payments'], { queryParams: { searchTerm: id } });
  }

  // Helpers
  getRoleLabel(role: string): string {
    const roles: any = { 'CLIENT': 'Passager / Locataire', 'DRIVER': 'Chauffeur', 'FLEET_OWNER': 'Propriétaire', 'COMPANY': 'Entreprise', 'PLATFORM': 'Plateforme', 'ADMIN': 'Admin' };
    return roles[role] || role;
  }

  getCategoryLabel(cat: string): string {
    const cats: any = { 'PAYMENT': 'Paiement', 'VEHICLE': 'Véhicule', 'BEHAVIOR': 'Comportement', 'LOST_ITEM': 'Objet perdu', 'CANCELLATION': 'Annulation', 'SERVICE_QUALITY': 'Qualité service', 'SAFETY': 'Sécurité', 'OTHER': 'Autre' };
    return cats[cat] || cat;
  }

  getPriorityLabel(p: string): string {
    const labels: any = { 'HIGH': 'Haute', 'MEDIUM': 'Moyenne', 'LOW': 'Basse' };
    return labels[p] || p;
  }

  getStatusLabel(s: string): string {
    const labels: any = { 'OPEN': 'Ouverte', 'IN_REVIEW': 'En examen', 'WAITING_RESPONSE': 'En attente réponse', 'RESOLVED': 'Résolue', 'REJECTED': 'Rejetée', 'CLOSED': 'Fermée' };
    return labels[s] || s;
  }

  getStatusClass(s: string): string {
    if (s === 'OPEN') return 'bg-danger-soft text-danger';
    if (s === 'IN_REVIEW') return 'bg-warning-soft text-warning';
    if (s === 'WAITING_RESPONSE') return 'bg-info-soft text-info';
    if (s === 'RESOLVED') return 'bg-success-soft text-success';
    return 'bg-light text-muted';
  }

  getPriorityClass(p: string): string {
    if (p === 'HIGH') return 'bg-danger text-white';
    if (p === 'MEDIUM') return 'bg-warning text-dark';
    return 'bg-light text-muted';
  }
}
