import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CompanyService } from '../../../services/company.service';
import { RentalService } from '../../../services/rental.service';

@Component({
  selector: 'app-request-service',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './request-service.component.html',
  styleUrls: ['./request-service.component.css']
})
export class RequestServiceComponent implements OnInit {
  activeSection: 'NONE' | 'VEHICLES' | 'DRIVERS' | 'CUSTOM' = 'NONE';
  
  availableVehicles: any[] = [];
  availableDrivers: any[] = [];
  
  vehicleSearch = '';
  driverSearch = '';
  
  selectedVehicle: any = null;
  selectedDriver: any = null;
  showDetailsModal = false;
  showRequestModal = false;
  successMessage = '';

  vehicleRequest = {
    quantity: 1,
    startDate: '',
    endDate: '',
    city: '',
    budget: null,
    comment: ''
  };

  driverRequest = {
    missionType: '',
    city: '',
    startDate: '',
    endDate: '',
    startTime: '',
    days: 1,
    passengers: 1,
    budget: null,
    comment: ''
  };

  customRequest = {
    needType: 'Service mixte',
    city: '',
    vehiclesCount: 1,
    driversCount: 1,
    vehicleType: 'Berline',
    startDate: '',
    endDate: '',
    budget: null,
    description: '',
    contactPerson: 'Achref Ouhichi'
  };

  vehicleErrors: any = {};
  driverErrors: any = {};
  customErrors: any = {};

  constructor(
    private router: Router,
    private companyService: CompanyService,
    private rentalService: RentalService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.applySettings();
  }

  applySettings(): void {
    this.companyService.getSettings().subscribe({
      next: (settingsStr) => {
        if (settingsStr && settingsStr !== '{}') {
          const settings = JSON.parse(settingsStr);
          
          if (settings.servicePreferences) {
            this.vehicleRequest.city = settings.servicePreferences.mainCity;
            this.vehicleRequest.budget = settings.servicePreferences.maxDailyBudget;
            this.driverRequest.city = settings.servicePreferences.mainCity;
            this.driverRequest.budget = settings.servicePreferences.maxDailyBudget;
            this.customRequest.city = settings.servicePreferences.mainCity;
            this.customRequest.budget = settings.servicePreferences.maxDailyBudget;
            this.customRequest.needType = settings.servicePreferences.preferredServiceType || 'Service mixte';
          }
          if (settings.vehiclePreferences) {
            this.vehicleRequest.quantity = settings.vehiclePreferences.defaultVehicleCount || 1;
            this.customRequest.vehicleType = settings.vehiclePreferences.preferredCategory || 'Berline';
            this.customRequest.vehiclesCount = settings.vehiclePreferences.defaultVehicleCount || 1;
          }
          if (settings.driverPreferences) {
            this.driverRequest.missionType = settings.driverPreferences.frequentMissionType || 'Transport employés';
          }
        }
      }
    });
  }

  loadInitialData(): void {
    this.rentalService.getAvailableVehicles().subscribe({
      next: (vehicles) => {
        this.availableVehicles = (vehicles || []).map((v: any) => ({
          id: v.id,
          vehicleName: `${v.brand || ''} ${v.model || ''}`.trim() || 'Véhicule',
          category: v.category || v.type || 'SUV',
          ownerName: v.owner ? (v.owner.firstName + ' ' + v.owner.lastName) : 'Agence GoRide',
          city: v.location || 'Tunis',
          pricePerDay: v.dailyPrice ?? v.pricePerDay ?? 120,
          availableQuantity: 1,
          rating: v.rating ?? 4.5,
          features: ['Climatisation', 'GPS', 'Assurance'],
          status: v.status || 'AVAILABLE'
        }));
      },
      error: () => {
        this.availableVehicles = [];
      }
    });

    this.companyService.getAvailableDrivers().subscribe({
      next: (drivers) => {
        this.availableDrivers = (drivers || []).map((d: any) => ({
          id: d.id,
          driverName: d.firstName + ' ' + d.lastName,
          vehicleName: 'Véhicule Partenaire',
          city: 'Tunis',
          rating: 4.9,
          tripsCount: 150,
          pricePerDay: 130,
          availability: 'Disponible',
          vehicleType: 'Berline',
          services: ['Transport employés', 'Missions VIP', 'Aéroport']
        }));
      }
    });
  }

  setSection(section: any): void {
    this.activeSection = section;
    this.successMessage = '';
    this.clearErrors();
  }

  goToVehicleCatalog(): void {
    this.router.navigate(['/company/vehicles-catalog']);
  }

  openDetails(item: any, type: 'VEHICLE' | 'DRIVER'): void {
    if (type === 'VEHICLE') this.selectedVehicle = item;
    else this.selectedDriver = item;
    this.showDetailsModal = true;
  }

  openRequestForm(item: any, type: 'VEHICLE' | 'DRIVER'): void {
    this.clearErrors();
    if (type === 'VEHICLE') {
      this.selectedVehicle = item;
      this.vehicleRequest = { quantity: 1, startDate: '', endDate: '', city: item.city, budget: null, comment: '' };
    } else {
      this.selectedDriver = item;
      this.driverRequest = { missionType: 'Transport employés', city: item.city, startDate: '', endDate: '', startTime: '08:00', days: 1, passengers: 1, budget: null, comment: '' };
    }
    this.showRequestModal = true;
  }

  closeModals(): void {
    this.showDetailsModal = false;
    this.showRequestModal = false;
    this.selectedVehicle = null;
    this.selectedDriver = null;
    this.clearErrors();
  }

  clearErrors(): void {
    this.vehicleErrors = {};
    this.driverErrors = {};
    this.customErrors = {};
  }

  validateVehicleRequest(): boolean {
    this.clearErrors();
    let isValid = true;
    
    if (this.vehicleRequest.quantity == null || this.vehicleRequest.quantity.toString() === '') {
      this.vehicleErrors.quantity = "La quantité est obligatoire.";
      isValid = false;
    } else if (this.vehicleRequest.quantity <= 0) {
      this.vehicleErrors.quantity = "La quantité doit être supérieure à 0.";
      isValid = false;
    }

    if (!this.vehicleRequest.city || this.vehicleRequest.city.trim() === '') {
      this.vehicleErrors.city = "La ville est obligatoire.";
      isValid = false;
    }

    if (!this.vehicleRequest.startDate) {
      this.vehicleErrors.startDate = "La date de début est obligatoire.";
      isValid = false;
    }

    if (!this.vehicleRequest.endDate) {
      this.vehicleErrors.endDate = "La date de fin est obligatoire.";
      isValid = false;
    }

    if (this.vehicleRequest.startDate && this.vehicleRequest.endDate && this.vehicleRequest.endDate < this.vehicleRequest.startDate) {
      this.vehicleErrors.endDate = "La date de fin doit être après la date de début.";
      isValid = false;
    }

    return isValid;
  }
  
  validateDriverRequest(): boolean {
    this.clearErrors();
    let isValid = true;

    if (!this.driverRequest.missionType || this.driverRequest.missionType.trim() === '') {
      this.driverErrors.missionType = "Le type de mission est obligatoire.";
      isValid = false;
    }

    if (!this.driverRequest.city || this.driverRequest.city.trim() === '') {
      this.driverErrors.city = "La ville est obligatoire.";
      isValid = false;
    }

    if (!this.driverRequest.startDate) {
      this.driverErrors.startDate = "La date de début est obligatoire.";
      isValid = false;
    }

    if (!this.driverRequest.endDate) {
      this.driverErrors.endDate = "La date de fin est obligatoire.";
      isValid = false;
    }

    if (this.driverRequest.startDate && this.driverRequest.endDate && this.driverRequest.endDate < this.driverRequest.startDate) {
      this.driverErrors.endDate = "La date de fin doit être après la date de début.";
      isValid = false;
    }

    if (!this.driverRequest.startTime) {
      this.driverErrors.startTime = "L'heure de début est obligatoire.";
      isValid = false;
    }

    if (this.driverRequest.passengers == null || this.driverRequest.passengers <= 0) {
      this.driverErrors.passengers = "Le nombre de passagers doit être supérieur à 0.";
      isValid = false;
    }

    return isValid;
  }

  validateCustomRequest(): boolean {
    this.clearErrors();
    let isValid = true;

    if (!this.customRequest.needType || this.customRequest.needType.trim() === '') {
      this.customErrors.needType = "Le type de besoin est obligatoire.";
      isValid = false;
    }

    if (!this.customRequest.city || this.customRequest.city.trim() === '') {
      this.customErrors.city = "La ville est obligatoire.";
      isValid = false;
    }

    if (!this.customRequest.startDate) {
      this.customErrors.startDate = "La date de début est obligatoire.";
      isValid = false;
    }

    if (!this.customRequest.endDate) {
      this.customErrors.endDate = "La date de fin est obligatoire.";
      isValid = false;
    }

    if (this.customRequest.startDate && this.customRequest.endDate && this.customRequest.endDate < this.customRequest.startDate) {
      this.customErrors.endDate = "La date de fin doit être après la date de début.";
      isValid = false;
    }

    if (!this.customRequest.description || this.customRequest.description.trim() === '') {
      this.customErrors.description = "La description est obligatoire.";
      isValid = false;
    }

    return isValid;
  }

  submitVehicleRequest(): void {
    if (!this.validateVehicleRequest()) {
      return;
    }

    const rentalPayload = {
      vehicleId: this.selectedVehicle.id,
      startDate: this.vehicleRequest.startDate,
      endDate: this.vehicleRequest.endDate,
      proposedPrice: this.vehicleRequest.budget ?? this.selectedVehicle.pricePerDay,
      clientNotes: this.vehicleRequest.comment,
      pickupLocation: this.vehicleRequest.city,
      returnLocation: this.vehicleRequest.city
    };

    this.rentalService.bookVehicle(rentalPayload).subscribe({
      next: () => {
        this.successMessage = 'Demande envoyée au propriétaire.';
        this.closeModals();
        this.router.navigate(['/company/requests']);
      },
      error: (err) => {
        alert('Erreur: ' + (err.error?.message || err.message || 'Impossible d\'envoyer la demande'));
      }
    });
  }

  submitDriverRequest(): void {
    if (!this.validateDriverRequest()) {
      return;
    }

    const newRequest = {
      type: "DRIVER_WITH_CAR",
      targetRole: "DRIVER",
      driverId: this.selectedDriver.id,
      driverName: this.selectedDriver.driverName,
      vehicleName: this.selectedDriver.vehicleName,
      city: this.driverRequest.city,
      missionType: this.driverRequest.missionType,
      startDate: this.driverRequest.startDate,
      endDate: this.driverRequest.endDate,
      startTime: this.driverRequest.startTime,
      estimatedPassengers: this.driverRequest.passengers,
      pricePerDay: this.selectedDriver.pricePerDay,
      budget: this.driverRequest.budget,
      comment: this.driverRequest.comment
    };

    this.companyService.createServiceRequest(newRequest).subscribe({
      next: () => {
        this.successMessage = 'Demande envoyée au chauffeur.';
        this.closeModals();
        setTimeout(() => this.successMessage = '', 3000);
      }
    });
  }

  submitCustomRequest(): void {
    if (!this.validateCustomRequest()) {
      return;
    }

    const newRequest = {
      type: "CUSTOM_REQUEST",
      needType: this.customRequest.needType,
      city: this.customRequest.city,
      vehiclesCount: this.customRequest.vehiclesCount,
      driversCount: this.customRequest.driversCount,
      vehicleType: this.customRequest.vehicleType,
      startDate: this.customRequest.startDate,
      endDate: this.customRequest.endDate,
      budget: this.customRequest.budget,
      description: this.customRequest.description,
      contactPerson: this.customRequest.contactPerson
    };

    this.companyService.createServiceRequest(newRequest).subscribe({
      next: () => {
        this.successMessage = 'Votre demande personnalisée a été envoyée.';
        this.activeSection = 'NONE';
        setTimeout(() => this.successMessage = '', 3000);
      }
    });
  }

  get filteredVehicles() {
    return this.availableVehicles.filter(v => 
      v.vehicleName.toLowerCase().includes(this.vehicleSearch.toLowerCase()) ||
      v.ownerName.toLowerCase().includes(this.vehicleSearch.toLowerCase()) ||
      v.city.toLowerCase().includes(this.vehicleSearch.toLowerCase()) ||
      v.category.toLowerCase().includes(this.vehicleSearch.toLowerCase())
    );
  }

  get filteredDrivers() {
    return this.availableDrivers.filter(d => 
      d.driverName.toLowerCase().includes(this.driverSearch.toLowerCase()) ||
      d.vehicleName.toLowerCase().includes(this.driverSearch.toLowerCase()) ||
      d.city.toLowerCase().includes(this.driverSearch.toLowerCase())
    );
  }
}
