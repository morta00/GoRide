import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { VehicleService } from '../services/vehicle.service';

@Component({
  selector: 'app-fleet-setup',
  templateUrl: './fleet-setup.component.html',
  styleUrls: ['./fleet-setup.component.css']
})
export class FleetSetupComponent implements OnInit {
  vehicleForm!: FormGroup;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  categories = [
    { value: 'STANDARD', label: 'Standard (Economie)' },
    { value: 'CONFORT', label: 'Confort' },
    { value: 'BUSINESS', label: 'Business / Affaires' },
    { value: 'XL', label: 'Van / XL' }
  ];

  fuelTypes = [
    { value: 'ESSENCE', label: 'Essence' },
    { value: 'DIESEL', label: 'Diesel' },
    { value: 'ELECTRIQUE', label: 'Électrique' },
    { value: 'HYBRIDE', label: 'Hybride' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private vehicleService: VehicleService
  ) {}

  ngOnInit(): void {
    this.vehicleForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      companyName: ['', Validators.required],
      brand: ['', Validators.required],
      model: ['', Validators.required],
      year: ['', [Validators.required, Validators.min(2010), Validators.max(new Date().getFullYear())]],
      category: ['', Validators.required],
      licensePlate: ['', [Validators.required, Validators.pattern('^[0-9]{3} TUN [0-9]{4}$|^[0-9]{1,3} TU [0-9]{1,6}$')]],
      color: ['', Validators.required],
      fuelType: ['', Validators.required],
      seats: [4, [Validators.required, Validators.min(1)]]
    });
  }

  onSubmit(): void {
    if (this.vehicleForm.invalid) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    const form = this.vehicleForm.value;

    // Construction du DTO correspondant au backend VehicleDTO
    const vehicleDTO = {
      brand: form.brand,
      model: form.model,
      licensePlate: form.licensePlate,
      seats: form.seats,
      fuelType: form.fuelType,
      color: form.color,
      year: form.year,
      category: form.category
    };

    this.vehicleService.addVehicle(vehicleDTO).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = 'Véhicule ajouté avec succès ! Vous pouvez maintenant gérer votre flotte.';
        setTimeout(() => this.router.navigate(['/role-selection']), 3000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
      }
    });
  }

  skip(): void {
    this.router.navigate(['/role-selection']);
  }
}

