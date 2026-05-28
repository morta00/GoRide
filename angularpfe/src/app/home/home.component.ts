import { Component, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { RoleDefinition, RoleService } from '../auth/role.service';
import { Subscription } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ContactService } from '../services/contact.service';
import { TranslateService } from '@ngx-translate/core';

declare var $: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  trajetsCount: number = 0;
  usersCount: number = 0;
  ratingCount: string = '0';
  statsAnimated: boolean = false;
  selectedSubject = '';
  selectedSubjectKey = 'HOME.CONTACT.SUBJECT_PLACEHOLDER';
  isDropdownOpen: boolean = false;
  contactSubjects: { key: string; icon: string }[] = [];
  
  // Contact Form
  contactForm!: FormGroup;
  isSubmitting: boolean = false;
  submitSuccess: boolean = false;
  submitError: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  
  // Auth state
  isLoggedIn: boolean = false;
  user: any = null;
  activeRole: string = '';
  availableRoles: RoleDefinition[] = [];
  isRoleSwitcherOpen: boolean = false;
  private subs: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private roleService: RoleService,
    private router: Router,
    private fb: FormBuilder,
    private contactService: ContactService,
    private translate: TranslateService
  ) {
    this.contactSubjects = [
      { key: 'HOME.CONTACT.SUBJECT_SUPPORT', icon: 'ion-ios-help-buoy' },
      { key: 'HOME.CONTACT.SUBJECT_DRIVER', icon: 'ion-ios-car' },
      { key: 'HOME.CONTACT.SUBJECT_BUSINESS', icon: 'ion-ios-business' },
      { key: 'HOME.CONTACT.SUBJECT_PARTNER', icon: 'ion-ios-people' },
      { key: 'HOME.CONTACT.SUBJECT_OTHER', icon: 'ion-ios-chatbubbles' }
    ];
    this.initContactForm();
    this.refreshContactSubjectLabels();
    this.subs.add(
      this.translate.onLangChange.subscribe(() => this.refreshContactSubjectLabels())
    );
  }

  private initContactForm(): void {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', [Validators.required]],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  private refreshContactSubjectLabels(): void {
    this.translate.get('HOME.CONTACT.SUBJECT_PLACEHOLDER').subscribe(placeholder => {
      this.selectedSubject = placeholder;
      if (!this.contactForm.get('subject')?.value || this.contactForm.get('subject')?.pristine) {
        this.contactForm.patchValue({ subject: placeholder });
      }
    });
  }

  ngOnInit(): void {
    this.subs.add(
      this.authService.isLoggedIn$.subscribe(status => {
        this.isLoggedIn = status;
      })
    );

    this.subs.add(
      this.authService.user$.subscribe(user => {
        this.user = user || this.authService.getCurrentUser();
        this.loadUserRoles();
      })
    );

    // Initialiser activeRole immédiatement depuis localStorage
    this.activeRole = this.roleService.getActiveRole() || '';

    this.subs.add(
      this.roleService.activeRole$.subscribe((role: string | null) => {
        this.activeRole = role || this.roleService.getActiveRole() || '';
      })
    );
  }

  loadUserRoles(): void {
    if (this.user && this.user.roles) {
      this.availableRoles = this.user.roles
        .map((r: any) => {
          const roleName = typeof r === 'string' ? r : (r.name || '');
          const normalizedRole = roleName.startsWith('ROLE_') ? roleName : 'ROLE_' + roleName;
          const def = this.roleService.getRoleDefinition(normalizedRole);
          if (def) {
            return def;
          }
          return {
            id: normalizedRole,
            label: roleName,
            labelKey: '',
            icon: 'ion-ios-settings',
            route: '/acceuil',
            color: '#6c757d',
            action: '',
            actionKey: 'HOME.LOGGED_IN.CHANGE'
          } as RoleDefinition;
        })
        .filter((role: RoleDefinition, index: number, self: RoleDefinition[]) =>
          role.id && index === self.findIndex((r: RoleDefinition) => r.id === role.id)
        );
    }
  }

  toggleRoleSwitcher(): void {
    this.isRoleSwitcherOpen = !this.isRoleSwitcherOpen;
  }

  switchRole(roleId: string): void {
    this.roleService.setActiveRole(roleId);
    this.isRoleSwitcherOpen = false;
  }

  getActiveRoleData(): RoleDefinition {
    return this.roleService.getActiveRoleData();
  }

  get currentUser(): any {
    return {
      name: this.user?.firstName || 'ichraf'
    };
  }

  get profileRoute(): string {
    const role = this.activeRole || this.roleService.getActiveRole() || 'ROLE_USER';
    const roleDef = this.roleService.getRoleDefinition(role);
    const dashboard = roleDef?.route || '/client/dashboard';
    return dashboard.replace('/dashboard', '/profile').replace('/home', '/profile');
  }

  goToDashboard(): void {
    const role = this.roleService.getActiveRole() || this.activeRole;

    if (!role) {
      const user = this.authService.getCurrentUser();
      const userRoles: any[] = user?.roles || [];
      if (userRoles.length === 1) {
        const r: any = userRoles[0];
        const resolvedRole = typeof r === 'string' ? r : (r.authority || r.name || String(r));
        this.roleService.setActiveRole(resolvedRole, false);
        this.router.navigate([this.roleService.getDashboardRoute(resolvedRole)]);
      } else if (userRoles.length > 1) {
        this.router.navigate(['/role-selection']);
      } else {
        this.router.navigate(['/login']);
      }
      return;
    }

    const route = this.roleService.getDashboardRoute(role);
    this.router.navigate([route]);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectSubject(subjectKey: string) {
    this.selectedSubjectKey = subjectKey;
    this.translate.get(subjectKey).subscribe(label => {
      this.selectedSubject = label;
      this.contactForm.patchValue({ subject: label });
    });
    this.isDropdownOpen = false;
  }

  onSubmitContact(): void {
    if (this.contactForm.invalid) {
      this.markFormGroupTouched(this.contactForm);
      return;
    }

    this.isSubmitting = true;
    this.submitSuccess = false;
    this.submitError = false;

    console.log('[ContactForm] Tentative d\'envoi :', this.contactForm.value);

    this.contactService.sendContactMessage(this.contactForm.value).subscribe({
      next: (response) => {
        console.log('[ContactForm] Succès :', response);
        this.isSubmitting = false;
        this.submitSuccess = true;
        this.successMessage = response.message || 'Votre demande a été envoyée avec succès.';
        this.contactForm.reset({
          subject: 'Choisissez votre demande'
        });
        this.selectedSubject = 'Choisissez votre demande';
        setTimeout(() => this.submitSuccess = false, 5000);
      },
      error: (err) => {
        console.error('[ContactForm] ERREUR DÉTAILLÉE :', err);
        this.isSubmitting = false;
        this.submitError = true;
        this.errorMessage = "Une erreur est survenue lors de l'envoi. Veuillez vérifier la console (F12).";
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as any);
      }
    });
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ngAfterViewInit() {
    this.initOwlCarousel();
    this.initScrollAnimation();
  }

  private initOwlCarousel() {
    setTimeout(() => {
      if ($('.carousel-services').length > 0) {
        $('.carousel-services').owlCarousel({
          center: false,
          loop: true,
          autoplay: true,
          autoplayTimeout: 5000,
          items: 1,
          margin: 30,
          stagePadding: 0,
          nav: false,
          dots: true,
          responsive: {
            0: { items: 1 },
            600: { items: 2 },
            1000: { items: 4 }
          }
        });
      }
    }, 500);
  }

  private initScrollAnimation() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.statsAnimated) {
          this.statsAnimated = true;
          this.animateStats();
        }
      });
    }, { threshold: 0.5 });

    const statsSection = document.querySelector('.stats-bar-new');
    if (statsSection) {
      observer.observe(statsSection);
    }
  }

  private animateStats() {
    this.animateValue(0, 152, 2000, (v) => this.trajetsCount = Math.floor(v));
    this.animateValue(0, 87, 2000, (v) => this.usersCount = Math.floor(v));
    this.animateValue(0, 4.8, 2000, (v) => this.ratingCount = v.toFixed(1));
  }

  private animateValue(start: number, end: number, duration: number, callback: (val: number) => void) {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const current = progress * (end - start) + start;
      callback(current);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }
}
