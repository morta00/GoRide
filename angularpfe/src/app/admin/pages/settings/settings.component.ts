import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admin-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  activeTab: string = 'general';
  settings: any = {};
  errors: any = {};
  showExportModal: boolean = false;
  exportData: string = '';

  defaultSettings = {
    general: {
      platformName: 'GoRide',
      country: 'Tunisie',
      currency: 'DT',
      language: 'Français',
      timezone: 'Africa/Tunis',
      supportEmail: 'support@goride.tn',
      supportPhone: '+216 70 000 000'
    },
    commissions: {
      passengerRide: 15,
      sharedTrip: 10,
      vehicleRental: 10,
      companyDriver: 15,
      companyVehicle: 12
    },
    services: {
      minDelayPassenger: 10,
      minDelayRental: 120,
      minDelayCompany: 1440,
      maxWaitDriver: 15,
      freeCancelTime: 30,
      lateCancelFee: 10,
      maxPassengerRide: 4,
      maxPassengerShared: 6,
      allowImmediate: true,
      allowShared: true,
      allowRental: true,
      allowCompany: true,
      allowCash: true
    },
    validations: {
      requireDriverValidation: true,
      requireOwnerValidation: true,
      requireCompanyValidation: true,
      requireVehicleValidation: true,
      requireDocumentValidation: true,
      autoPassengerValidation: true,
      targetProfessional: 24,
      targetVehicle: 48,
      targetDocument: 24
    },
    payments: {
      methods: {
        card: true,
        cash: true,
        transfer: true,
        wallet: true,
        invoice: true
      },
      requirePrepayCompany: false,
      autoInvoice: true,
      autoRefund: true,
      refundDelay: 3,
      lateInvoiceAlert: 7
    },
    notifications: {
      admin: {
        newValidation: true,
        newPayment: true,
        lateInvoice: true,
        newReport: true,
        newComplaint: true,
        newSupport: true,
        serviceIssue: true,
        reportedReview: true,
        failedPayment: true
      },
      channels: {
        dashboard: true,
        email: true,
        sms: false
      }
    },
    security: {
      sessionDuration: 60,
      twoFactor: false,
      maxAttempts: 5,
      lockoutDuration: 30,
      logAdminActions: true,
      alertSuspicious: true,
      allowPermanentDelete: false
    },
    maintenance: {
      enabled: false,
      message: 'GoRide est temporairement en maintenance. Merci de réessayer plus tard.',
      allowAdminAccess: true,
      blockReservations: true,
      blockPayments: true
    }
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.http.get<any>(`${environment.apiUrl}/admin/settings`).subscribe({
      next: (data) => {
        this.settings = data || JSON.parse(JSON.stringify(this.defaultSettings));
      },
      error: (err) => {
        console.error('Error loading settings:', err);
        this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
        this.saveSettings();
      }
    });
  }

  saveSettings(): void {
    this.http.put<any>(`${environment.apiUrl}/admin/settings`, this.settings).subscribe({
      next: () => {
        console.log('Settings saved successfully');
      },
      error: (err) => console.error('Error saving settings:', err)
    });
  }

  saveSection(section: string): void {
    if (this.validateSection(section)) {
      this.saveSettings();
      alert(`Paramètres ${section} enregistrés avec succès !`);
    }
  }

  saveAll(): void {
    let allValid = true;
    ['general', 'commissions', 'services', 'validations', 'payments', 'notifications', 'security', 'maintenance'].forEach(s => {
      if (!this.validateSection(s)) allValid = false;
    });

    if (allValid) {
      this.saveSettings();
      alert('Tous les paramètres ont été enregistrés !');
    } else {
      alert('Veuillez corriger les erreurs avant d’enregistrer.');
    }
  }

  validateSection(section: string): boolean {
    this.errors[section] = {};
    let isValid = true;

    if (section === 'commissions') {
      const comms = this.settings.commissions;
      Object.keys(comms).forEach(k => {
        if (comms[k] < 0 || comms[k] > 50) {
          this.errors.commissions[k] = 'La commission doit être entre 0 et 50%';
          isValid = false;
        }
      });
    }

    if (section === 'services') {
      const serv = this.settings.services;
      if (serv.minDelayPassenger < 0) { this.errors.services.minDelayPassenger = 'Doit être >= 0'; isValid = false; }
      if (serv.lateCancelFee < 0) { this.errors.services.lateCancelFee = 'Doit être >= 0'; isValid = false; }
    }

    if (section === 'payments') {
      if (this.settings.payments.refundDelay < 0) { this.errors.payments.refundDelay = 'Doit être >= 0'; isValid = false; }
    }

    return isValid;
  }

  resetToDefault(): void {
    if (confirm('Voulez-vous vraiment réinitialiser TOUS les paramètres ? Cette action est irréversible.')) {
      this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
      this.saveSettings();
      alert('Paramètres réinitialisés par défaut.');
    }
  }

  exportConfig(): void {
    this.exportData = JSON.stringify(this.settings, null, 2);
    this.showExportModal = true;
  }

  closeExport(): void {
    this.showExportModal = false;
  }

  copyExport(): void {
    navigator.clipboard.writeText(this.exportData);
    alert('Configuration copiée dans le presse-papier !');
  }

  toggleMaintenance(): void {
    this.settings.maintenance.enabled = !this.settings.maintenance.enabled;
    this.saveSettings();
  }
}
