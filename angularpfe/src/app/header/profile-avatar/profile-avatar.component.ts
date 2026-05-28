import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  avatarGradientFromSeed,
  isValidUserPhotoUrl,
  parseDisplayName
} from '../../shared/utils/avatar.utils';

@Component({
  selector: 'app-profile-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="avatar-container"
      [class.shape-rounded]="shape === 'rounded'"
      [ngStyle]="{ width: size + 'px', height: size + 'px' }"
      [attr.title]="title || null"
    >
      <img
        *ngIf="effectivePhotoUrl; else initialsTemplate"
        [src]="effectivePhotoUrl"
        class="avatar-img"
        alt=""
        (error)="onImageError()"
      />
      <ng-template #initialsTemplate>
        <div class="avatar-initials" [ngStyle]="initialsStyle">
          <span class="initials-text">{{ initials }}</span>
        </div>
      </ng-template>
      <div
        class="online-status"
        *ngIf="showStatus"
        [class.is-online]="isOnline"
        [class.is-offline]="!isOnline"
        [ngStyle]="{ width: statusSize + 'px', height: statusSize + 'px' }"
        [attr.aria-label]="isOnline ? 'En ligne' : 'Hors ligne'"
      ></div>
    </div>
  `,
  styles: [`
    .avatar-container {
      display: inline-block;
      border-radius: 50%;
      position: relative;
      user-select: none;
      flex-shrink: 0;
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
      vertical-align: middle;
    }
    .avatar-container.shape-rounded {
      border-radius: 28%;
    }
    .avatar-container:hover {
      transform: scale(1.05);
    }
    .avatar-img {
      width: 100%;
      height: 100%;
      border-radius: inherit;
      object-fit: cover;
      border: 2px solid #fff;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);
      display: block;
    }
    .avatar-initials {
      width: 100%;
      height: 100%;
      border-radius: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(255, 255, 255, 0.95);
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.22);
      position: relative;
      overflow: hidden;
    }
    .avatar-initials::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        145deg,
        rgba(255, 255, 255, 0.22) 0%,
        transparent 45%,
        rgba(0, 0, 0, 0.08) 100%
      );
      pointer-events: none;
    }
    .initials-text {
      position: relative;
      z-index: 1;
      color: #ffffff;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      line-height: 1;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    }
    .online-status {
      position: absolute;
      bottom: 2%;
      right: 2%;
      border: 2.5px solid #fff;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
      z-index: 2;
      transition: background 0.25s ease, box-shadow 0.25s ease;
    }
    .online-status.is-online {
      background: #10b981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
    }
    .online-status.is-offline {
      background: #94a3b8;
      box-shadow: none;
    }
  `]
})
export class ProfileAvatarComponent implements OnInit, OnChanges {
  @Input() firstName = '';
  @Input() lastName = '';
  /** Full name — used when first/last are empty (e.g. "imed tounis" → IT) */
  @Input() name = '';
  @Input() photoUrl?: string;
  @Input() size = 40;
  @Input() showStatus = false;
  /** When showStatus is true: green dot if true, grey if false */
  @Input() isOnline = true;
  @Input() shape: 'circle' | 'rounded' = 'circle';
  @Input() title = '';

  initials = 'U';
  fontSize = 14;
  statusSize = 10;
  initialsStyle: Record<string, string> = {};
  effectivePhotoUrl?: string;
  private imageBroken = false;

  ngOnInit(): void {
    this.refresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['firstName'] ||
      changes['lastName'] ||
      changes['name'] ||
      changes['photoUrl'] ||
      changes['size']
    ) {
      if (changes['photoUrl']) this.imageBroken = false;
      this.refresh();
    }
  }

  private refresh(): void {
    this.fontSize = Math.max(Math.round(this.size * 0.38), 10);
    this.statusSize = Math.max(Math.round(this.size * 0.26), 8);
    this.initials = this.buildInitials();
    const seed = `${this.resolvedFirst()}${this.resolvedLast()}` || this.name || 'user';
    const [c1, c2] = avatarGradientFromSeed(seed);
    this.initialsStyle = {
      background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
      fontSize: `${this.fontSize}px`
    };
    this.effectivePhotoUrl =
      !this.imageBroken && isValidUserPhotoUrl(this.photoUrl)
        ? this.photoUrl!.trim()
        : undefined;
  }

  private resolvedFirst(): string {
    if (this.firstName?.trim()) return this.firstName.trim();
    return parseDisplayName(this.name).first;
  }

  private resolvedLast(): string {
    if (this.lastName?.trim()) return this.lastName.trim();
    return parseDisplayName(this.name).last;
  }

  private buildInitials(): string {
    const first = this.resolvedFirst();
    const last = this.resolvedLast();
    const f = first ? first.charAt(0).toUpperCase() : '';
    const l = last ? last.charAt(0).toUpperCase() : '';
    if (f && l) return `${f}${l}`;
    if (f) return f.length >= 2 ? f.slice(0, 2) : f;
    if (this.name?.trim()) {
      const p = parseDisplayName(this.name);
      const a = p.first.charAt(0).toUpperCase();
      const b = p.last ? p.last.charAt(0).toUpperCase() : '';
      return a + (b || (p.first.length > 1 ? p.first.charAt(1).toUpperCase() : '')) || 'U';
    }
    return 'U';
  }

  onImageError(): void {
    this.imageBroken = true;
    this.effectivePhotoUrl = undefined;
    this.refresh();
  }
}
