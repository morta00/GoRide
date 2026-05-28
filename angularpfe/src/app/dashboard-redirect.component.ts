import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RoleService } from './auth/role.service';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-dashboard-redirect',
  template: `
    <div class="redirect-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; background: #f8fafc;">
      <div class="spinner" style="border: 4px solid rgba(0,0,0,0.1); border-left-color: #2563eb; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px;"></div>
      <div style="color: #64748b; font-size: 16px; font-weight: 500;">Redirection en cours...</div>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 10px;">Vérification de vos accès GoRide</p>
    </div>
    <style>
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  `
})
export class DashboardRedirectComponent implements OnInit {
  constructor(
    private router: Router,
    private roleService: RoleService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    console.log('[DashboardRedirect] Initializing...');
    this.performRedirect();
  }

  private performRedirect(): void {
    const user = this.authService.getCurrentUser();

    // Utilisateur non connecté → login
    if (!user) {
      console.warn('[DashboardRedirect] No user found, redirecting to /login');
      this.router.navigate(['/login']);
      return;
    }

    const roles: string[] = (user.roles || []).map((r: any) => {
      const roleStr = typeof r === 'string' ? r : (r.authority || r.name || String(r));
      return roleStr.toUpperCase().startsWith('ROLE_') ? roleStr.toUpperCase() : 'ROLE_' + roleStr.toUpperCase();
    });

    let activeRole = this.roleService.getActiveRole();

    // Si pas de rôle actif, on en définit un automatiquement
    if (!activeRole) {
      if (roles.length === 1) {
        activeRole = roles[0];
        this.roleService.setActiveRole(activeRole, false); // définir sans rediriger
        console.log(`[DashboardRedirect] Auto-set active role: ${activeRole}`);
      } else if (roles.length > 1) {
        // Plusieurs rôles → page de sélection
        console.log('[DashboardRedirect] Multiple roles, redirecting to /role-selection');
        this.router.navigate(['/role-selection']);
        return;
      } else {
        // Aucun rôle → accueil
        console.warn('[DashboardRedirect] No roles found, redirecting to /acceuil');
        this.router.navigate(['/acceuil']);
        return;
      }
    }

    const targetRoute = this.roleService.getDashboardRoute(activeRole);
    console.log(`[DashboardRedirect] Navigating to: ${targetRoute}`);
    this.router.navigate([targetRoute]);
  }
}
