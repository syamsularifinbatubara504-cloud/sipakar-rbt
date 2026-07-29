import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-mnj-materi',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page active">
      <div class="pagehead">
        <div>
          <span class="eyebrow">MANAJEMEN MATERI</span>
          <h1>Konten & Dokumen Materi PDF</h1>
          <p class="page-desc">Kelola materi pelatihan RBT, unggah dokumen PDF, serta setujui materi yang dibuat oleh Gadik.</p>
        </div>
        <button class="btn-primary" (click)="showForm = !showForm">
          {{ showForm ? '✕ Tutup' : '+ Tambah Materi & PDF' }}
        </button>
      </div>

      @if (showForm) {
        <div class="glass-card form-card">
          <h3>Buat Materi Baru</h3>
          <div class="form-grid">
            <div class="form-group full">
              <label>Judul Materi</label>
              <input type="text" [(ngModel)]="form.judul" placeholder="Judul materi..." class="form-input" />
            </div>
            <div class="form-group">
              <label>Unit Spesialisasi</label>
              <select [(ngModel)]="form.unit_spesialisasi" class="form-input">
                <option value="">Pilih Spesialisasi...</option>
                <option value="reserse">Reserse</option>
                <option value="sabhara">Sabhara</option>
                <option value="intel">Intel</option>
                <option value="lantas">Lantas</option>
                <option value="binmas">Binmas</option>
              </select>
            </div>
            <div class="form-group">
              <label>Outcomes</label>
              <input type="text" [(ngModel)]="form.outcomes" placeholder="Learning outcomes..." class="form-input" />
            </div>

            <!-- PDF Upload Box -->
            <div class="form-group full pdf-upload-box">
              <label>Unggah Dokumen PDF Materi</label>
              <div class="file-dropzone">
                <input type="file" accept="application/pdf" (change)="onPdfSelected($event)" class="file-input" />
                @if (uploadingPdf()) {
                  <span class="pdf-status loading">⏳ Mengunggah file PDF...</span>
                } @else if (form.lampiran) {
                  <span class="pdf-status success">✅ File PDF Terlampir: <a [href]="form.lampiran" target="_blank">Lihat PDF</a></span>
                } @else {
                  <span class="pdf-status-text">📄 Pilih file PDF dari komputer Anda (Maks. 30MB)</span>
                }
              </div>
            </div>

            <div class="form-group full">
              <label>Isi Materi</label>
              <textarea [(ngModel)]="form.isi_materi" rows="5" placeholder="Tulis isi materi..." class="form-input"></textarea>
            </div>
          </div>
          <button class="btn-primary" (click)="createMaterial()" [disabled]="saving() || uploadingPdf()">
            {{ saving() ? 'Menyimpan...' : 'Simpan Materi' }}
          </button>
        </div>
      }

      <div class="stats-row">
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background: rgba(139,92,246,0.15); color: #8b5cf6;">📚</div>
          <div class="stat-info"><span class="stat-val">{{ materials().length }}</span><span class="stat-label">Total Materi</span></div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background: rgba(16,185,129,0.15); color: #10b981;">✅</div>
          <div class="stat-info"><span class="stat-val">{{ countStatus('approved') }}</span><span class="stat-label">Disetujui</span></div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background: rgba(245,158,11,0.15); color: #f59e0b;">📝</div>
          <div class="stat-info"><span class="stat-val">{{ countStatus('draft') }}</span><span class="stat-label">Draft</span></div>
        </div>
      </div>

      <div class="glass-card table-wrap">
        @if (loading()) {
          <div class="loading-state">Memuat materi...</div>
        } @else if (materials().length === 0) {
          <div class="empty-state">Belum ada materi. Klik "Tambah Materi" untuk membuat.</div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>Judul & Dokumen</th>
                <th>Spesialisasi</th>
                <th>Status</th>
                <th>Pembuat</th>
                <th>Tanggal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              @for (m of materials(); track m.id) {
                <tr>
                  <td>
                    <div class="materi-cell">
                      <strong>{{ m.judul }}</strong>
                      @if (m.lampiran) {
                        <a [href]="m.lampiran" target="_blank" class="pdf-link-sm">📄 Buka File PDF</a>
                      }
                    </div>
                  </td>
                  <td><span class="badge badge-spec">{{ m.unit_spesialisasi }}</span></td>
                  <td>
                    <span class="badge" [class]="m.status === 'approved' ? 'badge-approved' : 'badge-draft'">
                      {{ m.status === 'approved' ? '✅ Approved' : '📝 Draft' }}
                    </span>
                  </td>
                  <td>{{ m.gadik_name || '-' }}</td>
                  <td>{{ formatDate(m.created_at) }}</td>
                  <td class="action-cell">
                    @if (m.status !== 'approved') {
                      <button class="btn-sm btn-approve" (click)="approveMaterial(m)">✓ Approve</button>
                    }
                    <button class="btn-sm btn-delete" (click)="deleteMaterial(m)">🗑️</button>
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
    .btn-primary { background: var(--gradient-primary); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-family: var(--font-body); transition: opacity 0.2s; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .form-card { padding: 1.75rem; margin-bottom: 2rem; }
    .form-card h3 { margin-bottom: 1.25rem; font-size: 1.125rem; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.25rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.375rem; }
    .form-group.full { grid-column: 1 / -1; }
    .form-group label { font-size: 0.75rem; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; }
    .form-input { background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--color-text-primary); padding: 10px 14px; border-radius: 8px; font-size: 0.875rem; font-family: var(--font-body); resize: vertical; }
    .pdf-upload-box { background: rgba(59, 130, 246, 0.04); border: 1px dashed var(--border-color); padding: 1.25rem; border-radius: 10px; }
    .file-dropzone { display: flex; flex-direction: column; gap: 0.5rem; }
    .file-input { padding: 8px 12px; }
    .pdf-status-text { font-size: 0.8125rem; color: var(--color-text-muted); }
    .pdf-status.loading { font-size: 0.8125rem; color: var(--color-accent-gold); font-weight: 600; }
    .pdf-status.success { font-size: 0.8125rem; color: #10b981; font-weight: 600; }
    .pdf-status.success a { color: #60a5fa; text-decoration: underline; }
    .materi-cell { display: flex; flex-direction: column; gap: 4px; }
    .pdf-link-sm { font-size: 0.75rem; color: var(--color-accent-blue-light); font-weight: 600; text-decoration: none; }
    .pdf-link-sm:hover { text-decoration: underline; }
    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
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
    .badge-approved { background: rgba(16,185,129,0.12); color: #10b981; }
    .badge-draft { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .action-cell { display: flex; gap: 0.5rem; align-items: center; }
    .btn-sm { background: none; border: 1px solid var(--border-color); color: var(--color-text-secondary); padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; font-family: var(--font-body); }
    .btn-approve:hover { background: rgba(16,185,129,0.1); border-color: #10b981; color: #10b981; }
    .btn-delete:hover { background: rgba(239,68,68,0.1); border-color: #ef4444; color: #ef4444; }
    .loading-state, .empty-state { padding: 3rem; text-align: center; color: var(--color-text-secondary); }
    .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 0.75rem 1.5rem; border-radius: 10px; font-size: 0.875rem; font-weight: 600; z-index: 1000; animation: slideUp 0.3s ease; }
    .toast-success { background: rgba(16,185,129,0.9); color: #fff; }
    .toast-error { background: rgba(239,68,68,0.9); color: #fff; }
  `]
})
export class MnjMateriComponent implements OnInit {
  materials = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  uploadingPdf = signal(false);
  showForm = false;
  toast = signal('');
  toastType = signal<'success' | 'error'>('success');
  form = { judul: '', unit_spesialisasi: '', isi_materi: '', outcomes: '', lampiran: '' };

  private apiUrl = environment.apiUrl;
  constructor(private http: HttpClient) {}

  ngOnInit() { this.loadMaterials(); }

  loadMaterials() {
    this.loading.set(true);
    const token = sessionStorage.getItem('rbt_token');
    this.http.get<any>(`${this.apiUrl}/materials`, { headers: { Authorization: `Bearer ${token}` } })
      .subscribe({
        next: (res) => { this.materials.set(res.data || []); this.loading.set(false); },
        error: () => { this.loading.set(false); }
      });
  }

  countStatus(s: string) { return this.materials().filter(m => m.status === s).length; }

  onPdfSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.showToast('Hanya file bertipe .pdf yang dapat diunggah!', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const token = sessionStorage.getItem('rbt_token');
    this.uploadingPdf.set(true);
    this.http.post<any>(`${this.apiUrl}/materials/upload-pdf`, formData, { headers: { Authorization: `Bearer ${token}` } }).subscribe({
      next: (res) => {
        this.form.lampiran = res.url;
        this.showToast('File PDF berhasil diunggah!', 'success');
        this.uploadingPdf.set(false);
      },
      error: () => {
        this.showToast('Gagal mengunggah file PDF.', 'error');
        this.uploadingPdf.set(false);
      }
    });
  }

  createMaterial() {
    if (!this.form.judul || !this.form.unit_spesialisasi) {
      this.showToast('Judul dan spesialisasi wajib diisi.', 'error'); return;
    }
    this.saving.set(true);
    const token = sessionStorage.getItem('rbt_token');
    this.http.post<any>(`${this.apiUrl}/materials`, this.form, { headers: { Authorization: `Bearer ${token}` } })
      .subscribe({
        next: () => {
          this.showToast('Materi berhasil dibuat!', 'success');
          this.showForm = false;
          this.form = { judul: '', unit_spesialisasi: '', isi_materi: '', outcomes: '', lampiran: '' };
          this.loadMaterials();
          this.saving.set(false);
        },
        error: () => { this.showToast('Gagal membuat materi.', 'error'); this.saving.set(false); }
      });
  }

  approveMaterial(m: any) {
    const token = sessionStorage.getItem('rbt_token');
    this.http.put<any>(`${this.apiUrl}/materials/${m.id}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } })
      .subscribe({
        next: () => { m.status = 'approved'; this.showToast('Materi disetujui!', 'success'); },
        error: () => this.showToast('Gagal menyetujui.', 'error')
      });
  }

  deleteMaterial(m: any) {
    if (!confirm('Yakin ingin menghapus materi ini?')) return;
    const token = sessionStorage.getItem('rbt_token');
    this.http.delete<any>(`${this.apiUrl}/materials/${m.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .subscribe({
        next: () => { this.materials.update(arr => arr.filter(x => x.id !== m.id)); this.showToast('Materi dihapus.', 'success'); },
        error: () => this.showToast('Gagal menghapus.', 'error')
      });
  }

  formatDate(d: string) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private showToast(msg: string, type: 'success' | 'error') {
    this.toast.set(msg); this.toastType.set(type);
    setTimeout(() => this.toast.set(''), 3000);
  }
}
