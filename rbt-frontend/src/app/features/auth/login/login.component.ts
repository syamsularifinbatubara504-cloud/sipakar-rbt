import { Component, AfterViewInit, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent, FormsModule],
  template: `
    <div class="login-page" id="login-page">
      <!-- Top-right corner language switcher -->
      <div class="login-lang-container animate-fade-in">
        <div class="lang-switcher">
          <button 
            [class.active]="lang.currentLang() === 'id'" 
            (click)="lang.setLanguage('id')"
            class="lang-btn"
            id="lang-btn-id"
          >
            ID
          </button>
          <button 
            [class.active]="lang.currentLang() === 'en'" 
            (click)="lang.setLanguage('en')"
            class="lang-btn"
            id="lang-btn-en"
          >
            EN
          </button>
        </div>
      </div>

      <!-- Animated Background -->
      <div class="login-bg">
        <div class="bg-orb bg-orb-1"></div>
        <div class="bg-orb bg-orb-2"></div>
        <div class="bg-orb bg-orb-3"></div>
        <div class="bg-grid"></div>
      </div>

      <div class="login-container animate-fade-in">
        <!-- Logo & Branding -->
        <div class="login-header">
          <div class="logo-container">
            <div class="logo-shield">
              <img src="SPN_PoldaSumut.png" alt="SPN Polda Sumut Logo" class="login-logo-img" />
            </div>
          </div>

          <h1 class="login-title">{{ lang.t('login.title') }}</h1>
          <p class="login-subtitle">{{ lang.t('login.subtitle') }}</p>
          <div class="login-org">
            <span class="org-badge">Reality-Based Training</span>
            <span class="org-divider">•</span>
            <span class="org-badge">Polda Sumut</span>
          </div>
        </div>

        <!-- Login Card -->
        <div class="login-card glass-card">
          <div class="card-header">
            <h2>{{ lang.t('login.card.title') }}</h2>
            <p> {{ lang.t('login.card.subtitle') }} </p>
          </div>

          @if (auth.loading() || devLoading()) {
            <app-loading-spinner message="Memproses autentikasi..." />
          }

          <div class="google-btn-container" #googleBtn id="google-signin-btn"></div>
          @if (auth.loginError()) {
            <p class="dev-error" style="margin-bottom: 1rem;">{{ auth.loginError() }}</p>
          }

          <!-- Local Login Form (untuk predefined accounts) -->
          <div class="local-login-section">
            <div class="dev-divider">
              <span>Atau Login Menggunakan Akun SPN</span>
            </div>
            <form (ngSubmit)="localLogin()" #localForm="ngForm" class="local-form">
              <input 
                type="email" 
                name="email" 
                [(ngModel)]="email" 
                placeholder="Email Akun SPN" 
                class="form-input"
                required
              >
              <input 
                type="password" 
                name="password" 
                [(ngModel)]="password" 
                placeholder="Password" 
                class="form-input"
                required
              >
              <button
                type="submit"
                class="btn-dev-login"
                [disabled]="auth.loading() || devLoading() || !localForm.form.valid"
              >
                Login Akun SPN
              </button>
            </form>
            @if (devError()) {
              <p class="dev-error">{{ devError() }}</p>
            }
          </div>

          <div class="login-info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>{{ lang.t('login.card.restricted') }}</span>
          </div>
        </div>

        <!-- Features Preview -->
        <div class="features-row">
          <div class="feature-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
            </svg>
            {{ lang.t('login.feature.ai') }}
          </div>
          <div class="feature-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            {{ lang.t('login.feature.rbt') }}
          </div>
          <div class="feature-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            {{ lang.t('login.feature.law') }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      padding: var(--spacing-lg);
    }

    .login-lang-container {
      position: absolute;
      top: var(--spacing-lg);
      right: var(--spacing-lg);
      z-index: 10;
    }

    /* Language Switcher */
    .lang-switcher {
      display: flex;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-full);
      padding: 2px;
      gap: 2px;
    }

    .lang-btn {
      background: transparent;
      border: none;
      color: var(--color-text-secondary);
      font-size: 0.725rem;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: var(--border-radius-full);
      transition: all var(--transition-fast);
      cursor: pointer;
    }

    .lang-btn:hover {
      color: var(--color-text-primary);
    }

    .lang-btn.active {
      background: var(--gradient-primary);
      color: #fff;
      box-shadow: var(--shadow-sm);
    }

    /* Animated Background */
    .login-bg {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
    }

    .bg-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      animation: float 8s ease-in-out infinite;
    }

    .bg-orb-1 {
      width: 400px;
      height: 400px;
      background: rgba(59, 130, 246, 0.12);
      top: -100px;
      right: -100px;
      animation-delay: 0s;
    }

    .bg-orb-2 {
      width: 300px;
      height: 300px;
      background: rgba(6, 182, 212, 0.08);
      bottom: -50px;
      left: -50px;
      animation-delay: 3s;
    }

    .bg-orb-3 {
      width: 200px;
      height: 200px;
      background: rgba(245, 158, 11, 0.06);
      top: 40%;
      left: 30%;
      animation-delay: 5s;
    }

    .bg-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px);
      background-size: 60px 60px;
    }

    @keyframes float {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(20px, -20px) scale(1.05); }
      66% { transform: translate(-10px, 15px) scale(0.95); }
    }

    .login-container {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 440px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-xl);
    }

    /* Header */
    .login-header {
      text-align: center;
    }

    .logo-container {
      display: flex;
      justify-content: center;
      margin-bottom: var(--spacing-md);
    }

    .logo-shield {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 96px;
      height: 96px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      padding: var(--spacing-sm);
      animation: pulse 3s ease-in-out infinite;
    }

    .login-logo-img {
      max-height: 100%;
      max-width: 100%;
      object-fit: contain;
    }

    .login-title {
      font-family: var(--font-heading);
      font-size: 1.75rem;
      font-weight: 800;
      background: var(--gradient-primary);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 4px;
    }

    .login-subtitle {
      color: var(--color-text-secondary);
      font-size: 0.9375rem;
      margin-bottom: var(--spacing-sm);
    }

    .login-org {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
    }

    .org-badge {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-accent-gold);
      letter-spacing: 0.03em;
    }

    .org-divider {
      color: var(--color-text-muted);
      font-size: 0.5rem;
    }

    /* Card */
    .login-card {
      width: 100%;
      padding: var(--spacing-xl);
      text-align: center;
    }

    .login-card:hover {
      transform: none;
    }

    .card-header {
      margin-bottom: var(--spacing-lg);
    }

    .card-header h2 {
      font-size: 1.125rem;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .card-header p {
      color: var(--color-text-secondary);
      font-size: 0.8125rem;
    }

    .google-btn-container {
      display: flex;
      justify-content: center;
      margin: var(--spacing-lg) 0;
      min-height: 44px;
    }

    /* Dev Login */
    .dev-login-section {
      margin-top: var(--spacing-sm);
    }

    .dev-divider {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-md);
    }

    .dev-divider::before,
    .dev-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border-color);
    }

    .dev-divider span {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      white-space: nowrap;
    }

    .btn-dev-login {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
      padding: 10px 20px;
      background: rgba(245, 158, 11, 0.08);
      color: var(--color-accent-gold);
      border: 1px dashed rgba(245, 158, 11, 0.3);
      border-radius: var(--border-radius-sm);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);
      font-family: var(--font-body);
    }

    .btn-dev-login:hover:not(:disabled) {
      background: rgba(245, 158, 11, 0.14);
      border-color: rgba(245, 158, 11, 0.5);
    }

    .btn-dev-login:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .local-form {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .form-input {
      width: 100%;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-sm);
      color: var(--color-text-primary);
      font-size: 0.875rem;
      font-family: var(--font-body);
      transition: all var(--transition-fast);
    }

    .form-input:focus {
      outline: none;
      border-color: var(--color-primary);
      background: rgba(255, 255, 255, 0.08);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .dev-error {
      margin-top: var(--spacing-sm);
      font-size: 0.75rem;
      color: var(--color-accent-red);
      text-align: center;
    }

    .login-info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
      color: var(--color-text-muted);
      font-size: 0.75rem;
    }

    /* Features */
    .features-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--spacing-sm);
    }

    .feature-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: rgba(59, 130, 246, 0.06);
      border: 1px solid rgba(59, 130, 246, 0.12);
      border-radius: var(--border-radius-full);
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-secondary);
    }
  `],
})
export class LoginComponent implements AfterViewInit {
  @ViewChild('googleBtn') googleBtn!: ElementRef;

  // State untuk local login
  email = '';
  password = '';
  devLoading = signal(false);
  devError = signal('');

  constructor(
    public auth: AuthService,
    public lang: LanguageService
  ) {}

  ngAfterViewInit(): void {
    // Small delay to ensure Google library is loaded
    setTimeout(() => {
      if (this.googleBtn) {
        this.auth.initGoogleSignIn(this.googleBtn.nativeElement);
      }
    }, 500);
  }

  /** Masuk menggunakan endpoint local-login (Email/Password) */
  async localLogin(): Promise<void> {
    if (!this.email || !this.password) return;
    
    this.devLoading.set(true);
    this.devError.set('');
    try {
      await this.auth.localLogin(this.email, this.password);
    } catch (err: any) {
      this.devError.set(err?.message || 'Login gagal. Pastikan email dan password benar.');
    } finally {
      this.devLoading.set(false);
    }
  }
}
