import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

/**
 * Intercepteur HTTP qui ajoute automatiquement le token JWT
 * dans le header "Authorization" de chaque requête sortante.
 */
@Injectable()
export class JwtInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    const isAuthRoute = req.url.includes('/api/auth/login') || req.url.includes('/api/auth/signup');
    const isPublicRoute = req.url.includes('/api/assistant/') || req.url.includes('/api/public/');

    if (token && !isAuthRoute && !isPublicRoute) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !isAuthRoute && !isPublicRoute) {
          console.error('[JwtInterceptor] 401 Unauthorized detected. Redirecting to login...');
          const returnUrl = this.router.url;
          this.authService.clearSession();
          this.router.navigate(['/login'], {
            queryParams: returnUrl && !returnUrl.includes('/login') ? { returnUrl } : {},
            replaceUrl: true
          });
        }
        return throwError(() => error);
      })
    );
  }
}
