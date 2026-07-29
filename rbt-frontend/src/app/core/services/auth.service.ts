import { Injectable, signal, computed, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { User, AuthResponse } from '../../shared/models/user.model';

declare const google: any;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenSignal = signal<string | null>(null);
  private userSignal = signal<User | null>(null);
  private loadingSignal = signal<boolean>(false);
  private loginErrorSignal = signal<string | null>(null);

  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly loginError = this.loginErrorSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSignal());

  private readonly API_URL = environment.apiUrl;
  private readonly GOOGLE_CLIENT_ID = environment.googleClientId;

  constructor(
    private http: HttpClient,
    private router: Router,
    private ngZone: NgZone
  ) {
    this.loadStoredAuth();
  }

  /**
   * Initialize Google Sign-In button
   */
  initGoogleSignIn(buttonElement: HTMLElement): void {
    if (typeof google === 'undefined') {
      console.warn('Google Sign-In library not loaded yet');
      return;
    }

    google.accounts.id.initialize({
      client_id: this.GOOGLE_CLIENT_ID,
      callback: (response: any) => {
        this.ngZone.run(() => {
          this.handleGoogleCallback(response);
        });
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    google.accounts.id.renderButton(buttonElement, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: 320,
    });
  }

  /**
   * Handle Google Sign-In callback
   */
  private async handleGoogleCallback(response: any): Promise<void> {
    if (!response.credential) {
      console.error('No credential received from Google');
      return;
    }

    this.loadingSignal.set(true);
    this.loginErrorSignal.set(null);

    try {
      const result = await this.http
        .post<AuthResponse>(`${this.API_URL}/auth/google`, {
          idToken: response.credential,
        })
        .toPromise();

      if (result && result.success) {
        this.tokenSignal.set(result.data.token);
        this.userSignal.set(result.data.user);

        // Store in sessionStorage
        sessionStorage.setItem('rbt_token', result.data.token);
        sessionStorage.setItem('rbt_user', JSON.stringify(result.data.user));

        if (result.data.user.role === 'siswa') {
          this.router.navigate(['/siswa/dashboard']);
        } else if (result.data.user.role === 'manajemen') {
          this.router.navigate(['/mnj/dashboard']);
        } else {
          this.router.navigate(['/gadik/dashboard']);
        }
      } else {
        const msg = result?.message || 'Login gagal: Respons server tidak valid.';
        this.loginErrorSignal.set(msg);
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      const msg = error?.error?.message || error?.message || 'Gagal terhubung ke server backend.';
      this.loginErrorSignal.set(msg);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Load stored auth from session
   */
  private loadStoredAuth(): void {
    const storedToken = sessionStorage.getItem('rbt_token');
    const storedUser = sessionStorage.getItem('rbt_user');

    if (storedToken && storedUser) {
      try {
        this.tokenSignal.set(storedToken);
        this.userSignal.set(JSON.parse(storedUser));
      } catch {
        this.clearAuth();
      }
    }
  }

  /**
   * Logout user
   */
  logout(): void {
    this.clearAuth();
    if (typeof google !== 'undefined') {
      google.accounts.id.disableAutoSelect();
    }
    this.router.navigate(['/login']);
  }

  /**
   * Clear auth state
   */
  private clearAuth(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    sessionStorage.removeItem('rbt_token');
    sessionStorage.removeItem('rbt_user');
  }

  /**
   * Get current token value
   */
  getToken(): string | null {
    return this.tokenSignal();
  }

  /**
   * Local login — bypass Google OAuth menggunakan email dan password untuk predefined accounts
   * Memanggil POST /api/auth/local-login di backend
   */
  async localLogin(email: string, password: string): Promise<void> {
    this.loadingSignal.set(true);
    try {
      const result = await this.http
        .post<AuthResponse>(`${this.API_URL}/auth/local-login`, { email, password })
        .toPromise();

      if (result && result.success) {
        this.tokenSignal.set(result.data.token);
        this.userSignal.set(result.data.user);
        sessionStorage.setItem('rbt_token', result.data.token);
        sessionStorage.setItem('rbt_user', JSON.stringify(result.data.user));
        
        if (result.data.user.role === 'siswa') {
          this.router.navigate(['/siswa/dashboard']);
        } else if (result.data.user.role === 'manajemen') {
          this.router.navigate(['/mnj/dashboard']);
        } else {
          this.router.navigate(['/gadik/dashboard']);
        }
      } else {
        throw new Error('Login lokal gagal: respons tidak valid dari server.');
      }
    } catch (error: any) {
      const msg = error?.error?.message || error?.message || 'Login lokal gagal.';
      throw new Error(msg);
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
