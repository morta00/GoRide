import { Component, ElementRef, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageOption, LanguageService } from '../i18n/language.service';
import { AuthService } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';
import { NotificationService, AppNotification } from '../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  private readonly mobileBreakpoint = 992;
  isNavbarOpen = false;
  isUserDropdownOpen = false;
  isNotificationDropdownOpen = false;
  
  notifications: AppNotification[] = [];
  unreadNotificationsCount = 0;
  private notificationSub?: Subscription;
  private unreadSub?: Subscription;

  availableRoles: any[] = [];


  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly languageService: LanguageService,
    public readonly authService: AuthService,
    public readonly roleService: RoleService,
    private readonly notificationService: NotificationService,
    private readonly router: Router
  ) {
    this.roleService.activeRole$.subscribe(() => {
      this.loadUserRoles();
    });

    // Souscrire aux notifications
    this.notificationSub = this.notificationService.notifications$.subscribe(n => {
      this.notifications = n;
    });

    this.unreadSub = this.notificationService.unreadCount$.subscribe(count => {
      this.unreadNotificationsCount = count;
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.notificationService.loadAll();
    }
  }

  ngOnDestroy(): void {
    this.notificationSub?.unsubscribe();
    this.unreadSub?.unsubscribe();
  }

  loadUserRoles(): void {
    const user = this.authService.getCurrentUser();
    if (user && user.roles) {
      const userRoles = [...user.roles];
      const definitions = this.roleService.getRoleDefinitions();
      
      this.availableRoles = userRoles
        .map((r: any) => {
          const roleName = typeof r === 'string' ? r : (r.authority || r.name || String(r));
          const normalizedRole = roleName.startsWith('ROLE_') ? roleName : 'ROLE_' + roleName;
          return definitions[normalizedRole] || { id: normalizedRole, label: roleName, icon: 'ion-ios-settings', route: '/acceuil', color: '#6c757d' };
        })
        // On fusionne les doublons de label (ex: Client)
        .filter((role, index, self) => 
          index === self.findIndex((r) => r.label === role.label)
        );
    }
  }

  toggleNotificationDropdown(event: Event): void {
    event.stopPropagation();
    this.isNotificationDropdownOpen = !this.isNotificationDropdownOpen;
    if (this.isNotificationDropdownOpen) {
      this.isUserDropdownOpen = false;
    }
  }

  markNotificationAsRead(notif: AppNotification, event: Event): void {
    event.stopPropagation();
    if (!notif.isRead) {
      this.notificationService.markAsRead(notif.id);
    }
    /*
    if (notif.targetUrl) {
      this.isNotificationDropdownOpen = false;
      this.router.navigateByUrl(notif.targetUrl);
    }
    */
  }

  markAllNotificationsAsRead(event: Event): void {
    event.stopPropagation();
    this.notificationService.markAllAsRead();
  }

  viewAllNotifications(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.closeAllMenus();
    
    let role = this.authService.getActiveRole();
    if (!role) {
      const user = this.authService.getCurrentUser();
      const userRoles: any[] = user?.roles || [];
      if (userRoles.length > 0) {
        const r: any = userRoles[0];
        role = typeof r === 'string' ? r : (r.authority || r.name || String(r));
      }
    }
    
    if (!role) {
      this.router.navigate(['/acceuil']);
      return;
    }

    const normalize = (r: any) => {
      const s = typeof r === 'string' ? r : (r.authority || r.name || String(r));
      return s.toUpperCase().startsWith('ROLE_') ? s.toUpperCase() : 'ROLE_' + s.toUpperCase();
    };

    const normalizedRole = normalize(role);
    switch (normalizedRole) {
      case 'ROLE_ADMIN':
        this.router.navigate(['/admin/notifications']);
        break;
      case 'ROLE_DRIVER':
        this.router.navigate(['/driver/notifications']);
        break;
      case 'ROLE_FLEET_OWNER':
        this.router.navigate(['/owner/notifications']);
        break;
      case 'ROLE_COMPANY':
        this.router.navigate(['/company/notifications']);
        break;
      case 'ROLE_CLIENT':
      case 'ROLE_USER':
      default:
        this.router.navigate(['/client/notifications']);
        break;
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'SUCCESS': return 'ion-ios-checkmark-circle';
      case 'WARNING': return 'ion-ios-warning';
      case 'DANGER': return 'ion-ios-close-circle';
      default: return 'ion-ios-information-circle';
    }
  }

  getNotificationColor(type: string): string {
    switch (type) {
      case 'SUCCESS': return '#10b981';
      case 'WARNING': return '#f59e0b';
      case 'DANGER': return '#ef4444';
      default: return '#2563eb';
    }
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    return date.toLocaleDateString();
  }

  toggleUserDropdown(event: Event): void {
    event.stopPropagation();
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
    if (this.isUserDropdownOpen) {
      this.isNotificationDropdownOpen = false;
      this.loadUserRoles(); 
    }
  }

  switchRole(roleId: string): void {
    this.roleService.setActiveRole(roleId);
    this.closeAllMenus();
  }

  navigateTo(route: string): void {
    this.closeAllMenus();
    const target = route.startsWith('/') ? route : '/' + route;
    this.router.navigate([target]);
  }

  handleMenuClick(item: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    this.closeAllMenus();

    if (item === 'dashboard') {
      let role = this.authService.getActiveRole();
      // Si pas de rôle actif, on le détermine depuis les rôles de l'utilisateur
      if (!role) {
        const user = this.authService.getCurrentUser();
        const userRoles: any[] = user?.roles || [];
        if (userRoles.length === 1) {
          const r: any = userRoles[0];
          role = typeof r === 'string' ? r : (r.authority || r.name || String(r));
          this.authService.setActiveRole(role as string, false);
        } else if (userRoles.length > 1) {
          this.router.navigate(['/role-selection']);
          return;
        }
      }
      const route = this.roleService.getDashboardRoute(role);
      this.router.navigate([route]);
    } else if (item === 'profile') {
      this.router.navigateByUrl(this.getProfileRoute());
    }
  }

  getProfileRoute(): string {
    const role = this.authService.getActiveRole();
    if (!role) return '/client/profile';

    const normalize = (r: any) => {
      const s = typeof r === 'string' ? r : (r.authority || r.name || String(r));
      return s.toUpperCase().startsWith('ROLE_') ? s.toUpperCase() : 'ROLE_' + s.toUpperCase();
    };

    const normalizedRole = normalize(role);

    switch (normalizedRole) {
      case 'ROLE_DRIVER': return '/driver/profile';
      case 'ROLE_FLEET_OWNER': return '/fleet/profile';
      case 'ROLE_ADMIN': return '/admin/profile';
      case 'ROLE_CLIENT':
      case 'ROLE_USER':
      default: return '/client/profile';
    }
  }

  get currentUser(): any {
    return this.authService.getCurrentUser();
  }

  get currentUserFullName(): string {
    const user = this.currentUser;
    return user ? `${user.firstName} ${user.lastName}` : '';
  }

  get activeRoleLabel(): string {
    const role = this.authService.getActiveRole();
    switch (role) {
      case 'ROLE_DRIVER': return 'Chauffeur';
      case 'ROLE_FLEET_OWNER': return 'Propriétaire';
      case 'ROLE_COMPANY': return 'Entreprise';
      case 'ROLE_ADMIN': return 'Admin';
      default: return 'Client';
    }
  }

  get dashboardRoute(): string {
    const role = this.authService.getActiveRole();
    if (!role) return '/acceuil';
    return this.roleService.getDashboardRoute(role);
  }

  get profileRoute(): string {
    const role = this.authService.getActiveRole();
    if (!role) return '/acceuil';
    const roleDef = this.roleService.getRoleDefinition(role);
    const dashboard = roleDef?.route || '/client/home';
    return dashboard.replace('/home', '/profile');
  }

  logout(): void {
    this.authService.logout();
    this.closeAllMenus();
  }

  get currentLanguageLabel(): string {
    return (this.languageService.current || 'fr').toUpperCase();
  }

  toggleLanguage(event: Event): void {
    event.stopPropagation();
    const next: LanguageOption['code'] = this.languageService.current === 'en' ? 'fr' : 'en';
    this.languageService.use(next);
  }

  toggleNavbar(event: Event): void {
    event.stopPropagation();
    this.isNavbarOpen = !this.isNavbarOpen;
  }

  closeAllMenus(): void {
    this.isNavbarOpen = false;
    this.isUserDropdownOpen = false;
    this.isNotificationDropdownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;

    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.closeAllMenus();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (window.innerWidth >= this.mobileBreakpoint) {
      this.isNavbarOpen = false;
    }
  }

}
