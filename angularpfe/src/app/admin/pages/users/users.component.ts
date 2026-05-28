import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  users: any[] = [];
  filteredUsers: any[] = [];
  currentFilter: string = 'ALL';
  searchTerm: string = '';
  loading = true;

  stats = {
    total: 0,
    passengers: 0,
    tenants: 0,
    drivers: 0,
    owners: 0,
    companies: 0,
    admins: 0,
    pending: 0
  };

  selectedUser: any = null;
  isModalOpen: boolean = false;
  confirmationModal: any = {
    isOpen: false,
    title: '',
    message: '',
    action: null,
    confirmText: '',
    confirmClass: ''
  };

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.initUsers();
  }

  initUsers(): void {
    this.loading = true;
    this.http.get<any[]>(`${environment.apiUrl}/admin/users`).subscribe({
      next: (data) => {
        this.users = (data || []).map(u => this.mapUserFromApi(u));
        this.calculateStats();
        this.applyFilter(this.currentFilter);
        this.loading = false;
      },
      error: () => {
        this.users = [];
        this.loading = false;
        this.calculateStats();
        this.applyFilter('ALL');
      }
    });
  }

  private mapUserFromApi(u: any): any {
    const roleNames: string[] = (u.roles || []).map((r: any) => r?.name || r).filter(Boolean);
    const priority = ['ROLE_ADMIN', 'ROLE_FLEET_OWNER', 'ROLE_DRIVER', 'ROLE_COMPANY', 'ROLE_CLIENT', 'ROLE_USER'];
    const primaryRole = priority.find(p => roleNames.includes(p)) || roleNames[0] || 'ROLE_CLIENT';

    return {
      ...u,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
      role: primaryRole,
      roles: roleNames,
      status: u.enabled !== false ? 'ACTIVE' : 'SUSPENDED',
      verificationStatus: u.verificationStatus || 'VERIFIED',
      city: u.city || 'Non renseigné',
      phone: u.phone || 'Non renseigné',
      protected: u.email === 'admin@goride.tn'
    };
  }

  userHasRole(user: any, role: string): boolean {
    return user.role === role || (user.roles || []).includes(role);
  }

  saveUsers(): void {
    this.calculateStats();
  }

  calculateStats(): void {
    this.stats = {
      total: this.users.length,
      passengers: this.users.filter(u => this.userHasRole(u, 'ROLE_USER')).length,
      tenants: this.users.filter(u => this.userHasRole(u, 'ROLE_CLIENT')).length,
      drivers: this.users.filter(u => this.userHasRole(u, 'ROLE_DRIVER')).length,
      owners: this.users.filter(u => this.userHasRole(u, 'ROLE_FLEET_OWNER')).length,
      companies: this.users.filter(u => this.userHasRole(u, 'ROLE_COMPANY')).length,
      admins: this.users.filter(u => this.userHasRole(u, 'ROLE_ADMIN')).length,
      pending: this.users.filter(u => u.verificationStatus === 'PENDING').length
    };
  }

  onSearch(): void {
    this.applyFilter(this.currentFilter);
  }

  applyFilter(filter: string): void {
    this.currentFilter = filter;
    let filtered = [...this.users];

    if (filter === 'PASSENGER') {
      filtered = filtered.filter(u => this.userHasRole(u, 'ROLE_USER'));
    } else if (filter === 'TENANT') {
      filtered = filtered.filter(u => this.userHasRole(u, 'ROLE_CLIENT'));
    } else if (filter === 'DRIVER') {
      filtered = filtered.filter(u => this.userHasRole(u, 'ROLE_DRIVER'));
    } else if (filter === 'OWNER') {
      filtered = filtered.filter(u => this.userHasRole(u, 'ROLE_FLEET_OWNER'));
    } else if (filter === 'COMPANY') {
      filtered = filtered.filter(u => this.userHasRole(u, 'ROLE_COMPANY'));
    } else if (filter === 'ADMIN') {
      filtered = filtered.filter(u => this.userHasRole(u, 'ROLE_ADMIN'));
    } else if (filter === 'PENDING') {
      filtered = filtered.filter(u => u.verificationStatus === 'PENDING');
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.city.toLowerCase().includes(term) ||
        this.getRoleLabel(u).toLowerCase().includes(term) ||
        (u.status === 'ACTIVE' ? 'actif' : 'suspendu').includes(term)
      );
    }

    this.filteredUsers = filtered;
  }

  getRoleLabel(user: any): string {
    if (user.role === 'ROLE_CLIENT') {
      if (user.clientType === 'PASSENGER') return 'Passager';
      if (user.clientType === 'TENANT' || user.clientType === 'RENTER') return 'Locataire';
      if (user.clientType === 'MIXED') return 'Passager / Locataire';
      return 'Client';
    }
    if (user.role === 'ROLE_DRIVER') return 'Chauffeur';
    if (user.role === 'ROLE_FLEET_OWNER') return 'Propriétaire';
    if (user.role === 'ROLE_COMPANY') return 'Entreprise';
    if (user.role === 'ROLE_ADMIN') return 'Administrateur';
    return 'Utilisateur';
  }

  getRoleColor(user: any): string {
    if (user.role === 'ROLE_CLIENT') {
      if (user.clientType === 'TENANT' || user.clientType === 'RENTER') return 'text-purple-500 bg-purple-50';
      return 'text-green-600 bg-green-50';
    }
    if (user.role === 'ROLE_DRIVER') return 'text-blue-600 bg-blue-50';
    if (user.role === 'ROLE_FLEET_OWNER') return 'text-orange-600 bg-orange-50';
    if (user.role === 'ROLE_COMPANY') return 'text-slate-600 bg-slate-100';
    if (user.role === 'ROLE_ADMIN') return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  }

  openDetails(user: any): void {
    this.selectedUser = user;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedUser = null;
  }

  goToValidations(user: any, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/admin/validations'], { queryParams: { type: 'account', userId: user.id } });
  }

  toggleSuspend(user: any, event: Event): void {
    event.stopPropagation();
    if (user.protected || user.email === 'admin@goride.tn') return;

    const isSuspending = user.status === 'ACTIVE';
    this.confirmationModal = {
      isOpen: true,
      title: isSuspending ? 'Suspendre l\'utilisateur' : 'Réactiver l\'utilisateur',
      message: `Êtes-vous sûr de vouloir ${isSuspending ? 'suspendre' : 'réactiver'} l'utilisateur ${user.name} ?`,
      confirmText: isSuspending ? 'Suspendre' : 'Réactiver',
      confirmClass: isSuspending ? 'btn-warning' : 'btn-success',
      action: () => {
        user.status = isSuspending ? 'SUSPENDED' : 'ACTIVE';
        this.saveUsers();
        this.closeConfirmation();
      }
    };
  }

  deleteUser(user: any, event: Event): void {
    event.stopPropagation();
    if (user.protected || user.role === 'ROLE_ADMIN') return;

    this.confirmationModal = {
      isOpen: true,
      title: 'Supprimer l\'utilisateur',
      message: `ATTENTION: Êtes-vous sûr de vouloir supprimer définitivement ${user.name} ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      confirmClass: 'btn-danger',
      action: () => {
        this.users = this.users.filter(u => u.id !== user.id);
        this.saveUsers();
        this.applyFilter(this.currentFilter);
        this.closeConfirmation();
      }
    };
  }

  closeConfirmation(): void {
    this.confirmationModal.isOpen = false;
  }
}
