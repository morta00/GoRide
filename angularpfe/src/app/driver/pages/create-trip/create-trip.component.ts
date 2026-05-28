import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DriverTripService } from '../../services/driver-trip.service';
import { PartnerVehicleService } from '../../services/partner-vehicle.service';

@Component({
  selector: 'app-create-trip',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './create-trip.component.html',
  styleUrls: ['./create-trip.component.css']
})
export class CreateTripComponent implements OnInit {
  tripForm!: FormGroup;
  isSubmitting = false;
  workVehicleInfo: any = null;
  hasActiveVehicle = false;

  constructor(
    private fb: FormBuilder,
    private tripService: DriverTripService,
    private vehicleService: PartnerVehicleService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadActiveVehicle();
  }

  loadActiveVehicle(): void {
    this.vehicleService.getWorkVehicle().subscribe({
      next: (res) => {
        if (res && res.configured && res.vehicle) {
          this.hasActiveVehicle = true;
          this.workVehicleInfo = res;
          this.tripForm.patchValue({ 
            vehicle: `${res.vehicle.brand} ${res.vehicle.model}`,
            vehicleId: res.vehicle.id
          });
          const maxSeats = (res.vehicle as any).seats ? (res.vehicle as any).seats - 1 : 3;
          this.tripForm.get('seats')?.setValidators([
            Validators.required, 
            Validators.min(1), 
            Validators.max(maxSeats)
          ]);
          this.tripForm.get('seats')?.updateValueAndValidity();
        } else {
          this.hasActiveVehicle = false;
          this.workVehicleInfo = null;
        }
      },
      error: (err) => {
        console.error('Error loading work vehicle:', err);
        this.hasActiveVehicle = false;
        this.workVehicleInfo = null;
      }
    });
  }

  initForm(): void {
    this.tripForm = this.fb.group({
      departure: ['', Validators.required],
      departureAddress: ['', Validators.required],
      destination: ['', Validators.required],
      destinationAddress: ['', Validators.required],
      date: ['', [Validators.required, this.dateValidator]],
      time: ['', Validators.required],
      seats: [3, [Validators.required, Validators.min(1)]],
      price: [10, [Validators.required, Validators.min(1)]],
      vehicle: [{ value: '', disabled: true }, Validators.required],
      vehicleId: [null, Validators.required],
      luggage: [true],
      pets: [false],
      comment: ['']
    }, { validators: this.locationValidator });
  }

  locationValidator(group: FormGroup) {
    const dep = group.get('departure')?.value;
    const dest = group.get('destination')?.value;
    return dep && dest && dep.toLowerCase() === dest.toLowerCase() ? { sameLocation: true } : null;
  }

  dateValidator(control: AbstractControl) {
    if (!control.value) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    return control.value < todayStr ? { pastDate: true } : null;
  }

  getTodayDate(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  onSubmit(): void {
    if (this.tripForm.invalid) {
      this.markFormGroupTouched(this.tripForm);
      return;
    }

    this.isSubmitting = true;
    const formData = this.tripForm.value;
    
    // We send payload to back-end
    this.tripService.createTrip(formData).subscribe({
      next: () => {
        alert('Trajet publié avec succès');
        this.router.navigate(['/driver/trips']);
      },
      error: (err: any) => {
        console.error(err);
        alert('Une erreur est survenue lors de la publication.');
        this.isSubmitting = false;
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }
}
