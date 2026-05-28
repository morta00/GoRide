import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../auth/auth.service';
import { MessagingService } from '../../../services/messaging.service';
import { RoleService } from '../../../auth/role.service';
import { environment } from '../../../../environments/environment';
import { SearchService } from '../../../services/search.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent implements OnInit, OnDestroy {
  isUserDropdownOpen = false;
  private userSub?: Subscription;
  unreadMessagesCount: number = 0;
  availableRoles: any[] = [];

  searchQuery: string = '';
  searchResults: any = null;
  isSearching: boolean = false;
  showSearchDropdown: boolean = false;
  private searchTimeout: any;

  private roleDefinitions: Record<string, any> = {
    'ROLE_CLIENT': { id: 'ROLE_CLIENT', label: 'Client', icon: 'ion-ios-person', route: '/client/home', color: '#10b981' },
    'ROLE_USER': { id: 'ROLE_USER', label: 'Client', icon: 'ion-ios-person', route: '/client/home', color: '#10b981' },
    'ROLE_DRIVER': { id: 'ROLE_DRIVER', label: 'Chauffeur', icon: 'ion-ios-car', route: '/driver/home', color: '#2563eb' },
    'ROLE_FLEET_OWNER': { id: 'ROLE_FLEET_OWNER', label: 'Propriétaire', icon: 'ion-ios-people', route: '/fleet/dashboard', color: '#f59e0b' },
    'ROLE_COMPANY': { id: 'ROLE_COMPANY', label: 'Entreprise', icon: 'ion-ios-briefcase', route: '/company/home', color: '#4b5563' },
    'ROLE_ADMIN': { id: 'ROLE_ADMIN', label: 'Admin', icon: 'ion-ios-settings', route: '/admin/home', color: '#ef4444' }
  };

  constructor(
    public authService: AuthService,
    private roleService: RoleService,
    private messagingService: MessagingService,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private searchService: SearchService
  ) { }

  ngOnInit(): void {
    this.userSub = this.authService.user$.subscribe(() => this.cdr.markForCheck());
    this.loadUserRoles();
    this.roleService.activeRole$.subscribe(() => {
      this.loadUserRoles();
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  loadUserRoles(): void {
    this.loadRoles();
    
    this.loadFleetMessageCount();
    this.messagingService.countsRefresh$.subscribe(() => this.loadFleetMessageCount());
    this.messagingService.message$.subscribe(msg => {
      if (msg && (msg as any).type !== 'READ_EVENT') {
        this.loadFleetMessageCount();
      }
    });
  }

  loadFleetMessageCount(): void {
    this.http.get<any>(`${environment.apiUrl}/fleet/sidebar-counts`).subscribe({
      next: (counts) => {
        this.unreadMessagesCount = Number(counts?.messages ?? 0);
        this.cdr.markForCheck();
      }
    });
  }

  loadRoles(): void {
    const user = this.currentUser;
    if (user && user.roles) {
      this.availableRoles = user.roles
        .map((r: any) => {
          const roleStr = typeof r === 'string' ? r : (r.name || r.authority || '');
          const normalizedRole = roleStr.startsWith('ROLE_') ? roleStr : 'ROLE_' + roleStr;
          return this.roleDefinitions[normalizedRole] || { id: normalizedRole, label: roleStr, icon: 'ion-ios-settings', route: '/acceuil', color: '#6c757d' };
        })
        .filter((role: any, index: number, self: any[]) => 
          index === self.findIndex((r) => r.label === role.label)
        );

      this.availableRoles = this.availableRoles.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
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
    const activeRole = this.authService.getActiveRole();
    const normalizedRole = activeRole?.startsWith('ROLE_') ? activeRole : 'ROLE_' + activeRole;
    return this.roleDefinitions[normalizedRole]?.route || '/acceuil';
  }

  getPageTitle(): string {
    const url = this.router.url;
    if (url.includes('dashboard')) return 'Vue d\'ensemble';
    if (url.includes('vehicles')) return 'Ma Flotte';
    if (url.includes('add-vehicle')) return 'Ajouter un véhicule';
    if (url.includes('bookings')) return 'Réservations';
    if (url.includes('earnings')) return 'Analytique Revenus';
    if (url.includes('profile')) return 'Mon Profil';
    return 'Gestion Flotte';
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

  logout(): void {
    this.authService.logout();
  }

  onSearchInput(): void {
    const query = this.searchQuery.trim();
    this.searchService.setSearchTerm(query);

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (!query) {
      this.showSearchDropdown = false;
      this.searchResults = null;
      return;
    }

    this.searchTimeout = setTimeout(() => {
      this.performSearch(query);
    }, 300);
  }

  onSearchSubmit(): void {
    const query = this.searchQuery.trim();
    if (!query) return;
    this.searchService.setSearchTerm(query);
    if (this.hasSearchResults()) {
      if (this.searchResults.vehicles?.length) {
        this.navigateToResult('vehicle', this.searchResults.vehicles[0].id);
      } else if (this.searchResults.bookings?.length) {
        this.navigateToResult('booking', this.searchResults.bookings[0].id);
      } else if (this.searchResults.conversations?.length) {
        this.navigateToResult('conversation', this.searchResults.conversations[0].id);
      }
    } else {
      this.router.navigate(['/fleet/vehicles'], { queryParams: { search: query } });
    }
    this.showSearchDropdown = false;
  }

  performSearch(query: string): void {
    this.isSearching = true;
    this.showSearchDropdown = true;
    this.http.get<any>(`${environment.apiUrl}/fleet/search?q=${encodeURIComponent(query)}`).subscribe({
      next: (res) => {
        this.searchResults = res;
        this.isSearching = false;
      },
      error: (err) => {
        console.error('Error during global search:', err);
        this.isSearching = false;
        this.searchResults = {
          vehicles: [],
          bookings: [],
          users: [],
          conversations: [],
          payments: [],
          reviews: [],
          notifications: []
        };
      }
    });
  }

  hasSearchResults(): boolean {
    if (!this.searchResults) return false;
    return (
      (this.searchResults.vehicles && this.searchResults.vehicles.length > 0) ||
      (this.searchResults.bookings && this.searchResults.bookings.length > 0) ||
      (this.searchResults.users && this.searchResults.users.length > 0) ||
      (this.searchResults.conversations && this.searchResults.conversations.length > 0) ||
      (this.searchResults.payments && this.searchResults.payments.length > 0) ||
      (this.searchResults.reviews && this.searchResults.reviews.length > 0) ||
      (this.searchResults.notifications && this.searchResults.notifications.length > 0)
    );
  }

  navigateToResult(type: string, id?: number): void {
    this.showSearchDropdown = false;
    this.searchQuery = '';

    const q = this.searchQuery.trim();
    switch (type) {
      case 'vehicle':
        this.router.navigate(['/fleet/vehicles'], q ? { queryParams: { search: q } } : {});
        break;
      case 'booking':
        this.router.navigate(['/fleet/bookings'], q ? { queryParams: { search: q } } : {});
        break;
      case 'conversation':
        this.router.navigate(['/fleet/messages'], { queryParams: id ? { convId: id } : {} });
        break;
      case 'payment':
        this.router.navigate(['/fleet/earnings']);
        break;
      case 'review':
        this.router.navigate(['/fleet/reviews']);
        break;
      case 'notification':
        this.router.navigate(['/fleet/notifications']);
        break;
      default:
        break;
    }
  }

  closeSearchDropdown(): void {
    setTimeout(() => {
      this.showSearchDropdown = false;
    }, 200);
  }
}
