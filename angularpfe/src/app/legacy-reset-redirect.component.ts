import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/** Redirects /r?token=xxx (old email links) to /reset-password?token=xxx */
@Component({
  template: '',
  standalone: false
})
export class LegacyResetRedirectComponent implements OnInit {
  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.router.navigate(['/reset-password'], { queryParams: { token }, replaceUrl: true });
    } else {
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }
}
