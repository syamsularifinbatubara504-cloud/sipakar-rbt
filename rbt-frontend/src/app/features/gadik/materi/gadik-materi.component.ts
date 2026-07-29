import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-gadik-materi',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page active">
      <div class="pagehead">
        <div>
          <span class="eyebrow">MATERI PELATIHAN</span>
          <h1>Kelola Materi & Modul PDF</h1>
          <p class="page-desc">Buat materi pelatihan RBT dan unggah modul/dokumen PDF pendukung untuk siswa.</p>
        </div>
        <button class="btn-primary" (click)="showForm = !showForm">{{ showForm ? '✕ Tutup' : '+ Buat Materi Baru' }}</button>
      </div>

      @if (showForm) {
        <div class="glass-card form-card">
          <h3>Buat Materi Baru</h3>
          <div class="form-grid">
            <div class="form-group full">
              <label>Judul Materi</label>
              <input type="text" [(ngModel)]="form.judul" placeholder="Judul materi pelatihan..." class="form-input" />
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
              <label>Learning Outcomes</label>
              <input type="text" [(ngModel)]="form.outcomes" placeholder="Tujuan pembelajaran..." class="form-input" />
            </div>

            <!-- PDF Upload Section -->
            <div class="form-group full pdf-upload-box">
              <label>Lampiran Modul PDF</label>
              <div class="file-dropzone">
                <input type="file" accept="application/pdf" (change)="onPdfSelected($event)" class="file-input" />
                @if (uploadingPdf()) {
                  <span class="pdf-status loading">⏳ Mengunggah file PDF...</span>
                } @else if (form.lampiran) {
                  <span class="pdf-status success">✅ File PDF Terlampir: <a [href]="form.lampiran" target="_blank">Lihat PDF</a></span>
                } @else {
                  <span class="pdf-status-text">📄 Pilih file .pdf dari komputer Anda (Maks. 30MB)</span>
                }
              </div>
            </div>

            <div class="form-group full">
              <label>Isi Teks Materi / Penjelasan Skenario</label>
              <textarea [(ngModel)]="form.isi_materi" rows="6" placeholder="Tulis isi ringkasan materi pelatihan..." class="form-input"></textarea>
            </div>
          </div>

          <button class="btn-primary" (click)="create()" [disabled]="saving() || uploadingPdf()">
            {{ saving() ? 'Menyimpan...' : 'Simpan Materi & Lampiran' }}
          </button>
        </div>
      }

      <div class="material-list">
        @if (loading()) {
          <div class="loading-state">Memuat materi...</div>
        } @else if (items().length === 0) {
          <div class="glass-card empty-state">
            <div class="empty-icon">📚</div>
            <h3>Belum Ada Materi</h3>
            <p>Klik "Buat Materi Baru" untuk membuat materi dan mengunggah dokumen PDF.</p>
          </div>
        } @else {
          @for (m of items(); track m.id) {
            <div class="glass-card material-card">
              <div class="material-header">
                <div>
                  <h3>{{ m.judul }}</h3>
                  <div class="material-meta">
                    <span class="badge badge-spec">{{ m.unit_spesialisasi }}</span>
                    <span class="badge" [class]="m.status === 'approved' ? 'badge-ok' : 'badge-draft'">{{ m.status }}</span>
                    <span class="meta-date">{{ formatDate(m.created_at) }}</span>
                  </div>
                </div>
                <button class="btn-sm btn-delete" (click)="remove(m)">🗑️</button>
              </div>

              @if (m.isi_materi) {
                <p class="material-body">{{ m.isi_materi }}</p>
              }

              @if (m.lampiran) {
                <div class="pdf-attachment-badge">
                  <span class="pdf-icon">📄</span>
                  <div class="pdf-info">
                    <span class="pdf-title">Dokumen Modul PDF Terlampir</span>
                    <a [href]="m.lampiran" target="_blank" class="pdf-link">Buka / Unduh File PDF ↗</a>
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>

      @if (toast()) {
        <div class="toast" [class.toast-success]="tt()==='success'" [class.toast-error]="tt()==='error'">{{ toast() }}</div>
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
    .pdf-upload-box { background: rgba(59, 130, 246, 0.04); border: 1px dashed var(--border-color); padding: 1.25rem; border-radius: 10px; }
    .file-dropzone { display: flex; flex-direction: column; gap: 0.5rem; }
    .pdf-status-text { font-size: 0.8125rem; color: var(--color-text-muted); }
    .pdf-status.loading { font-size: 0.8125rem; color: var(--color-accent-gold); font-weight: 600; }
    .pdf-status.success { font-size: 0.8125rem; color: #10b981; font-weight: 600; }
    .pdf-status.success a { color: #60a5fa; text-decoration: underline; }
    .material-list { display: flex; flex-direction: column; gap: 1.25rem; }
    .material-card { padding: 1.5rem; }
    .material-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .material-header h3 { font-size: 1.125rem; margin-bottom: 0.5rem; font-weight: 700; }
    .material-meta { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .badge { padding: 2px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; }
    .badge-spec { background: rgba(59,130,246,0.1); color: #60a5fa; }
    .badge-ok { background: rgba(16,185,129,0.12); color: #10b981; }
    .badge-draft { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .meta-date { font-size: 0.7rem; color: var(--color-text-muted); }
    .material-body { font-size: 0.875rem; color: var(--color-text-secondary); margin-top: 1rem; line-height: 1.6; }
    .pdf-attachment-badge { display: flex; align-items: center; gap: 1rem; margin-top: 1rem; padding: 0.875rem 1.25rem; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 10px; }
    .pdf-icon { font-size: 1.75rem; }
    .pdf-info { display: flex; flex-direction: column; gap: 2px; }
    .pdf-title { font-size: 0.8125rem; font-weight: 600; color: var(--color-text-primary); }
    .pdf-link { font-size: 0.8125rem; font-weight: 700; color: var(--color-accent-blue-light); text-decoration: none; }
    .pdf-link:hover { text-decoration: underline; }
    .btn-sm { background: none; border: 1px solid var(--border-color); color: var(--color-text-secondary); padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; }
    .btn-delete:hover { background: rgba(239,68,68,0.1); border-color: #ef4444; }
    .empty-state { text-align: center; padding: 3rem; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .loading-state { text-align: center; padding: 3rem; color: var(--color-text-secondary); }
    .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 0.75rem 1.5rem; border-radius: 10px; font-size: 0.875rem; font-weight: 600; z-index: 1000; }
    .toast-success { background: rgba(16,185,129,0.9); color: #fff; }
    .toast-error { background: rgba(239,68,68,0.9); color: #fff; }
  `]
})
export class GadikMateriComponent implements OnInit {
  items = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  uploadingPdf = signal(false);
  showForm = false;
  toast = signal('');
  tt = signal<'success'|'error'>('success');
  form = { judul: '', unit_spesialisasi: '', isi_materi: '', outcomes: '', lampiran: '' };
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}
  ngOnInit() { this.load(); }

  private headers() { return { Authorization: `Bearer ${sessionStorage.getItem('rbt_token')}` }; }

  load() {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/materials`, { headers: this.headers() }).subscribe({
      next: r => { this.items.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onPdfSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.msg('Hanya file bertipe .pdf yang dapat diunggah!', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    this.uploadingPdf.set(true);
    this.http.post<any>(`${this.api}/materials/upload-pdf`, formData, { headers: this.headers() }).subscribe({
      next: (res) => {
        this.form.lampiran = res.url;
        this.msg('File PDF berhasil diunggah!', 'success');
        this.uploadingPdf.set(false);
      },
      error: () => {
        this.msg('Gagal mengunggah file PDF.', 'error');
        this.uploadingPdf.set(false);
      }
    });
  }

  create() {
    if (!this.form.judul || !this.form.unit_spesialisasi) {
      this.msg('Judul dan unit spesialisasi wajib diisi.', 'error');
      return;
    }
    this.saving.set(true);
    this.http.post<any>(`${this.api}/materials`, this.form, { headers: this.headers() }).subscribe({
      next: () => {
        this.msg('Materi berhasil dibuat!', 'success');
        this.showForm = false;
        this.form = { judul: '', unit_spesialisasi: '', isi_materi: '', outcomes: '', lampiran: '' };
        this.load();
        this.saving.set(false);
      },
      error: () => { this.msg('Gagal membuat materi.', 'error'); this.saving.set(false); }
    });
  }

  remove(m: any) {
    if (!confirm('Hapus materi ini?')) return;
    this.http.delete<any>(`${this.api}/materials/${m.id}`, { headers: this.headers() }).subscribe({
      next: () => { this.items.update(a => a.filter(x => x.id !== m.id)); this.msg('Dihapus.', 'success'); },
      error: () => this.msg('Gagal menghapus.', 'error')
    });
  }

  formatDate(d: string) { return d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'; }
  private msg(m: string, t: 'success'|'error') { this.toast.set(m); this.tt.set(t); setTimeout(() => this.toast.set(''), 3000); }
}
