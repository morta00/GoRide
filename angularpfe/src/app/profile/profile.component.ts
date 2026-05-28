import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService, JwtResponse } from '../auth/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { ThemeService, ThemeMode } from '../theme.service';
import { SearchService } from '../services/search.service';
import { NotificationService, AppNotification } from '../services/notification.service';
import { PaymentService, PaymentMethod } from '../services/payment.service';
import { Subscription } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';

import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ProfileAvatarComponent } from '../header/profile-avatar/profile-avatar.component';
import { RouterModule } from '@angular/router';
import { LogoComponent } from '../shared/components/logo/logo.component';
import { RoleService } from '../auth/role.service';
import { LanguageService } from '../i18n/language.service';
import { DriverProfileService, DriverProfile } from '../driver/services/driver-profile.service';
import { DriverService } from '../driver/services/driver.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule, 
    TranslateModule, 
    ProfileAvatarComponent,
    RouterModule,
    LogoComponent
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css', './profile-password.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  /** True on /dashboard/profile (no sidebar layout). */
  showStandaloneLogo = false;
  standaloneRoleBadge = '';
  /** Chauffeur ou admin : masquer la gestion des rôles / adapter le contenu. */
  isDriverContext = false;
  isAdminContext = false;
  isCompanyContext = false;
  saveErrorMessage = '';
  driverProfile: DriverProfile | null = null;
  driverIsOnline = false;
  activeTab = 'info';
  isEditing = false;
  
  editProfile() {
    this.isEditing = true;
    this.activeTab = 'info';
    setTimeout(() => {
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }, 100);
  }
  user: JwtResponse | null = null;
  activeRole: string = 'Utilisateur';
  badgeLabel: string = 'Membre Standard';

  availableRolesList = [
    { value: 'USER', label: 'Passager' },
    { value: 'CLIENT', label: 'Locataire' },
    { value: 'DRIVER', label: 'Chauffeur' },
    { value: 'FLEET_OWNER', label: 'Gestionnaire de Flotte' },
    { value: 'COMPANY', label: 'Entreprise' }
  ];

  /** Masquer Locataire pour les chauffeurs (déjà couvert par Passager). */
  shouldShowRoleCard(roleValue: string): boolean {
    if (roleValue === 'CLIENT' && (this.isDriverContext || this.authService.getActiveRole() === 'ROLE_DRIVER')) {
      return false;
    }
    return true;
  }

  showRolesManagement(): boolean {
    return !this.isAdminContext;
  }

  getAvailableRolesToAdd() {
    if (!this.user?.roles) {
      return this.availableRolesList.filter(r => this.shouldShowRoleCard(r.value));
    }
    return this.availableRolesList
      .filter(r => this.shouldShowRoleCard(r.value))
      .filter(r => !this.user!.roles.includes('ROLE_' + r.value));
  }

  addRole(roleValue: string) {
    if (confirm('Voulez-vous vraiment ajouter le rôle ' + this.getRoleLabel('ROLE_' + roleValue) + ' ?')) {
      this.isSubmitting = true;
      this.authService.addRole(roleValue).subscribe({
        next: (updatedUser: JwtResponse) => {
          this.user = updatedUser;
          this.isSubmitting = false;
          this.showToast();
          this.setupRoleInfo(); // Mettre à jour les labels de badges
        },
        error: (err) => {
          this.isSubmitting = false;
          alert(err.error?.message || 'Erreur lors de l\'ajout du rôle');
        }
      });
    }
  }

  removeRole(roleName: string) {
    const roleValue = roleName.replace('ROLE_', '');
    if (confirm('Voulez-vous vraiment supprimer ce rôle ?')) {
      this.isSubmitting = true;
      this.authService.removeRole(roleValue).subscribe({
        next: (updatedUser: JwtResponse) => {
          this.user = updatedUser;
          this.isSubmitting = false;
          this.showToast();
          this.setupRoleInfo();
        },
        error: (err) => {
          this.isSubmitting = false;
          alert(err.error?.message || 'Erreur lors de la suppression du rôle');
        }
      });
    }
  }

  /**
   * Bascule vers un rôle que l'utilisateur possède déjà.
   */
  switchRole(role: string) {
    const roleName = role.startsWith('ROLE_') ? role : 'ROLE_' + role;
    this.authService.setActiveRole(roleName);
    this.showToast();
    
    // Redirection automatique vers le bon dashboard
    setTimeout(() => {
      this.authService.handleAuthSuccess();
    }, 800);
  }
  
  getRoleLabel(roleName: string): string {
    const roleValue = roleName.replace('ROLE_', '');
    const found = this.availableRolesList.find(r => r.value === roleValue);
    if (found) return found.label;
    if (roleValue === 'USER') return 'Passager';
    if (roleValue === 'CLIENT') return 'Locataire';
    if (roleValue === 'ADMIN') return 'Administrateur';
    return roleValue;
  }
  
  tunisianCities: string[] = ['Tunis', 'Sfax', 'Sousse', 'Ettadhamen-Mnihla', 'Kairouan', 'Bizerte', 'Gabès', 'Ariana', 'Gafsa', 'La Marsa', 'Kasserine', 'Ezzahra', 'Hammam Lif', 'La Goulette', 'Ben Arous', 'Monastir', 'Zarzis', 'Nabeul', 'Houmt Souk', 'Tataouine', 'Médenine', 'Béja', 'Jendouba', 'Mahdia'];
  
  infoForm!: FormGroup;
  securityForm!: FormGroup;
  notificationsForm!: FormGroup;
  preferencesForm!: FormGroup;
  paymentForm!: FormGroup;
  gorideBalance: number = 125.50; // Simulation de solde
  tunisianBanks = [
    { id: 'biat', name: 'BIAT', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Logo_BIAT.svg/1200px-Logo_BIAT.svg.png' },
    { id: 'stb', name: 'STB', logo: 'https://www.stb.com.tn/fileadmin/templates/images/logo_stb.png' },
    { id: 'attijari', name: 'Attijari Bank', logo: 'https://www.attijaribank.com.tn/Portail/images/logo.png' },
    { id: 'amen', name: 'Amen Bank', logo: 'https://www.amenbank.com.tn/assets/images/logo.png' },
    { id: 'uib', name: 'UIB', logo: 'https://www.uib.com.tn/images/logo.png' },
    { id: 'bh', name: 'BH Bank', logo: 'https://www.bhbank.com.tn/images/logo.png' }
  ];

  recentNotifications: AppNotification[] = [];
  unreadNotificationsCount: number = 0;
  paymentMethods: PaymentMethod[] = [];
  companyPaymentSettings: any = null;
  companyDocuments: any[] = [];
  companyDocProgress: number = 0;
  selectedCompanyDoc: any = null;
  showCompanyDocModal = false;

  loadCompanyDocuments(): void {
    const stored = localStorage.getItem('company_documents');
    if (stored) {
      this.companyDocuments = JSON.parse(stored);
    } else if (this.authService.getActiveRole() === 'ROLE_COMPANY') {
      this.companyDocuments = [
        { id: 1, name: 'Registre de commerce', description: 'Document d\'immatriculation officiel.', required: true, status: 'VERIFIED', fileName: 'registre-commerce.pdf', uploadedAt: '2026-04-10', verifiedAt: '2026-04-12' },
        { id: 2, name: 'Matricule fiscal', description: 'Identifiant fiscal de l\'entreprise.', required: true, status: 'PENDING', fileName: 'matricule-fiscal.pdf', uploadedAt: '2026-05-01' },
        { id: 3, name: 'Carte d\'identité du responsable légal', description: 'CIN ou Passeport du gérant.', required: true, status: 'VERIFIED', fileName: 'cin-responsable.pdf', uploadedAt: '2026-04-10', verifiedAt: '2026-04-11' },
        { id: 4, name: 'Justificatif d\'adresse entreprise', description: 'Facture STEG/SONEDE ou contrat de bail.', required: true, status: 'NOT_UPLOADED' },
        { id: 5, name: 'RIB bancaire entreprise', description: 'Relevé d\'Identité Bancaire officiel.', required: true, status: 'VERIFIED', fileName: 'rib-entreprise.pdf', uploadedAt: '2026-04-10', verifiedAt: '2026-04-11' },
        { id: 6, name: 'Autorisation de gestion / procuration', description: 'Si le gérant n\'est pas le signataire.', required: false, status: 'NOT_UPLOADED' },
        { id: 7, name: 'Bon de commande', description: 'Modèle de bon de commande tamponné.', required: false, status: 'NOT_UPLOADED' },
        { id: 8, name: 'Contrat cadre entreprise', description: 'Contrat de partenariat signé.', required: false, status: 'NOT_UPLOADED' },
        { id: 9, name: 'Assurance professionnelle', description: 'Attestation d\'assurance RC pro.', required: false, status: 'NOT_UPLOADED' }
      ];
      localStorage.setItem('company_documents', JSON.stringify(this.companyDocuments));
    }
    this.calculateCompanyDocProgress();
  }

  calculateCompanyDocProgress(): void {
    const requiredDocs = this.companyDocuments.filter(d => d.required);
    const completedDocs = requiredDocs.filter(d => d.status === 'VERIFIED' || d.status === 'PENDING');
    this.companyDocProgress = requiredDocs.length > 0 ? Math.round((completedDocs.length / requiredDocs.length) * 100) : 0;
  }

  uploadCompanyDocument(doc: any, event: any): void {
    const file = event.target.files[0];
    if (file) {
      doc.fileName = file.name;
      doc.status = 'PENDING';
      doc.uploadedAt = new Date().toISOString().split('T')[0];
      localStorage.setItem('company_documents', JSON.stringify(this.companyDocuments));
      this.calculateCompanyDocProgress();
      this.showToast();
    }
  }

  viewCompanyDocument(doc: any): void {
    this.selectedCompanyDoc = doc;
    this.showCompanyDocModal = true;
  }

  closeCompanyDocModal(): void {
    this.showCompanyDocModal = false;
    this.selectedCompanyDoc = null;
  }

  loadCompanyPaymentSettings(): void {
    const stored = localStorage.getItem('company_payment_settings');
    if (stored) {
      this.companyPaymentSettings = JSON.parse(stored);
    } else if (this.authService.getActiveRole() === 'ROLE_COMPANY') {
      this.companyPaymentSettings = {
        preferredPaymentMethod: "Carte bancaire entreprise",
        methods: [
          { id: "CARD_COMPANY", label: "Carte bancaire entreprise", details: "Visa *** 4455", active: true },
          { id: "BANK_TRANSFER", label: "Virement bancaire", details: "IBAN TN03 224...", active: true },
          { id: "GOCORP_BALANCE", label: "Solde GoCorp", details: "1 250 DT disponibles", active: true }
        ]
      };
      localStorage.setItem('company_payment_settings', JSON.stringify(this.companyPaymentSettings));
      
      // Cleanup old keys
      localStorage.removeItem('company_profile_payment_methods');
      localStorage.removeItem('company_payment_methods');
      localStorage.removeItem('company_payment_preferences');
    }
  }

  saveCompanyPaymentPreference(label: string): void {
    if (this.companyPaymentSettings) {
      this.companyPaymentSettings.preferredPaymentMethod = label;
      localStorage.setItem('company_payment_settings', JSON.stringify(this.companyPaymentSettings));
      this.showToast();
    }
  }

  markAsRead(id: number) {
    this.notificationService.markAsRead(id);
  }

  markAllNotificationsAsRead() {
    this.notificationService.markAllAsRead();
  }


  saveSuccess = false;
  isSubmitting = false;
  submitStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  cancelStatus: 'idle' | 'cancelled' = 'idle';
  lastModified: string = 'Il y a 2 jours';

  // Password Visibility
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  // Password Strength
  passwordStrength = 0;
  strengthLabel = 'Inexistant';
  strengthClass = 'strength-none';
  
  passwordChecks = {
    length: false,
    number: false,
    symbol: false
  };

  // 2FA Properties
  show2FASetup = false;
  qrCodeUrl: string | null = null;
  twoFactorCode: string = '';
  twoFactorSecret: string | null = null;
  is2FALoading = false;
  twoFactorError: string | null = null;
  twoFactorState: 'IDLE' | 'LOADING' | 'ERROR' | 'SETUP' = 'IDLE';
  selectedPaymentMethod: string = 'cash'; // Default method

  // D17 Fintech Flow State
  isSendingCode = false;
  isCodeSent = false;
  isVerifyingCode = false;
  isVerified = false;
  d17VerificationCode = '';
  d17Error: string | null = null;
  d17Step: 1 | 2 | 3 = 1;
  
  // GoRide Card Animation State
  isRecharging = false;

  // Recharge Modal State
  showRechargeModal = false;
  rechargeAmount: number | null = null;
  rechargeMethod: 'card' | 'd17' = 'card';
  isProcessingRecharge = false;
  rechargeStep: 1 | 2 = 1; // 1: Amount/Method, 2: Details

  // --- GLOBAL SEARCH SYSTEM ---
  private searchSubscription!: Subscription;
  searchTerm: string = '';

  allSections = [
    { 
      name: 'Informations Personnelles', 
      route: 'info', 
      icon: 'ion-md-person', 
      desc: 'Gérez vos coordonnées',
      keywords: ['nom', 'prénom', 'ville', 'adresse', 'téléphone', 'contact', 'naissance']
    },
    { 
      name: 'Sécurité & Mot de passe', 
      route: 'security', 
      icon: 'ion-md-lock', 
      desc: 'Protégez votre compte',
      keywords: ['password', 'mot de passe', '2fa', 'authentification', 'double facteur', 'sécurité', 'compte']
    },
    { 
      name: 'Moyens de paiement', 
      route: 'payments', 
      icon: 'ion-md-card', 
      desc: 'Vos préférences de paiement',
      keywords: ['argent', 'carte', 'bancaire', 'd17', 'paiement', 'préférences']
    },
    { 
      name: 'Notifications', 
      route: 'notifications', 
      icon: 'ion-md-notifications', 
      desc: 'Gérez vos alertes',
      keywords: ['alertes', 'push', 'mail', 'promo', 'notifications', 'message']
    },
    { 
      name: 'Documents', 
      route: 'documents', 
      icon: 'ion-md-document', 
      desc: 'Documents de location',
      keywords: ['permis', 'identite', 'cin', 'photo', 'justificatif', 'upload']
    },
    { 
      name: 'Préférences', 
      route: 'preferences', 
      icon: 'ion-md-options', 
      desc: 'Langue et thème',
      keywords: ['langue', 'thème', 'sombre', 'clair', 'dark mode', 'auto', 'monnaie', 'standard']
    }
  ];
  filteredSections: any[] = [];
  showSearchResults = false;

  filterSections() {
    if (!this.searchTerm || !this.searchTerm.trim()) {
      this.filteredSections = this.allSections; 
      this.showSearchResults = false;
      return;
    }

    const term = this.searchTerm.toLowerCase().trim();
    this.filteredSections = this.allSections.filter(section =>
      section.name.toLowerCase().includes(term) || 
      section.desc.toLowerCase().includes(term) ||
      section.keywords.some(kw => kw.toLowerCase().includes(term))
    );
    
    this.showSearchResults = true;

    if (this.filteredSections.length === 1 && this.searchTerm.length > 2) {
      this.navigateToSection(this.filteredSections[0]);
    }
  }

  navigateToSection(section: any) {
    this.activeTab = section.route;
    this.searchTerm = '';
    this.showSearchResults = false;
    
    setTimeout(() => {
      const element = document.getElementById(`${section.route}-section`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 400, behavior: 'smooth' });
      }
    }, 100);
  }

  getHighlightedText(text: string): string {
    if (!this.searchTerm.trim()) return text;
    const regex = new RegExp(`(${this.searchTerm})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  // --- END SEARCH SYSTEM ---


  // --- DOCUMENTS SECTION ---
  documents = [
    { 
      id: 1, 
      name: 'Permis de conduire', 
      status: 'verified', 
      description: 'Document obligatoire pour louer une voiture.',
      icon: 'ion-md-card'
    },
    { 
      id: 2, 
      name: 'Carte d’identité', 
      status: 'pending', 
      description: 'Votre carte d’identité est en cours de vérification.',
      icon: 'ion-md-person'
    },
    { 
      id: 3, 
      name: 'Photo de profil', 
      status: 'verified', 
      description: 'Photo utilisée pour identifier votre compte.',
      icon: 'ion-md-image'
    },
    { 
      id: 4, 
      name: 'Justificatif', 
      status: 'missing', 
      description: 'Justificatif supplémentaire si demandé par le propriétaire ou l’agence.',
      icon: 'ion-md-document'
    }
  ];

  selectedFileName: string = '';

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFileName = file.name;
      // Simulation d'upload
      this.showToast();
    }
  }

  triggerFileUpload() {
    const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private translate: TranslateService,
    private themeService: ThemeService,
    private searchService: SearchService,
    private notificationService: NotificationService,
    private paymentService: PaymentService,
    private router: Router,
    private route: ActivatedRoute,
    private roleService: RoleService,
    private driverProfileService: DriverProfileService,
    private driverService: DriverService,
    private languageService: LanguageService
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    this.isDriverContext =
      this.router.url.includes('/driver/') || this.authService.getActiveRole() === 'ROLE_DRIVER';
    this.isAdminContext =
      this.router.url.includes('/admin/') || this.authService.getActiveRole() === 'ROLE_ADMIN';
    this.isCompanyContext =
      this.router.url.includes('/company/') || this.authService.getActiveRole() === 'ROLE_COMPANY';

    if (this.isDriverContext) {
      this.driverIsOnline = this.driverService.getOnlineStatus();
      this.driverService.isOnline$.subscribe((status) => (this.driverIsOnline = status));
      this.loadDriverProfile();
    }

    this.showStandaloneLogo = this.router.url.includes('/dashboard/profile');
    if (this.showStandaloneLogo) {
      const roleDef = this.roleService.getActiveRoleData();
      this.standaloneRoleBadge = roleDef?.label || '';
    }

    if (this.authService.getActiveRole() === 'ROLE_USER') {
      this.allSections = this.allSections.filter(s => s.route !== 'documents');
    }

    if (this.isAdminContext) {
      this.allSections = this.allSections.filter(s => s.route !== 'documents');
    }

    if (this.isDriverContext) {
      const docs = this.allSections.find(s => s.route === 'documents');
      if (docs) {
        docs.name = 'Documents Chauffeur';
        docs.desc = 'Permis et pièces justificatives';
      }
    }

    // S'abonner aux moyens de paiement
    this.paymentService.paymentMethods$.subscribe(methods => {
      this.paymentMethods = methods;
    });

    // S'abonner à la recherche globale
    this.searchSubscription = this.searchService.searchTerm$.subscribe(term => {
      this.searchTerm = term;
      this.filterSections();
    });

    // Gérer l'onglet actif via les paramètres de requête (ex: ?tab=security)
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const tab = params['tab'];
        // Check if tab exists in our sections
        const exists = this.allSections.some(s => s.route === tab);
        if (exists) {
          this.activeTab = tab;
          this.scrollToActiveSection();
        }
      }
    });

    // S'abonner aux notifications
    this.notificationService.notifications$.subscribe(n => this.recentNotifications = n);
    this.notificationService.unreadCount$.subscribe(c => this.unreadNotificationsCount = c);

    this.loadCompanyPaymentSettings();
    this.loadCompanyDocuments();

    // Charger les données fraîches du backend
    this.authService.getProfile().subscribe({
      next: (user) => {
        this.user = this.normalizeUserProfile(user);
        this.initForms();
        if (this.isDriverContext && this.driverProfile) {
          this.patchDriverFormControls();
        }
      },
      error: () => {
        // Fallback sur le local si API indisponible
        this.user = this.authService.getCurrentUser();
        this.initForms();
        if (this.isDriverContext && this.driverProfile) {
          this.patchDriverFormControls();
        }
      }
    });
    this.setupRoleInfo();
  }

  setupRoleInfo(): void {
    const roleData = this.authService.getActiveRoleData();
    this.activeRole = roleData ? roleData.label : 'Utilisateur';
    
    // Define badges based on roles
    const badges: Record<string, string> = {
      'ROLE_CLIENT': 'Locataire Premium',
      'ROLE_USER': 'Passager Régulier',
      'ROLE_DRIVER': 'Chauffeur Partenaire',
      'ROLE_FLEET_OWNER': 'Gestionnaire Flotte',
      'ROLE_COMPANY': 'Compte Entreprise',
      'ROLE_ADMIN': 'Administrateur'
    };
    
    const currentRoleKey = this.authService.getActiveRole() || 'ROLE_USER';
    this.badgeLabel = badges[currentRoleKey] || 'Membre';
  }

  loadDriverProfile(): void {
    this.driverProfileService.getProfile().subscribe({
      next: (data) => {
        this.driverProfile = data;
        if (this.infoForm) {
          this.patchDriverFormControls();
        }
      },
      error: () => {
        this.driverProfile = null;
      }
    });
  }

  private patchDriverFormControls(): void {
    if (!this.driverProfile || !this.infoForm) return;
    const dp = this.driverProfile;
    const patch: Record<string, unknown> = {
      licenseNumber: dp.licenseNumber || '',
      drivingExperienceYears: dp.drivingExperienceYears ?? '',
      availabilityStatus: dp.availabilityStatus || 'AVAILABLE',
      workMode: dp.workMode || 'INDEPENDENT',
      driverBio: dp.bio || ''
    };
    Object.entries(patch).forEach(([key, val]) => {
      if (!this.infoForm.contains(key)) {
        this.infoForm.addControl(key, this.fb.control(val));
      } else {
        this.infoForm.get(key)?.setValue(val);
      }
    });
  }

  initForms(): void {
    const birthValidators = this.isDriverContext || this.isAdminContext || this.isCompanyContext
      ? []
      : [Validators.required, this.minimumAgeValidator(18)];

    const phoneValidators = this.isCompanyContext
      ? []
      : [Validators.required];

    this.infoForm = this.fb.group({
      firstName: [this.user?.firstName || '', Validators.required],
      lastName: [this.user?.lastName || '', Validators.required],
      email: [this.user?.email || '', [Validators.required, Validators.email]],
      phone: [this.user?.phone || '', phoneValidators],
      address: [this.user?.address || ''],
      gender: [this.user?.gender || ''],
      preferredLanguage: [(this.user?.preferredLanguage || (this.user as any)?.language || 'FR').toString().toUpperCase()],
      city: [this.user?.city || 'Tunis', Validators.required],
      birthDate: [this.user?.birthDate || '', birthValidators]
    });

    if (this.isDriverContext) {
      const dp = this.driverProfile;
      this.infoForm.addControl('licenseNumber', this.fb.control(dp?.licenseNumber || ''));
      this.infoForm.addControl('drivingExperienceYears', this.fb.control(dp?.drivingExperienceYears ?? ''));
      this.infoForm.addControl('availabilityStatus', this.fb.control(dp?.availabilityStatus || 'AVAILABLE'));
      this.infoForm.addControl('workMode', this.fb.control(dp?.workMode || 'INDEPENDENT'));
      this.infoForm.addControl('driverBio', this.fb.control(dp?.bio || ''));
    }

    this.securityForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[0-9])(?=.*[!@#$%^&*])/) ]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    this.notificationsForm = this.fb.group({
      emailPromo: [true],
      emailTrip: [true],
      pushNewTrip: [true],
      pushBooking: [true]
    });

    this.preferencesForm = this.fb.group({
      theme: [this.themeService.getStoredTheme()],
      language: [this.translate.currentLang?.toUpperCase() || this.user?.preferredLanguage || 'FR'],
      currency: ['TND'],
      tripMode: ['standard']
    });

    this.paymentForm = this.fb.group({
      bank: ['', Validators.required],
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{4} \d{4} \d{4} \d{4}$/)]],
      cardExpiry: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
      cardCvv: ['', [Validators.required, Validators.pattern(/^\d{3}$/)]],
      cardHolder: ['', Validators.required],
      d17Phone: [this.user?.phone || '', [Validators.required, Validators.pattern(/^\d{2} \d{3} \d{3}$/)]]
    });

    // Formatage automatique du téléphone D17 (28 056 922)
    this.paymentForm.get('d17Phone')?.valueChanges.subscribe(val => {
      if (val) {
        const cleaned = val.replace(/\D/g, '').substring(0, 8);
        let formatted = '';
        if (cleaned.length <= 2) {
          formatted = cleaned;
        } else if (cleaned.length <= 5) {
          formatted = cleaned.substring(0, 2) + ' ' + cleaned.substring(2);
        } else {
          formatted = cleaned.substring(0, 2) + ' ' + cleaned.substring(2, 5) + ' ' + cleaned.substring(5);
        }
        this.paymentForm.get('d17Phone')?.patchValue(formatted, { emitEvent: false });
      }
    });

    // Formatage automatique du numéro de carte (1234 5678 ...)
    this.paymentForm.get('cardNumber')?.valueChanges.subscribe(val => {
      if (val) {
        const cleaned = val.replace(/\D/g, '').substring(0, 16);
        const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
        this.paymentForm.get('cardNumber')?.patchValue(formatted, { emitEvent: false });
        // Auto-focus expiry input
        if (formatted.length === 19) {
          document.getElementById('cardExpiryInput')?.focus();
        }
      }
    });

    // Auto‑formatting & validation for expiration (MM/AA)
    this.paymentForm.get('cardExpiry')?.valueChanges.subscribe(val => {
      if (val) {
        // Keep only digits
        let cleaned = val.replace(/\D/g, '').substring(0, 4);
        // Insert slash after month
        if (cleaned.length >= 2) {
          cleaned = cleaned.substring(0, 2) + '/' + cleaned.substring(2);
        }
        this.paymentForm.get('cardExpiry')?.patchValue(cleaned, { emitEvent: false });

        const monthStr = cleaned.split('/')[0];
        const yearStr = cleaned.split('/')[1];
        const month = monthStr ? Number(monthStr) : 0;
        
        let errorsObj: any = null;

        if (monthStr && (month < 1 || month > 12)) {
          errorsObj = { invalidMonth: true };
        } else if (cleaned.length === 5) {
          const year = Number(yearStr);
          const now = new Date();
          const currentYear = Number(now.getFullYear().toString().slice(-2));
          const currentMonth = now.getMonth() + 1;
          
          if (year < currentYear || (year === currentYear && month < currentMonth)) {
            errorsObj = { expiredDate: true };
          } else {
            // Valid complete date! Auto-focus next field
            document.getElementById('cardCvvInput')?.focus();
          }
        }
        
        if (errorsObj) {
          this.paymentForm.get('cardExpiry')?.setErrors(errorsObj);
        } else {
          // Preserve other errors (pattern) if any, but clear custom ones
          const errors = this.paymentForm.get('cardExpiry')?.errors;
          if (errors) {
            delete errors['invalidMonth'];
            delete errors['expiredDate'];
            if (Object.keys(errors).length === 0) {
              this.paymentForm.get('cardExpiry')?.setErrors(null);
            }
          }
        }
      }
    });



    // Limitation du CVV (3 ou 4 chiffres)
    this.paymentForm.get('cardCvv')?.valueChanges.subscribe(val => {
      if (val) {
        const cleaned = val.replace(/\D/g, '').substring(0, 4);
        this.paymentForm.get('cardCvv')?.patchValue(cleaned, { emitEvent: false });
      }
    });

    // Monitor password strength
    this.securityForm.get('newPassword')?.valueChanges.subscribe(val => {
      this.calculateStrength(val || '');
    });
  }

  calculateStrength(pass: string): void {
    let score = 0;
    
    // Checks
    this.passwordChecks.length = pass.length >= 8;
    this.passwordChecks.number = /[0-9]/.test(pass);
    this.passwordChecks.symbol = /[!@#$%^&*(),.?":{}|<>]/.test(pass);

    if (this.passwordChecks.length) score += 33;
    if (this.passwordChecks.number) score += 33;
    if (this.passwordChecks.symbol) score += 34;

    this.passwordStrength = score;

    if (score === 0) {
      this.strengthLabel = 'Inexistant';
      this.strengthClass = 'strength-none';
    } else if (score <= 33) {
      this.strengthLabel = 'Faible';
      this.strengthClass = 'strength-weak';
    } else if (score <= 66) {
      this.strengthLabel = 'Moyen';
      this.strengthClass = 'strength-medium';
    } else {
      this.strengthLabel = 'Fort';
      this.strengthClass = 'strength-strong';
    }
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }
  
  minimumAgeValidator(minAge: number) {
    return (control: any) => {
      if (!control.value) return null;
      const birthDate = new Date(control.value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= minAge ? null : { underAge: true };
    };
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.initForms();
      this.infoForm.markAsPristine(); // S'assurer que les boutons disparaissent
      this.cancelStatus = 'cancelled';
      setTimeout(() => this.cancelStatus = 'idle', 2000);
    }
  }

  scrollToActiveSection(): void {
    const sectionIds: { [key: string]: string } = {
      'info': 'personal-info-section',
      'security': 'security-section',
      'documents': 'documents-section',
      'payments': 'payments-section',
      'notifications': 'notifications-section',
      'preferences': 'preferences-section'
    };

    const targetId = sectionIds[this.activeTab];
    if (targetId) {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  saveInfo(): void {
    this.saveErrorMessage = '';
    if (this.infoForm.valid && this.submitStatus === 'idle') {
      this.submitStatus = 'loading';
      this.isSubmitting = true;
      const raw = this.infoForm.getRawValue();
      const formData = this.buildProfileUpdatePayload(raw);
      const driverPayload = this.isDriverContext
        ? {
            firstName: raw['firstName'],
            lastName: raw['lastName'],
            phone: raw['phone'],
            city: raw['city'],
            address: raw['address'],
            preferredLanguage: raw['preferredLanguage'],
            licenseNumber: raw['licenseNumber'],
            drivingExperienceYears: raw['drivingExperienceYears'],
            availabilityStatus: raw['availabilityStatus'],
            workMode: raw['workMode'],
            bio: raw['driverBio']
          }
        : null;

      this.authService.updateProfile(formData).subscribe({
        next: (updatedUser) => {
          this.user = this.normalizeUserProfile({
            ...(this.authService.getCurrentUser() || {}),
            ...updatedUser
          } as JwtResponse);
          const finish = () => {
            this.submitStatus = 'success';
            this.isSubmitting = false;
            this.initForms();
            setTimeout(() => {
              this.submitStatus = 'idle';
              this.isEditing = false;
              this.infoForm.markAsPristine();
            }, 1500);
            this.showToast();
          };

          if (driverPayload) {
            this.driverProfileService.updateProfile(driverPayload).subscribe({
              next: (dp) => {
                this.driverProfile = dp;
                finish();
              },
              error: () => {
                this.submitStatus = 'error';
                this.isSubmitting = false;
                setTimeout(() => (this.submitStatus = 'idle'), 3000);
                alert('Profil utilisateur enregistré, mais erreur sur les données chauffeur.');
              }
            });
          } else {
            finish();
          }
        },
        error: (err) => {
          this.submitStatus = 'error';
          this.isSubmitting = false;
          if (err?.status === 0) {
            this.saveLocallyForCompany(formData);
            return;
          }
          this.saveErrorMessage =
            err?.error?.message ||
            (err?.status === 401 ? 'Session expirée. Reconnectez-vous.' : 'Erreur lors de l\'enregistrement.');
          setTimeout(() => (this.submitStatus = 'idle'), 3000);
        }
      });
    } else if (this.infoForm.invalid) {
      this.infoForm.markAllAsTouched();
      this.saveErrorMessage = this.getInfoFormValidationMessage();
    }
  }

  /** Payload minimal pour PATCH /api/users/me (évite email vide, téléphone dupliqué, etc.). */
  private buildProfileUpdatePayload(raw: Record<string, unknown>): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      firstName: raw['firstName'],
      lastName: raw['lastName'],
      city: raw['city'],
      language: String(raw['preferredLanguage'] || 'FR').toLowerCase()
    };
    const phone = typeof raw['phone'] === 'string' ? raw['phone'].trim() : '';
    if (phone) {
      payload['phone'] = phone;
    }
    const address = typeof raw['address'] === 'string' ? raw['address'].trim() : '';
    if (address) {
      payload['address'] = address;
    }
    const gender = typeof raw['gender'] === 'string' ? raw['gender'].trim() : '';
    if (gender) {
      payload['gender'] = gender;
    }
    const birthDate = typeof raw['birthDate'] === 'string' ? raw['birthDate'].trim() : '';
    if (birthDate) {
      payload['birthDate'] = birthDate;
    }
    return payload;
  }

  /** Sauvegarde locale si le backend est indisponible (compte entreprise). */
  private saveLocallyForCompany(formData: Record<string, unknown>): void {
    if (!this.isCompanyContext) {
      this.saveErrorMessage = 'Impossible de joindre le serveur. Réessayez plus tard.';
      setTimeout(() => (this.submitStatus = 'idle'), 3000);
      return;
    }
    const merged = {
      ...this.user,
      ...formData,
      preferredLanguage: String(formData['language'] || 'fr').toUpperCase()
    } as JwtResponse;
    this.authService.updateUser(merged);
    this.user = this.normalizeUserProfile(merged);
    this.submitStatus = 'success';
    this.isSubmitting = false;
    this.saveErrorMessage = '';
    this.initForms();
    setTimeout(() => {
      this.submitStatus = 'idle';
      this.isEditing = false;
      this.infoForm.markAsPristine();
    }, 1500);
    this.showToast();
  }

  private normalizeUserProfile(user: JwtResponse): JwtResponse {
    const lang = user.preferredLanguage || (user as any).language || 'FR';
    return {
      ...user,
      preferredLanguage: String(lang).toUpperCase()
    };
  }

  private getInfoFormValidationMessage(): string {
    if (this.infoForm.get('firstName')?.invalid || this.infoForm.get('lastName')?.invalid) {
      return 'Le prénom et le nom sont obligatoires.';
    }
    if (this.infoForm.get('birthDate')?.hasError('required')) {
      return 'La date de naissance est obligatoire pour ce type de compte.';
    }
    if (this.infoForm.get('birthDate')?.hasError('underAge')) {
      return 'Vous devez avoir au moins 18 ans.';
    }
    if (this.infoForm.get('phone')?.invalid) {
      return 'Le numéro de téléphone est obligatoire.';
    }
    if (this.infoForm.get('city')?.invalid) {
      return 'La ville principale est obligatoire.';
    }
    return 'Veuillez corriger les champs en rouge avant d\'enregistrer.';
  }

  get driverWorkModeLabel(): string {
    const mode = this.infoForm?.get('workMode')?.value || this.driverProfile?.workMode;
    return mode === 'COMPANY' ? 'Chauffeur Entreprise' : 'Chauffeur Indépendant';
  }

  get driverAvailabilityLabel(): string {
    const s = this.infoForm?.get('availabilityStatus')?.value || this.driverProfile?.availabilityStatus;
    if (s === 'BUSY') return 'Occupé';
    if (s === 'OFFLINE') return 'Hors ligne';
    return 'Disponible';
  }

  updateSecurity(): void {
    if (this.securityForm.valid) {
      this.isSubmitting = true;
      const payload = {
        currentPassword: this.securityForm.value.currentPassword,
        newPassword: this.securityForm.value.newPassword
      };
      this.authService.changePassword(payload).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.securityForm.reset();
          this.showToast();
          this.passwordStrength = 0;
          this.strengthLabel = 'Inexistant';
          this.strengthClass = 'strength-none';
          this.passwordChecks = { length: false, number: false, symbol: false };
        },
        error: (err) => {
          this.isSubmitting = false;
          alert(err.error?.message || 'Une erreur est survenue.');
        }
      });
    }
  }

  showToast(): void {
    this.saveSuccess = true;
    setTimeout(() => this.saveSuccess = false, 3000);
  }

  updateNotifications(): void {
    if (this.notificationsForm.valid) {
      this.isSubmitting = true;
      setTimeout(() => {
        this.isSubmitting = false;
        this.notificationsForm.markAsPristine();
        this.showToast();
      }, 1000);
    }
  }

  updatePreferences(): void {
    if (this.preferencesForm.valid) {
      this.isSubmitting = true;
      setTimeout(() => {
        this.isSubmitting = false;
        this.preferencesForm.markAsPristine();
        this.showToast();
      }, 1000);
    }
  }

  cancelForm(formName: string): void {
    if (formName === 'security') {
      this.securityForm.reset();
      this.passwordStrength = 0;
      this.strengthLabel = 'Inexistant';
      this.strengthClass = 'strength-none';
      this.passwordChecks = { length: false, number: false, symbol: false };
    } else if (formName === 'notifications') {
      this.notificationsForm.reset({
        emailPromo: true, emailTrip: true, pushNewTrip: true, pushBooking: true
      });
    } else if (formName === 'preferences') {
      this.preferencesForm.reset({
        theme: this.user?.theme || 'light',
        language: this.user?.preferredLanguage || 'FR',
        currency: 'TND'
      });
    }
  }

  triggerPhotoUpload(): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          const photoUrl = event.target.result;
          this.authService.updateProfile({ photoUrl }).subscribe({
            next: (updatedUser) => {
              this.user = updatedUser;
              this.showToast();
            },
            error: (err) => console.error('Photo upload failed', err)
          });
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  }

  removePhoto(): void {
    if (confirm('Voulez-vous vraiment supprimer votre photo de profil ?')) {
      this.authService.updateProfile({ photoUrl: '' }).subscribe({
        next: (updatedUser) => {
          this.user = updatedUser;
          this.showToast();
        },
        error: (err) => console.error('Photo removal failed', err)
      });
    }
  }

  confirmDeleteAccount(): void {
    if (confirm('Êtes-vous absolument sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
      console.log('Account deletion requested');
      // En production : appeler authService.deleteAccount()
      alert('Compte supprimé (simulation).');
      this.authService.logout();
    }
  }

  onImageError(event: any): void {
    event.target.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
  }

  formatLastPasswordUpdate(): string {
    if (!this.user?.lastPasswordUpdate) return 'Jamais';

    const lastUpdate = new Date(this.user.lastPasswordUpdate);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

    if (diffInSeconds < 60) return "À l'instant";
    if (diffInSeconds < 3600) {
      const mins = Math.floor(diffInSeconds / 60);
      return `il y a ${mins} minute${mins > 1 ? 's' : ''}`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    }
    if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `il y a ${days} jour${days > 1 ? 's' : ''}`;
    }
    
    const months = Math.floor(diffInSeconds / 2592000);
    return `il y a ${months} mois`;
  }

  // =============================================
  // 2FA Methods
  // =============================================

  init2FASetup(): void {
    this.is2FALoading = true;
    this.twoFactorError = null;
    this.twoFactorState = 'LOADING';

    this.authService.setup2FA().subscribe({
      next: (res) => {
        this.qrCodeUrl = res.qrCodeUrl;
        this.twoFactorSecret = res.secret;
        this.show2FASetup = true;
        this.is2FALoading = false;
        this.twoFactorState = 'SETUP';
      },
      error: (err) => {
        this.handle2FAError(err, "initialisation");
      }
    });
  }

  verifyAndEnable2FA(): void {
    if (this.twoFactorCode.length === 6) {
      this.is2FALoading = true;
      this.twoFactorError = null;
      this.twoFactorState = 'LOADING';

      this.authService.verify2FA(this.twoFactorCode).subscribe({
        next: (res) => {
          if (this.user) {
            this.user.twoFactorEnabled = true;
          }
          this.show2FASetup = false;
          this.twoFactorCode = '';
          this.is2FALoading = false;
          this.twoFactorState = 'IDLE';
          this.showToast();
          this.authService.getProfile().subscribe(u => this.user = u);
        },
        error: (err) => {
          this.handle2FAError(err, "vérification");
        }
      });
    }
  }

  private handle2FAError(err: any, action: string): void {
    console.error(`[2FA ${action}] Error Details:`, err);
    this.is2FALoading = false;
    this.twoFactorState = 'ERROR';

    if (err.status === 0) {
      this.twoFactorError = "Problème de connexion réseau. Veuillez vérifier votre accès internet.";
    } else if (err.status === 401) {
      this.twoFactorError = "Votre session a expiré. Veuillez vous reconnecter.";
    } else if (err.status === 500) {
      this.twoFactorError = "Erreur interne du serveur. Nos ingénieurs ont été prévenus.";
    } else {
      this.twoFactorError = err.error?.message || `Une erreur est survenue lors de la ${action} du 2FA.`;
    }
  }

  retry2FA(): void {
    this.twoFactorError = null;
    if (this.show2FASetup) {
      this.verifyAndEnable2FA();
    } else {
      this.init2FASetup();
    }
  }

  disable2FA(): void {
    if (confirm("Voulez-vous vraiment désactiver l'authentification à deux facteurs ?")) {
      this.is2FALoading = true;
      this.twoFactorError = null;
      this.authService.disable2FA().subscribe({
        next: (res) => {
          if (this.user) {
            this.user.twoFactorEnabled = false;
          }
          this.is2FALoading = false;
          this.showToast();
        },
        error: (err) => {
          this.handle2FAError(err, "désactivation");
        }
      });
    }
  }

  logoutThisDevice(deviceId: string): void {
    if (confirm("Voulez-vous déconnecter cet appareil ?")) {
      if (deviceId === 'current') {
        this.authService.logout();
      } else {
        // Simulation d'appel API pour déconnecter un autre appareil
        alert("L'appareil a été déconnecté avec succès.");
      }
    }
  }

  logoutAllDevices(): void {
    if (confirm("Voulez-vous vous déconnecter de TOUS vos appareils ? Cette action invalidera toutes vos sessions actives.")) {
      // En production : appeler un endpoint comme authService.logoutAll()
      alert("Toutes les sessions ont été invalidées. Vous allez être déconnecté.");
      this.authService.logout();
    }
  }

  isPaymentFormValid(): boolean {
    if (this.selectedPaymentMethod === 'card') {
      const bank = this.paymentForm.get('bank');
      const cardNumber = this.paymentForm.get('cardNumber');
      const cardExpiry = this.paymentForm.get('cardExpiry');
      const cardCvv = this.paymentForm.get('cardCvv');
      const cardHolder = this.paymentForm.get('cardHolder');
      return !!(bank?.valid && cardNumber?.valid && cardExpiry?.valid && cardCvv?.valid && cardHolder?.valid);
    } else if (this.selectedPaymentMethod === 'd17') {
      return !!this.paymentForm.get('d17Phone')?.valid;
    }
    return true; // cash and goride
  }

  // D17 Verification Methods (Fintech Flow)
  sendCode(): void {
    const phoneControl = this.paymentForm.get('d17Phone');
    
    if (phoneControl?.invalid) {
      this.d17Error = "Veuillez entrer un numéro valide (8 chiffres)";
      return;
    }

    this.isSendingCode = true;
    this.d17Error = null;

    // Simulation d'envoi de SMS
    setTimeout(() => {
      this.isSendingCode = false;
      this.isCodeSent = true;
      this.d17Step = 2;
    }, 2000);
  }

  verifyCode(): void {
    if (this.d17VerificationCode.length < 4) {
      this.d17Error = "Code incorrect";
      return;
    }

    this.isVerifyingCode = true;
    this.d17Error = null;

    // Simulation de vérification du code OTP
    setTimeout(() => {
      if (this.d17VerificationCode === '1234') { // Code démo
        this.isVerified = true;
        this.isVerifyingCode = false;
        this.d17Step = 3;
        this.showToast();
      } else {
        this.isVerifyingCode = false;
        this.d17Error = "Code incorrect";
      }
    }, 1800);
  }

  resetD17Flow(): void {
    this.isVerified = false;
    this.isCodeSent = false;
    this.d17Step = 1;
    this.d17VerificationCode = '';
    this.d17Error = null;
  }

  getMainPaymentButtonText(): string {
    if (this.isSendingCode) return 'Envoi du code...';
    if (this.isVerifyingCode) return 'Vérification en cours...';
    
    if (this.selectedPaymentMethod === 'd17') {
      if (this.d17Step === 1) return 'Envoyer le code';
      if (this.d17Step === 2) return 'Confirmer le code';
      return 'Compte vérifié';
    }
    
    return 'Enregistrer ma préférence';
  }

  handleMainPaymentClick(): void {
    if (this.selectedPaymentMethod === 'd17') {
      if (this.d17Step === 1) {
        this.sendCode();
        return;
      }
      if (this.d17Step === 2) {
        this.verifyCode();
        // After verification success for D17, save if driver
        if (this.authService.getActiveRole() === 'ROLE_DRIVER') {
          this.saveDriverPaymentPreference();
        }
        return;
      }
      return;
    }
    
    // For other methods
    if (this.authService.getActiveRole() === 'ROLE_DRIVER') {
      this.saveDriverPaymentPreference();
    }
    
    this.showToast();
  }

  private saveDriverPaymentPreference(): void {
    const method = this.selectedPaymentMethod;
    let details = {
      method: method,
      holder: this.user?.firstName + ' ' + this.user?.lastName,
      number: '••••',
      status: 'verified',
      typeLabel: ''
    };

    if (method === 'card') {
      const cardNum = this.paymentForm.get('cardNumber')?.value || '';
      details.number = '•••• ' + cardNum.slice(-4);
      details.typeLabel = 'Carte Bancaire';
    } else if (method === 'd17') {
      const phone = this.paymentForm.get('d17Phone')?.value || '';
      details.number = phone;
      details.typeLabel = 'D17 Poste';
    } else if (method === 'goride') {
      details.number = 'Wallet ID: ' + this.user?.id;
      details.typeLabel = 'Carte GoRide';
    } else {
      details.typeLabel = 'Espèces';
    }

    localStorage.setItem('driver_payment_preference', JSON.stringify(details));
  }

  rechargeGoRide(): void {
    this.openRechargeModal();
  }

  openRechargeModal(): void {
    this.showRechargeModal = true;
    this.rechargeStep = 1;
    this.rechargeAmount = 20; // Default amount
  }

  closeRechargeModal(): void {
    this.showRechargeModal = false;
    this.rechargeAmount = null;
    this.isProcessingRecharge = false;
  }

  confirmRecharge(): void {
    if (!this.rechargeAmount || this.rechargeAmount <= 0) return;

    this.isProcessingRecharge = true;

    // Simulation d'appel API POST /api/wallet/recharge
    setTimeout(() => {
      this.gorideBalance += this.rechargeAmount!;
      this.isProcessingRecharge = false;
      this.showRechargeModal = false;
      
      // Déclencher l'animation sur la carte
      this.isRecharging = true;
      setTimeout(() => this.isRecharging = false, 2000);
      
      this.showToast(); // Message de succès
    }, 2000);
  }

  onToggleChange(label: string, event: any): void {
    const isChecked = event.target.checked;
    const status = isChecked ? 'activée' : 'désactivée';
    // On peut utiliser le toast existant ou en créer un spécifique
    this.showToast(); 
    console.log(`${label} ${status}`);
  }

  isAutoSaving = false;
  lastSaved: Date | null = null;

  setPrincipalPaymentMethod(id: number): void {
    this.paymentService.setPrincipalMethod(id);
    this.showToast();
  }

  deletePaymentMethod(id: number): void {
    if (confirm('Voulez-vous vraiment supprimer ce moyen de paiement ?')) {
      this.paymentService.deleteMethod(id);
      this.showToast();
    }
  }

  autoSavePreferences(): void {
    if (this.preferencesForm.invalid) return;
    
    this.isAutoSaving = true;
    
    // Changement de langue réel avec TranslateService
    const lang = (this.preferencesForm.get('language')?.value || '').toString().toUpperCase();
    if (lang === 'EN') {
      this.languageService.use('en');
    } else if (lang === 'FR') {
      this.languageService.use('fr');
    }

    // Changement de thème réel
    const theme = this.preferencesForm.get('theme')?.value as ThemeMode;
    if (theme) {
      this.themeService.setTheme(theme);
    }

    setTimeout(() => {
      this.isAutoSaving = false;
      this.lastSaved = new Date();
      this.preferencesForm.markAsPristine();
    }, 1200);
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }
}
