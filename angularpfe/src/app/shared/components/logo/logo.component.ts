import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logo-wrapper" [class.white-theme]="theme === 'white'">
      <div class="logo-icon-container" [style.width.px]="size" [style.height.px]="size">
        <svg viewBox="0 0 100 100" [attr.width]="size * 0.8" [attr.height]="size * 0.8">
          <path d="M 65 15 A 35 35 0 0 0 15 50" stroke="white" stroke-width="12" fill="none" />
          <path d="M 50 45 C 50 25, 80 25, 80 45 C 80 65, 65 95, 65 95 C 65 95, 50 65, 50 45 Z" fill="white"/>
        </svg>
      </div>
      <div class="brand-info" *ngIf="showText">
        <span class="logo-text" [style.font-size.px]="fontSize">GO<span style="color: #2563eb;">RIDE</span></span>
        <span class="role-badge" *ngIf="roleBadge" [style.background-color]="badgeBgColor" [style.color]="badgeTextColor">{{ roleBadge }}</span>
      </div>
    </div>
  `,
  styles: [`
    .logo-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-icon-container {
      background: #2563eb;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }
    .white-theme .logo-icon-container {
      background: #ffffff;
      box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
    }
    .white-theme .logo-icon-container svg path {
      stroke: #2563eb !important;
      fill: #2563eb !important;
    }
    .brand-info {
      display: flex;
      flex-direction: column;
    }
    .logo-text {
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1;
    }
    .white-theme .logo-text {
      color: #ffffff;
    }
    .role-badge {
      font-size: 10px;
      font-weight: 800;
      color: #2563eb;
      background: rgba(37, 99, 235, 0.05);
      padding: 2px 8px;
      border-radius: 6px;
      margin-top: 4px;
      text-transform: uppercase;
      width: fit-content;
    }
    .white-theme .role-badge {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.2);
    }
  `]
})
export class LogoComponent {
  @Input() size: number = 38;
  @Input() fontSize: number = 20;
  @Input() showText: boolean = true;
  @Input() theme: 'default' | 'white' = 'default';
  @Input() roleBadge: string = '';
  @Input() badgeBgColor: string = 'rgba(37, 99, 235, 0.05)';
  @Input() badgeTextColor: string = '#2563eb';
}
