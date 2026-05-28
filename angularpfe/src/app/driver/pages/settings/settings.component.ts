// Settings Component
import { Component, OnInit, OnDestroy } from '@angular/core';
import { DriverSettingsService } from '../../services/driver-settings.service';
import { FullDriverSettings } from '../../models/driver.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit, OnDestroy {
  activeTab: string = 'availability';
  settings!: FullDriverSettings;
  private sub: Subscription = new Subscription();

  successMessage: string | null = null;
  showResetModal: boolean = false;

  constructor(private settingsService: DriverSettingsService) {}

  ngOnInit(): void {
    this.sub.add(
      this.settingsService.settings$.subscribe(data => {
        // Deep copy to avoid direct mutation before saving
        this.settings = JSON.parse(JSON.stringify(data));
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  setTab(tab: string): void {
    this.activeTab = tab;
  }

  saveAvailability(): void {
    this.settingsService.saveAvailabilitySettings(this.settings.availability);
    this.showSuccess('Disponibilité enregistrée avec succès.');
  }

  saveTripPreferences(): void {
    this.settingsService.saveTripPreferences(this.settings.tripPreferences);
    this.showSuccess('Préférences de trajets enregistrées.');
  }

  saveRequestSettings(): void {
    this.settingsService.saveRequestSettings(this.settings.requestSettings);
    this.showSuccess('Paramètres des demandes enregistrés.');
  }

  saveNotifications(): void {
    this.settingsService.saveNotificationSettings(this.settings.notifications);
    this.showSuccess('Préférences de notifications enregistrées.');
  }

  savePrivacy(): void {
    this.settingsService.savePrivacySettings(this.settings.privacy);
    this.showSuccess('Paramètres de confidentialité enregistrés.');
  }

  saveApp(): void {
    this.settingsService.saveAppSettings(this.settings.app);
    this.showSuccess('Paramètres de l\'application enregistrés.');
  }

  openResetModal(): void {
    this.showResetModal = true;
  }

  closeResetModal(): void {
    this.showResetModal = false;
  }

  confirmReset(): void {
    this.settingsService.resetSettings();
    this.closeResetModal();
    this.showSuccess('Tous les paramètres ont été réinitialisés.');
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    setTimeout(() => this.successMessage = null, 3000);
  }
}
