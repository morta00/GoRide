import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { RoleService } from '../../../auth/role.service';
import { CompanyService } from '../../../services/company.service';
import { SearchService } from '../../../services/search.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent implements OnInit, OnDestroy {
  isUserDropdownOpen = false;
  availableRoles: any[] = [];
  unreadNotificationsCount = 0;
  searchQuery = '';
  searchResults: { requests: any[]; conversations: any[] } | null = null;
  isSearching = false;
  showSearchDropdown = false;
  private searchTimeout: any;
  private refreshInterval: any;

  constructor(
    public authService: AuthService,
    private roleService: RoleService,
    private companyService: CompanyService,
    private router: Router,
    private http: HttpClient,
    private searchService: SearchService
  ) { }

  ngOnInit(): void {
    this.loadUserRoles();
    this.roleService.activeRole$.subscribe(() => {
      this.loadUserRoles();
    });

    this.fetchUnreadCount();
    this.refreshInterval = setInterval(() => this.fetchUnreadCount(), 8000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  fetchUnreadCount(): void {
    this.companyService.getSidebarCounts().subscribe({
      next: (counts) => {
        if (counts) {
          this.unreadNotificationsCount = counts.unreadNotifications || 0;
        }
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des notifs non lues dans le topbar', err);
      }
    });
  }

  loadUserRoles(): void {
    const user = this.authService.getCurrentUser();
    if (user && user.roles) {
      const definitions = this.roleService.getRoleDefinitions();
      this.availableRoles = user.roles
        .map((r: any) => {
          const roleStr = typeof r === 'string' ? r : (r.name || r.authority || '');
          const normalizedRole = roleStr.startsWith('ROLE_') ? roleStr : 'ROLE_' + roleStr;
          return definitions[normalizedRole];
        })
        .filter(role => !!role)
        .filter((role, index, self) => 
          index === self.findIndex((r) => r.label === role.label)
        );
    }
  }

  toggleDropdown(): void {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }

  switchRole(roleId: string, route: string): void {
    this.roleService.setActiveRole(roleId);
    this.isUserDropdownOpen = false;
  }

  getHomeRoute(): string {
    const activeRole = this.roleService.getActiveRole();
    return this.roleService.getDashboardRoute(activeRole || 'ROLE_COMPANY');
  }

  getPageTitle(): string {
    const url = this.router.url;
    if (url.includes('home')) return 'Dashboard Entreprise';
    if (url.includes('employees')) return 'Collaborateurs';
    if (url.includes('billing')) return 'Facturation & Budgets';
    if (url.includes('reports')) return 'Rapports d\'activité';
    return 'Espace Corporate';
  }

  get currentUser(): any {
    return this.authService.getCurrentUser();
  }

  get currentUserFullName(): string {
    const user = this.currentUser;
    return user ? `${user.firstName} ${user.lastName}` : '';
  }

  getDashboardRouteByRole(role: string | null): string {
    if (!role) return '/acceuil';
    switch (role) {
      case 'ROLE_ADMIN': return '/admin/dashboard';
      case 'ROLE_CLIENT':
      case 'ROLE_USER': return '/client/dashboard';
      case 'ROLE_DRIVER': return '/driver/dashboard';
      case 'ROLE_FLEET_OWNER': return '/owner/dashboard';
      case 'ROLE_COMPANY': return '/company/dashboard';
      default: return '/acceuil';
    }
  }

  getProfileRouteByRole(role: string | null): string {
    if (!role) return '/acceuil';
    switch (role) {
      case 'ROLE_ADMIN': return '/admin/profile';
      case 'ROLE_CLIENT':
      case 'ROLE_USER': return '/client/profile';
      case 'ROLE_DRIVER': return '/driver/profile';
      case 'ROLE_FLEET_OWNER': return '/owner/profile';
      case 'ROLE_COMPANY': return '/company/profile';
      default: return '/acceuil';
    }
  }

  getSettingsRouteByRole(role: string | null): string {
    if (!role) return '/acceuil';
    switch (role) {
      case 'ROLE_ADMIN': return '/admin/settings';
      case 'ROLE_CLIENT':
      case 'ROLE_USER': return '/client/settings';
      case 'ROLE_DRIVER': return '/driver/settings';
      case 'ROLE_FLEET_OWNER': return '/owner/settings';
      case 'ROLE_COMPANY': return '/company/settings';
      default: return '/acceuil';
    }
  }

  goToSettings(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isUserDropdownOpen = false;
    const role = this.authService.getActiveRole();
    const route = this.getSettingsRouteByRole(role);
    this.router.navigate([route]);
  }

  goToProfile(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isUserDropdownOpen = false;
    const role = this.authService.getActiveRole();
    const route = this.getProfileRouteByRole(role);
    this.router.navigate([route]);
  }

  goToHome(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isUserDropdownOpen = false;
    this.router.navigate(['/accueil']);
  }

  goToNotifications(): void {
    this.router.navigate(['/company/notifications']);
  }

  logout(): void {
    this.authService.logout();
  }

  onSearchInput(): void {
    const query = this.searchQuery.trim();
    this.searchService.setSearchTerm(query);
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    if (!query) {
      this.showSearchDropdown = false;
      this.searchResults = null;
      return;
    }
    this.searchTimeout = setTimeout(() => this.performSearch(query), 300);
  }

  onSearchSubmit(): void {
    const q = this.searchQuery.trim();
    if (!q) return;
    this.searchService.setSearchTerm(q);
    if (this.searchResults?.requests?.length) {
      this.router.navigate(['/company/requests'], { queryParams: { search: q } });
    } else {
      this.router.navigate(['/company/requests'], { queryParams: { search: q } });
    }
    this.showSearchDropdown = false;
  }

  performSearch(query: string): void {
    this.isSearching = true;
    this.showSearchDropdown = true;
    this.http.get<any>(`${environment.apiUrl}/company/search?q=${encodeURIComponent(query)}`).subscribe({
      next: (res) => {
        this.searchResults = {
          requests: res?.requests || [],
          conversations: res?.conversations || []
        };
        this.isSearching = false;
      },
      error: () => {
        this.searchResults = { requests: [], conversations: [] };
        this.isSearching = false;
      }
    });
  }

  hasSearchResults(): boolean {
    return (
      (this.searchResults?.requests?.length || 0) > 0 ||
      (this.searchResults?.conversations?.length || 0) > 0
    );
  }

  openRequest(item: any): void {
    this.showSearchDropdown = false;
    this.router.navigate(['/company/requests'], { queryParams: { search: item.label || this.searchQuery } });
  }

  openConversation(item: any): void {
    this.showSearchDropdown = false;
    this.router.navigate(['/company/conversations'], { queryParams: { conversationId: item.id } });
  }

  closeSearchDropdown(): void {
    setTimeout(() => (this.showSearchDropdown = false), 200);
  }
}
