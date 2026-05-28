import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { 
  FullDriverSettings, 
  DriverAvailabilitySettings,
  DriverTripPreferences,
  DriverRequestSettings,
  DriverNotificationSettings,
  DriverPrivacySettings,
  DriverAppSettings
} from '../models/driver.models';

@Injectable({
  providedIn: 'root'
})
export class DriverSettingsService {
  private readonly STORAGE_KEY = 'driver_settings';

  private defaultSettings: FullDriverSettings = {
    availability: {
      autoOnline: false,
      workingDays: [
        { day: 'Lundi', active: true },
        { day: 'Mardi', active: true },
        { day: 'Mercredi', active: true },
        { day: 'Jeudi', active: true },
        { day: 'Vendredi', active: true },
        { day: 'Samedi', active: true },
        { day: 'Dimanche', active: false }
      ],
      startTime: '08:00',
      endTime: '18:00',
      autoBreak: true,
      mainZone: 'Tunis',
      workRadius: 15
    },
    tripPreferences: {
      sharedTrips: true,
      companyMissions: true,
      longDistance: false,
      minDistance: 2,
      maxDistance: 50,
      minPrice: 8,
      maxPassengers: 4
    },
    requestSettings: {
      autoAccept: false,
      minPassengerRating: 4,
      rejectOutOfZone: true,
      maxWaitingTime: 10,
      immediateRequests: true,
      scheduledRequests: true
    },
    notifications: {
      newRequest: true,
      newMessage: true,
      paymentReceived: true,
      withdrawalStatus: true,
      reviewReceived: true,
      companyOffer: true,
      documentStatus: true,
      availabilityReminder: false,
      app: true,
      email: true,
      sms: false
    },
    privacy: {
      showPhone: false,
      showVehicle: true,
      showRating: true,
      allowCompanyContact: true,
      allowPerformanceData: true,
      hideProfileOffline: false
    },
    app: {
      language: 'Français',
      theme: 'Clair',
      timeFormat: '24h',
      distanceUnit: 'km',
      currency: 'DT'
    }
  };

  private settingsSubject = new BehaviorSubject<FullDriverSettings>(this.loadSettings());
  settings$ = this.settingsSubject.asObservable();

  constructor() {}

  private loadSettings(): FullDriverSettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error parsing settings', e);
      localStorage.removeItem(this.STORAGE_KEY);
    }
    return JSON.parse(JSON.stringify(this.defaultSettings));
  }

  getSettings(): Observable<FullDriverSettings> {
    return this.settings$;
  }

  saveAvailabilitySettings(data: DriverAvailabilitySettings): void {
    const current = this.settingsSubject.value;
    current.availability = data;
    this.saveAll(current);
  }

  saveTripPreferences(data: DriverTripPreferences): void {
    const current = this.settingsSubject.value;
    current.tripPreferences = data;
    this.saveAll(current);
  }

  saveRequestSettings(data: DriverRequestSettings): void {
    const current = this.settingsSubject.value;
    current.requestSettings = data;
    this.saveAll(current);
  }

  saveNotificationSettings(data: DriverNotificationSettings): void {
    const current = this.settingsSubject.value;
    current.notifications = data;
    this.saveAll(current);
  }

  savePrivacySettings(data: DriverPrivacySettings): void {
    const current = this.settingsSubject.value;
    current.privacy = data;
    this.saveAll(current);
  }

  saveAppSettings(data: DriverAppSettings): void {
    const current = this.settingsSubject.value;
    current.app = data;
    this.saveAll(current);
  }

  resetSettings(): void {
    const defaultCopy = JSON.parse(JSON.stringify(this.defaultSettings));
    this.saveAll(defaultCopy);
  }

  private saveAll(settings: FullDriverSettings): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    this.settingsSubject.next(settings);
  }
}
