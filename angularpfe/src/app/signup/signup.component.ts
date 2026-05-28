import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService, SignupRequest } from '../auth/auth.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnInit {
  signupForm!: FormGroup;
  isSubmitting = false;
  showSuccess = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  hidePassword = true;
  hideConfirmPassword = true;
  
  // Wizard State
  currentStep = 1;
  totalSteps = 4;

  // Map roles to images and content
  visualDataMap: Record<string, { image: string, title: string, highlight: string, subtitle: string, features: string[] }> = {
    'CLIENT': {
      image: '/assets/images/goride-client-bg.png',
      title: 'Une seule plateforme,',
      highlight: 'toutes les mobilités',
      subtitle: 'Optimisez chaque trajet et déplacez-vous en toute sérénité.',
      features: ['Réservation instantanée', 'Chauffeurs certifiés']
    },
    'USER': {
      image: '/assets/images/goride-client-bg.png',
      title: 'Votre chauffeur,',
      highlight: 'à votre porte',
      subtitle: 'Commandez un trajet en toute simplicité avec GoRide.',
      features: ['Trajets sécurisés', 'Prix transparents']
    },
    'DRIVER': {
      image: '/assets/images/goride-driver-bg.png',
      title: 'Prenez le volant,',
      highlight: 'augmentez vos revenus',
      subtitle: 'Conduisez à votre rythme et rentabilisez votre véhicule.',
      features: ['Horaires flexibles', 'Paiements rapides']
    },
    'FLEET_OWNER': {
      image: '/assets/images/goride-fleet-bg.png',
      title: 'Gérez votre flotte,',
      highlight: 'maximisez vos profits',
      subtitle: 'Développez votre activité avec nos outils de gestion avancés.',
      features: ['Tableau de bord pro', 'Suivi en temps réel']
    },
    'COMPANY': {
      image: '/assets/images/goride-company-bg.png',
      title: 'La mobilité pensée',
      highlight: 'pour votre entreprise',
      subtitle: 'Optimisez les déplacements de tous vos collaborateurs.',
      features: ['Facturation simplifiée', 'Gestion centralisée']
    }
  };

  roles = [
    { 
      value: 'DRIVER', 
      label: 'Devenir partenaire chauffeur', 
      desc: 'Générez des revenus selon vos conditions', 
      icon: 'ion-ios-person',
      iconColor: '#2563eb'
    },
    { 
      value: 'CLIENT', 
      label: 'Commander une voiture', 
      desc: 'Réservez un véhicule selon vos besoins', 
      icon: 'ion-ios-car',
      iconColor: '#10b981'
    },
    { 
      value: 'USER', 
      label: 'Passer un trajet', 
      desc: 'Commandez un trajet et laissez-nous vous conduire', 
      icon: 'flaticon-route',
      iconColor: '#f59e0b'
    },
    { 
      value: 'FLEET_OWNER', 
      label: 'Inscrivez-vous en tant que propriétaire de flotte', 
      desc: 'Ajoutez votre flotte sur GoRide et augmentez vos revenus', 
      icon: 'ion-ios-people',
      iconColor: '#059669'
    },
    { 
      value: 'COMPANY', 
      label: 'Entreprises', 
      desc: 'Produits et services adaptés à votre entreprise', 
      icon: 'ion-ios-briefcase',
      iconColor: '#4b5563'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const roleFromRoute = this.route.snapshot.data['role'] as string | undefined;
    const roleParam =
      roleFromRoute || this.route.snapshot.queryParamMap.get('role') || 'CLIENT';
    this.initForm([roleParam]);
  }

  private initForm(roles: string[]): void {
    this.signupForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$')]],
      phone: ['', [Validators.required, Validators.pattern('^(\\+216)?[0-9]{8}$')]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern('(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}')]],
      confirmPassword: ['', [Validators.required]],
      roles: [roles, [Validators.required, Validators.minLength(1)]],
      hasFleet: [false]
    }, {
      validators: this.passwordMatchValidator
    });

    // Effacer le message d'erreur quand l'utilisateur modifie le formulaire
    this.signupForm.valueChanges.subscribe(() => {
      if (this.errorMessage) {
        this.errorMessage = '';
      }
    });
  }

  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  nextStep(): void {
    if (this.canGoNext()) {
      this.currentStep++;
      window.scrollTo(0, 0);
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      window.scrollTo(0, 0);
    }
  }

  canGoNext(): boolean {
    if (this.currentStep === 1) {
      return this.signupForm.get('firstName')!.valid && 
             this.signupForm.get('lastName')!.valid && 
             this.signupForm.get('email')!.valid;
    }
    if (this.currentStep === 2) {
      return this.signupForm.get('roles')!.valid && this.signupForm.get('roles')!.value.length > 0;
    }
    if (this.currentStep === 3) {
      return this.signupForm.get('phone')!.valid;
    }
    return true;
  }

  toggleRole(roleValue: string): void {
    const currentRoles = [...this.signupForm.get('roles')?.value || []];
    const index = currentRoles.indexOf(roleValue);
    
    if (index > -1) {
      // Remove if already selected
      currentRoles.splice(index, 1);
    } else {
      // Add if not selected
      currentRoles.push(roleValue);
    }
    
    this.signupForm.patchValue({ roles: currentRoles });
    this.signupForm.get('roles')?.markAsTouched();
  }

  isRoleSelected(roleValue: string): boolean {
    return this.signupForm?.get('roles')?.value?.includes(roleValue);
  }

  get currentRole(): string {
    const roles = this.signupForm?.get('roles')?.value;
    return roles && roles.length > 0 ? roles[0] : 'CLIENT';
  }

  get currentVisualData(): { image: string, title: string, highlight: string, subtitle: string, features: string[] } {
    return this.visualDataMap[this.currentRole] || this.visualDataMap['CLIENT'];
  }

  // Getter for easy access to form fields
  get f() {
    return this.signupForm.controls;
  }

  submit(): void {
    if (this.signupForm.invalid) return;
    
    // Normalize email
    const formValue = this.signupForm.getRawValue();
    formValue.email = formValue.email.trim().toLowerCase();

    this.isSubmitting = true;
    this.errorMessage = '';

    // Nettoyage préventif pour éviter les conflits de session
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');

    const payload = {
      ...formValue,
      roles: (formValue.roles?.length ? formValue.roles : ['CLIENT']) as string[]
    };

    this.authService.signup(payload)
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: (res) => {
          this.showSuccess = true;
          let msg = res.message || 'Inscription réussie !';
          if (res.emailHint) {
            msg += ' ' + res.emailHint;
          } else if (res.emailSent) {
            msg += ' Un e-mail de bienvenue a été envoyé.';
          }
          this.successMessage = msg;

          this.authService.login({ email: formValue.email, password: formValue.password }).subscribe({
            next: () => {
              setTimeout(() => this.authService.handleAuthSuccess(), 1500);
            },
            error: (loginErr) => {
              console.warn('Inscription OK mais connexion auto échouée', loginErr);
              this.successMessage = (this.successMessage || '') + ' Connectez-vous avec votre e-mail et mot de passe.';
              setTimeout(() => this.router.navigate(['/login']), 3500);
            }
          });
        },
        error: (err) => {
          console.error("Erreur d'inscription détaillée :", err);
          if (err.status === 0) {
            this.errorMessage = 'Impossible de joindre le serveur GoRide (port 8081). Démarrez le backend puis réessayez.';
          } else {
            this.errorMessage = err.error?.message || err.message || "Une erreur technique est survenue.";
          }
        }
      });
  }
}
