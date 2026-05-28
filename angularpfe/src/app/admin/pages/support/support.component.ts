import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-support',
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.css']
})
export class SupportComponent implements OnInit {
  tickets: any[] = [];
  filteredTickets: any[] = [];
  
  searchTerm: string = '';
  statusFilter: string = 'ALL';
  categoryFilter: string = 'ALL';
  roleFilter: string = 'ALL';
  currentSort: string = 'NEWEST';

  stats = {
    open: 0,
    inProgress: 0,
    waitingUser: 0,
    resolved: 0,
    highPriority: 0,
    avgResponseTime: '12 min'
  };

  selectedTicket: any = null;
  showDetailsModal: boolean = false;
  showReplyModal: boolean = false;
  replyMessage: string = '';
  replyError: string = '';

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.http.get<any[]>(`${environment.apiUrl}/admin/support`).subscribe({
      next: (data) => {
        this.tickets = data || [];
        this.calculateStats();
        this.applyFilters();
      },
      error: (err) => console.error('Error loading support tickets:', err)
    });
  }

  resetToMocks(): void {
    this.statusFilter = 'ALL';
    this.categoryFilter = 'ALL';
    this.roleFilter = 'ALL';
    this.searchTerm = '';
    this.loadData();
  }

  saveData(): void {
    localStorage.setItem('admin_support_tickets', JSON.stringify(this.tickets));
  }

  calculateStats(): void {
    this.stats = {
      open: this.tickets.filter(t => t.status === 'OPEN').length,
      inProgress: this.tickets.filter(t => t.status === 'IN_PROGRESS').length,
      waitingUser: this.tickets.filter(t => t.status === 'WAITING_USER').length,
      resolved: this.tickets.filter(t => t.status === 'RESOLVED').length,
      highPriority: this.tickets.filter(t => t.priority === 'HIGH' && t.status !== 'CLOSED').length,
      avgResponseTime: '12 min'
    };
  }

  applyFilters(): void {
    let result = [...this.tickets];

    if (this.statusFilter === 'OPEN_ONLY') result = result.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'WAITING_USER');
    else if (this.statusFilter !== 'ALL') result = result.filter(t => t.status === this.statusFilter);

    if (this.categoryFilter !== 'ALL') result = result.filter(t => t.category === this.categoryFilter);
    if (this.roleFilter !== 'ALL') result = result.filter(t => t.requesterRole === this.roleFilter);

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(t => 
        t.subject.toLowerCase().includes(term) ||
        t.requesterName.toLowerCase().includes(term) ||
        t.requesterEmail.toLowerCase().includes(term) ||
        t.id.toLowerCase().includes(term)
      );
    }

    if (this.currentSort === 'NEWEST') result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (this.currentSort === 'OLDEST') result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (this.currentSort === 'PRIORITY') {
      const p: any = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      result.sort((a, b) => p[b.priority] - p[a.priority]);
    }
    else if (this.currentSort === 'LAST_MESSAGE') result.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    this.filteredTickets = result;
  }

  syncNotifications(): void {
    const notifs = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
    this.tickets.filter(t => t.status === 'OPEN').forEach(t => {
      const exists = notifs.find((n: any) => n.type === 'SUPPORT' && n.relatedEntityId === t.id);
      if (!exists) {
        notifs.unshift({
          id: 'NOT-SUP-' + t.id,
          title: 'Nouveau ticket support',
          message: `${t.requesterName} : ${t.subject}`,
          type: 'SUPPORT',
          priority: t.priority,
          status: 'NEW',
          isRead: false,
          createdAt: new Date().toISOString(),
          actionRoute: '/admin/support',
          relatedEntityId: t.id
        });
      }
    });
    localStorage.setItem('admin_notifications', JSON.stringify(notifs));
  }

  // Actions
  openDetails(ticket: any): void {
    this.selectedTicket = ticket;
    this.showDetailsModal = true;
  }

  closeDetails(): void {
    this.selectedTicket = null;
    this.showDetailsModal = false;
  }

  openReply(ticket: any, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedTicket = ticket;
    this.replyMessage = '';
    this.replyError = '';
    this.showReplyModal = true;
  }

  closeReply(): void {
    this.showReplyModal = false;
    this.replyError = '';
  }

  sendReply(): void {
    if (!this.replyMessage.trim()) {
      this.replyError = 'Le message est obligatoire.';
      return;
    }

    const ticket = this.tickets.find(t => t.id === this.selectedTicket.id);
    if (ticket) {
      const now = new Date().toISOString();
      ticket.messages.push({
        sender: 'Admin GoRide',
        content: this.replyMessage,
        date: now
      });
      ticket.lastMessageAt = now;
      ticket.status = 'WAITING_USER';
      ticket.assignedTo = 'Admin GoRide';
      this.saveAndRefresh();
      this.closeReply();
      this.closeDetails();
      alert('Réponse envoyée avec succès !');
    }
  }

  assignToMe(ticket: any, event?: Event): void {
    if (event) event.stopPropagation();
    ticket.assignedTo = 'Admin GoRide';
    if (ticket.status === 'OPEN') ticket.status = 'IN_PROGRESS';
    this.saveAndRefresh();
  }

  markInProgress(ticket: any, event?: Event): void {
    if (event) event.stopPropagation();
    ticket.status = 'IN_PROGRESS';
    this.saveAndRefresh();
  }

  markResolved(ticket: any, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm('Marquer ce ticket comme résolu ?')) {
      ticket.status = 'RESOLVED';
      ticket.messages.push({
        sender: 'Système',
        content: 'Ticket marqué comme résolu par l’administrateur.',
        date: new Date().toISOString()
      });
      this.saveAndRefresh();
      this.closeDetails();
    }
  }

  closeTicket(ticket: any, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm('Fermer définitivement ce ticket ?')) {
      ticket.status = 'CLOSED';
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

  // Helpers
  getRoleLabel(role: string): string {
    const roles: any = {
      'CLIENT': 'Passager / Locataire',
      'DRIVER': 'Chauffeur',
      'FLEET_OWNER': 'Propriétaire',
      'COMPANY': 'Entreprise'
    };
    return roles[role] || role;
  }

  getCategoryLabel(cat: string): string {
    const cats: any = {
      'ACCOUNT': 'Compte',
      'PAYMENT': 'Paiement',
      'SERVICE': 'Service',
      'VEHICLE': 'Véhicule',
      'TECHNICAL': 'Technique',
      'GENERAL': 'Général'
    };
    return cats[cat] || cat;
  }

  getPriorityLabel(p: string): string {
    const labels: any = { 'HIGH': 'Haute', 'MEDIUM': 'Moyenne', 'LOW': 'Basse' };
    return labels[p] || p;
  }

  getStatusLabel(s: string): string {
    const labels: any = {
      'OPEN': 'Ouvert',
      'IN_PROGRESS': 'En cours',
      'WAITING_USER': 'En attente utilisateur',
      'RESOLVED': 'Résolu',
      'CLOSED': 'Fermé'
    };
    return labels[s] || s;
  }

  getStatusClass(s: string): string {
    if (s === 'OPEN') return 'bg-danger-soft text-danger';
    if (s === 'IN_PROGRESS') return 'bg-primary-soft text-primary';
    if (s === 'WAITING_USER') return 'bg-warning-soft text-warning';
    if (s === 'RESOLVED') return 'bg-success-soft text-success';
    return 'bg-light text-muted';
  }

  getPriorityClass(p: string): string {
    if (p === 'HIGH') return 'bg-danger text-white';
    if (p === 'MEDIUM') return 'bg-warning text-dark';
    return 'bg-light text-muted';
  }
}
