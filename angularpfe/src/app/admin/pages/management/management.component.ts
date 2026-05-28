import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-management',
  templateUrl: './management.component.html',
  styleUrls: ['./management.component.css']
})
export class ManagementComponent implements OnInit {
  activeTab: string = 'users';

  // --- Users Data ---
  users: any[] = [];
  filteredUsers: any[] = [];
  searchTermUsers: string = '';
  currentFilterUsers: string = 'ALL';
  usersStats = { total: 0, passengers: 0, tenants: 0, drivers: 0, owners: 0, companies: 0, admins: 0, pending: 0 };

  // --- Vehicles Data ---
  vehicles: any[] = [];
  filteredVehicles: any[] = [];
  searchTermVehicles: string = '';
  currentFilterVehicles: string = 'ALL';
  currentSortVehicles: string = 'NEWEST';
  vehiclesStats = { total: 0, validated: 0, pending: 0, available: 0, inRide: 0, maintenance: 0, suspended: 0, totalRevenue: 0 };

  // --- Validations Data ---
  validations: any[] = [];
  filteredValidations: any[] = [];
  currentFilterValidations: string = 'ALL';
  validationsStats = { pendingTotal: 0, accounts: 0, documents: 0, vehicles: 0, validated: 0, rejected: 0 };

  // --- Modals State ---
  selectedItem: any = null;
  activeModal: string | null = null; // 'user-details', 'vehicle-details', 'validation-details', 'reject', 'validate-confirm', 'suspend-user', 'suspend-vehicle', 'confirmation'
  
  // Shared modal props
  rejectionReason: string = '';
  rejectionError: string = '';
  suspensionReason: string = '';
  suspensionError: string = '';
  confirmationData: any = { title: '', message: '', action: null, confirmText: '', confirmClass: '' };

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Handle tab from URL
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
    });

    this.loadAllData();
  }

  loadAllData(): void {
    this.initUsers();
    this.initVehicles();
    this.initValidations();
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab },
      queryParamsHandling: 'merge'
    });
  }

  // ==========================================
  // USERS LOGIC
  // ==========================================
  initUsers(): void {
    this.http.get<any[]>(`${environment.apiUrl}/admin/users`).subscribe({
      next: (data) => {
        this.users = (data || []).map(u => this.mapUserFromApi(u));
        this.ensureDemoCompanies();
        this.calculateUsersStats();
        this.applyUsersFilter(this.currentFilterUsers);
      },
      error: () => {
        this.users = this.getDemoUsersFallback();
        this.calculateUsersStats();
        this.applyUsersFilter(this.currentFilterUsers);
      }
    });
  }

  /** Show sample companies when API has none yet (e.g. before seeder / backend restart). */
  private ensureDemoCompanies(): void {
    const hasCompany = this.users.some(u => this.userHasRole(u, 'ROLE_COMPANY'));
    if (hasCompany) return;
    const existingEmails = new Set(this.users.map(u => u.email?.toLowerCase()));
    for (const demo of this.getDemoCompaniesOnly()) {
      if (!existingEmails.has(demo.email.toLowerCase())) {
        this.users.push(demo);
      }
    }
  }

  private getDemoCompaniesOnly(): any[] {
    return [
      { id: 'demo-company-1', name: 'Société GoRide', firstName: 'Société', lastName: 'GoRide', email: 'company@goride.demo', role: 'ROLE_COMPANY', roles: ['ROLE_COMPANY', 'ROLE_USER'], status: 'ACTIVE', verificationStatus: 'VERIFIED', city: 'Tunis', phone: '+216 70 000 001', protected: false },
      { id: 'demo-company-2', name: 'Tech Solutions SARL', firstName: 'Tech', lastName: 'Solutions SARL', email: 'entreprise.tech@goride.demo', role: 'ROLE_COMPANY', roles: ['ROLE_COMPANY'], status: 'ACTIVE', verificationStatus: 'VERIFIED', city: 'Ariana', phone: '+216 71 111 222', protected: false },
      { id: 'demo-company-3', name: 'Logistique Tunis SA', firstName: 'Logistique', lastName: 'Tunis SA', email: 'logistique.tunis@goride.demo', role: 'ROLE_COMPANY', roles: ['ROLE_COMPANY'], status: 'ACTIVE', verificationStatus: 'VERIFIED', city: 'Sfax', phone: '+216 74 333 444', protected: false }
    ];
  }

  private getDemoUsersFallback(): any[] {
    return [
      ...this.getDemoCompaniesOnly(),
      { id: 'demo-admin', name: 'Admin GoRide', email: 'admin@goride.tn', role: 'ROLE_ADMIN', roles: ['ROLE_ADMIN'], status: 'ACTIVE', verificationStatus: 'VERIFIED', city: 'Tunis', protected: true },
      { id: 'demo-driver', name: 'Imed Kilani', email: 'driver@goride.demo', role: 'ROLE_DRIVER', roles: ['ROLE_DRIVER'], status: 'ACTIVE', verificationStatus: 'VERIFIED', city: 'Tunis', protected: false },
      { id: 'demo-owner', name: 'Ahmed Abidi', email: 'owner@goride.demo', role: 'ROLE_FLEET_OWNER', roles: ['ROLE_FLEET_OWNER'], status: 'ACTIVE', verificationStatus: 'VERIFIED', city: 'Tunis', protected: false }
    ];
  }

  /** Pick the most relevant role when a user has several (e.g. COMPANY + USER). */
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
    this.calculateUsersStats();
  }

  calculateUsersStats(): void {
    this.usersStats = {
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

  applyUsersFilter(filter: string): void {
    this.currentFilterUsers = filter;
    let filtered = [...this.users];
    if (filter === 'PASSENGER') filtered = filtered.filter(u => this.userHasRole(u, 'ROLE_USER'));
    else if (filter === 'TENANT') filtered = filtered.filter(u => this.userHasRole(u, 'ROLE_CLIENT'));
    else if (filter === 'DRIVER') filtered = filtered.filter(u => this.userHasRole(u, 'ROLE_DRIVER'));
    else if (filter === 'OWNER') filtered = filtered.filter(u => this.userHasRole(u, 'ROLE_FLEET_OWNER'));
    else if (filter === 'COMPANY') filtered = filtered.filter(u => this.userHasRole(u, 'ROLE_COMPANY'));
    else if (filter === 'ADMIN') filtered = filtered.filter(u => this.userHasRole(u, 'ROLE_ADMIN'));
    else if (filter === 'PENDING') filtered = filtered.filter(u => u.verificationStatus === 'PENDING');

    if (this.searchTermUsers.trim()) {
      const term = this.searchTermUsers.toLowerCase();
      filtered = filtered.filter(u => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term) || u.city.toLowerCase().includes(term));
    }
    this.filteredUsers = filtered;
  }

  getRoleLabel(user: any): string {
    if (user.role === 'ROLE_CLIENT' || user.role === 'ROLE_USER') return 'Client';
    if (user.role === 'ROLE_DRIVER') return 'Chauffeur';
    if (user.role === 'ROLE_FLEET_OWNER') return 'Propriétaire';
    if (user.role === 'ROLE_COMPANY') return 'Entreprise';
    if (user.role === 'ROLE_ADMIN') return 'Administrateur';
    return 'Utilisateur';
  }

  // ==========================================
  // VEHICLES LOGIC
  // ==========================================
  initVehicles(): void {
    this.http.get<any[]>(`${environment.apiUrl}/admin/vehicles`).subscribe({
      next: (data) => {
        this.vehicles = (data || []).map(v => {
          v.plateNumber = v.licensePlate || 'Non renseigné';
          v.ownerName = v.owner ? ((v.owner.firstName || '') + ' ' + (v.owner.lastName || '')) : 'GoRide Partner';
          v.ownerRole = v.owner ? 'FLEET_OWNER' : 'PLATFORM';
          v.validationStatus = v.available ? 'APPROVED' : 'PENDING';
          v.availabilityStatus = v.status || 'AVAILABLE';
          v.totalRevenue = v.totalRevenue || 0;
          v.rating = v.rating || 0;
          v.createdAt = v.createdAt || new Date().toISOString();
          return v;
        });
        this.calculateVehiclesStats();
        this.applyVehiclesFilter(this.currentFilterVehicles);
      },
      error: (err) => console.error('Error loading vehicles:', err)
    });
  }

  saveVehicles(): void {
    this.calculateVehiclesStats();
  }

  calculateVehiclesStats(): void {
    this.vehiclesStats = {
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

  applyVehiclesFilter(filter: string): void {
    this.currentFilterVehicles = filter;
    let filtered = [...this.vehicles];
    if (filter === 'APPROVED') filtered = filtered.filter(v => v.validationStatus === 'APPROVED');
    else if (filter === 'PENDING') filtered = filtered.filter(v => v.validationStatus === 'PENDING');
    else if (filter === 'AVAILABLE') filtered = filtered.filter(v => v.availabilityStatus === 'AVAILABLE');
    else if (filter === 'MAINTENANCE') filtered = filtered.filter(v => v.availabilityStatus === 'MAINTENANCE');
    else if (filter === 'SUSPENDED') filtered = filtered.filter(v => v.availabilityStatus === 'SUSPENDED');
    else if (filter === 'OWNER') filtered = filtered.filter(v => v.ownerRole === 'FLEET_OWNER');
    else if (filter === 'DRIVER') filtered = filtered.filter(v => v.ownerRole === 'DRIVER');

    if (this.searchTermVehicles.trim()) {
      const term = this.searchTermVehicles.toLowerCase();
      filtered = filtered.filter(v => v.brand.toLowerCase().includes(term) || v.model.toLowerCase().includes(term) || v.plateNumber.toLowerCase().includes(term));
    }

    if (this.currentSortVehicles === 'REVENUE_DESC') filtered.sort((a, b) => b.totalRevenue - a.totalRevenue);
    else if (this.currentSortVehicles === 'RATING_DESC') filtered.sort((a, b) => b.rating - a.rating);
    else filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    this.filteredVehicles = filtered;
  }

  // ==========================================
  // VALIDATIONS LOGIC
  // ==========================================
  initValidations(): void {
    this.http.get<any[]>(`${environment.apiUrl}/admin/validations`).subscribe({
      next: (data) => {
        this.validations = (data || []).map(item => {
          return {
            id: item.id,
            type: 'OWNER_VEHICLE',
            entityName: (item.brand || '') + ' ' + (item.model || ''),
            subEntity: item.licensePlate || '',
            date: 'Récemment',
            status: 'PENDING',
            priority: 'Haute',
            details: 'Validation de véhicule: ' + (item.brand || '') + ' ' + (item.model || '')
          };
        });
        this.calculateValidationsStats();
        this.applyValidationsFilter(this.currentFilterValidations);
      },
      error: (err) => console.error('Error loading validations:', err)
    });
  }

  saveValidations(): void {
    this.calculateValidationsStats();
  }

  calculateValidationsStats(): void {
    const pending = this.validations.filter(v => v.status === 'PENDING');
    this.validationsStats = {
      pendingTotal: pending.length,
      accounts: pending.filter(v => v.type.includes('ACCOUNT')).length,
      documents: pending.filter(v => v.type.includes('DOCUMENT')).length,
      vehicles: pending.filter(v => v.type.includes('VEHICLE')).length,
      validated: this.validations.filter(v => v.status === 'APPROVED').length,
      rejected: this.validations.filter(v => v.status === 'REJECTED').length
    };
  }

  applyValidationsFilter(filter: string): void {
    this.currentFilterValidations = filter;
    let filtered = [...this.validations];
    if (filter === 'ACCOUNTS') filtered = filtered.filter(v => v.type.includes('ACCOUNT'));
    else if (filter === 'DOCUMENTS') filtered = filtered.filter(v => v.type.includes('DOCUMENT'));
    else if (filter === 'VEHICLES') filtered = filtered.filter(v => v.type.includes('VEHICLE'));
    else if (filter === 'DRIVER') filtered = filtered.filter(v => v.type.includes('DRIVER'));
    else if (filter === 'OWNER') filtered = filtered.filter(v => v.type.includes('OWNER'));
    else if (filter === 'COMPANY') filtered = filtered.filter(v => v.type.includes('COMPANY'));
    this.filteredValidations = filtered;
  }

  // ==========================================
  // SHARED MODAL LOGIC
  // ==========================================
  openModal(type: string, item: any, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedItem = item;
    this.activeModal = type;
    
    if (type === 'reject') { this.rejectionReason = ''; this.rejectionError = ''; }
    if (type === 'suspend-vehicle') { this.suspensionReason = ''; this.suspensionError = ''; }
  }

  closeModal(): void {
    this.activeModal = null;
    this.selectedItem = null;
  }

  // ==========================================
  // SYNC ACTIONS WITH DATABASE
  // ==========================================
  confirmValidation(): void {
    if (!this.selectedItem) return;
    const endpoint = `${environment.apiUrl}/admin/vehicles/${this.selectedItem.id}/approve`;
    this.http.put(endpoint, {}).subscribe({
      next: () => {
        this.loadAllData();
        this.closeModal();
      },
      error: (err) => console.error('Error validating:', err)
    });
  }

  confirmReject(): void {
    if (!this.rejectionReason.trim()) {
      this.rejectionError = 'Le motif du refus est obligatoire.';
      return;
    }
    const endpoint = `${environment.apiUrl}/admin/vehicles/${this.selectedItem.id}/suspend`;
    this.http.put(endpoint, {}).subscribe({
      next: () => {
        this.loadAllData();
        this.closeModal();
      },
      error: (err) => console.error('Error rejecting:', err)
    });
  }

  // Users Specific Actions
  confirmToggleSuspendUser(): void {
    const isSuspending = this.selectedItem.status === 'ACTIVE';
    const endpoint = `${environment.apiUrl}/admin/users/${this.selectedItem.id}/${isSuspending ? 'suspend' : 'verify'}`;
    this.http.put(endpoint, {}).subscribe({
      next: () => {
        this.loadAllData();
        this.closeModal();
      },
      error: (err) => console.error('Error toggling user suspension:', err)
    });
  }

  confirmDeleteUser(): void {
    this.http.delete(`${environment.apiUrl}/users/admin/${this.selectedItem.id}`, { responseType: 'text' }).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== this.selectedItem.id);
        this.calculateUsersStats();
        this.applyUsersFilter(this.currentFilterUsers);
        this.closeModal();
      },
      error: (err) => console.error('Error deleting user:', err)
    });
  }

  // Vehicles Specific Actions
  toggleMaintenance(vehicle: any): void {
    const isMaint = vehicle.availabilityStatus === 'MAINTENANCE';
    const endpoint = `${environment.apiUrl}/admin/vehicles/${vehicle.id}/${isMaint ? 'approve' : 'suspend'}`;
    this.http.put(endpoint, {}).subscribe({
      next: () => {
        this.loadAllData();
      },
      error: (err) => console.error(err)
    });
  }

  confirmSuspendVehicle(): void {
    if (!this.suspensionReason.trim()) {
      this.suspensionError = 'Motif obligatoire.';
      return;
    }
    const endpoint = `${environment.apiUrl}/admin/vehicles/${this.selectedItem.id}/suspend`;
    this.http.put(endpoint, {}).subscribe({
      next: () => {
        this.loadAllData();
        this.closeModal();
      },
      error: (err) => console.error(err)
    });
  }

  reactivateVehicle(vehicle: any): void {
    const endpoint = `${environment.apiUrl}/admin/vehicles/${vehicle.id}/approve`;
    this.http.put(endpoint, {}).subscribe({
      next: () => {
        this.loadAllData();
      },
      error: (err) => console.error(err)
    });
  }

  getTypeLabel(type: string): string {
    const labels: any = { 'DRIVER_ACCOUNT': 'Compte chauffeur', 'OWNER_ACCOUNT': 'Compte propriétaire', 'COMPANY_ACCOUNT': 'Compte entreprise', 'DRIVER_DOCUMENT': 'Document chauffeur', 'OWNER_DOCUMENT': 'Document propriétaire', 'COMPANY_DOCUMENT': 'Document entreprise', 'OWNER_VEHICLE': 'Véhicule propriétaire', 'DRIVER_VEHICLE': 'Véhicule chauffeur' };
    return labels[type] || type;
  }
}
