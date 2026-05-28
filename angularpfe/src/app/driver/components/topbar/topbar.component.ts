import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DriverService } from '../../services/driver.service';
import { DriverProfile } from '../../models/driver.models';
import { AuthService } from '../../../auth/auth.service';
import { SearchService } from '../../../services/search.service';
import { RoleService } from '../../../auth/role.service';
import { NotificationService, AppNotification } from '../../../services/notification.service';
import { DriverTripService, DriverTrip } from '../../services/driver-trip.service';
import { DriverRequestService, DriverRequest } from '../../services/driver-request.service';
import { forkJoin, Subscription } from 'rxjs';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent implements OnInit, OnDestroy {
  profile: DriverProfile | null = null;
  isOnline = true;
  availableRoles: any[] = [];
  isUserDropdownOpen = false;
  isNotificationDropdownOpen = false;
  recentNotifications: AppNotification[] = [];
  unreadCount = 0;

  searchQuery = '';
  showSearchDropdown = false;
  isSearching = false;
  tripResults: DriverTrip[] = [];
  requestResults: DriverRequest[] = [];
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private notifSub?: Subscription;
  private unreadSub?: Subscription;
  private routerSub?: Subscription;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private router: Router,
    private driverService: DriverService,
    private roleService: RoleService,
    public authService: AuthService,
    private searchService: SearchService,
    private notificationService: NotificationService,
    private tripService: DriverTripService,
    private requestService: DriverRequestService
  ) {}

  ngOnInit(): void {
    this.driverService.getProfile().subscribe(p => (this.profile = p));
    this.driverService.isOnline$.subscribe(status => (this.isOnline = status));

    this.loadUserRoles();
    this.roleService.activeRole$.subscribe(() => this.loadUserRoles());

    this.notifSub = this.notificationService.notifications$.subscribe(
      n => (this.recentNotifications = n.slice(0, 8))
    );
    this.unreadSub = this.notificationService.unreadCount$.subscribe(c => (this.unreadCount = c));

    this.notificationService.loadAll();
    this.refreshInterval = setInterval(() => this.notificationService.loadAll(), 15000);

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.notificationService.loadAll());
  }

  ngOnDestroy(): void {
    this.notifSub?.unsubscribe();
    this.unreadSub?.unsubscribe();
    this.routerSub?.unsubscribe();
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  getPageTitle(): string {
    const url = this.router.url;
    if (url.includes('/dashboard')) return 'Tableau de bord';
    if (url.includes('/trips')) return 'Mes trajets';
    if (url.includes('/requests')) return 'Demandes reçues';
    if (url.includes('/create-trip')) return 'Proposer un trajet';
    if (url.includes('/my-vehicle')) return 'Mon véhicule';
    if (url.includes('/partner-vehicles')) return 'Véhicules partenaires';
    if (url.includes('/rentals')) return 'Mes locations';
    if (url.includes('/earnings')) return 'Mes revenus';
    if (url.includes('/payments')) return 'Paiements';
    if (url.includes('/history')) return 'Historique';
    if (url.includes('/conversations')) return 'Conversations';
    if (url.includes('/notifications')) return 'Notifications';
    if (url.includes('/profile')) return 'Mon profil';
    if (url.includes('/settings')) return 'Paramètres';
    return 'Espace Chauffeur';
  }

  onSearchInput(): void {
    const query = this.searchQuery.trim();
    this.searchService.setSearchTerm(query);

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (!query) {
      this.showSearchDropdown = false;
      this.tripResults = [];
      this.requestResults = [];
      return;
    }

    this.searchTimeout = setTimeout(() => this.performSearch(query), 280);
  }

  onSearchFocus(): void {
    if (this.searchQuery.trim()) {
      this.performSearch(this.searchQuery.trim());
    }
  }

  onSearchSubmit(): void {
    const query = this.searchQuery.trim();
    if (!query) return;
    this.searchService.setSearchTerm(query);
    if (this.tripResults.length > this.requestResults.length) {
      this.goToTrips(query);
    } else {
      this.goToRequests(query);
    }
    this.showSearchDropdown = false;
  }

  performSearch(query: string): void {
    const q = query.toLowerCase();
    this.isSearching = true;
    this.showSearchDropdown = true;

    forkJoin({
      trips: this.tripService.getTrips(),
      requests: this.requestService.getRequests()
    }).subscribe({
      next: ({ trips, requests }) => {
        this.tripResults = (trips || []).filter(t => this.matchesTrip(t, q)).slice(0, 5);
        this.requestResults = (requests || []).filter(r => this.matchesRequest(r, q)).slice(0, 5);
        this.isSearching = false;
      },
      error: () => {
        this.tripResults = [];
        this.requestResults = [];
        this.isSearching = false;
      }
    });
  }

  hasSearchResults(): boolean {
    return this.tripResults.length > 0 || this.requestResults.length > 0;
  }

  private matchesTrip(t: DriverTrip, q: string): boolean {
    return (
      (t.departure || '').toLowerCase().includes(q) ||
      (t.destination || '').toLowerCase().includes(q) ||
      (t.vehicleName || '').toLowerCase().includes(q) ||
      (t.clientName || '').toLowerCase().includes(q) ||
      String(t.id).includes(q)
    );
  }

  private matchesRequest(r: DriverRequest, q: string): boolean {
    return (
      (r.clientName || '').toLowerCase().includes(q) ||
      (r.from || '').toLowerCase().includes(q) ||
      (r.to || '').toLowerCase().includes(q) ||
      (r.vehicleType || '').toLowerCase().includes(q) ||
      String(r.id).includes(q)
    );
  }

  openTrip(trip: DriverTrip): void {
    this.showSearchDropdown = false;
    this.searchQuery = `${trip.departure} ${trip.destination}`.trim();
    this.searchService.setSearchTerm(this.searchQuery);
    this.router.navigate(['/driver/trips'], { queryParams: { search: this.searchQuery } });
  }

  openRequest(req: DriverRequest): void {
    this.showSearchDropdown = false;
    this.searchQuery = req.clientName || req.from || '';
    this.searchService.setSearchTerm(this.searchQuery);
    this.router.navigate(['/driver/requests'], {
      queryParams: { search: this.searchQuery, requestId: req.id }
    });
  }

  goToTrips(query?: string): void {
    const q = query || this.searchQuery.trim();
    this.showSearchDropdown = false;
    this.searchService.setSearchTerm(q);
    this.router.navigate(['/driver/trips'], { queryParams: q ? { search: q } : {} });
  }

  goToRequests(query?: string): void {
    const q = query || this.searchQuery.trim();
    this.showSearchDropdown = false;
    this.searchService.setSearchTerm(q);
    this.router.navigate(['/driver/requests'], { queryParams: q ? { search: q } : {} });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.tripResults = [];
    this.requestResults = [];
    this.showSearchDropdown = false;
    this.searchService.setSearchTerm('');
  }

  closeSearchDropdown(): void {
    setTimeout(() => {
      this.showSearchDropdown = false;
    }, 200);
  }

  loadUserRoles(): void {
    const user = this.authService.getCurrentUser();
    if (user && user.roles) {
      const definitions = this.roleService.getRoleDefinitions();
      this.availableRoles = user.roles
        .map((r: any) => {
          const roleStr = typeof r === 'string' ? r : r.name || r.authority || '';
          const normalizedRole = roleStr.startsWith('ROLE_') ? roleStr : 'ROLE_' + roleStr;
          return definitions[normalizedRole];
        })
        .filter(role => !!role)
        .filter((role, index, self) => index === self.findIndex(r => r.label === role.label));
    }
  }

  switchRole(roleId: string, _route: string): void {
    this.roleService.setActiveRole(roleId);
    this.isUserDropdownOpen = false;
  }

  get currentUser(): any {
    return this.authService.getCurrentUser();
  }

  get currentUserFullName(): string {
    const user = this.currentUser;
    return user ? `${user.firstName} ${user.lastName}` : '';
  }

  toggleDropdown(): void {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
    if (this.isUserDropdownOpen) this.isNotificationDropdownOpen = false;
  }

  toggleNotifications(): void {
    this.isNotificationDropdownOpen = !this.isNotificationDropdownOpen;
    if (this.isNotificationDropdownOpen) {
      this.isUserDropdownOpen = false;
      this.notificationService.loadAll();
    }
  }

  onNotificationClick(notif: AppNotification): void {
    this.markAsRead(notif.id);
    const url = (notif.targetUrl || '').trim();
    if (url) {
      this.isNotificationDropdownOpen = false;
      const path = url.startsWith('/') ? url : `/${url}`;
      this.router.navigateByUrl(path);
    }
  }

  markAsRead(id: number): void {
    this.notificationService.markAsRead(id);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  toggleStatus(): void {
    this.driverService.toggleOnlineStatus().subscribe();
  }

  getSettingsRouteByRole(role: string | null): string {
    if (!role) return '/acceuil';
    switch (role) {
      case 'ROLE_ADMIN':
        return '/admin/settings';
      case 'ROLE_CLIENT':
      case 'ROLE_USER':
        return '/client/settings';
      case 'ROLE_DRIVER':
        return '/driver/settings';
      case 'ROLE_FLEET_OWNER':
        return '/owner/settings';
      case 'ROLE_COMPANY':
        return '/company/settings';
      default:
        return '/acceuil';
    }
  }

  getProfileRouteByRole(role: string | null): string {
    if (!role) return '/acceuil';
    switch (role) {
      case 'ROLE_ADMIN':
        return '/admin/profile';
      case 'ROLE_CLIENT':
      case 'ROLE_USER':
        return '/client/profile';
      case 'ROLE_DRIVER':
        return '/driver/profile';
      case 'ROLE_FLEET_OWNER':
        return '/owner/profile';
      case 'ROLE_COMPANY':
        return '/company/profile';
      default:
        return '/acceuil';
    }
  }

  goToSettings(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isUserDropdownOpen = false;
    this.router.navigate([this.getSettingsRouteByRole(this.authService.getActiveRole())]);
  }

  goToProfile(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isUserDropdownOpen = false;
    this.router.navigate([this.getProfileRouteByRole(this.authService.getActiveRole())]);
  }

  goToHome(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.isUserDropdownOpen = false;
    this.router.navigate(['/acceuil']);
  }

  logout(): void {
    this.authService.logout();
  }
}
