import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-mnj-soal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page active">
      <div class="pagehead">
        <div>
          <span class="eyebrow">MANAJEMEN SOAL</span>
          <h1>Bank Soal, Poin & Impor Excel</h1>
          <p class="page-desc">Kelola, verifikasi, dan impor soal via Excel. Setiap soal memiliki bobot poin untuk penilaian.</p>
        </div>
        <div class="action-buttons">
          <button class="btn-primary" (click)="toggleForm('single')">
            {{ activeMode === 'single' && showForm ? '✕ Tutup' : '+ Tambah Soal' }}
          </button>
          <button class="btn-secondary" (click)="toggleForm('excel')" style="margin-left: 0.5rem;">
            {{ activeMode === 'excel' && showForm ? '✕ Tutup' : '📊 Impor Excel' }}
          </button>
        </div>
      </div>

      <!-- Form Single Soal -->
      @if (showForm && activeMode === 'single') {
        <div class="glass-card form-card">
          <h3>Buat Soal Baru</h3>
          <div class="form-grid">
            <div class="form-group full">
              <label>Pertanyaan Soal</label>
              <textarea [(ngModel)]="form.soal" rows="3" placeholder="Tulis pertanyaan soal..." class="form-input"></textarea>
            </div>
            <div class="form-group">
              <label>Unit Spesialisasi</label>
              <select [(ngModel)]="form.unit_spesialisasi" class="form-input">
                <option value="">Pilih Spesialisasi...</option>
                <option value="reserse">Reserse</option>
                <option value="sabhara">Sabhara</option>
                <option value="intel">Intelkam</option>
                <option value="lantas">Lantas</option>
                <option value="binmas">Binmas</option>
              </select>
            </div>
            <div class="form-group">
              <label>Poin Soal (Bobot Nilai)</label>
              <input type="number" [(ngModel)]="form.poin" min="1" max="100" class="form-input" />
            </div>
            <div class="form-group">
              <label>Kunci Jawaban Benar</label>
              <select [(ngModel)]="form.jawaban_benar" class="form-input highlight-select">
                <option [value]="0">✅ Opsi A (Pilihan A)</option>
                <option [value]="1">✅ Opsi B (Pilihan B)</option>
                <option [value]="2">✅ Opsi C (Pilihan C)</option>
                <option [value]="3">✅ Opsi D (Pilihan D)</option>
              </select>
            </div>

            <!-- Separated Options Input -->
            <div class="form-group full options-section">
              <label class="section-label">Pilihan Opsi Jawaban Ganda (A, B, C, D)</label>
              
              <div class="option-row">
                <span class="option-badge opt-a" [class.is-correct]="form.jawaban_benar == 0">A</span>
                <input type="text" [(ngModel)]="form.opsi_a" placeholder="Isi teks pilihan A..." class="form-input opt-input" />
              </div>

              <div class="option-row">
                <span class="option-badge opt-b" [class.is-correct]="form.jawaban_benar == 1">B</span>
                <input type="text" [(ngModel)]="form.opsi_b" placeholder="Isi teks pilihan B..." class="form-input opt-input" />
              </div>

              <div class="option-row">
                <span class="option-badge opt-c" [class.is-correct]="form.jawaban_benar == 2">C</span>
                <input type="text" [(ngModel)]="form.opsi_c" placeholder="Isi teks pilihan C..." class="form-input opt-input" />
              </div>

              <div class="option-row">
                <span class="option-badge opt-d" [class.is-correct]="form.jawaban_benar == 3">D</span>
                <input type="text" [(ngModel)]="form.opsi_d" placeholder="Isi teks pilihan D..." class="form-input opt-input" />
              </div>
            </div>
          </div>
          <button class="btn-primary" (click)="createQuestion()" [disabled]="saving()" style="margin-top: 1rem;">
            {{ saving() ? 'Menyimpan...' : '💾 Simpan Soal' }}
          </button>
        </div>
      }

      <!-- Form Impor Excel -->
      @if (showForm && activeMode === 'excel') {
        <div class="glass-card form-card">
          <div class="batch-header">
            <h3>📊 Impor Batch Soal dari File Excel</h3>
            <button class="btn-sm btn-link" (click)="downloadExcelTemplate()">⬇️ Unduh Template Excel</button>
          </div>
          <p class="batch-desc">Unggah file spreadsheet Excel berisi soal (Kolom: Soal, Spesialisasi, Poin, Opsi A–D, Jawaban Benar). Soal dari Admin langsung terverifikasi.</p>
          
          <div class="form-group full excel-box">
            <label>Pilih File Excel (.xlsx / .xls)</label>
            <input type="file" accept=".xlsx, .xls" (change)="onExcelFileSelected($event)" class="form-input file-input" />
          </div>

          @if (excelFile) {
            <div class="excel-selected-info">
              📄 File Terpilih: <strong>{{ excelFile.name }}</strong> ({{ (excelFile.size / 1024).toFixed(1) }} KB)
            </div>
          }

          <button class="btn-primary" (click)="submitExcel()" [disabled]="saving() || !excelFile" style="margin-top: 1rem;">
            {{ saving() ? 'Mengimpor...' : '🚀 Unggah & Impor Excel' }}
          </button>
        </div>
      }

      <!-- Stats -->
      <div class="stats-row">
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background: rgba(59,130,246,0.15); color: #3b82f6;">📝</div>
          <div class="stat-info"><span class="stat-val">{{ questions().length }}</span><span class="stat-label">Total Soal</span></div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background: rgba(16,185,129,0.15); color: #10b981;">✅</div>
          <div class="stat-info"><span class="stat-val">{{ countStatus('approved') }}</span><span class="stat-label">Terverifikasi</span></div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background: rgba(245,158,11,0.15); color: #f59e0b;">⭐</div>
          <div class="stat-info"><span class="stat-val">{{ totalPoin() }}</span><span class="stat-label">Total Poin Bank Soal</span></div>
        </div>
      </div>

      <!-- Table -->
      <div class="glass-card table-wrap">
        @if (loading()) {
          <div class="loading-state">Memuat soal...</div>
        } @else if (questions().length === 0) {
          <div class="empty-state">Belum ada soal. Klik "Tambah Soal" atau "Impor Excel" untuk membuat.</div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>Soal</th>
                <th>Poin</th>
                <th>Spesialisasi</th>
                <th>Status</th>
                <th>Pembuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              @for (q of questions(); track q.id) {
                <tr>
                  <td><span class="soal-text">{{ q.soal?.substring(0, 70) }}{{ q.soal?.length > 70 ? '...' : '' }}</span></td>
                  <td><span class="badge badge-poin">⭐ {{ q.poin || 10 }}</span></td>
                  <td><span class="badge badge-spec">{{ q.unit_spesialisasi }}</span></td>
                  <td>
                    <span class="badge" [class]="q.status === 'approved' ? 'badge-approved' : 'badge-pending'">
                      {{ q.status === 'approved' ? '✅ Verified' : '⏳ Pending' }}
                    </span>
                  </td>
                  <td>{{ q.gadik_name || '-' }}</td>
                  <td class="action-cell">
                    <button class="btn-sm btn-view" (click)="viewDetail(q)">👁️ View</button>
                    @if (q.status !== 'approved') {
                      <button class="btn-sm btn-approve" (click)="approveQuestion(q)">✓ Approve</button>
                    }
                    <button class="btn-sm btn-delete" (click)="deleteQuestion(q)">🗑️</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- View Detail Modal -->
      @if (selectedQuestion) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="glass-card modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="badge badge-spec" style="margin-right: 0.5rem;">{{ selectedQuestion.unit_spesialisasi }}</span>
                <span class="badge badge-poin">⭐ {{ selectedQuestion.poin || 10 }} Poin</span>
              </div>
              <button class="btn-close" (click)="closeModal()">✕</button>
            </div>
            
            <h3 class="modal-title">Detail Soal & Opsi Jawaban</h3>
            <p class="modal-question">{{ selectedQuestion.soal }}</p>

            <div class="options-view-list">
              @for (opt of parseOptions(selectedQuestion.opsi_jawaban); track $index) {
                <div class="option-view-item" [class.is-correct-opt]="$index === parseNum(selectedQuestion.jawaban_benar)">
                  <span class="opt-key">{{ getOptionKey($index) }}</span>
                  <span class="opt-text">{{ opt }}</span>
                  @if ($index === parseNum(selectedQuestion.jawaban_benar)) {
                    <span class="correct-badge">✅ KUNCI JAWABAN BENAR</span>
                  }
                </div>
              }
            </div>

            <div class="modal-footer">
              <button class="btn-secondary" (click)="closeModal()">✕ Tutup Preview</button>
            </div>
          </div>
        </div>
      }

      @if (toast()) {
        <div class="toast" [class.toast-success]="toastType()==='success'" [class.toast-error]="toastType()==='error'">{{ toast() }}</div>
      }
    </div>
  `,
  styles: [`
    .pagehead { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
    .action-buttons { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
    .btn-primary { background: var(--gradient-primary); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-family: var(--font-body); }
    .btn-secondary { background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--color-text-primary); padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-family: var(--font-body); }
    .btn-primary:disabled, .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
    .form-card { padding: 1.75rem; margin-bottom: 2rem; }
    .batch-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .batch-desc { font-size: 0.8125rem; color: var(--color-text-secondary); margin-bottom: 1.25rem; }
    .btn-link { background: none; border: none; color: var(--color-accent-blue-light); cursor: pointer; font-size: 0.8125rem; text-decoration: underline; }
    .file-input { padding: 8px 12px; }
    .excel-box { background: rgba(16, 185, 129, 0.04); border: 1px dashed rgba(16, 185, 129, 0.3); padding: 1rem; border-radius: 8px; }
    .excel-selected-info { margin-top: 0.75rem; font-size: 0.875rem; color: #10b981; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.25rem; }
    .form-group.full { grid-column: 1 / -1; }
    .form-group label { font-size: 0.75rem; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
    .form-input { background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--color-text-primary); padding: 10px 12px; border-radius: 8px; font-size: 0.875rem; font-family: var(--font-body); resize: vertical; }
    .highlight-select { border-color: rgba(16,185,129,0.5); background: rgba(16,185,129,0.05); color: #10b981; font-weight: 700; }
    
    /* Options Section Styles */
    .options-section { background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 10px; padding: 1.25rem; gap: 0.875rem; }
    .section-label { font-size: 0.8125rem; font-weight: 800; color: var(--color-text-primary); text-transform: uppercase; margin-bottom: 0.5rem; letter-spacing: 0.04em; }
    .option-row { display: flex; align-items: center; gap: 0.75rem; }
    .option-badge { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.875rem; background: rgba(255,255,255,0.08); color: var(--color-text-secondary); flex-shrink: 0; transition: all 0.2s; }
    .option-badge.is-correct { background: #10b981; color: #fff; box-shadow: 0 0 10px rgba(16,185,129,0.4); }
    .opt-input { width: 100%; }

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
    .soal-text { color: var(--color-text-primary); }
    .badge { padding: 2px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; }
    .badge-poin { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-spec { background: rgba(59,130,246,0.1); color: #60a5fa; }

    .badge-approved { background: rgba(16,185,129,0.12); color: #10b981; }
    .badge-pending { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .action-cell { display: flex; gap: 0.375rem; align-items: center; }
    .btn-sm { background: none; border: 1px solid var(--border-color); color: var(--color-text-secondary); padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; font-family: var(--font-body); }
    .btn-view { border-color: rgba(59,130,246,0.4); color: #60a5fa; }
    .btn-view:hover { background: rgba(59,130,246,0.15); }
    .btn-approve:hover { background: rgba(16,185,129,0.1); border-color: #10b981; color: #10b981; }
    .btn-delete:hover { background: rgba(239,68,68,0.1); border-color: #ef4444; color: #ef4444; }
    .loading-state, .empty-state { padding: 3rem; text-align: center; color: var(--color-text-secondary); }

    /* Modal View Styles */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1.5rem; }
    .modal-card { width: 100%; max-width: 650px; padding: 1.75rem; border: 1px solid var(--border-color); box-shadow: 0 20px 40px rgba(0,0,0,0.5); animation: fadeIn 0.2s ease-out; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
    .btn-close { background: none; border: none; color: var(--color-text-secondary); font-size: 1.25rem; cursor: pointer; }
    .btn-close:hover { color: #ef4444; }
    .modal-title { font-size: 1.125rem; font-weight: 800; color: var(--color-text-primary); margin-bottom: 0.75rem; }
    .modal-question { font-size: 1rem; line-height: 1.6; color: var(--color-text-primary); background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 1.25rem; }
    .options-view-list { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }
    .option-view-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.875rem; color: var(--color-text-primary); }
    .option-view-item.is-correct-opt { background: rgba(16, 185, 129, 0.12); border-color: #10b981; }
    .opt-key { width: 28px; height: 28px; border-radius: 6px; background: rgba(255,255,255,0.08); font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 0.8125rem; flex-shrink: 0; }
    .is-correct-opt .opt-key { background: #10b981; color: #fff; }
    .opt-text { flex: 1; }
    .correct-badge { font-size: 0.7rem; font-weight: 800; color: #10b981; background: rgba(16,185,129,0.2); padding: 2px 8px; border-radius: 12px; border: 1px solid rgba(16,185,129,0.4); margin-left: 0.5rem; flex-shrink: 0; }
    .modal-footer { display: flex; justify-content: flex-end; }

    .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 0.75rem 1.5rem; border-radius: 10px; font-size: 0.875rem; font-weight: 600; z-index: 10000; }
    .toast-success { background: rgba(16,185,129,0.9); color: #fff; }
    .toast-error { background: rgba(239,68,68,0.9); color: #fff; }
  `]
})
export class MnjSoalComponent implements OnInit {
  questions = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  showForm = false;
  activeMode: 'single' | 'excel' = 'single';
  excelFile: File | null = null;
  selectedQuestion: any = null;
  toast = signal('');
  toastType = signal<'success' | 'error'>('success');

  form = {
    soal: '',
    unit_spesialisasi: '',
    poin: 10,
    jawaban_benar: 0,
    opsi_a: '',
    opsi_b: '',
    opsi_c: '',
    opsi_d: ''
  };

  private apiUrl = environment.apiUrl;
  constructor(private http: HttpClient) {}

  ngOnInit() { this.loadQuestions(); }

  toggleForm(mode: 'single' | 'excel') {
    if (this.showForm && this.activeMode === mode) {
      this.showForm = false;
    } else {
      this.showForm = true;
      this.activeMode = mode;
    }
  }

  loadQuestions() {
    this.loading.set(true);
    const token = sessionStorage.getItem('rbt_token');
    this.http.get<any>(`${this.apiUrl}/questions`, { headers: { Authorization: `Bearer ${token}` } })
      .subscribe({
        next: (res) => { this.questions.set(res.data || []); this.loading.set(false); },
        error: () => { this.loading.set(false); }
      });
  }

  countStatus(s: string) { return this.questions().filter(q => q.status === s).length; }
  totalPoin() { return this.questions().reduce((sum, q) => sum + (parseInt(q.poin) || 10), 0); }

  createQuestion() {
    if (!this.form.soal || !this.form.unit_spesialisasi) {
      this.showToast('Isi soal dan spesialisasi wajib diisi.', 'error'); return;
    }
    if (!this.form.opsi_a || !this.form.opsi_b) {
      this.showToast('Pilihan Opsi A dan B minimal wajib diisi.', 'error'); return;
    }

    this.saving.set(true);
    const token = sessionStorage.getItem('rbt_token');
    const opsiArray = [
      `A. ${this.form.opsi_a.trim()}`,
      `B. ${this.form.opsi_b.trim()}`
    ];
    if (this.form.opsi_c.trim()) opsiArray.push(`C. ${this.form.opsi_c.trim()}`);
    if (this.form.opsi_d.trim()) opsiArray.push(`D. ${this.form.opsi_d.trim()}`);

    this.http.post<any>(`${this.apiUrl}/questions`, {
      soal: this.form.soal,
      unit_spesialisasi: this.form.unit_spesialisasi,
      tingkat_kesulitan: 'sedang',
      poin: this.form.poin,
      opsi_jawaban: opsiArray,
      jawaban_benar: parseInt(this.form.jawaban_benar as any) || 0
    }, { headers: { Authorization: `Bearer ${token}` } }).subscribe({
      next: () => {
        this.showToast('Soal berhasil ditambahkan!', 'success');
        this.showForm = false;
        this.form = { soal: '', unit_spesialisasi: '', poin: 10, jawaban_benar: 0, opsi_a: '', opsi_b: '', opsi_c: '', opsi_d: '' };
        this.loadQuestions();
        this.saving.set(false);
      },
      error: () => { this.showToast('Gagal menambahkan soal.', 'error'); this.saving.set(false); }
    });
  }

  onExcelFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.excelFile = file;
  }

  submitExcel() {
    if (!this.excelFile) { this.showToast('Pilih file Excel terlebih dahulu.', 'error'); return; }
    const formData = new FormData();
    formData.append('file', this.excelFile);
    const token = sessionStorage.getItem('rbt_token');
    this.saving.set(true);
    this.http.post<any>(`${this.apiUrl}/questions/upload-excel`, formData, { headers: { Authorization: `Bearer ${token}` } }).subscribe({
      next: (res) => {
        this.showToast(res.message || 'File Excel berhasil diimpor!', 'success');
        this.showForm = false; this.excelFile = null;
        this.loadQuestions(); this.saving.set(false);
      },
      error: (err) => { this.showToast(err.error?.message || 'Gagal mengimpor file Excel.', 'error'); this.saving.set(false); }
    });
  }

  downloadExcelTemplate() {
    window.location.href = `${this.apiUrl}/questions/template-excel`;
    this.showToast('Mengunduh file Template_Soal_SIPAKAR_SPN.xlsx...', 'success');
  }

  approveQuestion(q: any) {
    const token = sessionStorage.getItem('rbt_token');
    this.http.put<any>(`${this.apiUrl}/questions/${q.id}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } })
      .subscribe({
        next: () => { q.status = 'approved'; this.showToast('Soal berhasil diverifikasi!', 'success'); },
        error: () => this.showToast('Gagal memverifikasi soal.', 'error')
      });
  }

  deleteQuestion(q: any) {
    if (!confirm('Yakin ingin menghapus soal ini?')) return;
    const token = sessionStorage.getItem('rbt_token');
    this.http.delete<any>(`${this.apiUrl}/questions/${q.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .subscribe({
        next: () => { this.questions.update(arr => arr.filter(x => x.id !== q.id)); this.showToast('Soal dihapus.', 'success'); },
        error: () => this.showToast('Gagal menghapus.', 'error')
      });
  }

  viewDetail(q: any) { this.selectedQuestion = q; }
  closeModal() { this.selectedQuestion = null; }
  parseNum(val: any): number { return parseInt(val) || 0; }
  getOptionKey(index: number): string { return ['A', 'B', 'C', 'D'][index] || ''; }
  parseOptions(opsi: any): string[] {
    if (!opsi) return [];
    if (Array.isArray(opsi)) return opsi;
    try {
      const parsed = JSON.parse(opsi);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
    return String(opsi).split('\n').filter(s => s.trim());
  }

  private showToast(msg: string, type: 'success' | 'error') {
    this.toast.set(msg); this.toastType.set(type);
    setTimeout(() => this.toast.set(''), 3000);
  }
}
