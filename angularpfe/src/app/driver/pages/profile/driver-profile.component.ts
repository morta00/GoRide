import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DriverProfileService, DriverProfile } from '../../services/driver-profile.service';
import { DriverService } from '../../services/driver.service';
import { ProfileAvatarComponent } from '../../../header/profile-avatar/profile-avatar.component';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-driver-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ProfileAvatarComponent],
  templateUrl: './driver-profile.component.html',
  styleUrls: ['./driver-profile.component.css']
})
export class DriverProfileComponent implements OnInit {
  profile: DriverProfile | null = null;
  isOnline = true;
  isLoading = true;
  isEditing = false;
  profileForm!: FormGroup;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  activeTab = 'info'; // info, security, documents

  constructor(
    private profileService: DriverProfileService,
    private driverService: DriverService,
    private fb: FormBuilder,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isOnline = this.driverService.getOnlineStatus();
    this.driverService.isOnline$.subscribe(status => (this.isOnline = status));
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.profileService.getProfile().subscribe({
      next: (data) => {
        this.profile = data;
        this.isLoading = false;
        this.initForm();
      },
      error: (err) => {
        this.errorMessage = "Erreur lors du chargement du profil.";
        this.isLoading = false;
      }
    });
  }

  initForm(): void {
    if (!this.profile) return;
    this.profileForm = this.fb.group({
      firstName: [this.profile.firstName || '', Validators.required],
      lastName: [this.profile.lastName || '', Validators.required],
      phone: [this.profile.phone || '', Validators.required],
      city: [this.profile.city || '', Validators.required],
      address: [this.profile.address || ''],
      country: [this.profile.country || 'Tunisie'],
      preferredLanguage: [this.profile.preferredLanguage || 'Français'],
      licenseNumber: [this.profile.licenseNumber || ''],
      drivingExperienceYears: [this.profile.drivingExperienceYears || null],
      availabilityStatus: [this.profile.availabilityStatus || 'AVAILABLE'],
      workMode: [this.profile.workMode || 'INDEPENDENT'],
      bio: [this.profile.bio || '']
    });
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.initForm();
    }
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const payload = this.profileForm.value;
    this.isLoading = true;
    this.profileService.updateProfile(payload).subscribe({
      next: (updated) => {
        this.profile = updated;
        this.isEditing = false;
        this.isLoading = false;
        this.showSuccess("Profil mis à jour avec succès.");
      },
      error: (err) => {
        this.errorMessage = "Erreur lors de la mise à jour.";
        this.isLoading = false;
      }
    });
  }

  showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = null, 3000);
  }

  // Security Tab
  securityForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  });

  changePassword(): void {
    if (this.securityForm.invalid) return;
    if (this.securityForm.value.newPassword !== this.securityForm.value.confirmPassword) {
      this.errorMessage = "Les mots de passe ne correspondent pas.";
      return;
    }

    this.profileService.changePassword(this.securityForm.value).subscribe({
      next: () => {
        this.showSuccess("Mot de passe modifié.");
        this.securityForm.reset();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || "Erreur sécurité.";
      }
    });
  }
}
