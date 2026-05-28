import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { RoleService } from '../../auth/role.service';

interface RoleOption {
  id: string;
  label: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-role-switcher',
  templateUrl: './role-switcher.component.html',
  styleUrls: ['./role-switcher.component.css']
})
export class RoleSwitcherComponent implements OnInit {
  
  availableRoles: RoleOption[] = [];
  activeRole: RoleOption | null = null;
  showDropdown = false;

  private roleDefinitions: Record<string, RoleOption> = {
    'ROLE_CLIENT': {
      id: 'ROLE_CLIENT',
      label: 'Client',
      icon: 'ion-ios-car',
      route: '/client/home',
      color: '#10b981'
    },
    'ROLE_USER': {
      id: 'ROLE_USER',
      label: 'Passager',
      icon: 'ion-ios-navigate',
      route: '/client/home',
      color: '#3b82f6'
    },
    'ROLE_DRIVER': {
      id: 'ROLE_DRIVER',
      label: 'Chauffeur',
      icon: 'ion-ios-car',
      route: '/driver/home',
      color: '#2563eb'
    },
    'ROLE_FLEET_OWNER': {
      id: 'ROLE_FLEET_OWNER',
      label: 'Propriétaire',
      icon: 'ion-ios-people',
      route: '/fleet/home',
      color: '#f59e0b'
    },
    'ROLE_COMPANY': {
      id: 'ROLE_COMPANY',
      label: 'Entreprise',
      icon: 'ion-ios-briefcase',
      route: '/company/home',
      color: '#4b5563'
    },
    'ROLE_ADMIN': {
      id: 'ROLE_ADMIN',
      label: 'Admin',
      icon: 'ion-ios-settings',
      route: '/admin/home',
      color: '#ef4444'
    }
  };

  constructor(
    private authService: AuthService,
    private roleService: RoleService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.roleService.activeRole$.subscribe((roleId: string | null) => {
      if (roleId) {
        this.activeRole = this.roleDefinitions[roleId] || this.roleDefinitions['ROLE_CLIENT'];
      }
      this.loadUserRoles();
    });
  }

  loadUserRoles(): void {
    const user = this.authService.getCurrentUser();
    if (user && user.roles) {
      this.availableRoles = user.roles
        .map(roleName => this.roleDefinitions[roleName])
        .filter(role => !!role);
    }
  }

  switchRole(role: RoleOption): void {
    if (this.activeRole?.id === role.id) {
      this.showDropdown = false;
      return;
    }

    this.roleService.setActiveRole(role.id);
    this.showDropdown = false;
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }
}
