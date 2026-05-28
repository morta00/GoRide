import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RentalService } from '../../../services/rental.service';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-add-vehicle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-vehicle.component.html',
  styleUrls: ['./add-vehicle.component.css']
})
export class AddVehicleComponent implements OnInit {
  vehicleForm!: FormGroup;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';
  selectedPhotoFile: File | null = null;
  photoPreviewUrl: string | null = null;
  private readonly apiOrigin = environment.apiUrl.replace(/\/api\/?$/, '');

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private rentalService: RentalService
  ) {}

  ngOnInit(): void {
    this.vehicleForm = this.fb.group({
      brand: ['', [Validators.required, Validators.minLength(2)]],
      model: ['', [Validators.required, Validators.minLength(1)]],
      licensePlate: ['', [Validators.required, Validators.pattern(/^[0-9]+ TUN [0-9]+$/i)]],
      year: [new Date().getFullYear(), [Validators.required, Validators.min(1900), Validators.max(new Date().getFullYear() + 1)]],
      transmission: ['Manuelle', Validators.required],
      fuelType: ['Essence', Validators.required],
      seats: [5, [Validators.required, Validators.min(1), Validators.max(9)]],
      dailyPrice: [120, [Validators.required, Validators.min(1)]],
      location: ['', Validators.required],
      color: ['', Validators.required],
      category: ['STANDARD', Validators.required],
      hasAC: [true],
      mileage: [0, [Validators.required, Validators.min(0)]],
      insuranceInfo: ['', Validators.required],
      depositAmount: [500, [Validators.required, Validators.min(0)]],
      consumption: ['', Validators.required],
      description: ['', [Validators.maxLength(500)]],
      photoUrl: [''],
      hasWifi: [false],
      hasBabySeat: [false],
      luggageCapacity: [2, [Validators.required, Validators.min(0)]]
    });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Veuillez sélectionner une image (JPG, PNG, WEBP).';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'Image trop volumineuse (max 5 Mo).';
      return;
    }
    this.selectedPhotoFile = file;
    this.errorMessage = '';
    if (this.photoPreviewUrl) {
      URL.revokeObjectURL(this.photoPreviewUrl);
    }
    this.photoPreviewUrl = URL.createObjectURL(file);
    this.vehicleForm.patchValue({ photoUrl: '' });
  }

  clearPhoto(): void {
    this.selectedPhotoFile = null;
    if (this.photoPreviewUrl) {
      URL.revokeObjectURL(this.photoPreviewUrl);
      this.photoPreviewUrl = null;
    }
  }

  hasPhoto(): boolean {
    return !!this.selectedPhotoFile || !!(this.vehicleForm.get('photoUrl')?.value || '').trim();
  }

  onSubmit(): void {
    if (this.vehicleForm.invalid) {
      this.vehicleForm.markAllAsTouched();
      return;
    }
    if (!this.hasPhoto()) {
      this.errorMessage = 'Ajoutez une photo du véhicule (fichier ou lien).';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const upload$ = this.selectedPhotoFile
      ? this.rentalService.uploadVehiclePhoto(this.selectedPhotoFile)
      : of({ photoUrl: (this.vehicleForm.value.photoUrl || '').trim() });

    upload$.pipe(
      switchMap(res => {
        const payload = {
          ...this.vehicleForm.value,
          photoUrl: res.photoUrl,
          imageUrl: res.photoUrl
        };
        return this.rentalService.addVehicle(payload);
      })
    ).subscribe({
      next: () => {
        this.successMessage = 'Véhicule ajouté avec succès !';
        this.isSubmitting = false;
        setTimeout(() => this.router.navigate(['/fleet/vehicles']), 1500);
      },
      error: (err: any) => {
        this.errorMessage = err.error?.message || 'Erreur lors de l\'ajout';
        this.isSubmitting = false;
      }
    });
  }

  resolvePhotoSrc(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return this.apiOrigin + (url.startsWith('/') ? url : '/' + url);
  }
}
