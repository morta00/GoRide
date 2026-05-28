import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, ClientSettings } from '../../../services/settings.service';
import { RoleService } from '../../../auth/role.service';
import { LanguageService } from '../../../i18n/language.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  isTenantMode = false;
  
  // Passenger settings (local storage)
  settings: any = {
    ridePreferences: {
      preferredRideType: "BOTH",
      defaultPassengers: 1,
      preferredPaymentMethod: "Carte bancaire",
      favoriteExtras: ["Bagages"]
    },
    searchPreferences: {
      searchRadius: 5,
      priority: "Chauffeur le plus proche",
      onlyHighRatedDrivers: true,
      showCollaborativeRides: true,
      hideDriversWithoutReviews: false
    },
    notifications: {
      driverAccepted: true,
      driverArriving: true,
      newMessage: true,
      paymentConfirmed: true,
      rideCompleted: true,
      reviewReminder: true,
      offers: false
    },
    privacy: {
      shareLocationDuringRide: true,
      allowDriverPhoneVisibility: true,
      hideFullName: false,
      keepConversationHistory: true,
      allowSupportNotifications: true
    },
    display: {
      language: "Français",
      theme: "Clair",
      textSize: "Normal"
    },
    security: {
      confirmBeforeCancel: true,
      confirmBeforePayment: true,
      paymentPinEnabled: false,
      unusualRideAlert: true
    }
  };

  // Tenant settings (from backend ClientSettings table)
  rentalSettings: ClientSettings = {
    defaultPickupLocation: '',
    defaultReturnLocation: '',
    preferredVehicleType: 'Berline',
    preferredTransmission: 'Manuelle',
    preferredFuelType: 'Essence',
    maxBudgetPerDay: 150,
    preferredRentalDuration: '1 semaine',
    airConditioning: true,
    gps: true,
    babySeat: false,
    largeTrunk: false,
    unlimitedMileage: true,
    onlyAvailableVehicles: true,
    sortByPrice: true,
    proximitySearch: false,
    bestRatedFirst: true,
    insuranceIncluded: true,
    reservationNotifications: true,
    returnReminderNotifications: true,
    messageNotifications: true,
    emailNotifications: true,
    allowLocation: true,
    shareProfileWithOwners: true,
    showFullName: true
  };

  messages: any = {
    ride: '',
    search: '',
    notifications: '',
    privacy: '',
    display: '',
    security: '',
    rental: '',
    rentalSearch: '',
    rentalNotif: '',
    rentalPrivacy: ''
  };

  availableExtras = [
    { id: 'Bagages', label: 'Bagages' },
    { id: 'Animal', label: 'Animal' },
    { id: 'Siège enfant', label: 'Siège enfant' },
    { id: 'Arrêt supplémentaire', label: 'Arrêt supplémentaire' },
    { id: 'Attente chauffeur', label: 'Attente chauffeur' }
  ];

  constructor(
    private settingsService: SettingsService,
    private roleService: RoleService,
    private languageService: LanguageService
  ) { }

  ngOnInit(): void {
    this.roleService.activeRole$.subscribe(role => {
      this.isTenantMode = role === 'ROLE_CLIENT';
      if (this.isTenantMode) {
        this.loadRentalSettings();
      } else {
        this.loadPassengerSettings();
      }
    });
  }

  loadPassengerSettings(): void {
    const stored = localStorage.getItem('client_settings');
    if (stored) {
      this.settings = JSON.parse(stored);
    } else {
      localStorage.setItem('client_settings', JSON.stringify(this.settings));
    }
    this.syncLanguageDisplay();
    this.applyDisplayLanguage();
  }

  private syncLanguageDisplay(): void {
    const stored = this.settings.display?.language;
    if (stored === 'en' || stored === 'fr') {
      return;
    }
    this.settings.display.language = this.languageService.current;
  }

  applyDisplayLanguage(): void {
    const lang = (this.settings.display?.language || '').toString();
    if (lang === 'en' || lang === 'Anglais' || lang === 'English') {
      this.languageService.use('en');
      this.settings.display.language = 'en';
    } else {
      this.languageService.use('fr');
      this.settings.display.language = 'fr';
    }
  }

  loadRentalSettings(): void {
    this.settingsService.getClientSettings().subscribe({
      next: (data) => {
        if (data) {
          this.rentalSettings = data;
        }
      },
      error: (err) => console.error('Error loading rental settings from backend', err)
    });
  }

  saveSection(section: string): void {
    if (this.isTenantMode) {
      this.saveRentalSection(section);
    } else {
      if (section === 'display') {
        this.applyDisplayLanguage();
        this.syncLanguageDisplay();
      }
      localStorage.setItem('client_settings', JSON.stringify(this.settings));
      this.showSuccess(section);
    }
  }

  saveRentalSection(section: string): void {
    if (section === 'rental') {
      this.settingsService.saveRentalPreferences(this.rentalSettings).subscribe({
        next: (updated) => {
          this.rentalSettings = updated;
          this.showSuccess('rental');
        },
        error: (err) => console.error('Error saving rental preferences', err)
      });
    } else if (section === 'rentalSearch') {
      this.settingsService.saveSearchPreferences(this.rentalSettings).subscribe({
        next: (updated) => {
          this.rentalSettings = updated;
          this.showSuccess('rentalSearch');
        },
        error: (err) => console.error('Error saving rental search preferences', err)
      });
    } else if (section === 'rentalNotif') {
      this.settingsService.saveNotificationPreferences(this.rentalSettings).subscribe({
        next: (updated) => {
          this.rentalSettings = updated;
          this.showSuccess('rentalNotif');
        },
        error: (err) => console.error('Error saving rental notification preferences', err)
      });
    } else if (section === 'rentalPrivacy') {
      this.settingsService.savePrivacySettings(this.rentalSettings).subscribe({
        next: (updated) => {
          this.rentalSettings = updated;
          this.showSuccess('rentalPrivacy');
        },
        error: (err) => console.error('Error saving rental privacy settings', err)
      });
    }
  }

  showSuccess(section: string): void {
    this.messages[section] = "Paramètres enregistrés avec succès !";
    setTimeout(() => this.messages[section] = '', 3000);
  }

  toggleExtra(extraId: string): void {
    const extras = this.settings.ridePreferences.favoriteExtras;
    const index = extras.indexOf(extraId);
    if (index > -1) {
      extras.splice(index, 1);
    } else {
      extras.push(extraId);
    }
  }

  isExtraSelected(extraId: string): boolean {
    return this.settings.ridePreferences.favoriteExtras.includes(extraId);
  }
}
