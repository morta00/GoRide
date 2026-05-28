import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, JwtResponse } from '../auth/auth.service';
import { RoleService } from '../auth/role.service';

interface RoleCard {
  roleKey: string;
  label: string;
  description: string;
  icon: string;
  gradient: string;
  route: string;
  emoji: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-role-selection',
  templateUrl: './role-selection.component.html',
  styleUrls: ['./role-selection.component.css']
})
export class RoleSelectionComponent implements OnInit {

  user: JwtResponse | null = null;
  availableRoles: RoleCard[] = [];

  private readonly roleConfig: Record<string, RoleCard> = {
    'ROLE_CLIENT': {
      roleKey: 'ROLE_CLIENT',
      label: 'Espace Location',
      description: 'Accédez à des véhicules disponibles à tout moment.',
      icon: 'ion-ios-briefcase',
      gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      route: '/client/home',
      emoji: '💎',
      imageUrl: 'assets/images/goride-fleet-owner-key.png'
    },
    'ROLE_USER': {
      roleKey: 'ROLE_USER',
      label: 'Espace Passager',
      description: 'Commandez un trajet instantané et voyagez en toute sérénité.',
      icon: 'ion-ios-navigate',
      gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      route: '/client/home',
      emoji: '✨',
      imageUrl: 'assets/images/roles/passenger.png'
    },
    'ROLE_DRIVER': {
      roleKey: 'ROLE_DRIVER',
      label: 'Chauffeur',
      description: 'Acceptez des courses, gérez vos revenus et votre planning.',
      icon: 'ion-ios-speedometer',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      route: '/driver/home',
      emoji: '🚕'
    },
    'ROLE_FLEET_OWNER': {
      roleKey: 'ROLE_FLEET_OWNER',
      label: 'Propriétaire de Flotte',
      description: 'Gérez votre flotte de véhicules et suivez vos performances en temps réel.',
      icon: 'ion-ios-people',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      route: '/fleet/home',
      emoji: '🚌'
    },
    'ROLE_COMPANY': {
      roleKey: 'ROLE_COMPANY',
      label: 'Entreprise',
      description: 'Gérez la mobilité de vos collaborateurs avec des outils professionnels.',
      icon: 'ion-ios-business',
      gradient: 'linear-gradient(135deg, #64748b 0%, #334155 100%)',
      route: '/company/home',
      emoji: '🏢'
    },
    'ROLE_ADMIN': {
      roleKey: 'ROLE_ADMIN',
      label: 'Administrateur',
      description: 'Accédez au panneau d\'administration de la plateforme GoRide.',
      icon: 'ion-ios-settings',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      route: '/admin/home',
      emoji: '⚙️'
    }
  };

  constructor(
    private authService: AuthService,
    private roleService: RoleService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    // Si un rôle est déjà actif, rediriger vers le dashboard (évite d'afficher la page par erreur)
    const activeRole = this.roleService.getActiveRole();
    if (activeRole) {
      this.router.navigate([this.roleService.getDashboardRoute(activeRole)]);
      return;
    }

    if (!this.user) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.availableRoles = (this.user.roles || [])
      .map(role => {
        const normalized = role.startsWith('ROLE_') ? role : 'ROLE_' + role;
        return this.roleConfig[normalized];
      })
      .filter(Boolean);

    // Si un seul rôle, rediriger directement
    if (this.availableRoles.length === 1) {
      this.selectRole(this.availableRoles[0]);
    }
  }

  get formattedFirstName(): string {
    const name = this.user?.firstName || this.user?.email?.split('@')[0] || 'Utilisateur';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  selectRole(card: RoleCard): void {
    this.roleService.setActiveRole(card.roleKey);
  }

  logout(): void {
    this.authService.logout();
  }
}
