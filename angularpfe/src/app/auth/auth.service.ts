import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { RoleService } from './role.service';

// =============================================
// Interfaces (DTOs côté Angular)
// =============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  roles: string[]; // CLIENT, DRIVER, FLEET_OWNER, COMPANY
  city?: string;
  hasFleet?: boolean;
}

export interface JwtResponse {
  token: string;
  type: string;
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  secondaryEmail?: string;
  roles: string[];
  photoUrl?: string;
  phone?: string;
  address?: string;
  gender?: string;
  preferredLanguage?: string;
  city?: string;
  birthDate?: string;
  lastPasswordUpdate?: string;
  theme?: string;

  twoFactorEnabled?: boolean;
}

export interface MessageResponse {
  message: string;
}

// =============================================
// Service d'authentification
// =============================================

import { environment } from 'src/environments/environment';

// ... (interfaces)

const API_URL = `${environment.apiUrl}/auth/`;
const USERS_API_URL = `${environment.apiUrl}/users/`;
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const ACTIVE_ROLE_KEY = 'auth_active_role';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  readonly isLoggedIn$ = this.isLoggedInSubject.asObservable();

  private userSubject = new BehaviorSubject<JwtResponse | null>(this.getCurrentUser());
  readonly user$ = this.userSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private roleService: RoleService
  ) { }

  getActiveRoleData(): any {
    return this.roleService.getActiveRoleData();
  }

  /**
   * Connexion — envoie email/password au backend et stocke le JWT reçu.
   */
  login(request: LoginRequest): Observable<any> {
    return this.http.post<any>(API_URL + 'login', request).pipe(
      tap(response => {
        if (response.twoFactorRequired) {
          return; // 2FA is required, don't store token yet
        }

        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response));

        if (response.roles && response.roles.length > 0) {
          if (response.roles.length === 1) {
            this.roleService.setActiveRole(response.roles[0], false);
          }
        }

        this.userSubject.next(response);
        this.isLoggedInSubject.next(true);
      })
    );
  }

  /**
   * Logique de redirection centralisée après connexion ou inscription
   */
  handleAuthSuccess(returnUrl?: string | null): void {
    const user = this.getCurrentUser();
    const roles = user?.roles || [];

    // Normaliser les rôles pour comparaison
    const normalizeRole = (r: any): string => {
      const s = typeof r === 'string' ? r : (r.authority || r.name || String(r));
      return s.toUpperCase().startsWith('ROLE_') ? s.toUpperCase() : 'ROLE_' + s.toUpperCase();
    };
    const normalizedRoles = roles.map(normalizeRole);

    // Vérifier que le returnUrl est valide (pas login/signup/role-selection)
    const isValidReturnUrl = (url: string | null | undefined): boolean => {
      if (!url) return false;
      const blocked = ['/login', '/signup', '/role-selection', '/acceuil'];
      return !blocked.some(b => url.includes(b));
    };

    const isReturnUrlAllowedForRoles = (url: string): boolean => {
      if (url.includes('/client')) {
        return normalizedRoles.some(r => r === 'ROLE_CLIENT' || r === 'ROLE_USER');
      }
      if (url.includes('/fleet') || url.includes('/owner')) {
        return normalizedRoles.includes('ROLE_FLEET_OWNER');
      }
      if (url.includes('/driver')) {
        return normalizedRoles.includes('ROLE_DRIVER');
      }
      if (url.includes('/company')) {
        return normalizedRoles.includes('ROLE_COMPANY');
      }
      if (url.includes('/admin')) {
        return normalizedRoles.includes('ROLE_ADMIN');
      }
      return true;
    };

    if (returnUrl && isValidReturnUrl(returnUrl) && isReturnUrlAllowedForRoles(returnUrl)) {
      this.router.navigateByUrl(returnUrl);
      return;
    }

    // Plusieurs rôles → page de sélection
    if (normalizedRoles.length > 1) {
      this.router.navigate(['/role-selection']);
      return;
    }

    // Un seul rôle (ou fallback) → dashboard du compte connecté
    const activeRole = this.resolveActiveRoleForUser(normalizedRoles);
    if (activeRole) {
      this.roleService.setActiveRole(activeRole, false);
      this.router.navigateByUrl(this.roleService.getDashboardRoute(activeRole));
      return;
    }

    this.router.navigate(['/acceuil']);
  }

  /**
   * Inscription — crée un compte avec le rôle spécifié.
   */
  signup(request: SignupRequest): Observable<MessageResponse & { emailSent?: boolean; emailHint?: string }> {
    const payload = {
      firstName: request.firstName?.trim(),
      lastName: request.lastName?.trim(),
      email: (request.email ?? '').trim().toLowerCase(),
      password: request.password,
      confirmPassword: request.confirmPassword,
      phone: request.phone?.trim(),
      roles: request.roles?.length ? request.roles : ['CLIENT'],
      city: request.city,
      hasFleet: request.hasFleet ?? false
    };
    return this.http.post<MessageResponse & { emailSent?: boolean; emailHint?: string }>(
      API_URL + 'signup',
      payload
    );
  }

  /**
   * Déconnexion — supprime le token et les données utilisateur.
   */
  logout(): void {
    this.clearSession();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  /** Supprime la session sans redirection (ex. intercepteur 401). */
  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.roleService.clearActiveRole();
    this.isLoggedInSubject.next(false);
    this.userSubject.next(null);
  }

  /** Rôle actif adapté au compte qui vient de se connecter. */
  private resolveActiveRoleForUser(normalizedRoles: string[]): string | null {
    if (normalizedRoles.length === 0) return null;
    const priority = [
      'ROLE_FLEET_OWNER',
      'ROLE_COMPANY',
      'ROLE_DRIVER',
      'ROLE_ADMIN',
      'ROLE_CLIENT',
      'ROLE_USER'
    ];
    for (const role of priority) {
      if (normalizedRoles.includes(role)) return role;
    }
    return normalizedRoles[0];
  }

  /**
   * Retourne le token JWT stocké (ou null).
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Retourne les infos de l'utilisateur connecté.
   */
  getCurrentUser(): JwtResponse | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('[AuthService] Error parsing user from localStorage', e);
      return null;
    }
  }

  /**
   * Vérifie si l'utilisateur possède un rôle donné.
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    if (!user || !user.roles) return false;
    
    const normalize = (r: any) => {
      const roleStr = typeof r === 'string' ? r : (r.authority || r.name || String(r));
      return roleStr.toUpperCase().startsWith('ROLE_') ? roleStr.toUpperCase() : 'ROLE_' + roleStr.toUpperCase();
    };
    
    const targetRole = normalize(role);
    
    return user.roles.some((r: any) => normalize(r) === targetRole);
  }

  /**
   * Vérifie si l'utilisateur est connecté (token présent).
   */
  isLoggedIn(): boolean {
    return this.hasToken();
  }

  /**
   * Définit le rôle actif actuel.
   */
  setActiveRole(role: string, redirect: boolean = false): void {
    this.roleService.setActiveRole(role, redirect);
    this.userSubject.next(this.getCurrentUser());
  }

  getActiveRole(): string | null {
    return this.roleService.getActiveRole();
  }

  /**
   * Ajoute un rôle à l'utilisateur actuel et met à jour la session.
   */
  addRole(role: string): Observable<JwtResponse> {
    return this.http.post<JwtResponse>(API_URL + 'add-role', { role }).pipe(
      tap(response => {
        this.updateSession(response);
      })
    );
  }

  /**
   * Supprime un rôle de l'utilisateur actuel et met à jour la session.
   */
  removeRole(role: string): Observable<JwtResponse> {
    return this.http.post<JwtResponse>(API_URL + 'remove-role', { role }).pipe(
      tap(response => {
        this.updateSession(response);
      })
    );
  }

  /**
   * Met à jour le token et les données utilisateur après une modification de rôle.
   */
  private updateSession(response: JwtResponse): void {
    const currentUser = this.getCurrentUser();
    if (currentUser && response.token) {
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response));
      this.userSubject.next(response);
      console.log('[AuthService] Session mise à jour avec les nouveaux rôles:', response.roles);
    }
  }

  /**
   * Récupère le profil complet depuis le backend.
   */
  getProfile(): Observable<JwtResponse> {
    return this.http.get<JwtResponse>(USERS_API_URL + 'me').pipe(
      tap(user => {
        this.updateUser(this.normalizeProfileUser(user));
      })
    );
  }

  /**
   * Met à jour le profil côté backend.
   */
  updateProfile(data: any): Observable<JwtResponse> {
    const payload: Record<string, unknown> = {};
    const allowed = ['firstName', 'lastName', 'phone', 'address', 'gender', 'birthDate', 'photoUrl', 'city', 'language'];
    for (const key of allowed) {
      if (data[key] != null && data[key] !== '') {
        payload[key] = data[key];
      }
    }
    if (data.preferredLanguage != null && payload['language'] == null) {
      payload['language'] = String(data.preferredLanguage).toLowerCase();
    }
    if (typeof payload['phone'] === 'string' && !(payload['phone'] as string).trim()) {
      delete payload['phone'];
    }
    return this.http.patch<JwtResponse>(USERS_API_URL + 'me', payload).pipe(
      tap(user => {
        this.updateUser(this.normalizeProfileUser(user));
      })
    );
  }

  /** Map API user fields (language) to UI model (preferredLanguage). */
  private normalizeProfileUser(user: any): JwtResponse {
    const lang = user?.preferredLanguage || user?.language || 'FR';
    return {
      ...user,
      preferredLanguage: String(lang).toUpperCase()
    };
  }

  /**
   * Met à jour les infos de l'utilisateur dans le localStorage et notifie les composants.
   */
  updateUser(userData: any): void {
    const user = this.getCurrentUser();
    if (user) {
      // Fusionner les données pour ne pas perdre le token
      const updatedUser = { ...user, ...userData };
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      this.userSubject.next(updatedUser);
    }
  }

  /**
   * Met à jour la photo de profil localement et notifie les composants.
   */
  updateUserPhoto(photoUrl: string): void {
    const user = this.getCurrentUser();
    if (user) {
      user.photoUrl = photoUrl;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      this.userSubject.next(user);
    }
  }

  /**
   * Demander un lien de réinitialisation de mot de passe.
   */
  forgotPassword(email: string): Observable<MessageResponse & { resetLink?: string; emailSent?: boolean; emailHint?: string }> {
    const normalized = (email ?? '').trim().toLowerCase();
    return this.http.post<MessageResponse & { resetLink?: string }>(API_URL + 'forgot-password', { email: normalized });
  }

  /**
   * Réinitialiser le mot de passe avec le token.
   */
  resetPassword(request: { token: string | null, newPassword: string }): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(API_URL + 'reset-password', request);
  }

  changePassword(data: any): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(USERS_API_URL + 'me/password', data);
  }

  // =============================================
  // 2FA Methods
  // =============================================

  setup2FA(): Observable<{ secret: string, qrCodeUrl: string }> {
    return this.http.post<{ secret: string, qrCodeUrl: string }>(API_URL + '2fa/setup', {});
  }

  verify2FA(code: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(API_URL + '2fa/verify', { code });
  }

  disable2FA(): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(API_URL + '2fa/disable', {});
  }

  verifyLogin2FA(email: string, code: string): Observable<JwtResponse> {
    return this.http.post<JwtResponse>(API_URL + 'login/verify-2fa', { email, code }).pipe(
      tap(response => {
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response));

        if (response.roles && response.roles.length > 0) {
          if (response.roles.length === 1) {
            this.roleService.setActiveRole(response.roles[0], false);
          }
        }

        this.userSubject.next(response);
        this.isLoggedInSubject.next(true);
      })
    );
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Retourne les initiales de l'utilisateur (ex: IO pour Ichraf Ouhichi).
   */
  getUserInitials(): string {
    const user = this.getCurrentUser();
    if (!user) return '?';
    const first = user.firstName ? user.firstName.charAt(0).toUpperCase() : '';
    const last = user.lastName ? user.lastName.charAt(0).toUpperCase() : '';
    return (first + last) || user.email.charAt(0).toUpperCase();
  }
}
