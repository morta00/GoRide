import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyService } from '../../../services/company.service';

@Component({
  selector: 'app-company-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class CompanySettingsComponent implements OnInit {
  settings: any = {
    servicePreferences: {
      preferredServiceType: "Tous les services",
      defaultDuration: "2-3 jours",
      mainCity: "Tunis",
      maxDailyBudget: 500,
      requireApprovalBeforeReservation: true
    },
    vehiclePreferences: {
      preferredCategory: "Berline",
      defaultVehicleCount: 2,
      options: ["Assurance incluse", "Climatisation"],
      onlyVerifiedVehicles: true,
      onlyHighRatedOwners: true
    },
    driverPreferences: {
      minimumDriverRating: 4.5,
      frequentMissionType: "Transport employés",
      requireVehicleWithDriver: true,
      requireVerifiedDriver: true,
      requireBusinessExperience: true
    },
    notifications: {
      ownerAccepted: true,
      ownerRejected: true,
      driverAccepted: true,
      driverRejected: true,
      newInvoice: true,
      paymentConfirmed: true,
      newMessage: true,
      serviceCompleted: true,
      reviewReminder: true
    },
    privacy: {
      showCompanyNameToPartners: true,
      showManagerPhoneAfterAcceptance: true,
      allowDriversToContactCompany: true,
      keepConversationHistory: true,
      allowSupportAccessForIssues: true
    },
    displayAndSecurity: {
      language: "Français",
      theme: "Clair",
      textSize: "Normal",
      confirmBeforeCancel: true,
      confirmBeforePayment: true,
      paymentPinEnabled: false,
      budgetExceededAlert: true,
      missingDocumentAlert: true
    }
  };

  showToast = false;
  toastMessage = "";

  constructor(private companyService: CompanyService) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.companyService.getSettings().subscribe({
      next: (settingsStr) => {
        if (settingsStr && settingsStr !== '{}') {
          try {
            this.settings = JSON.parse(settingsStr);
          } catch(e) {
            console.error('Erreur parsing settings', e);
          }
        }
      }
    });
  }

  saveSection(section: string): void {
    console.log(`Saving ${section}...`, this.settings[section]);
    this.saveToStorage();
    this.displayToast(`Section ${this.formatSectionName(section)} enregistrée avec succès !`);
  }

  saveToStorage(): void {
    this.companyService.updateSettings(JSON.stringify(this.settings)).subscribe({
      next: () => {
        console.log('Paramètres mis à jour avec succès sur le serveur.');
      }
    });
  }

  displayToast(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  formatSectionName(key: string): string {
    const names: any = {
      servicePreferences: 'Services',
      vehiclePreferences: 'Véhicules',
      driverPreferences: 'Chauffeurs',
      notifications: 'Notifications',
      privacy: 'Confidentialité',
      displayAndSecurity: 'Affichage & Sécurité'
    };
    return names[key] || key;
  }

  toggleOption(option: string): void {
    const index = this.settings.vehiclePreferences.options.indexOf(option);
    if (index > -1) {
      this.settings.vehiclePreferences.options.splice(index, 1);
    } else {
      this.settings.vehiclePreferences.options.push(option);
    }
  }

  isOptionSelected(option: string): boolean {
    return this.settings.vehiclePreferences.options.includes(option);
  }
}
