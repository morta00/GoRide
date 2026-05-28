import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PartnerVehicleService, PartnerVehicle } from '../../services/partner-vehicle.service';

@Component({
  selector: 'app-vehicle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicle.component.html',
  styleUrls: ['./vehicle.component.css']
})
export class VehicleComponent implements OnInit {
  readonly MODE_OWN = 'OWN_VEHICLE';
  readonly MODE_PARTNER = 'PLATFORM_RENTAL';

  vehicleWorkMode: string = this.MODE_OWN;
  isConfigured = false;
  
  personalVehicle = {
    brand: '',
    model: '',
    year: 2022,
    plateNumber: '',
    color: 'Gris',
    fuelType: 'Essence',
    transmission: 'Manuelle',
    seats: 4,
    mileage: 0,
    status: 'Non configuré'
  };
  
  selectedPartnerVehicle: PartnerVehicle | null = null;
  
  // Real documents and history from backend
  documents: any[] = [];
  history: any[] = [];
  
  isLoading = true;
  showPersonalModal = false;
  successMessage: string | null = null;

  constructor(
    private partnerService: PartnerVehicleService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.isLoading = true;
    this.partnerService.getWorkVehicle().subscribe({
      next: (res) => {
        if (res && res.configured && res.vehicle) {
          this.isConfigured = true;
          if (res.mode === 'OWN_VEHICLE') {
            this.vehicleWorkMode = this.MODE_OWN;
            this.personalVehicle = {
              brand: res.vehicle.brand,
              model: res.vehicle.model,
              year: (res.vehicle as any).year || 2022,
              plateNumber: res.vehicle.licensePlate,
              color: (res.vehicle as any).color || 'Non renseigné',
              fuelType: (res.vehicle as any).fuelType || 'Non renseigné',
              transmission: (res.vehicle as any).transmission || 'Non renseigné',
              seats: (res.vehicle as any).seats || 4,
              mileage: (res.vehicle as any).mileage || 0,
              status: 'Validé'
            };
          } else if (res.mode === 'RENTED_VEHICLE') {
            this.vehicleWorkMode = this.MODE_PARTNER;
            this.selectedPartnerVehicle = {
              id: res.vehicle.id,
              name: `${res.vehicle.brand} ${res.vehicle.model}`,
              category: 'Standard',
              location: 'Tunis',
              image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=500&auto=format&fit=crop',
              type: (res.vehicle as any).transmission || 'Automatique',
              fuel: (res.vehicle as any).fuelType || 'Essence',
              seats: (res.vehicle as any).seats || 5,
              rating: 4.8,
              agency: res.vehicle.ownerName || 'Agence GoRide',
              dailyPrice: 120,
              driverPrice: 86,
              discount: 28,
              description: 'Véhicule loué auprès de la plateforme pour travailler.',
              status: 'rented'
            };
          }
        } else {
          this.isConfigured = false;
          this.personalVehicle = {
            brand: '',
            model: '',
            year: 2022,
            plateNumber: '',
            color: 'Gris',
            fuelType: 'Essence',
            transmission: 'Manuelle',
            seats: 4,
            mileage: 0,
            status: 'Non configuré'
          };
          this.selectedPartnerVehicle = null;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading work vehicle:', err);
        this.isConfigured = false;
        this.isLoading = false;
      }
    });

    // Fetch real documents
    this.partnerService.getDriverDocuments().subscribe({
      next: (docs) => {
        this.documents = docs || [];
      },
      error: (err) => {
        console.error('Error loading documents:', err);
      }
    });

    // Fetch real history
    this.partnerService.getVehicleHistory().subscribe({
      next: (hist) => {
        this.history = hist || [];
      },
      error: (err) => {
        console.error('Error loading history:', err);
      }
    });
  }

  setWorkMode(mode: string): void {
    this.vehicleWorkMode = mode;
  }

  openPersonalModal(): void {
    this.showPersonalModal = true;
  }

  closePersonalModal(): void {
    this.showPersonalModal = false;
  }

  savePersonalVehicle(): void {
    if (!this.personalVehicle.brand || !this.personalVehicle.brand.trim()) {
      alert("La marque est obligatoire.");
      return;
    }
    if (!this.personalVehicle.model || !this.personalVehicle.model.trim()) {
      alert("Le modèle est obligatoire.");
      return;
    }
    if (!this.personalVehicle.plateNumber || !this.personalVehicle.plateNumber.trim()) {
      alert("La plaque d'immatriculation est obligatoire.");
      return;
    }
    if (!this.personalVehicle.year || this.personalVehicle.year < 1900 || this.personalVehicle.year > new Date().getFullYear() + 1) {
      alert("Veuillez saisir une année de production valide.");
      return;
    }
    if (!this.personalVehicle.seats || this.personalVehicle.seats <= 0) {
      alert("Le nombre de places doit être supérieur à 0.");
      return;
    }

    this.isLoading = true;
    const backendPayload = {
      brand: this.personalVehicle.brand,
      model: this.personalVehicle.model,
      licensePlate: this.personalVehicle.plateNumber,
      seats: this.personalVehicle.seats,
      fuelType: this.personalVehicle.fuelType,
      color: this.personalVehicle.color,
      transmission: this.personalVehicle.transmission,
      productionYear: this.personalVehicle.year,
      mileage: this.personalVehicle.mileage
    };

    this.partnerService.savePersonalVehicleBackend(backendPayload).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.showPersonalModal = false;
        this.successMessage = "Véhicule personnel configuré avec succès !";
        this.loadSettings();
        setTimeout(() => this.successMessage = null, 4000);
      },
      error: (err) => {
        console.error('Error saving personal vehicle:', err);
        this.isLoading = false;
        alert("Une erreur est survenue lors de la configuration du véhicule.");
      }
    });
  }

  removeActiveVehicle(): void {
    if (confirm("Êtes-vous sûr de vouloir retirer ce véhicule comme véhicule de travail actif ? (Cette action supprimera également votre véhicule s'il s'agit de votre véhicule personnel)")) {
      this.isLoading = true;
      this.partnerService.removeWorkVehicle().subscribe({
        next: (res) => {
          this.successMessage = "Véhicule de travail retiré avec succès.";
          this.loadSettings();
          setTimeout(() => this.successMessage = null, 4000);
        },
        error: (err) => {
          console.error('Error removing vehicle:', err);
          alert("Une erreur est survenue lors du retrait du véhicule.");
          this.isLoading = false;
        }
      });
    }
  }

  goToPartnerExplore(): void {
    this.router.navigate(['/driver/partner-vehicles']);
  }
}
