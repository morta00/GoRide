import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../auth/auth.service';
import { RoleService } from '../../../auth/role.service';
import { SearchService } from '../../../services/search.service';
import { NotificationService, AppNotification } from '../../../services/notification.service';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent implements OnInit, OnDestroy {
  isUserDropdownOpen = false;
  isNotificationDropdownOpen = false;
  availableRoles: any[] = [];
  searchQuery = '';
  searchResults: { trips: any[]; rentals: any[]; conversations: any[] } | null = null;
  isSearching = false;
  showSearchDropdown = false;
  private searchTimeout: any;
  recentNotifications: AppNotification[] = [];
  unreadCount = 0;
  pageTitle = '';
  isTenantMode = false;
  private langSub?: Subscription;
  private routerSub?: Subscription;



  constructor(
    public authService: AuthService,
    private roleService: RoleService,
    private router: Router,
    private http: HttpClient,
    private searchService: SearchService,
    private notificationService: NotificationService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.loadUserRoles(); // Initial load
    this.roleService.activeRole$.subscribe(role => {
      this.isTenantMode = role === 'ROLE_CLIENT';
      this.loadUserRoles();
    });

    this.notificationService.notifications$.subscribe(n => this.recentNotifications = n);
    this.notificationService.unreadCount$.subscribe(c => this.unreadCount = c);
    this.notificationService.loadAll();

    this.updatePageTitle();
    this.langSub = this.translate.onLangChange.subscribe(() => this.updatePageTitle());
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.updatePageTitle();
        this.notificationService.loadAll();
      });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
    this.routerSub?.unsubscribe();
  }

  private updatePageTitle(): void {
    this.pageTitle = this.getPageTitle();
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
        // Fusionner les labels identiques (Client/Passager) si besoin
        .filter((role, index, self) =>
          index === self.findIndex((r) => (r.labelKey || r.label) === (role.labelKey || role.label))
        );
    }
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

  onNotificationClick(notif: AppNotification, event?: Event): void {
    event?.stopPropagation();
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

  switchRole(roleId: string, route: string): void {
    this.roleService.setActiveRole(roleId);
    this.isUserDropdownOpen = false;
  }

  navigateToHome(): void {
    const route = this.getHomeRoute();
    console.log('[Topbar] Navigating to home:', route);
    this.router.navigateByUrl(route);
    this.isUserDropdownOpen = false;
  }

  getHomeRoute(): string {
    const activeRole = this.roleService.getActiveRole();
    return this.roleService.getDashboardRoute(activeRole || 'ROLE_USER');
  }

  getPageTitle(): string {
    const url = this.router.url;
    if (url.includes('dashboard')) return this.translate.instant('CLIENT.TOPBAR.PAGE_DASHBOARD');
    if (url.includes('request-ride')) return this.translate.instant('CLIENT.TOPBAR.PAGE_REQUEST_RIDE');
    if (url.includes('available-rides') || url.includes('book-ride')) return this.translate.instant('CLIENT.MENU.BOOK_SEAT');
    if (url.includes('explore') || url.includes('rent-vehicle')) return this.translate.instant('CLIENT.TOPBAR.PAGE_RENT');
    if (url.includes('reservations')) return this.translate.instant('CLIENT.TOPBAR.PAGE_BOOKINGS');
    if (url.includes('history')) return this.translate.instant('CLIENT.TOPBAR.PAGE_HISTORY');
    if (url.includes('payments')) return this.translate.instant('CLIENT.TOPBAR.PAGE_PAYMENTS');
    return this.translate.instant('CLIENT.TOPBAR.CLIENT_SPACE');
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
    if (this.searchResults?.rentals?.length && this.isTenantMode) {
      this.openRental(this.searchResults.rentals[0]);
    } else if (this.searchResults?.trips?.length) {
      this.openTrip(this.searchResults.trips[0]);
    } else if (this.searchResults?.conversations?.length) {
      this.openConversation(this.searchResults.conversations[0]);
    } else if (this.isTenantMode) {
      this.router.navigate(['/client/reservations'], { queryParams: { search: q } });
    } else {
      this.router.navigate(['/client/reservations'], { queryParams: { search: q } });
    }
    this.showSearchDropdown = false;
  }

  performSearch(query: string): void {
    this.isSearching = true;
    this.showSearchDropdown = true;
    this.http.get<any>(`${environment.apiUrl}/client/search?q=${encodeURIComponent(query)}`).subscribe({
      next: (res) => {
        this.searchResults = {
          trips: res?.trips || [],
          rentals: res?.rentals || [],
          conversations: res?.conversations || []
        };
        this.isSearching = false;
      },
      error: () => {
        this.searchResults = { trips: [], rentals: [], conversations: [] };
        this.isSearching = false;
      }
    });
  }

  hasSearchResults(): boolean {
    if (!this.searchResults) return false;
    return (
      (this.searchResults.trips?.length || 0) > 0 ||
      (this.searchResults.rentals?.length || 0) > 0 ||
      (this.searchResults.conversations?.length || 0) > 0
    );
  }

  openTrip(item: any): void {
    this.showSearchDropdown = false;
    this.searchQuery = item.label || '';
    this.router.navigate(['/client/reservations'], { queryParams: { search: this.searchQuery } });
  }

  openRental(item: any): void {
    this.showSearchDropdown = false;
    this.searchQuery = item.label || '';
    this.router.navigate(['/client/reservations'], { queryParams: { search: this.searchQuery } });
  }

  openConversation(item: any): void {
    this.showSearchDropdown = false;
    this.router.navigate(['/client/conversations'], {
      queryParams: {
        conversationId: item.id,
        context: this.isTenantMode ? 'RENTAL' : 'RIDE'
      }
    });
  }

  closeSearchDropdown(): void {
    setTimeout(() => (this.showSearchDropdown = false), 200);
  }
}
