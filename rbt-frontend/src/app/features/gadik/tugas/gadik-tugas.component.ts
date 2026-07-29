import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-gadik-tugas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page active">
      <div class="pagehead">
        <div>
          <span class="eyebrow">PENUGASAN</span>
          <h1>Kelola Tugas & Penilaian Siswa</h1>
          <p class="page-desc">Buat tugas baru berdasarkan materi pelatihan dan berikan nilai kepada siswa Prolat.</p>
        </div>
        <button class="btn-primary" (click)="showForm = !showForm">
          {{ showForm ? '✕ Tutup' : '+ Buat Tugas Baru' }}
        </button>
      </div>

      <!-- Form Buat Tugas -->
      @if (showForm) {
        <div class="glass-card form-card">
          <h3>Formulir Buat Tugas Baru</h3>
          <div class="form-grid">
            <div class="form-group full">
              <label>Pilih Materi Terkait (Opsional)</label>
              <select [(ngModel)]="form.material_id" class="form-input">
                <option value="">-- Pilih Materi --</option>
                @for (m of materials(); track m.id) {
                  <option [value]="m.id">{{ m.judul }} ({{ m.unit_spesialisasi }})</option>
                }
              </select>
            </div>
            <div class="form-group full">
              <label>Deskripsi & Instruksi Tugas</label>
              <textarea [(ngModel)]="form.deskripsi_tugas" rows="4" placeholder="Tulis rincian instruksi tugas yang harus dikerjakan siswa..." class="form-input"></textarea>
            </div>
            <div class="form-group">
              <label>Tenggat Waktu (Deadline)</label>
              <input type="datetime-local" [(ngModel)]="form.tenggat" class="form-input" />
            </div>
            <div class="form-group">
              <label>Poin Maksimal</label>
              <input type="number" [(ngModel)]="form.poin_maksimal" class="form-input" placeholder="100" />
            </div>
          </div>
          <button class="btn-primary" (click)="createTugas()" [disabled]="saving()">
            {{ saving() ? 'Menyimpan...' : '🚀 Terbitkan Tugas Ke Siswa' }}
          </button>
        </div>
      }

      <div class="stats-row">
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background: rgba(59,130,246,0.15); color: #3b82f6;">📋</div>
          <div class="stat-info"><span class="stat-val">{{ assignments().length }}</span><span class="stat-label">Total Tugas</span></div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background: rgba(16,185,129,0.15); color: #10b981;">📩</div>
          <div class="stat-info"><span class="stat-val">{{ totalSubmissions() }}</span><span class="stat-label">Total Jawaban Siswa</span></div>
        </div>
      </div>

      <div class="glass-card table-wrap">
        @if (loading()) {
          <div class="center-state">Memuat tugas...</div>
        } @else if (assignments().length === 0) {
          <div class="center-state">
            <div style="font-size:3rem; margin-bottom:1rem;">📋</div>
            <h3>Belum Ada Tugas Ditambahkan</h3>
            <p style="color: var(--color-text-secondary); margin-top: 0.5rem;">Klik tombol "+ Buat Tugas Baru" di atas untuk memberikan tugas kepada siswa.</p>
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>Instruksi Tugas</th>
                <th>Materi Pelatihan</th>
                <th>Tenggat Waktu</th>
                <th>Dikumpulkan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              @for (t of assignments(); track t.id) {
                <tr>
                  <td>
                    <strong style="color: var(--color-text-primary);">{{ t.deskripsi_tugas }}</strong>
                  </td>
                  <td>
                    <span class="badge badge-spec">{{ t.material_title || 'Tugas Umum' }}</span>
                  </td>
                  <td style="font-size: 0.8125rem;">
                    {{ t.tenggat ? formatDate(t.tenggat) : 'Tanpa Tenggat' }}
                  </td>
                  <td>
                    <span class="badge badge-ok">📥 {{ t.submission_count || 0 }} Siswa</span>
                  </td>
                  <td>
                    <button class="btn-sm btn-delete" (click)="deleteTugas(t)">🗑️ Hapus</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      @if (toast()) {
        <div class="toast" [class.toast-success]="toastType()==='success'" [class.toast-error]="toastType()==='error'">{{ toast() }}</div>
      }
    </div>
  `,
  styles: [`
    .pagehead { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
    .btn-primary { background: var(--gradient-primary); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-family: var(--font-body); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .form-card { padding: 1.75rem; margin-bottom: 2rem; }
    .form-card h3 { margin-bottom: 1.25rem; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.25rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.375rem; }
    .form-group.full { grid-column: 1 / -1; }
    .form-group label { font-size: 0.75rem; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; }
    .form-input { background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--color-text-primary); padding: 10px 14px; border-radius: 8px; font-size: 0.875rem; font-family: var(--font-body); resize: vertical; }
    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .stat-card { display: flex; align-items: center; gap: 1rem; padding: 1.25rem; }
    .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-val { font-size: 1.5rem; font-weight: 800; }
    .stat-label { font-size: 0.75rem; color: var(--color-text-secondary); }
    .table-wrap { overflow-x: auto; padding: 0; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { padding: 0.875rem 1.25rem; text-align: left; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); border-bottom: 1px solid var(--border-color); }
    .data-table td { padding: 0.875rem 1.25rem; font-size: 0.875rem; border-bottom: 1px solid rgba(255,255,255,0.03); }
    .data-table tr:hover { background: rgba(255,255,255,0.02); }
    .badge { padding: 2px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; }
    .badge-spec { background: rgba(59,130,246,0.1); color: #60a5fa; }
    .badge-ok { background: rgba(16,185,129,0.12); color: #10b981; }
    .btn-sm { background: none; border: 1px solid var(--border-color); color: var(--color-text-secondary); padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; }
    .btn-delete:hover { background: rgba(239,68,68,0.1); border-color: #ef4444; color: #ef4444; }
    .center-state { padding: 3rem; text-align: center; color: var(--color-text-secondary); }
    .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 0.75rem 1.5rem; border-radius: 10px; font-size: 0.875rem; font-weight: 600; z-index: 1000; }
    .toast-success { background: rgba(16,185,129,0.9); color: #fff; }
    .toast-error { background: rgba(239,68,68,0.9); color: #fff; }
  `]
})
export class GadikTugasComponent implements OnInit {
  assignments = signal<any[]>([]);
  materials = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  showForm = false;
  toast = signal('');
  toastType = signal<'success' | 'error'>('success');

  form = { material_id: '', deskripsi_tugas: '', tenggat: '', poin_maksimal: 100 };
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadAssignments();
    this.loadMaterials();
  }

  private headers() { return { Authorization: `Bearer ${sessionStorage.getItem('rbt_token')}` }; }

  loadAssignments() {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/assignments`, { headers: this.headers() }).subscribe({
      next: r => { this.assignments.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  loadMaterials() {
    this.http.get<any>(`${this.api}/materials`, { headers: this.headers() }).subscribe({
      next: r => this.materials.set(r.data || [])
    });
  }

  totalSubmissions() {
    return this.assignments().reduce((sum, a) => sum + (parseInt(a.submission_count) || 0), 0);
  }

  createTugas() {
    if (!this.form.deskripsi_tugas) {
      this.msg('Deskripsi tugas wajib diisi.', 'error');
      return;
    }
    this.saving.set(true);
    this.http.post<any>(`${this.api}/assignments`, this.form, { headers: this.headers() }).subscribe({
      next: () => {
        this.msg('Tugas berhasil diterbitkan!', 'success');
        this.showForm = false;
        this.form = { material_id: '', deskripsi_tugas: '', tenggat: '', poin_maksimal: 100 };
        this.loadAssignments();
        this.saving.set(false);
      },
      error: () => { this.msg('Gagal membuat tugas.', 'error'); this.saving.set(false); }
    });
  }

  deleteTugas(t: any) {
    if (!confirm('Hapus tugas ini?')) return;
    this.http.delete<any>(`${this.api}/assignments/${t.id}`, { headers: this.headers() }).subscribe({
      next: () => {
        this.assignments.update(arr => arr.filter(x => x.id !== t.id));
        this.msg('Tugas dihapus.', 'success');
      },
      error: () => this.msg('Gagal menghapus.', 'error')
    });
  }

  formatDate(d: string) { return d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'; }
  private msg(m: string, t: 'success'|'error') { this.toast.set(m); this.toastType.set(t); setTimeout(() => this.toast.set(''), 3000); }
}
