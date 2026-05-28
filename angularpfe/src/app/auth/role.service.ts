import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';

export interface SidebarItem {
  /** i18n key (ngx-translate) */
  labelKey: string;
  icon: string;
  route: string;
  badge?: string;
  badgeClass?: string;
  condition?: string;
}

export interface SidebarSection {
  titleKey: string;
  items: SidebarItem[];
}

export interface RoleDefinition {
  id: string;
  label: string;
  labelKey: string;
  icon: string;
  route: string;
  color: string;
  action: string;
  actionKey: string;
}

const ACTIVE_ROLE_KEY = 'auth_active_role';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private roleDefinitions: Record<string, RoleDefinition> = {
    'ROLE_CLIENT': { id: 'ROLE_CLIENT', label: 'LOCATAIRE', labelKey: 'CLIENT.ROLES.TENANT', icon: 'ion-ios-car', route: '/client/dashboard', color: '#10b981', action: 'Louer un véhicule', actionKey: 'CLIENT.ROLES.TENANT_ACTION' },
    'ROLE_USER': { id: 'ROLE_USER', label: 'PASSAGER', labelKey: 'CLIENT.ROLES.PASSENGER', icon: 'ion-ios-navigate', route: '/client/dashboard', color: '#2563eb', action: 'Commander un trajet', actionKey: 'CLIENT.ROLES.PASSENGER_ACTION' },
    'ROLE_DRIVER': { id: 'ROLE_DRIVER', label: 'CHAUFFEUR', labelKey: 'DRIVER.MENU.ROLE', icon: 'ion-ios-speedometer', route: '/driver/dashboard', color: '#3b82f6', action: 'Prendre le volant', actionKey: 'DRIVER.MENU.ROLE_ACTION' },
    'ROLE_FLEET_OWNER': { id: 'ROLE_FLEET_OWNER', label: 'PROPRIÉTAIRE', labelKey: 'FLEET.MENU.ROLE', icon: 'ion-ios-people', route: '/owner/dashboard', color: '#f59e0b', action: 'Gérer ma flotte', actionKey: 'FLEET.MENU.ROLE_ACTION' },
    'ROLE_COMPANY': { id: 'ROLE_COMPANY', label: 'ENTREPRISE', labelKey: 'CLIENT.ROLES.COMPANY', icon: 'ion-ios-business', route: '/company/dashboard', color: '#4b5563', action: 'Gérer la mobilité', actionKey: 'CLIENT.ROLES.COMPANY_ACTION' },
    'ROLE_ADMIN': { id: 'ROLE_ADMIN', label: 'ADMINISTRATEUR', labelKey: 'CLIENT.ROLES.ADMIN', icon: 'ion-ios-settings', route: '/admin/dashboard', color: '#ef4444', action: 'Gérer la plateforme', actionKey: 'CLIENT.ROLES.ADMIN_ACTION' }
  };

  private sidebarMenus: Record<string, SidebarSection[]> = {
    'ROLE_CLIENT': [
      {
        titleKey: 'CLIENT.MENU.MAIN',
        items: [
          { labelKey: 'CLIENT.MENU.DASHBOARD', icon: 'ion-ios-apps', route: '/client/dashboard' },
          { labelKey: 'CLIENT.MENU.EXPLORE_VEHICLES', icon: 'ion-ios-search', route: '/client/explore' }
        ]
      },
      {
        titleKey: 'CLIENT.MENU.MY_BOOKINGS_SECTION',
        items: [
          { labelKey: 'CLIENT.MENU.MY_RESERVATIONS', icon: 'ion-ios-calendar', route: '/client/reservations' }
        ]
      },
      {
        titleKey: 'CLIENT.MENU.MESSAGES_SECTION',
        items: [
          { labelKey: 'CLIENT.MENU.CONVERSATIONS', icon: 'ion-ios-chatbubbles', route: '/client/conversations' },
          { labelKey: 'CLIENT.MENU.NOTIFICATIONS', icon: 'ion-ios-notifications', route: '/client/notifications' }
        ]
      },
      {
        titleKey: 'CLIENT.MENU.FAVORITES_SECTION',
        items: [
          { labelKey: 'CLIENT.MENU.FAVORITES', icon: 'ion-ios-heart', route: '/client/favorites' }
        ]
      },
      {
        titleKey: 'CLIENT.MENU.PAYMENTS_SECTION',
        items: [
          { labelKey: 'CLIENT.MENU.PAYMENTS', icon: 'ion-ios-card', route: '/client/payments' },
          { labelKey: 'CLIENT.MENU.HISTORY', icon: 'ion-ios-list', route: '/client/history' }
        ]
      },
      {
        titleKey: 'CLIENT.MENU.ACCOUNT_SECTION',
        items: [
          { labelKey: 'CLIENT.MENU.PROFILE', icon: 'ion-ios-person', route: '/client/profile' },
          { labelKey: 'CLIENT.MENU.SETTINGS', icon: 'ion-ios-settings', route: '/client/settings' }
        ]
      }
    ],
    'ROLE_USER': [
      {
        titleKey: 'CLIENT.MENU.MAIN',
        items: [
          { labelKey: 'CLIENT.MENU.DASHBOARD', icon: 'ion-ios-apps', route: '/client/dashboard' },
          { labelKey: 'CLIENT.MENU.REQUEST_RIDE', icon: 'ion-ios-paper-plane', route: '/client/request-ride' },
          { labelKey: 'CLIENT.MENU.BOOK_SEAT', icon: 'ion-ios-search', route: '/client/available-rides' },
          { labelKey: 'CLIENT.MENU.CURRENT_RIDE', icon: 'ion-ios-navigate', route: '/client/current-ride' }
        ]
      },
      {
        titleKey: 'CLIENT.MENU.MY_ACTIVITY',
        items: [
          { labelKey: 'CLIENT.MENU.MY_TRIPS', icon: 'ion-ios-list', route: '/client/reservations' },
          { labelKey: 'CLIENT.MENU.HISTORY', icon: 'ion-ios-time', route: '/client/history' },
          { labelKey: 'CLIENT.MENU.PENDING_REVIEWS', icon: 'ion-ios-star', route: '/client/reviews' }
        ]
      },
      {
        titleKey: 'CLIENT.MENU.COMMUNICATION',
        items: [
          { labelKey: 'CLIENT.MENU.CONVERSATIONS', icon: 'ion-ios-chatbubbles', route: '/client/conversations' },
          { labelKey: 'CLIENT.MENU.NOTIFICATIONS', icon: 'ion-ios-notifications', route: '/client/notifications' }
        ]
      },
      {
        titleKey: 'CLIENT.MENU.ACCOUNT_SECTION',
        items: [
          { labelKey: 'CLIENT.MENU.PAYMENTS', icon: 'ion-ios-card', route: '/client/payments' },
          { labelKey: 'CLIENT.MENU.PROFILE', icon: 'ion-ios-person', route: '/client/profile' },
          { labelKey: 'CLIENT.MENU.SETTINGS', icon: 'ion-ios-settings', route: '/client/settings' }
        ]
      }
    ],
    'ROLE_DRIVER': [
      {
        titleKey: 'DRIVER.MENU.MAIN',
        items: [
          { labelKey: 'CLIENT.MENU.DASHBOARD', icon: 'ion-ios-speedometer', route: '/driver/home' },
          { labelKey: 'DRIVER.MENU.REQUESTS', icon: 'ion-ios-mail', route: '/driver/trips', badge: 'COMMON.NEW_BADGE', badgeClass: 'badge-primary' }
        ]
      },
      {
        titleKey: 'DRIVER.MENU.RIDES',
        items: [
          { labelKey: 'DRIVER.MENU.MY_RIDES', icon: 'ion-ios-navigate', route: '/driver/history' },
          { labelKey: 'DRIVER.MENU.EARNINGS', icon: 'ion-ios-cash', route: '/driver/earnings' }
        ]
      },
      {
        titleKey: 'CLIENT.MENU.ACCOUNT_SECTION',
        items: [
          { labelKey: 'CLIENT.MENU.PROFILE', icon: 'ion-ios-person', route: '/driver/profile' }
        ]
      }
    ],
    'ROLE_FLEET_OWNER': [
      {
        titleKey: 'FLEET.MENU.FLEET',
        items: [
          { labelKey: 'CLIENT.MENU.DASHBOARD', icon: 'ion-ios-apps', route: '/fleet/dashboard' },
          { labelKey: 'FLEET.MENU.VEHICLES', icon: 'ion-ios-car', route: '/fleet/vehicles' },
          { labelKey: 'FLEET.MENU.BOOKINGS', icon: 'ion-ios-calendar', route: '/fleet/bookings' }
        ]
      },
      {
        titleKey: 'CLIENT.MENU.COMMUNICATION',
        items: [
          { labelKey: 'FLEET.MENU.MESSAGES', icon: 'ion-ios-mail', route: '/fleet/messages' },
          { labelKey: 'CLIENT.MENU.NOTIFICATIONS', icon: 'ion-ios-notifications', route: '/fleet/notifications' }
        ]
      },
      {
        titleKey: 'FLEET.MENU.ANALYTICS',
        items: [
          { labelKey: 'CLIENT.MENU.HISTORY', icon: 'ion-ios-time', route: '/fleet/history' },
          { labelKey: 'FLEET.MENU.REVENUE', icon: 'ion-ios-stats', route: '/fleet/earnings' },
          { labelKey: 'FLEET.MENU.REVIEWS', icon: 'ion-ios-star', route: '/fleet/reviews' }
        ]
      },
      {
        titleKey: 'CLIENT.MENU.ACCOUNT_SECTION',
        items: [
          { labelKey: 'CLIENT.MENU.PAYMENTS', icon: 'ion-ios-wallet', route: '/fleet/payments' },
          { labelKey: 'CLIENT.MENU.SETTINGS', icon: 'ion-ios-settings', route: '/fleet/settings' },
          { labelKey: 'CLIENT.MENU.PROFILE', icon: 'ion-ios-person', route: '/fleet/profile' }
        ]
      }
    ]
  };

  private hasActiveRideSubject = new BehaviorSubject<boolean>(false);
  readonly hasActiveRide$ = this.hasActiveRideSubject.asObservable();

  private activeRoleSubject = new BehaviorSubject<string | null>(localStorage.getItem(ACTIVE_ROLE_KEY));
  readonly activeRole$ = this.activeRoleSubject.asObservable();

  constructor(private router: Router) {}

  /**
   * Met à jour l'état de la course active.
   */
  setActiveRideState(active: boolean): void {
    this.hasActiveRideSubject.next(active);
  }

  /**
   * Vérifie si une course est actuellement active.
   */
  hasActiveRide(): boolean {
    return this.hasActiveRideSubject.value;
  }

  /**
   * Retourne le rôle actif actuel.
   */
  getActiveRole(): string | null {
    return this.activeRoleSubject.value;
  }

  /** Réinitialise le rôle actif (déconnexion / changement de compte). */
  clearActiveRole(): void {
    localStorage.removeItem(ACTIVE_ROLE_KEY);
    this.activeRoleSubject.next(null);
  }

  /**
   * Définit le rôle actif et redirige vers son dashboard si nécessaire.
   */
  setActiveRole(role: string, redirect: boolean = true): void {
    localStorage.setItem(ACTIVE_ROLE_KEY, role);
    this.activeRoleSubject.next(role);
    
    if (redirect) {
      const route = this.getDashboardRoute(role);
      this.router.navigateByUrl(route);
    }
  }

  /**
   * Retourne la route du dashboard pour un rôle donné.
   */
  getDashboardRoute(role: string | null | undefined): string {
    if (!role || role.trim() === '') {
      console.warn('[RoleService] getDashboardRoute called with invalid role:', role, '-> fallback to /client/dashboard');
      return '/client/dashboard';
    }

    const normalizedRole = role.toUpperCase().startsWith('ROLE_') ? role.toUpperCase() : 'ROLE_' + role.toUpperCase();
    const route = this.roleDefinitions[normalizedRole]?.route;

    if (route) {
      console.log(`[RoleService] getDashboardRoute resolved role '${normalizedRole}' to route:`, route);
      return route;
    } else {
      console.warn(`[RoleService] getDashboardRoute could not find role '${normalizedRole}' -> fallback to /client/dashboard`);
      return '/client/dashboard';
    }
  }

  /**
   * Retourne les données complètes du rôle actif.
   */
  getActiveRoleData(): RoleDefinition {
    const activeRole = this.getActiveRole() || 'ROLE_USER';
    const normalizedRole = activeRole.startsWith('ROLE_') ? activeRole : 'ROLE_' + activeRole;
    return this.roleDefinitions[normalizedRole] || this.roleDefinitions['ROLE_USER'];
  }

  /**
   * Retourne toutes les définitions de rôles.
   */
  getRoleDefinitions(): Record<string, RoleDefinition> {
    return this.roleDefinitions;
  }

  /**
   * Retourne la définition d'un rôle spécifique.
   */
  getRoleDefinition(role: string): RoleDefinition | undefined {
    const normalizedRole = role.toUpperCase().startsWith('ROLE_') ? role.toUpperCase() : 'ROLE_' + role.toUpperCase();
    return this.roleDefinitions[normalizedRole];
  }

  /**
   * Retourne les sections du menu sidebar selon le rôle actif.
   */
  getSidebarMenu(role: string): SidebarSection[] {
    const normalizedRole = role.startsWith('ROLE_') ? role : 'ROLE_' + role;
    return this.sidebarMenus[normalizedRole] || this.sidebarMenus['ROLE_USER'];
  }

  /**
   * Vérifie si l'utilisateur a un rôle spécifique parmi une liste.
   */
  hasAnyRole(userRoles: string[], allowedRoles: string[]): boolean {
    return userRoles.some(role => allowedRoles.includes(role));
  }
}
