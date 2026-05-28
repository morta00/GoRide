import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guard qui protège les routes nécessitant une authentification.
 * Redirige vers /login si l'utilisateur n'est pas connecté.
 *
 * Utilisation dans le routing :
 *   { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] }
 *
 * Pour vérifier un rôle spécifique, ajoutez data.role :
 *   { path: 'driver', component: DriverComponent, canActivate: [AuthGuard], data: { role: 'ROLE_DRIVER' } }
 */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    // 1. Vérifier que l'utilisateur est connecté
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    // 2. Si un ou plusieurs rôles sont requis, vérifier
    const requiredRole = route.data['role'] as string;
    const requiredRoles = route.data['roles'] as string[];

    if (requiredRole || (requiredRoles && requiredRoles.length > 0)) {
      let hasRole = false;

      if (requiredRole) {
        hasRole = this.authService.hasRole(requiredRole);
      } else if (requiredRoles) {
        hasRole = requiredRoles.some(r => this.authService.hasRole(r));
      }

      if (!hasRole) {
        // L'utilisateur n'a pas du tout le rôle requis → retour à l'accueil
        console.warn('[AuthGuard] Access denied. User lacks required roles for route.');
        this.router.navigate(['/acceuil']);
        return false;
      }
    }

    // 3. Si aucun rôle actif n'est défini, l'auto-définir pour éviter les boucles
    const activeRole = this.authService.getActiveRole();
    if (!activeRole) {
      const user = this.authService.getCurrentUser();
      const userRoles: any[] = user?.roles || [];
      const normalize = (r: any): string => {
        const s = typeof r === 'string' ? r : (r.authority || r.name || String(r));
        return s.toUpperCase().startsWith('ROLE_') ? s.toUpperCase() : 'ROLE_' + s.toUpperCase();
      };
      const normalizedRoles = userRoles.map(normalize);

      if (normalizedRoles.length === 1) {
        // Un seul rôle → l'activer silencieusement
        this.authService.setActiveRole(normalizedRoles[0], false);
      } else if (normalizedRoles.length > 1) {
        // Plusieurs rôles → choisir le premier rôle autorisé pour cette route
        const requiredRoles2 = route.data['roles'] as string[] | undefined;
        const requiredRole2 = route.data['role'] as string | undefined;
        const allowed = requiredRoles2 || (requiredRole2 ? [requiredRole2] : []);
        const match = normalizedRoles.find(r => allowed.length === 0 || allowed.includes(r));
        if (match) {
          this.authService.setActiveRole(match, false);
        }
      }
    }

    return true;
  }
}
