import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ReservationSettings {
  autoBooking: boolean;
  confirmationDelay: number;       // minutes
  minDuration: number;
  minDurationUnit: string;         // 'heure' | 'jour'
  maxDuration: number;
  maxDurationUnit: string;
  allowClientCancellation: boolean;
  freeCancellationDelay: number;   // heures
  autoMessage: string;
}

interface ScheduleSettings {
  allowedStartHour: string;
  allowedEndHour: string;
  availableDays: { [key: string]: boolean };
}

interface ReturnSettings {
  [key: string]: boolean | number;
  requireCleanVehicle: boolean;
  requireFullTank: boolean;
  requirePhotosOnReturn: boolean;
  lateReturnPenalty: number;
  maxLateHours: number;
}

interface VehicleManagementSettings {
  [key: string]: boolean | number | string;
  autoAvailability: boolean;
  validateDocuments: boolean;
  maxKmPerRental: number;
  penaltyPerExtraKm: number;
  bufferTimeBetweenBookings: number;
  allowSimultaneousBookings: boolean;
  autoMaintenanceMode: boolean;
  rentalsBeforeMaintenance: number;
  autoCompressPhotos: boolean;
  imageQuality: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {

  // Toast
  showToast: boolean = false;
  toastMessage: string = '';

  // Active section
  activeSection: string = 'reservations';

  // Track unsaved changes
  hasChanges: boolean = false;

  // ===== RESERVATION SETTINGS =====
  reservation: ReservationSettings = {
    autoBooking: false,
    confirmationDelay: 60,
    minDuration: 1,
    minDurationUnit: 'jour',
    maxDuration: 30,
    maxDurationUnit: 'jour',
    allowClientCancellation: true,
    freeCancellationDelay: 24,
    autoMessage: 'Merci pour votre réservation ! Votre véhicule sera prêt à l\'heure convenue. N\'hésitez pas à me contacter pour toute question. Bonne route !'
  };

  confirmationDelayOptions = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 heure' },
    { value: 180, label: '3 heures' },
    { value: 1440, label: '24 heures' }
  ];

  freeCancellationOptions = [
    { value: 1, label: '1 heure avant' },
    { value: 3, label: '3 heures avant' },
    { value: 6, label: '6 heures avant' },
    { value: 24, label: '24 heures avant' }
  ];

  durationUnits = ['heure', 'jour'];

  // ===== SCHEDULE SETTINGS =====
  schedule: ScheduleSettings = {
    allowedStartHour: '08:00',
    allowedEndHour: '20:00',
    availableDays: {
      'Lundi': true,
      'Mardi': true,
      'Mercredi': true,
      'Jeudi': true,
      'Vendredi': true,
      'Samedi': true,
      'Dimanche': false
    }
  };

  daysOfWeek: string[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  // ===== RETURN SETTINGS =====
  returnRules: ReturnSettings = {
    requireCleanVehicle: true,
    requireFullTank: true,
    requirePhotosOnReturn: false,
    lateReturnPenalty: 15,
    maxLateHours: 6
  };

  // ===== VEHICLE MANAGEMENT SETTINGS =====
  vehicleMgmt: VehicleManagementSettings = {
    autoAvailability: true,
    validateDocuments: true,
    maxKmPerRental: 300,
    penaltyPerExtraKm: 0.5,
    bufferTimeBetweenBookings: 60,
    allowSimultaneousBookings: false,
    autoMaintenanceMode: true,
    rentalsBeforeMaintenance: 10,
    autoCompressPhotos: true,
    imageQuality: 'optimisee'
  };

  bufferTimeOptions = [
    { value: 0, label: 'Aucun' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 heure' },
    { value: 120, label: '2 heures' },
    { value: 1440, label: '1 jour' }
  ];

  imageQualityOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'haute', label: 'Haute' },
    { value: 'optimisee', label: 'Optimisée web' }
  ];

  // ===== METHODS =====
  onSettingChange(): void {
    this.hasChanges = true;
  }

  toggleDay(day: string): void {
    this.schedule.availableDays[day] = !this.schedule.availableDays[day];
    this.onSettingChange();
  }

  get activeDaysCount(): number {
    return Object.values(this.schedule.availableDays).filter(v => v).length;
  }

  get autoMessageLength(): number {
    return this.reservation.autoMessage.length;
  }

  saveSettings(): void {
    this.hasChanges = false;
    this.showSuccessToast('Paramètres enregistrés avec succès !');
  }

  resetSettings(): void {
    this.reservation = {
      autoBooking: false,
      confirmationDelay: 60,
      minDuration: 1,
      minDurationUnit: 'jour',
      maxDuration: 30,
      maxDurationUnit: 'jour',
      allowClientCancellation: true,
      freeCancellationDelay: 24,
      autoMessage: 'Merci pour votre réservation ! Votre véhicule sera prêt à l\'heure convenue. N\'hésitez pas à me contacter pour toute question. Bonne route !'
    };
    this.schedule = {
      allowedStartHour: '08:00',
      allowedEndHour: '20:00',
      availableDays: {
        'Lundi': true,
        'Mardi': true,
        'Mercredi': true,
        'Jeudi': true,
        'Vendredi': true,
        'Samedi': true,
        'Dimanche': false
      }
    };
    this.returnRules = {
      requireCleanVehicle: true,
      requireFullTank: true,
      requirePhotosOnReturn: false,
      lateReturnPenalty: 15,
      maxLateHours: 6
    };
    this.vehicleMgmt = {
      autoAvailability: true,
      validateDocuments: true,
      maxKmPerRental: 300,
      penaltyPerExtraKm: 0.5,
      bufferTimeBetweenBookings: 60,
      allowSimultaneousBookings: false,
      autoMaintenanceMode: true,
      rentalsBeforeMaintenance: 10,
      autoCompressPhotos: true,
      imageQuality: 'optimisee'
    };
    this.hasChanges = false;
    this.showSuccessToast('Paramètres réinitialisés.');
  }

  showSuccessToast(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }
}
