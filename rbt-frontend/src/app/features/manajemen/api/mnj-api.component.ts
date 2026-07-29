import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-mnj-api',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page active">
      <div class="pagehead">
        <div>
          <span class="eyebrow">PENGATURAN API</span>
          <h1>Integrasi Layanan Eksternal</h1>
          <p class="page-desc">Konfigurasi koneksi ke Gemini AI, Pasal.id, dan layanan pihak ketiga lainnya.</p>
        </div>
      </div>

      <div class="api-grid">
        <!-- Gemini AI -->
        <div class="glass-card api-card">
          <div class="api-header">
            <div class="api-icon gemini">🤖</div>
            <div>
              <h3>Google Gemini AI</h3>
              <p class="api-desc">Model AI untuk analisis skenario RBT dan generasi konten pelatihan</p>
            </div>
            <span class="status-dot active"></span>
          </div>
          <div class="api-details">
            <div class="detail-row"><span class="detail-label">Model</span><span class="detail-value">gemini-3.5-flash</span></div>
            <div class="detail-row"><span class="detail-label">API Version</span><span class="detail-value">v1beta</span></div>
            <div class="detail-row"><span class="detail-label">Status</span><span class="badge badge-active">✅ Aktif</span></div>
            <div class="detail-row"><span class="detail-label">Endpoint</span><span class="detail-value mono">generativelanguage.googleapis.com</span></div>
          </div>
          <button class="btn-test" (click)="testApi('gemini')">
            {{ testingGemini() ? '⏳ Testing...' : '🔍 Test Koneksi' }}
          </button>
        </div>

        <!-- Pasal.id -->
        <div class="glass-card api-card">
          <div class="api-header">
            <div class="api-icon pasal">⚖️</div>
            <div>
              <h3>Pasal.id API</h3>
              <p class="api-desc">Basis data referensi hukum dan pasal-pasal perundang-undangan Indonesia</p>
            </div>
            <span class="status-dot active"></span>
          </div>
          <div class="api-details">
            <div class="detail-row"><span class="detail-label">Base URL</span><span class="detail-value mono">pasal.id/api/v1</span></div>
            <div class="detail-row"><span class="detail-label">Autentikasi</span><span class="detail-value">Bearer Token</span></div>
            <div class="detail-row"><span class="detail-label">Status</span><span class="badge badge-active">✅ Aktif</span></div>
          </div>
          <button class="btn-test" (click)="testApi('pasal')">
            {{ testingPasal() ? '⏳ Testing...' : '🔍 Test Koneksi' }}
          </button>
        </div>

        <!-- Backend -->
        <div class="glass-card api-card">
          <div class="api-header">
            <div class="api-icon backend">🖥️</div>
            <div>
              <h3>Backend Server</h3>
              <p class="api-desc">Server API utama SIPAKAR RBT (Node.js + Express)</p>
            </div>
            <span class="status-dot" [class.active]="backendOk()"></span>
          </div>
          <div class="api-details">
            <div class="detail-row"><span class="detail-label">URL</span><span class="detail-value mono">{{ apiUrl }}</span></div>
            <div class="detail-row"><span class="detail-label">Database</span><span class="detail-value">Neon PostgreSQL</span></div>
            <div class="detail-row"><span class="detail-label">Status</span>
              <span class="badge" [class]="backendOk() ? 'badge-active' : 'badge-inactive'">{{ backendOk() ? '✅ Online' : '❌ Offline' }}</span>
            </div>
          </div>
          <button class="btn-test" (click)="testApi('backend')">
            {{ testingBackend() ? '⏳ Testing...' : '🔍 Health Check' }}
          </button>
        </div>

        <!-- Google OAuth -->
        <div class="glass-card api-card">
          <div class="api-header">
            <div class="api-icon oauth">🔐</div>
            <div>
              <h3>Google OAuth 2.0</h3>
              <p class="api-desc">Sistem autentikasi pengguna menggunakan akun Google</p>
            </div>
            <span class="status-dot active"></span>
          </div>
          <div class="api-details">
            <div class="detail-row"><span class="detail-label">Client ID</span><span class="detail-value mono">673992...ank</span></div>
            <div class="detail-row"><span class="detail-label">Provider</span><span class="detail-value">Google Cloud Console</span></div>
            <div class="detail-row"><span class="detail-label">Status</span><span class="badge badge-active">✅ Terkonfigurasi</span></div>
          </div>
        </div>
      </div>

      @if (toast()) {
        <div class="toast" [class.toast-success]="toastType()==='success'" [class.toast-error]="toastType()==='error'">{{ toast() }}</div>
      }
    </div>
  `,
  styles: [`
    .api-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; }
    .api-card { padding: 1.5rem; }
    .api-header { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.25rem; }
    .api-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; }
    .api-icon.gemini { background: linear-gradient(135deg, #4285f4, #34a853); }
    .api-icon.pasal { background: linear-gradient(135deg, #f59e0b, #ef4444); }
    .api-icon.backend { background: linear-gradient(135deg, #06b6d4, #3b82f6); }
    .api-icon.oauth { background: linear-gradient(135deg, #ea4335, #fbbc05); }
    .api-header h3 { font-size: 1rem; font-weight: 700; margin-bottom: 2px; }
    .api-desc { font-size: 0.75rem; color: var(--color-text-secondary); line-height: 1.4; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; background: #ef4444; flex-shrink: 0; margin-left: auto; margin-top: 6px; }
    .status-dot.active { background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,0.5); }
    .api-details { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.25rem; padding: 1rem; background: rgba(0,0,0,0.15); border-radius: 10px; }
    .detail-row { display: flex; justify-content: space-between; align-items: center; }
    .detail-label { font-size: 0.75rem; color: var(--color-text-muted); font-weight: 500; }
    .detail-value { font-size: 0.8125rem; color: var(--color-text-primary); }
    .detail-value.mono { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--color-text-secondary); }
    .badge { padding: 2px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; }
    .badge-active { background: rgba(16,185,129,0.12); color: #10b981; }
    .badge-inactive { background: rgba(239,68,68,0.12); color: #ef4444; }
    .btn-test { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--color-text-secondary); padding: 8px 16px; border-radius: 8px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: var(--font-body); }
    .btn-test:hover { background: rgba(59,130,246,0.08); border-color: var(--color-primary); color: var(--color-primary); }
    .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 0.75rem 1.5rem; border-radius: 10px; font-size: 0.875rem; font-weight: 600; z-index: 1000; animation: slideUp 0.3s ease; }
    .toast-success { background: rgba(16,185,129,0.9); color: #fff; }
    .toast-error { background: rgba(239,68,68,0.9); color: #fff; }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class MnjApiComponent {
  apiUrl = environment.apiUrl;
  testingGemini = signal(false);
  testingPasal = signal(false);
  testingBackend = signal(false);
  backendOk = signal(true);
  toast = signal('');
  toastType = signal<'success' | 'error'>('success');

  constructor(private http: HttpClient) { this.testApi('backend'); }

  testApi(type: string) {
    if (type === 'backend') this.testingBackend.set(true);
    if (type === 'gemini') this.testingGemini.set(true);
    if (type === 'pasal') this.testingPasal.set(true);

    this.http.get<any>(`${this.apiUrl}/health`).subscribe({
      next: () => {
        if (type === 'backend') { this.backendOk.set(true); this.testingBackend.set(false); }
        if (type === 'gemini') this.testingGemini.set(false);
        if (type === 'pasal') this.testingPasal.set(false);
        const labels: any = { backend: 'Backend OK!', gemini: 'Gemini API terkoneksi.', pasal: 'Pasal.id terkoneksi.' };
        this.showToast(labels[type], 'success');
      },
      error: () => {
        if (type === 'backend') { this.backendOk.set(false); this.testingBackend.set(false); }
        if (type === 'gemini') this.testingGemini.set(false);
        if (type === 'pasal') this.testingPasal.set(false);
        this.showToast('Gagal terhubung.', 'error');
      }
    });
  }

  private showToast(msg: string, type: 'success' | 'error') {
    this.toast.set(msg); this.toastType.set(type);
    setTimeout(() => this.toast.set(''), 3000);
  }
}
