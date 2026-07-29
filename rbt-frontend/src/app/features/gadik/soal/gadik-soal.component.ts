import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-gadik-soal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page active">
      <div class="pagehead">
        <div>
          <span class="eyebrow">BANK SOAL</span>
          <h1>Kelola Soal Ujian, Poin & Impor Excel</h1>
          <p class="page-desc">Buat soal secara satuan atau impor sekaligus dari file Excel (.xlsx / .xls), dan atur sistem poin setiap soal.</p>
        </div>
        <div class="action-buttons">
          <button class="btn-primary" (click)="toggleForm('single')">
            {{ activeMode === 'single' && showForm ? '✕ Tutup' : '+ Input Soal Satuan' }}
          </button>
          <button class="btn-secondary" (click)="toggleForm('excel')" style="margin-left: 0.5rem;">
            {{ activeMode === 'excel' && showForm ? '✕ Tutup' : '📊 Impor File Excel' }}
          </button>
          <button class="btn-ai" (click)="toggleForm('ai')" style="margin-left: 0.5rem;">
            {{ activeMode === 'ai' && showForm ? '✕ Tutup' : '🤖 Generate Soal AI' }}
          </button>
        </div>
      </div>

      <!-- Form Single Soal -->
      @if (showForm && activeMode === 'single') {
        <div class="glass-card form-card">
          <h3>Input Soal Satuan</h3>
          <div class="form-grid">
            <div class="form-group full">
              <label>Pertanyaan Soal</label>
              <textarea [(ngModel)]="form.soal" rows="3" placeholder="Tulis pertanyaan soal secara jelas..." class="form-input"></textarea>
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

          <button class="btn-primary" (click)="create()" [disabled]="saving()" style="margin-top: 1rem;">
            {{ saving() ? 'Menyimpan...' : '💾 Simpan Soal' }}
          </button>
        </div>
      }

      <!-- Form Impor Excel -->
      @if (showForm && activeMode === 'excel') {
        <div class="glass-card form-card">
          <div class="batch-header">
            <h3>📊 Impor Batch Soal via File Excel (.xlsx / .xls)</h3>
            <button class="btn-sm btn-link" (click)="downloadExcelTemplate()">⬇️ Unduh Format Excel Contoh</button>
          </div>
          <p class="batch-desc">Pilih file spreadsheet Excel berisi data soal (Kolom: Soal, Spesialisasi, Poin, Opsi A, Opsi B, Opsi C, Opsi D, Jawaban Benar).</p>
          
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
            {{ saving() ? 'Mengimpor File Excel...' : '🚀 Unggah & Impor File Excel' }}
          </button>
        </div>
      }

      <!-- Form Generate AI -->
      @if (showForm && activeMode === 'ai') {
        <div class="glass-card form-card ai-form-card">
          <div class="ai-header">
            <div class="ai-icon-box">🤖</div>
            <div>
              <h3>Generate Soal Otomatis via AI (Gemini)</h3>
              <p class="ai-sub">Buat soal ujian berkualitas tinggi berbasis Pasal Hukum & Simulasi Kasus secara otomatis.</p>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>Unit Spesialisasi</label>
              <select [(ngModel)]="aiForm.spesialisasi" class="form-input">
                <option value="reserse">Reserse (Penyidikan)</option>
                <option value="sabhara">Sabhara (Turjavali)</option>
                <option value="intel">Intelkam</option>
                <option value="lantas">Lalu Lintas</option>
                <option value="binmas">Binmas</option>
              </select>
            </div>

            <div class="form-group">
              <label>Jumlah Soal</label>
              <select [(ngModel)]="aiForm.jumlahSoal" class="form-input">
                <option [ngValue]="5">5 Soal</option>
                <option [ngValue]="10">10 Soal</option>
                <option [ngValue]="15">15 Soal</option>
                <option [ngValue]="20">20 Soal</option>
              </select>
            </div>

            <div class="form-group full">
              <label>Topik / Konteks Kasus (Opsional)</label>
              <textarea [(ngModel)]="aiForm.topik" rows="3" placeholder="Misal: Penanganan unjuk rasa anarkis di depan gedung pemerintahan, prosedur olah TKP pembunuhan berencana, tilang elektronik ETLE..." class="form-input"></textarea>
            </div>
          </div>

          <button class="btn-ai-generate" (click)="generateAI()" [disabled]="aiGenerating()">
            {{ aiGenerating() ? '⏳ Sedang Men-generate Soal via AI...' : '⚡ Generate Soal Sekarang' }}
          </button>

          @if (aiGenerating()) {
            <div class="ai-progress">
              <div class="ai-spinner"></div>
              <span>Gemini AI sedang menganalisis pasal hukum & membuat soal berkualitas...</span>
            </div>
          }
        </div>
      }

      <!-- AI Generated Questions Preview -->
      @if (aiGeneratedQuestions().length > 0) {
        <div class="glass-card ai-preview-card">
          <div class="ai-preview-header">
            <h3>📋 Hasil Generate: {{ aiGeneratedQuestions().length }} Soal AI</h3>
            <div class="ai-preview-actions">
              <button class="btn-save-all" (click)="saveAllAIQuestions()" [disabled]="saving()">💾 Simpan Semua ke Bank Soal</button>
              <button class="btn-sm btn-clear" (click)="aiGeneratedQuestions.set([])">✕ Bersihkan</button>
            </div>
          </div>

          @for (q of aiGeneratedQuestions(); track $index; let i = $index) {
            <div class="ai-q-card">
              <div class="ai-q-num">{{ i + 1 }}</div>
              <div class="ai-q-body">
                <p class="ai-q-text"><strong>{{ q.soal }}</strong></p>
                <div class="ai-q-options">
                  @for (opt of q.opsi_jawaban; track $index) {
                    <div class="ai-q-opt" [class.ai-correct]="$index === q.jawaban_benar">
                      {{ opt }}
                      @if ($index === q.jawaban_benar) {
                        <span class="correct-badge">✅ JAWABAN</span>
                      }
                    </div>
                  }
                </div>
                @if (q.penjelasan) {
                  <div class="ai-q-explain">
                    💡 <em>{{ q.penjelasan }}</em>
                  </div>
                }
                <div class="ai-q-meta">
                  <span class="badge badge-spec">{{ q.unit_spesialisasi }}</span>
                  <span class="badge badge-poin">⭐ {{ q.poin }} Poin</span>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Specialization Category Filter Bar & Search -->
      <div class="glass-card filter-card">
        <div class="filter-header-row">
          <div class="filter-tabs">
            <button 
              class="tab-btn" 
              [class.active]="selectedSpec() === 'all'" 
              (click)="selectedSpec.set('all')"
            >
              🌐 Semua Soal <span class="tab-badge">{{ items().length }}</span>
            </button>
            <button 
              class="tab-btn tab-sabhara" 
              [class.active]="selectedSpec() === 'sabhara'" 
              (click)="selectedSpec.set('sabhara')"
            >
              🚔 Sabhara <span class="tab-badge">{{ getCountForSpec('sabhara') }}</span>
            </button>
            <button 
              class="tab-btn tab-reserse" 
              [class.active]="selectedSpec() === 'reserse'" 
              (click)="selectedSpec.set('reserse')"
            >
              🔍 Reserse <span class="tab-badge">{{ getCountForSpec('reserse') }}</span>
            </button>
            <button 
              class="tab-btn tab-intel" 
              [class.active]="selectedSpec() === 'intel'" 
              (click)="selectedSpec.set('intel')"
            >
              🎯 Intelkam <span class="tab-badge">{{ getCountForSpec('intel') }}</span>
            </button>
            <button 
              class="tab-btn tab-lantas" 
              [class.active]="selectedSpec() === 'lantas'" 
              (click)="selectedSpec.set('lantas')"
            >
              🚥 Lalu Lintas <span class="tab-badge">{{ getCountForSpec('lantas') }}</span>
            </button>
            <button 
              class="tab-btn tab-binmas" 
              [class.active]="selectedSpec() === 'binmas'" 
              (click)="selectedSpec.set('binmas')"
            >
              🤝 Binmas <span class="tab-badge">{{ getCountForSpec('binmas') }}</span>
            </button>
          </div>

          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              [ngModel]="searchQuery()" 
              (ngModelChange)="searchQuery.set($event)" 
              placeholder="Cari pertanyaan soal..." 
              class="search-input"
            />
          </div>
        </div>
      </div>

      <!-- Questions Grouped List -->
      <div class="items-list">
        @if (loading()) { 
          <div class="loading-state">Memuat bank soal...</div> 
        } @else if (items().length === 0) {
          <div class="glass-card empty-state">
            <div class="empty-icon">📝</div>
            <h3>Belum Ada Soal</h3>
            <p>Buat soal pertama Anda, Impor File Excel, atau Generate Soal via AI.</p>
          </div>
        } @else if (filteredGroupedItems().length === 0) {
          <div class="glass-card empty-state">
            <div class="empty-icon">🔍</div>
            <h3>Soal Tidak Ditemukan</h3>
            <p>Tidak ada soal yang cocok dengan filter spesialisasi atau pencarian saat ini.</p>
          </div>
        } @else {
          @for (group of filteredGroupedItems(); track group.key) {
            <div class="glass-card group-section-card">
              <div class="group-header">
                <div class="group-title-box">
                  <span class="group-icon">{{ group.icon }}</span>
                  <div>
                    <h3 class="group-name">{{ group.title }}</h3>
                    <span class="group-count">{{ group.items.length }} Soal Ujian • {{ getTotalPoints(group.items) }} Poin</span>
                  </div>
                </div>
              </div>

              <div class="group-items-grid">
                @for (q of group.items; track q.id; let i = $index) {
                  <div class="glass-card item-card">
                    <div class="item-header">
                      <div class="q-num-badge">{{ i + 1 }}</div>
                      <p class="item-text"><strong>{{ q.soal }}</strong></p>
                      <div class="card-actions">
                        <button class="btn-sm btn-view" (click)="viewDetail(q)">👁️ Detail</button>
                        <button class="btn-sm btn-delete" (click)="remove(q)">🗑️</button>
                      </div>
                    </div>
                    <div class="item-meta">
                      <span class="badge badge-poin">⭐ {{ q.poin || 10 }} Poin</span>
                      <span class="badge badge-spec" [class]="'spec-' + (q.unit_spesialisasi || 'default').toLowerCase()">{{ getSpecName(q.unit_spesialisasi) }}</span>
                      <span class="badge" [class]="q.status === 'approved' ? 'badge-ok' : 'badge-pending'">{{ q.status === 'approved' ? 'Terverifikasi' : 'Draft/Pending' }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
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
                <div class="option-view-item" [class.is-correct-opt]="$index === parseInt(selectedQuestion.jawaban_benar)">
                  <span class="opt-key">{{ getOptionKey($index) }}</span>
                  <span class="opt-text">{{ opt }}</span>
                  @if ($index === parseInt(selectedQuestion.jawaban_benar)) {
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

      @if (toast()) { <div class="toast" [class.toast-success]="tt()==='success'" [class.toast-error]="tt()==='error'">{{ toast() }}</div> }
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
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.375rem; }
    .form-group.full { grid-column: 1 / -1; }
    .form-group label { font-size: 0.75rem; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; }
    .form-input { background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--color-text-primary); padding: 10px 14px; border-radius: 8px; font-size: 0.875rem; font-family: var(--font-body); resize: vertical; }
    .highlight-select { border-color: rgba(16,185,129,0.5); background: rgba(16,185,129,0.05); color: #10b981; font-weight: 700; }
    
    /* Options Section Styles */
    .options-section { background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 10px; padding: 1.25rem; gap: 0.875rem; }
    .section-label { font-size: 0.8125rem; font-weight: 800; color: var(--color-text-primary); text-transform: uppercase; margin-bottom: 0.5rem; letter-spacing: 0.04em; }
    .option-row { display: flex; align-items: center; gap: 0.75rem; }
    .option-badge { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.875rem; background: rgba(255,255,255,0.08); color: var(--color-text-secondary); flex-shrink: 0; transition: all 0.2s; }
    .option-badge.is-correct { background: #10b981; color: #fff; box-shadow: 0 0 10px rgba(16,185,129,0.4); }
    .opt-input { width: 100%; }

    .items-list { display: flex; flex-direction: column; gap: 1rem; }
    .item-card { padding: 1.25rem; }
    .item-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    .item-text { font-size: 0.9375rem; color: var(--color-text-primary); margin-bottom: 0.5rem; line-height: 1.5; }
    .item-meta { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .badge { padding: 2px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; }
    .badge-poin { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-spec { background: rgba(59,130,246,0.1); color: #60a5fa; }
    .badge-mudah { background: rgba(16,185,129,0.1); color: #10b981; }
    .badge-sedang { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .badge-sulit { background: rgba(239,68,68,0.1); color: #ef4444; }
    .badge-ok { background: rgba(16,185,129,0.12); color: #10b981; }
    .badge-pending { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .card-actions { display: flex; gap: 0.5rem; align-items: center; }
    .btn-sm { background: none; border: 1px solid var(--border-color); color: var(--color-text-secondary); padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-family: var(--font-body); }
    .btn-view { border-color: rgba(59,130,246,0.4); color: #60a5fa; }
    .btn-view:hover { background: rgba(59,130,246,0.15); }
    .btn-delete:hover { background: rgba(239,68,68,0.1); border-color: #ef4444; color: #ef4444; }
    .empty-state { text-align: center; padding: 3rem; }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
    .loading-state { text-align: center; padding: 3rem; color: var(--color-text-secondary); }

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

    /* Specialization Filter Bar */
    .filter-card { padding: 1.25rem; margin-bottom: 1.5rem; }
    .filter-header-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .filter-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .tab-btn { background: rgba(255,255,255,0.04); border: 1px solid var(--border-color); color: var(--color-text-secondary); padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 0.8125rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
    .tab-btn:hover { background: rgba(255,255,255,0.08); color: var(--color-text-primary); }
    .tab-btn.active { background: rgba(59,130,246,0.15); border-color: #3b82f6; color: #60a5fa; box-shadow: 0 4px 12px rgba(59,130,246,0.25); }
    .tab-badge { font-size: 0.75rem; padding: 2px 7px; border-radius: 12px; background: rgba(255,255,255,0.1); color: inherit; }

    .search-box { display: flex; align-items: center; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 8px; padding: 4px 12px; gap: 0.5rem; min-width: 260px; }
    .search-input { background: none; border: none; color: var(--color-text-primary); font-size: 0.875rem; width: 100%; outline: none; }

    /* Grouped Category Section */
    .group-section-card { padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid var(--border-color); }
    .group-header { margin-bottom: 1.25rem; padding-bottom: 0.875rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .group-title-box { display: flex; align-items: center; gap: 0.875rem; }
    .group-icon { width: 42px; height: 42px; border-radius: 10px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; font-size: 1.35rem; flex-shrink: 0; }
    .group-name { font-size: 1.125rem; font-weight: 800; color: var(--color-text-primary); margin: 0; }
    .group-count { font-size: 0.8125rem; color: var(--color-text-secondary); margin-top: 2px; display: block; }

    .group-items-grid { display: flex; flex-direction: column; gap: 1rem; }
    .q-num-badge { width: 28px; height: 28px; border-radius: 6px; background: rgba(59,130,246,0.15); color: #60a5fa; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 0.8125rem; flex-shrink: 0; }
    
    .spec-sabhara { background: rgba(59,130,246,0.15); color: #60a5fa; }
    .spec-reserse { background: rgba(239,68,68,0.15); color: #f87171; }
    .spec-intel { background: rgba(245,158,11,0.15); color: #fbbf24; }
    .spec-lantas { background: rgba(16,185,129,0.15); color: #34d399; }
    .spec-binmas { background: rgba(168,85,247,0.15); color: #c084fc; }

    /* AI Button */
    .btn-ai { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 0.8125rem; cursor: pointer; transition: all 0.2s; }
    .btn-ai:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(139,92,246,0.4); }

    /* AI Form */
    .ai-form-card { border: 1px solid rgba(139,92,246,0.3); background: linear-gradient(135deg, rgba(139,92,246,0.08), rgba(99,102,241,0.05)); }
    .ai-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
    .ai-icon-box { width: 48px; height: 48px; border-radius: 12px; background: rgba(139,92,246,0.2); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; }
    .ai-sub { font-size: 0.8125rem; color: var(--color-text-secondary); margin: 0.25rem 0 0 0; }
    .btn-ai-generate { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: #fff; border: none; padding: 12px 24px; border-radius: 10px; font-size: 0.9375rem; font-weight: 800; cursor: pointer; margin-top: 1rem; box-shadow: 0 4px 15px rgba(139,92,246,0.3); transition: all 0.2s; }
    .btn-ai-generate:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(139,92,246,0.4); }
    .btn-ai-generate:disabled { opacity: 0.6; cursor: not-allowed; }
    .ai-progress { display: flex; align-items: center; gap: 0.75rem; margin-top: 1rem; font-size: 0.875rem; color: #a78bfa; }
    .ai-spinner { width: 20px; height: 20px; border: 2px solid rgba(139,92,246,0.3); border-top-color: #8b5cf6; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* AI Preview */
    .ai-preview-card { padding: 1.5rem; margin-top: 1rem; border: 1px solid rgba(139,92,246,0.3); }
    .ai-preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem; }
    .ai-preview-header h3 { font-size: 1rem; font-weight: 800; margin: 0; color: #a78bfa; }
    .ai-preview-actions { display: flex; gap: 0.5rem; }
    .btn-save-all { background: #10b981; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 0.8125rem; cursor: pointer; }
    .btn-save-all:hover { background: #059669; }
    .btn-clear { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
    .ai-q-card { display: flex; gap: 1rem; padding: 1rem; border: 1px solid var(--border-color); border-radius: 10px; margin-bottom: 0.75rem; background: rgba(255,255,255,0.02); }
    .ai-q-num { width: 32px; height: 32px; border-radius: 8px; background: rgba(139,92,246,0.2); color: #a78bfa; font-weight: 900; display: flex; align-items: center; justify-content: center; font-size: 0.875rem; flex-shrink: 0; }
    .ai-q-body { flex: 1; }
    .ai-q-text { margin: 0 0 0.75rem 0; font-size: 0.875rem; line-height: 1.5; }
    .ai-q-options { display: flex; flex-direction: column; gap: 0.375rem; margin-bottom: 0.75rem; }
    .ai-q-opt { font-size: 0.8125rem; padding: 6px 10px; border-radius: 6px; background: rgba(255,255,255,0.03); border: 1px solid transparent; display: flex; align-items: center; gap: 0.5rem; }
    .ai-q-opt.ai-correct { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #10b981; font-weight: 600; }
    .ai-q-explain { font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 0.5rem; background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #8b5cf6; }
    .ai-q-meta { display: flex; gap: 0.5rem; }
  `]
})
export class GadikSoalComponent implements OnInit {
  items = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  showForm = false;
  activeMode: 'single' | 'excel' | 'ai' = 'single';
  excelFile: File | null = null;
  selectedQuestion: any = null;
  toast = signal('');
  tt = signal<'success'|'error'>('success');
  selectedSpec = signal<string>('all');
  searchQuery = signal<string>('');
  aiGenerating = signal(false);
  aiGeneratedQuestions = signal<any[]>([]);
  aiForm = { spesialisasi: 'reserse', jumlahSoal: 5, topik: '' };
  
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

  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}
  ngOnInit() { this.load(); }
  private headers() { return { Authorization: `Bearer ${sessionStorage.getItem('rbt_token')}` }; }

  toggleForm(mode: 'single' | 'excel' | 'ai') {
    if (this.showForm && this.activeMode === mode) {
      this.showForm = false;
    } else {
      this.showForm = true;
      this.activeMode = mode;
    }
  }

  load() {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/questions`, { headers: this.headers() }).subscribe({
      next: r => { this.items.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  create() {
    if (!this.form.soal || !this.form.unit_spesialisasi) {
      this.msg('Pertanyaan dan unit spesialisasi wajib diisi.', 'error'); return;
    }
    if (!this.form.opsi_a || !this.form.opsi_b) {
      this.msg('Pilihan Opsi A dan B minimal wajib diisi.', 'error'); return;
    }

    this.saving.set(true);
    const opsiArray = [
      `A. ${this.form.opsi_a.trim()}`,
      `B. ${this.form.opsi_b.trim()}`
    ];
    if (this.form.opsi_c.trim()) opsiArray.push(`C. ${this.form.opsi_c.trim()}`);
    if (this.form.opsi_d.trim()) opsiArray.push(`D. ${this.form.opsi_d.trim()}`);

    this.http.post<any>(`${this.api}/questions`, {
      soal: this.form.soal,
      unit_spesialisasi: this.form.unit_spesialisasi,
      tingkat_kesulitan: 'sedang',
      poin: this.form.poin,
      opsi_jawaban: opsiArray,
      jawaban_benar: parseInt(this.form.jawaban_benar as any) || 0
    }, { headers: this.headers() }).subscribe({
      next: () => {
        this.msg('Soal berhasil dibuat!', 'success');
        this.showForm = false;
        this.form = { soal: '', unit_spesialisasi: '', poin: 10, jawaban_benar: 0, opsi_a: '', opsi_b: '', opsi_c: '', opsi_d: '' };
        this.load(); this.saving.set(false);
      },
      error: () => { this.msg('Gagal membuat soal.', 'error'); this.saving.set(false); }
    });
  }

  onExcelFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.excelFile = file;
  }

  submitExcel() {
    if (!this.excelFile) { this.msg('Pilih file Excel terlebih dahulu.', 'error'); return; }
    const formData = new FormData();
    formData.append('file', this.excelFile);
    this.saving.set(true);
    this.http.post<any>(`${this.api}/questions/upload-excel`, formData, { headers: this.headers() }).subscribe({
      next: (res) => {
        this.msg(res.message || 'File Excel berhasil diimpor!', 'success');
        this.showForm = false; this.excelFile = null;
        this.load(); this.saving.set(false);
      },
      error: (err) => { this.msg(err.error?.message || 'Gagal mengimpor file Excel.', 'error'); this.saving.set(false); }
    });
  }

  downloadExcelTemplate() {
    window.location.href = `${this.api}/questions/template-excel`;
    this.msg('Mengunduh file Template_Soal_SIPAKAR_SPN.xlsx...', 'success');
  }

  remove(q: any) {
    if (!confirm('Hapus soal ini?')) return;
    this.http.delete<any>(`${this.api}/questions/${q.id}`, { headers: this.headers() }).subscribe({
      next: () => { this.items.update(a => a.filter(x => x.id !== q.id)); this.msg('Dihapus.', 'success'); },
      error: () => this.msg('Gagal menghapus.', 'error')
    });
  }

  viewDetail(q: any) { this.selectedQuestion = q; }
  closeModal() { this.selectedQuestion = null; }
  parseInt(val: any): number { return parseInt(val) || 0; }
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

  getCountForSpec(specKey: string): number {
    return this.items().filter(q => (q.unit_spesialisasi || '').toLowerCase() === specKey.toLowerCase()).length;
  }

  getSpecName(spec: string): string {
    const map: Record<string, string> = {
      reserse: 'Reserse',
      sabhara: 'Sabhara',
      intel: 'Intelkam',
      lantas: 'Lalu Lintas',
      binmas: 'Binmas'
    };
    return map[(spec || '').toLowerCase()] || spec || 'Umum';
  }

  getTotalPoints(groupItems: any[]): number {
    return groupItems.reduce((acc, q) => acc + (parseInt(q.poin) || 10), 0);
  }

  filteredGroupedItems(): { key: string; title: string; icon: string; items: any[] }[] {
    const raw = this.items();
    const query = this.searchQuery().trim().toLowerCase();
    const selected = this.selectedSpec();

    const filtered = raw.filter(q => {
      const matchSpec = selected === 'all' || (q.unit_spesialisasi || '').toLowerCase() === selected;
      const matchQuery = !query || (q.soal || '').toLowerCase().includes(query);
      return matchSpec && matchQuery;
    });

    const groupsMeta: Record<string, { title: string; icon: string }> = {
      sabhara: { title: 'Unit Sabhara (Pengaturan, Penjagaan & Patroli)', icon: '🚔' },
      reserse: { title: 'Unit Reserse (Penyidikan & Penindakan Pidana)', icon: '🔍' },
      intel: { title: 'Unit Intelkam (Intelijen Keamanan)', icon: '🎯' },
      lantas: { title: 'Unit Lalu Lintas (Kamseltibcarlantas)', icon: '🚥' },
      binmas: { title: 'Unit Binmas (Pembinaan Masyarakat)', icon: '🤝' },
      lainnya: { title: 'Spesialisasi Kepolisian Umum', icon: '📝' }
    };

    const groupedMap: Record<string, any[]> = {};

    filtered.forEach(q => {
      const spec = (q.unit_spesialisasi || 'lainnya').toLowerCase();
      const key = groupsMeta[spec] ? spec : 'lainnya';
      if (!groupedMap[key]) groupedMap[key] = [];
      groupedMap[key].push(q);
    });

    const result: { key: string; title: string; icon: string; items: any[] }[] = [];
    const keysOrder = ['sabhara', 'reserse', 'intel', 'lantas', 'binmas', 'lainnya'];

    keysOrder.forEach(key => {
      if (groupedMap[key] && groupedMap[key].length > 0) {
        result.push({
          key,
          title: groupsMeta[key].title,
          icon: groupsMeta[key].icon,
          items: groupedMap[key]
        });
      }
    });

    return result;
  }

  private msg(m: string, t: 'success'|'error') { this.toast.set(m); this.tt.set(t); setTimeout(() => this.toast.set(''), 3000); }

  generateAI() {
    this.aiGenerating.set(true);
    this.aiGeneratedQuestions.set([]);
    this.http.post<any>(`${this.api}/questions/generate-ai`, {
      spesialisasi: this.aiForm.spesialisasi,
      jumlahSoal: this.aiForm.jumlahSoal,
      topik: this.aiForm.topik
    }, { headers: this.headers() }).subscribe({
      next: (res) => {
        this.aiGenerating.set(false);
        if (res.success && res.data) {
          this.aiGeneratedQuestions.set(res.data);
          this.msg(`Berhasil men-generate ${res.data.length} soal AI!`, 'success');
        } else {
          this.msg(res.message || 'Gagal generate soal.', 'error');
        }
      },
      error: (err) => {
        this.aiGenerating.set(false);
        this.msg(err.error?.message || 'Gagal generate soal AI. Coba lagi.', 'error');
      }
    });
  }

  saveAllAIQuestions() {
    const questions = this.aiGeneratedQuestions();
    if (questions.length === 0) return;
    this.saving.set(true);

    const payload = {
      questions: questions.map(q => ({
        soal: q.soal,
        unit_spesialisasi: q.unit_spesialisasi,
        tingkat_kesulitan: 'sedang',
        poin: q.poin,
        opsi_jawaban: q.opsi_jawaban,
        jawaban_benar: q.jawaban_benar
      }))
    };

    this.http.post<any>(`${this.api}/questions/batch`, payload, { headers: this.headers() }).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.msg(`${res.count || questions.length} soal AI berhasil disimpan ke Bank Soal!`, 'success');
        this.aiGeneratedQuestions.set([]);
        this.showForm = false;
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.msg('Gagal menyimpan soal AI ke database.', 'error');
      }
    });
  }
}
