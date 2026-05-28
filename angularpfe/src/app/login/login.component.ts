import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { LanguageOption, LanguageService } from '../i18n/language.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$')]],
    password: ['', [Validators.required, Validators.minLength(4)]]
  });

  readonly forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$')]]
  });

  isSubmitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  forgotEmailHint: string | null = null;
  hidePassword = true;
  mode: 'login' | 'forgot' | 'reset' | '2fa' = 'login';
  twoFactorEmail: string = '';
  twoFactorCode: string = '';
  token: string | null = null;
  resetMessage: string | null = null;
  resetErrorMessage: string | null = null;
  isSubmittingReset = false;
  hideConfirmPassword = true;
  resetSubmitAttempted = false;

  readonly resetForm = this.fb.group({
    password: ['', [
      Validators.required, 
      Validators.minLength(8),
      Validators.pattern('(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}')
    ]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  get passwordRules() {
    const pwd = this.resetForm.get('password')?.value || '';
    return {
      length: pwd.length >= 8,
      number: /[0-9]/.test(pwd),
      symbol: /[^A-Za-z0-9]/.test(pwd)
    };
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly languageService: LanguageService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  ngOnInit(): void {
    const resetToken = this.extractResetToken();
    const isResetRoute = this.router.url.includes('reset-password') || !!resetToken;

    if (this.authService.isLoggedIn() && !isResetRoute) {
      this.authService.handleAuthSuccess(this.route.snapshot.queryParamMap.get('returnUrl'));
      return;
    }

    if (isResetRoute && resetToken) {
      this.token = resetToken;
      this.mode = 'reset';
      this.errorMessage = null;
      this.successMessage = null;
      return;
    }

    this.resetLoginFormState();

    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        this.token = params['token'];
        this.mode = 'reset';
      }
    });

    this.route.params.subscribe(params => {
      if (params['token']) {
        this.token = params['token'];
        this.mode = 'reset';
      }
    });
  }

  /** Token from ?token=, /reset-password/:token, or legacy /login/reset/:token */
  private extractResetToken(): string | null {
    const fromQuery = this.route.snapshot.queryParamMap.get('token');
    if (fromQuery) return fromQuery;
    const fromParam = this.route.snapshot.paramMap.get('token');
    if (fromParam) return fromParam;
    const match = this.router.url.match(/reset-password\/([^/?]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  get currentLanguageLabel(): string {
    return (this.languageService.current || 'fr').toUpperCase();
  }

  private resetLoginFormState(): void {
    this.mode = 'login';
    this.errorMessage = null;
    this.successMessage = null;
    this.isSubmitting = false;
    this.twoFactorCode = '';
    this.twoFactorEmail = '';
    this.form.reset({ email: '', password: '' });
    this.forgotForm.reset({ email: '' });
  }

  toggleForgotPassword(): void {
    this.mode = this.mode === 'forgot' ? 'login' : 'forgot';
    this.errorMessage = null;
    this.successMessage = null;
    this.isSubmitting = false;
  }

  toggleLanguage(): void {
    const next: LanguageOption['code'] = this.languageService.current === 'en' ? 'fr' : 'en';
    this.languageService.use(next);
  }

  // Getters pour accès facile aux champs
  get f() { return this.form.controls; }
  get ff() { return this.forgotForm.controls; }
  get fReset() { return this.resetForm.controls; }

  trySubmitReset(): void {
    this.resetSubmitAttempted = true;
    if (this.resetForm.valid) {
      this.submitReset();
    }
  }

  submitReset(): void {
    if (this.resetForm.invalid || !this.token) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isSubmittingReset = true;
    this.resetMessage = null;
    this.resetErrorMessage = null;

    const newPassword = this.resetForm.value.password;

    this.authService.resetPassword({ token: this.token, newPassword: newPassword })
      .pipe(finalize(() => this.isSubmittingReset = false))
      .subscribe({
        next: () => {
          this.resetMessage = "Votre mot de passe a été réinitialisé avec succès.";
          this.resetForm.reset();
          // Facultatif : On peut rediriger vers le mode login après 3 secondes
          setTimeout(() => {
            this.mode = 'login';
            this.resetMessage = null;
          }, 3000);
        },
        error: (err) => {
          this.resetErrorMessage = err.error?.message || "Le lien est invalide ou a expiré.";
        }
      });
  }

  submit(): void {
    this.errorMessage = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    const normalizedEmail = (email ?? '').trim().toLowerCase();
    this.isSubmitting = true;

    this.authService
      .login({ email: normalizedEmail, password: password ?? '' })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (response) => {
          if (response.twoFactorRequired) {
            this.twoFactorEmail = normalizedEmail;
            this.mode = '2fa';
            this.successMessage = "Veuillez saisir votre code à 6 chiffres.";
            return;
          }
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          this.authService.handleAuthSuccess(returnUrl);
        },
        error: (err: any) => {
          console.error('Erreur login:', err);
          if (err.status === 0) {
            this.errorMessage = 'Le serveur est actuellement indisponible. Veuillez vérifier votre connexion ou réessayer plus tard.';
          } else if (err.status === 401) {
            this.errorMessage = 'Adresse e-mail ou mot de passe incorrect.';
          } else if (err.status === 403) {
            this.errorMessage = 'Accès refusé. Votre compte pourrait être restreint.';
          } else {
            this.errorMessage = err.error?.message || 'Une erreur inattendue est survenue (Code: ' + err.status + ').';
          }
        }
      });
  }

  submit2FA(): void {
    if (this.twoFactorCode.length !== 6) return;
    
    this.isSubmitting = true;
    this.errorMessage = null;

    this.authService.verifyLogin2FA(this.twoFactorEmail, this.twoFactorCode)
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          this.authService.handleAuthSuccess(returnUrl);
        },
        error: (err) => {
          this.errorMessage = err.error?.message || "Code invalide.";
        }
      });
  }

  submitForgot(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.forgotEmailHint = null;
    const email = this.forgotForm.value.email ?? '';

    this.authService.forgotPassword(email)
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: (res) => {
          const ext = res as {
            intendedEmail?: string;
            actualRecipient?: string;
            devRedirected?: boolean;
            emailSent?: boolean;
          };
          this.successMessage = res.message
            || 'Si un compte existe avec cet e-mail, un lien de réinitialisation a été envoyé (vérifiez votre boîte et les spams).';
          let hint = res.emailHint || '';
          if (ext.devRedirected && ext.emailSent && ext.actualRecipient) {
            hint = `Mode test : l'e-mail est envoyé à ${ext.actualRecipient} (compte Resend de développement).`;
          } else if (ext.emailSent) {
            hint = '';
          } else if (!ext.intendedEmail) {
            hint = 'Aucun compte avec cet e-mail. Inscrivez-vous ou vérifiez l\'orthographe.';
          } else if (!ext.emailSent) {
            hint = (hint ? hint + ' ' : '')
              + 'Impossible d\'envoyer l\'e-mail pour le moment. Réessayez plus tard ou contactez le support.';
          }
          this.forgotEmailHint = hint || null;
          this.forgotForm.reset();
        },
        error: (err) => {
          if (err.status === 0) {
            this.errorMessage = 'Impossible de joindre le serveur. Vérifiez votre connexion.';
          } else {
            this.errorMessage = err.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
          }
        }
      });
  }
}
