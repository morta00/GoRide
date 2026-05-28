import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { RoleService } from './role.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private roleService: RoleService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    // 1. Vérifier si l'utilisateur est connecté
    if (!this.authService.isLoggedIn()) {
      return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    // 2. Récupérer le rôle actif
    const activeRole = this.roleService.getActiveRole();
    const user = this.authService.getCurrentUser();
    const userRoles = user?.roles || [];

    // 3. Si aucun rôle n'est actif, rediriger vers la sélection
    if (!activeRole) {
      if (userRoles.length > 1) {
        return this.router.createUrlTree(['/role-selection']);
      } else if (userRoles.length === 1) {
        this.roleService.setActiveRole(userRoles[0]);
        return true;
      } else {
        return this.router.createUrlTree(['/login']);
      }
    }

    // 4. Vérifier si le rôle actif est autorisé pour cette route
    // Les routes peuvent définir des rôles attendus via data: { roles: ['ROLE_ADMIN'] }
    const expectedRoles = route.data['roles'] as Array<string>;
    if (expectedRoles && !expectedRoles.includes(activeRole)) {
      // Rediriger vers le dashboard par défaut du rôle actif si non autorisé
      const defaultRoute = this.roleService.getDashboardRoute(activeRole);
      return this.router.createUrlTree([defaultRoute]);
    }

    return true;
  }
}
