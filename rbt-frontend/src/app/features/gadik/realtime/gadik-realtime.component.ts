import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-gadik-realtime',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page active">
      <div class="pagehead">
        <div>
          <span class="eyebrow">MONITORING REALTIME</span>
          <h1>Buat & Pantau Sesi Ujian / Latihan Per Spesialisasi</h1>
          <p class="page-desc">Konfigurasi sesi ujian dan latihan berbasis kategori spesialisasi (Reserse, Sabhara, Intel, Lantas, Binmas) secara real-time.</p>
        </div>
        <button class="btn-primary" (click)="showForm = !showForm">
          {{ showForm ? '✕ Tutup' : '+ Buat Sesi Ujian Baru' }}
        </button>
      </div>

      <!-- Form Buat Sesi Ujian Baru -->
      @if (showForm) {
        <div class="glass-card form-card">
          <h3>Konfigurasi Sesi Ujian / Latihan</h3>
          <div class="form-grid">
            <div class="form-group full">
              <label>Judul Sesi Ujian / Latihan</label>
              <input type="text" [(ngModel)]="form.judul" placeholder="Contoh: Ujian Evaluasi Reserse Gelombang 1..." class="form-input" />
            </div>
            <div class="form-group">
              <label>Kategori Unit Spesialisasi</label>
              <select [(ngModel)]="form.unit_spesialisasi" (change)="onCategoryChange()" class="form-input">
                <option value="reserse">Reserse</option>
                <option value="sabhara">Sabhara</option>
                <option value="intel">Intelkam</option>
                <option value="lantas">Lalu Lintas (Lantas)</option>
                <option value="binmas">Binmas</option>
                <option value="semua">Semua Spesialisasi</option>
              </select>
            </div>
            <div class="form-group">
              <label>Tipe Sesi</label>
              <select [(ngModel)]="form.tipe" class="form-input">
                <option value="ujian">Ujian Resmi (Berwaktu & Terikat)</option>
                <option value="latihan">Latihan Soal Mandiri</option>
              </select>
            </div>
            <div class="form-group">
              <label>Durasi Ujian (Menit)</label>
              <input type="number" [(ngModel)]="form.durasi" min="10" max="180" class="form-input" />
            </div>
            <div class="form-group">
              <label>Jumlah Soal Diambil dari Bank Soal</label>
              <input type="number" [(ngModel)]="form.jumlah_soal" min="5" max="50" class="form-input" />
            </div>
          </div>

          <!-- Preview Filtered Questions -->
          <div class="questions-preview-box">
            <div class="preview-header">
              <span>📝 Soal Terikutserta dari Spesialisasi <strong>{{ form.unit_spesialisasi | uppercase }}</strong></span>
              <span class="badge badge-info">{{ filteredQuestions().length }} Soal Tersedia</span>
            </div>
            @if (filteredQuestions().length === 0) {
              <p class="empty-q-text">⚠️ Belum ada soal dalam bank soal untuk spesialisasi ini. Silakan input soal di menu "Bank Soal".</p>
            } @else {
              <ul class="q-list">
                @for (q of filteredQuestions().slice(0, 5); track q.id) {
                  <li>⭐ [{{ q.poin || 10 }} Poin] {{ q.soal }}</li>
                }
              </ul>
            }
          </div>

          <button class="btn-primary" (click)="startSession()" [disabled]="saving() || filteredQuestions().length === 0" style="margin-top: 1rem;">
            {{ saving() ? 'Memproses...' : '🚀 Mulai & Terbitkan Sesi Ujian Realtime' }}
          </button>
        </div>
      }

      <!-- Status Sesi Realtime Aktif -->
      <div class="glass-card status-card">
        <div class="pulse-container">
          <div class="pulse-dot" [class.active]="activeSession()"></div>
          <span class="pulse-label">
            {{ activeSession() ? 'SESI UJIAN SEDANG BERLANGSUNG' : 'TIDAK ADA SESI AKTIF' }}
          </span>
        </div>

        @if (activeSession()) {
          <div class="session-info-grid">
            <div class="info-item">
              <span class="lbl">Judul Sesi:</span>
              <span class="val">{{ currentSession.judul }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Spesialisasi:</span>
              <span class="badge badge-spec">{{ currentSession.unit_spesialisasi }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Kode PIN Ujian:</span>
              <span class="pin-code">{{ currentSession.pin }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Durasi:</span>
              <span class="val">{{ currentSession.durasi }} Menit</span>
            </div>
          </div>
          <button class="btn-danger" (click)="stopSession()" style="margin-top: 1.25rem;">⏹️ Akhiri Sesi Ujian</button>
        } @else {
          <p class="status-desc">Saat ini tidak ada sesi ujian yang aktif. Klik "+ Buat Sesi Ujian Baru" untuk memulai sesi ujian berdasarkan unit spesialisasi.</p>
        }
      </div>

      <!-- Live Participant List -->
      @if (activeSession()) {
        <div class="glass-card table-wrap" style="margin-top: 1.5rem;">
          <h3 style="padding: 1.25rem 1.25rem 0.5rem 1.25rem;">📡 Live Peserta Ujian</h3>
          <table class="data-table">
            <thead>
              <tr><th>Siswa</th><th>Status Pengerjaan</th><th>Progress Soal</th><th>Skor Live</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Bripda Ahmad Subagja</strong></td>
                <td><span class="badge badge-ok">🟢 Mengerjakan</span></td>
                <td>12 / 15 Soal</td>
                <td><strong style="color: #fbbf24;">85 Poin</strong></td>
              </tr>
              <tr>
                <td><strong>Bripda Budi Santoso</strong></td>
                <td><span class="badge badge-ok">🟢 Mengerjakan</span></td>
                <td>10 / 15 Soal</td>
                <td><strong style="color: #fbbf24;">70 Poin</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      }

      @if (toast()) {
        <div class="toast" [class.toast-success]="toastType()==='success'" [class.toast-error]="toastType()==='error'">{{ toast() }}</div>
      }
    </div>
  `,
  styles: [`
    .pagehead { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
    .btn-primary { background: var(--gradient-primary); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-family: var(--font-body); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-danger { background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #ef4444; padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; }
    .btn-danger:hover { background: #ef4444; color: #fff; }
    .form-card { padding: 1.75rem; margin-bottom: 2rem; }
    .form-card h3 { margin-bottom: 1.25rem; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.25rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.375rem; }
    .form-group.full { grid-column: 1 / -1; }
    .form-group label { font-size: 0.75rem; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; }
    .form-input { background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--color-text-primary); padding: 10px 14px; border-radius: 8px; font-size: 0.875rem; font-family: var(--font-body); }
    .questions-preview-box { background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem; }
    .preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; font-size: 0.875rem; }
    .q-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; font-size: 0.8125rem; color: var(--color-text-secondary); }
    .empty-q-text { font-size: 0.8125rem; color: var(--color-accent-gold); margin: 0; }
    .status-card { padding: 2rem; text-align: center; margin-bottom: 1.5rem; }
    .pulse-container { display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin-bottom: 1rem; }
    .pulse-dot { width: 14px; height: 14px; border-radius: 50%; background: #64748b; }
    .pulse-dot.active { background: #10b981; animation: pulse 1.5s ease-in-out infinite; }
    .pulse-label { font-size: 1rem; font-weight: 800; letter-spacing: 0.05em; color: var(--color-text-primary); }
    .status-desc { color: var(--color-text-secondary); font-size: 0.875rem; max-width: 550px; margin: 0 auto; }
    .session-info-grid { display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap; margin-top: 1rem; background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 10px; }
    .info-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .info-item .lbl { font-size: 0.75rem; color: var(--color-text-muted); }
    .info-item .val { font-weight: 700; color: var(--color-text-primary); }
    .pin-code { font-family: 'JetBrains Mono', monospace; font-size: 1.25rem; font-weight: 800; letter-spacing: 0.1em; color: #fbbf24; background: rgba(245,158,11,0.15); padding: 2px 12px; border-radius: 6px; }
    .badge { padding: 2px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; }
    .badge-info { background: rgba(59,130,246,0.15); color: #60a5fa; }
    .badge-spec { background: rgba(59,130,246,0.1); color: #60a5fa; }
    .badge-ok { background: rgba(16,185,129,0.12); color: #10b981; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { padding: 0.875rem 1.25rem; text-align: left; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--color-text-muted); border-bottom: 1px solid var(--border-color); }
    .data-table td { padding: 0.875rem 1.25rem; font-size: 0.875rem; border-bottom: 1px solid rgba(255,255,255,0.03); }
    @keyframes pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); opacity: 0.6; } }
    .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 0.75rem 1.5rem; border-radius: 10px; font-size: 0.875rem; font-weight: 600; z-index: 1000; }
    .toast-success { background: rgba(16,185,129,0.9); color: #fff; }
    .toast-error { background: rgba(239,68,68,0.9); color: #fff; }
  `]
})
export class GadikRealtimeComponent implements OnInit {
  questions = signal<any[]>([]);
  filteredQuestions = signal<any[]>([]);
  showForm = false;
  saving = signal(false);
  activeSession = signal(false);
  toast = signal('');
  toastType = signal<'success'|'error'>('success');

  form = {
    judul: 'Ujian Evaluasi Reserse',
    unit_spesialisasi: 'reserse',
    tipe: 'ujian',
    durasi: 60,
    jumlah_soal: 15
  };

  currentSession = {
    judul: '',
    unit_spesialisasi: '',
    durasi: 60,
    pin: ''
  };

  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadQuestions();
  }

  loadQuestions() {
    const token = sessionStorage.getItem('rbt_token');
    this.http.get<any>(`${this.api}/questions`, { headers: { Authorization: `Bearer ${token}` } }).subscribe({
      next: r => {
        const all = r.data || [];
        this.questions.set(all);
        this.onCategoryChange();
      }
    });
  }

  onCategoryChange() {
    const spec = this.form.unit_spesialisasi;
    if (spec === 'semua') {
      this.filteredQuestions.set(this.questions());
    } else {
      this.filteredQuestions.set(this.questions().filter(q => (q.unit_spesialisasi || '').toLowerCase() === spec));
    }
  }

  startSession() {
    if (!this.form.judul) {
      this.msg('Judul sesi wajib diisi.', 'error');
      return;
    }
    this.currentSession = {
      judul: this.form.judul,
      unit_spesialisasi: this.form.unit_spesialisasi.toUpperCase(),
      durasi: this.form.durasi,
      pin: Math.floor(100000 + Math.random() * 900000).toString()
    };
    this.activeSession.set(true);
    this.showForm = false;
    this.msg('Sesi Ujian Realtime Berhasil Dimulai!', 'success');
  }

  stopSession() {
    this.activeSession.set(false);
    this.msg('Sesi Ujian Ditutup.', 'error');
  }

  private msg(m: string, t: 'success'|'error') { this.toast.set(m); this.toastType.set(t); setTimeout(() => this.toast.set(''), 3000); }
}
