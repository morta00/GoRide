import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { RoleService } from '../../../auth/role.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent implements OnInit {
  isUserDropdownOpen = false;
  availableRoles: any[] = [];



  constructor(
    public authService: AuthService,
    private roleService: RoleService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadUserRoles(); // Initial load
    this.roleService.activeRole$.subscribe(() => {
      this.loadUserRoles();
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
    return this.roleService.getDashboardRoute(activeRole || 'ROLE_ADMIN');
  }

  getPageTitle(): string {
    const url = this.router.url;
    if (url.includes('dashboard')) return 'Espace Administrateur';
    if (url.includes('users')) return 'Gestion Utilisateurs';
    if (url.includes('validations')) return 'Validations en attente';
    if (url.includes('vehicles')) return 'Gestion Véhicules';
    if (url.includes('services')) return 'Demandes & Services';
    if (url.includes('payments')) return 'Paiements & Factures';
    if (url.includes('revenue')) return 'Revenus plateforme';
    if (url.includes('notifications')) return 'Notifications';
    if (url.includes('support')) return 'Support';
    if (url.includes('complaints')) return 'Réclamations';
    if (url.includes('reviews')) return 'Avis & Évaluations';
    if (url.includes('reports')) return 'Signalements';
    if (url.includes('settings')) return 'Paramètres plateforme';
    if (url.includes('profile')) return 'Profil Administrateur';
    return 'Espace Administrateur';
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
}
