import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface CalendarDay {
  date: Date;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: any[];
}

@Component({
  selector: 'app-siswa-tugas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page active">
      <div class="pagehead">
        <div>
          <span class="eyebrow">TUGAS & JADWAL SISWA</span>
          <h1>Pengumpulan Tugas (PDF, DOCX, PPT) & Kalender Note</h1>
          <p class="page-desc">Unggah file tugas pelatihan (PDF, DOCX, PPT), berikan catatan komentar, dan kelola penugasan Anda.</p>
        </div>
      </div>

      <!-- Main Layout Grid: Calendar + Task Notes -->
      <div class="calendar-layout-grid">
        <!-- Widget Kalender Tugas -->
        <div class="glass-card calendar-card">
          <div class="calendar-header">
            <div class="cal-title-group">
              <span class="cal-icon">📅</span>
              <h2 class="cal-month-title">{{ monthNames[currentDate.getMonth()] }} {{ currentDate.getFullYear() }}</h2>
            </div>
            <div class="cal-nav-buttons">
              <button class="btn-cal-nav" (click)="changeMonth(-1)">◄</button>
              <button class="btn-cal-today" (click)="goToToday()">Hari Ini</button>
              <button class="btn-cal-nav" (click)="changeMonth(1)">►</button>
            </div>
          </div>

          <!-- Weekday Headers -->
          <div class="weekdays-grid">
            <span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span>Min</span>
          </div>

          <!-- Days Grid -->
          <div class="days-grid">
            @for (d of calendarDays; track $index) {
              <div 
                class="day-cell" 
                [class.other-month]="!d.isCurrentMonth"
                [class.is-today]="d.isToday"
                [class.is-selected]="isSelectedDate(d.date)"
                [class.has-tasks]="d.tasks.length > 0"
                (click)="selectDate(d)"
              >
                <span class="day-number">{{ d.dayNum }}</span>
                @if (d.tasks.length > 0) {
                  <div class="task-indicator" title="{{ d.tasks.length }} Tugas pada tanggal ini">
                    <span class="task-dot"></span>
                    <span class="task-count-text">{{ d.tasks.length }}</span>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Legend -->
          <div class="calendar-legend">
            <div class="legend-item"><span class="legend-dot today-dot"></span> Hari Ini</div>
            <div class="legend-item"><span class="legend-dot task-dot"></span> Ada Tenggat Tugas</div>
            <div class="legend-item"><span class="legend-dot selected-dot"></span> Tanggal Dipilih</div>
          </div>
        </div>

        <!-- Note & Detail Tugas Panel -->
        <div class="glass-card notes-card">
          <div class="notes-header">
            <h3>📝 Catatan & Tugas ({{ selectedDateStr }})</h3>
            <span class="badge badge-count">{{ getSelectedDayTasks().length }} Tugas</span>
          </div>

          <!-- Quick Note Form for Student -->
          <div class="quick-note-box">
            <label class="note-label">✍️ Catatan Pengingat Siswa</label>
            <div class="note-input-row">
              <input type="text" [(ngModel)]="currentNote" placeholder="Tulis pengingat tugas untuk tanggal ini..." class="form-input note-input" (keyup.enter)="savePersonalNote()" />
              <button class="btn-save-note" (click)="savePersonalNote()">💾 Simpan</button>
            </div>
            @if (personalNotes[selectedDateKey]) {
              <div class="saved-note-pill">
                📌 <span>{{ personalNotes[selectedDateKey] }}</span>
                <button class="btn-clear-note" (click)="deleteNote()">✕</button>
              </div>
            }
          </div>

          <!-- Tasks List for Selected Date -->
          <div class="notes-list-section">
            <h4 class="sub-section-title">📋 Penugasan pada {{ selectedDateStr }}</h4>

            @if (loading()) {
              <div class="center-state">Memuat tugas...</div>
            } @else if (getSelectedDayTasks().length === 0) {
              <div class="empty-tasks-state">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">✨</div>
                <p>Tidak ada tenggat tugas pada <strong>{{ selectedDateStr }}</strong>.</p>
                <small style="color: var(--color-text-secondary);">Klik tanggal lain di kalender untuk melihat tugas.</small>
              </div>
            } @else {
              <div class="tasks-vertical-list">
                @for (a of getSelectedDayTasks(); track a.id) {
                  <div class="glass-card task-item-card">
                    <div class="task-item-top">
                      <span class="badge badge-spec">{{ a.material_title || 'Tugas Pelatihan' }}</span>
                      <span class="badge badge-time">⏳ Tenggat: {{ formatDate(a.tenggat) }}</span>
                    </div>
                    
                    <h4 class="task-item-title">{{ a.deskripsi_tugas }}</h4>
                    <p class="task-item-gadik">Instruktur: <strong>{{ a.gadik_name || 'Gadik SPN' }}</strong></p>

                    <!-- Submission Form Box -->
                    <div class="upload-submission-box">
                      @if (getSubmission(a.id) && !editMode[a.id]) {
                        <!-- Already Submitted View -->
                        <div class="submitted-status-banner">
                          <div class="status-left">
                            <span class="status-icon">✅</span>
                            <div>
                              <strong>Sudah Dikumpulkan</strong>
                              <p class="submitted-date">Waktu: {{ formatDate(getSubmission(a.id).submitted_at) }}</p>
                            </div>
                          </div>
                          <button class="btn-sm btn-edit-sub" (click)="toggleEdit(a.id)">✏️ Edit Upload</button>
                        </div>

                        @if (getSubmission(a.id).file_url) {
                          <div class="file-link-box">
                            📄 File: <a [href]="getSubmission(a.id).file_url" target="_blank" class="file-download-link">{{ getSubmission(a.id).file_name || 'Lihat File Terunggah' }}</a>
                          </div>
                        }

                        @if (getSubmission(a.id).catatan) {
                          <div class="student-comment-view">
                            <strong>💬 Catatan Anda:</strong> {{ getSubmission(a.id).catatan }}
                          </div>
                        }
                      } @else {
                        <!-- Upload & Submit Form -->
                        <div class="file-upload-section">
                          <label class="file-input-label">📎 Pilih File Tugas (.pdf, .docx, .ppt, .zip, .png)</label>
                          <input 
                            type="file" 
                            accept=".pdf, .docx, .doc, .pptx, .ppt, .zip, .png, .jpg, .jpeg" 
                            (change)="onFileSelected($event, a.id)" 
                            class="form-input file-input"
                          />

                          @if (uploadingState[a.id]) {
                            <div class="upload-progress-info">⏳ Mengunggah file tugas...</div>
                          } @else if (uploadedFiles[a.id]) {
                            <div class="uploaded-file-tag">
                              ✅ File SIAP: <strong>{{ uploadedFiles[a.id].file_name }}</strong>
                            </div>
                          }
                        </div>

                        <div class="comment-input-section">
                          <label class="file-input-label">💬 Catatan / Komentar untuk Gadik</label>
                          <textarea 
                            [(ngModel)]="commentsState[a.id]" 
                            rows="2" 
                            placeholder="Tambahkan pesan/catatan pengerjaan tugas di sini..." 
                            class="form-input comment-textarea"
                          ></textarea>
                        </div>

                        <div class="submit-action-row">
                          @if (editMode[a.id]) {
                            <button class="btn-secondary-sm" (click)="toggleEdit(a.id)">Batal Edit</button>
                          }
                          <button class="btn-submit-task" (click)="submitAssignment(a.id)" [disabled]="uploadingState[a.id]">
                            🚀 {{ getSubmission(a.id) ? 'Simpan Perubahan & Unggah Ulang' : 'Unggah & Kumpulkan Tugas' }}
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <!-- All Assignments List -->
      <div class="all-tasks-section">
        <div class="section-head-bar">
          <h2>📚 Semua Daftar Tugas Pelatihan & Modul</h2>
          <span class="badge badge-total">{{ assignments().length }} Total Tugas</span>
        </div>

        @if (loading()) {
          <div class="center-state">Memuat semua tugas...</div>
        } @else if (assignments().length === 0) {
          <div class="glass-card center-state">
            <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
            <h3>Belum Ada Tugas Ditugaskan</h3>
            <p style="color: var(--color-text-secondary); margin-top: 0.5rem;">Tugas baru dari Gadik akan muncul di sini.</p>
          </div>
        } @else {
          <div class="assignment-grid">
            @for (a of assignments(); track a.id) {
              <div class="glass-card task-card-full">
                <div class="task-card-header">
                  <span class="badge badge-spec">{{ a.material_title || 'Tugas Pelatihan' }}</span>
                  <span class="badge badge-deadline">🗓️ {{ a.tenggat ? formatDate(a.tenggat) : 'Tanpa Tenggat' }}</span>
                </div>
                
                <h3 class="task-card-title">{{ a.deskripsi_tugas }}</h3>
                <p class="task-card-gadik">Instruktur: <strong>{{ a.gadik_name || 'Gadik SPN' }}</strong></p>

                <!-- Card Submission Status & Upload -->
                <div class="upload-submission-box">
                  @if (getSubmission(a.id) && !editMode[a.id]) {
                    <div class="submitted-status-banner">
                      <div class="status-left">
                        <span class="status-icon">✅</span>
                        <div>
                          <strong>Dikumpulkan</strong>
                          <p class="submitted-date">{{ formatDate(getSubmission(a.id).submitted_at) }}</p>
                        </div>
                      </div>
                      <button class="btn-sm btn-edit-sub" (click)="toggleEdit(a.id)">✏️ Edit</button>
                    </div>

                    @if (getSubmission(a.id).file_url) {
                      <div class="file-link-box">
                        📄 File: <a [href]="getSubmission(a.id).file_url" target="_blank" class="file-download-link">{{ getSubmission(a.id).file_name || 'Unduh File' }}</a>
                      </div>
                    }

                    @if (getSubmission(a.id).catatan) {
                      <div class="student-comment-view">💬 {{ getSubmission(a.id).catatan }}</div>
                    }
                  } @else {
                    <div class="file-upload-section">
                      <label class="file-input-label">📎 Unggah File (PDF / DOCX / PPT)</label>
                      <input 
                        type="file" 
                        accept=".pdf, .docx, .doc, .pptx, .ppt, .zip, .png, .jpg, .jpeg" 
                        (change)="onFileSelected($event, a.id)" 
                        class="form-input file-input"
                      />

                      @if (uploadingState[a.id]) {
                        <div class="upload-progress-info">⏳ Mengunggah file...</div>
                      } @else if (uploadedFiles[a.id]) {
                        <div class="uploaded-file-tag">
                          ✅ SIAP: <strong>{{ uploadedFiles[a.id].file_name }}</strong>
                        </div>
                      }
                    </div>

                    <div class="comment-input-section">
                      <input 
                        type="text" 
                        [(ngModel)]="commentsState[a.id]" 
                        placeholder="Komentar / catatan tugas..." 
                        class="form-input sub-input-sm"
                      />
                    </div>

                    <div class="submit-action-row" style="margin-top: 0.5rem;">
                      @if (editMode[a.id]) {
                        <button class="btn-secondary-sm" (click)="toggleEdit(a.id)">Batal</button>
                      }
                      <button class="btn-primary-sm" (click)="submitAssignment(a.id)" [disabled]="uploadingState[a.id]">
                        🚀 {{ getSubmission(a.id) ? 'Unggah Ulang' : 'Kumpulkan Tugas' }}
                      </button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>

      @if (toast()) {
        <div class="toast" [class.toast-success]="toastType()==='success'" [class.toast-error]="toastType()==='error'">{{ toast() }}</div>
      }
    </div>
  `,
  styles: [`
    .pagehead { margin-bottom: 1.5rem; }
    
    /* Layout Grid */
    .calendar-layout-grid { display: grid; grid-template-columns: 1.1fr 1.1fr; gap: 1.5rem; margin-bottom: 2rem; }
    @media (max-width: 992px) {
      .calendar-layout-grid { grid-template-columns: 1fr; }
    }

    /* Calendar Widget Styles */
    .calendar-card { padding: 1.5rem; }
    .calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
    .cal-title-group { display: flex; align-items: center; gap: 0.5rem; }
    .cal-icon { font-size: 1.5rem; }
    .cal-month-title { font-size: 1.125rem; font-weight: 800; color: var(--color-text-primary); margin: 0; }
    .cal-nav-buttons { display: flex; gap: 0.375rem; align-items: center; }
    .btn-cal-nav { background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: var(--color-text-primary); padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8125rem; }
    .btn-cal-nav:hover { background: rgba(255,255,255,0.12); }
    .btn-cal-today { background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.4); color: #60a5fa; padding: 4px 12px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 0.75rem; }

    .weekdays-grid { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 0.75rem; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .days-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.375rem; }
    
    .day-cell { min-height: 54px; padding: 6px; border-radius: 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); display: flex; flex-direction: column; justify-content: space-between; cursor: pointer; transition: all 0.2s; position: relative; }
    .day-cell:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); }
    .day-number { font-size: 0.875rem; font-weight: 700; color: var(--color-text-primary); }
    .other-month { opacity: 0.3; }
    .is-today { border-color: #3b82f6 !important; background: rgba(59,130,246,0.1) !important; }
    .is-today .day-number { color: #60a5fa; font-weight: 900; }
    .is-selected { border-color: #10b981 !important; background: rgba(16,185,129,0.15) !important; box-shadow: 0 0 12px rgba(16,185,129,0.25); }
    .is-selected .day-number { color: #10b981; }

    .task-indicator { display: flex; align-items: center; gap: 3px; background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.4); padding: 1px 5px; border-radius: 10px; width: fit-content; }
    .task-dot { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; }
    .task-count-text { font-size: 0.65rem; font-weight: 800; color: #fca5a5; }

    .calendar-legend { display: flex; gap: 1.25rem; margin-top: 1.25rem; padding-top: 0.875rem; border-top: 1px solid rgba(255,255,255,0.05); font-size: 0.75rem; color: var(--color-text-secondary); }
    .legend-item { display: flex; align-items: center; gap: 0.375rem; }
    .legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .today-dot { background: #3b82f6; }
    .task-dot { background: #ef4444; }
    .selected-dot { background: #10b981; }

    /* Notes Card */
    .notes-card { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
    .notes-header { display: flex; justify-content: space-between; align-items: center; }
    .notes-header h3 { font-size: 1.05rem; font-weight: 800; margin: 0; color: var(--color-text-primary); }
    .badge-count { background: rgba(16,185,129,0.15); color: #10b981; }

    .quick-note-box { background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 1rem; border-radius: 10px; display: flex; flex-direction: column; gap: 0.5rem; }
    .note-label { font-size: 0.75rem; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; }
    .note-input-row { display: flex; gap: 0.5rem; }
    .note-input { flex: 1; font-size: 0.8125rem; }
    .btn-save-note { background: rgba(16,185,129,0.2); border: 1px solid #10b981; color: #10b981; padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; cursor: pointer; white-space: nowrap; }
    .btn-save-note:hover { background: #10b981; color: #fff; }
    .saved-note-pill { background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.3); color: #fbbf24; padding: 6px 12px; border-radius: 8px; font-size: 0.8125rem; display: flex; justify-content: space-between; align-items: center; }
    .btn-clear-note { background: none; border: none; color: #ef4444; font-weight: 800; cursor: pointer; margin-left: 0.5rem; }

    .sub-section-title { font-size: 0.875rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-secondary); margin-bottom: 0.75rem; }
    .empty-tasks-state { text-align: center; padding: 2rem 1rem; color: var(--color-text-secondary); background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px dashed var(--border-color); }
    .tasks-vertical-list { display: flex; flex-direction: column; gap: 1rem; max-height: 420px; overflow-y: auto; }
    .task-item-card { padding: 1.25rem; border: 1px solid var(--border-color); background: rgba(255,255,255,0.03); }
    .task-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.375rem; }
    .badge-time { background: rgba(239,68,68,0.12); color: #fca5a5; }
    .task-item-title { font-size: 1rem; font-weight: 700; color: var(--color-text-primary); margin: 0 0 0.25rem 0; }
    .task-item-gadik { font-size: 0.8125rem; color: var(--color-text-secondary); margin-bottom: 1rem; }

    /* Upload & Submission Form Box */
    .upload-submission-box { background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); padding: 1rem; border-radius: 10px; display: flex; flex-direction: column; gap: 0.75rem; }
    .file-input-label { font-size: 0.75rem; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; }
    .file-input { padding: 6px 10px; font-size: 0.8125rem; }
    .upload-progress-info { font-size: 0.8125rem; color: #60a5fa; margin-top: 0.25rem; font-weight: 600; }
    .uploaded-file-tag { font-size: 0.8125rem; color: #10b981; background: rgba(16,185,129,0.1); padding: 4px 10px; border-radius: 6px; margin-top: 0.375rem; border: 1px solid rgba(16,185,129,0.3); }
    .comment-textarea { font-size: 0.8125rem; resize: vertical; }
    .submit-action-row { display: flex; justify-content: flex-end; gap: 0.5rem; align-items: center; }
    .btn-submit-task { background: var(--gradient-primary); color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-size: 0.8125rem; font-weight: 700; cursor: pointer; }
    .btn-submit-task:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Submitted Status View */
    .submitted-status-banner { display: flex; justify-content: space-between; align-items: center; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); padding: 0.75rem 1rem; border-radius: 8px; color: #10b981; }
    .status-left { display: flex; align-items: center; gap: 0.75rem; }
    .status-icon { font-size: 1.25rem; }
    .submitted-date { font-size: 0.75rem; color: var(--color-text-secondary); margin: 2px 0 0 0; }
    .btn-edit-sub { border-color: rgba(59,130,246,0.4); color: #60a5fa; }
    .btn-edit-sub:hover { background: rgba(59,130,246,0.15); }
    .file-link-box { font-size: 0.8125rem; color: var(--color-text-primary); background: rgba(255,255,255,0.04); padding: 0.625rem 0.875rem; border-radius: 6px; border: 1px solid var(--border-color); }
    .file-download-link { color: #60a5fa; text-decoration: underline; font-weight: 700; }
    .student-comment-view { font-size: 0.8125rem; color: var(--color-text-secondary); background: rgba(255,255,255,0.02); padding: 0.5rem 0.75rem; border-radius: 6px; border-left: 3px solid #10b981; }

    /* All Tasks Section */
    .all-tasks-section { margin-top: 2.5rem; }
    .section-head-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
    .section-head-bar h2 { font-size: 1.25rem; font-weight: 800; margin: 0; color: var(--color-text-primary); }
    .badge-total { background: rgba(59,130,246,0.15); color: #60a5fa; }
    
    .assignment-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.5rem; }
    .task-card-full { padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid var(--border-color); }
    .task-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem; }
    .badge-deadline { background: rgba(245,158,11,0.12); color: #fbbf24; }
    .task-card-title { font-size: 1.05rem; font-weight: 800; color: var(--color-text-primary); margin: 0 0 0.25rem 0; line-height: 1.4; }
    .task-card-gadik { font-size: 0.8125rem; color: var(--color-text-secondary); margin-bottom: 1rem; }
    .sub-input-sm { flex: 1; font-size: 0.8125rem; padding: 6px 10px; }
    .btn-primary-sm { background: var(--gradient-primary); color: #fff; border: none; padding: 6px 14px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; cursor: pointer; white-space: nowrap; }
    .btn-secondary-sm { background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: var(--color-text-secondary); padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; cursor: pointer; }

    .center-state { text-align: center; padding: 3rem; color: var(--color-text-secondary); }
    .badge { padding: 2px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; }
    .badge-spec { background: rgba(59,130,246,0.1); color: #60a5fa; }
    .btn-sm { background: none; border: 1px solid var(--border-color); color: var(--color-text-secondary); padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-family: var(--font-body); }
    .form-input { background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--color-text-primary); padding: 8px 12px; border-radius: 8px; font-family: var(--font-body); }
    
    .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 0.75rem 1.5rem; border-radius: 10px; font-size: 0.875rem; font-weight: 600; z-index: 10000; }
    .toast-success { background: rgba(16,185,129,0.9); color: #fff; }
    .toast-error { background: rgba(239,68,68,0.9); color: #fff; }
  `]
})
export class SiswaTugasComponent implements OnInit {
  assignments = signal<any[]>([]);
  submissions = signal<{ [assignmentId: number]: any }>({});
  loading = signal(true);
  toast = signal('');
  toastType = signal<'success'|'error'>('success');

  // Calendar State
  currentDate: Date = new Date();
  selectedDate: Date = new Date();
  calendarDays: CalendarDay[] = [];
  monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  // Notes & Submissions Form State
  personalNotes: { [key: string]: string } = {};
  currentNote = '';
  
  uploadingState: { [assignmentId: number]: boolean } = {};
  uploadedFiles: { [assignmentId: number]: { file_url: string; file_name: string } } = {};
  commentsState: { [assignmentId: number]: string } = {};
  editMode: { [assignmentId: number]: boolean } = {};

  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadNotesFromStorage();
    this.loadAssignments();
    this.loadMySubmissions();
  }

  get selectedDateKey(): string {
    return this.formatDateKey(this.selectedDate);
  }

  get selectedDateStr(): string {
    return this.selectedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  loadAssignments() {
    this.loading.set(true);
    const token = sessionStorage.getItem('rbt_token');
    this.http.get<any>(`${this.api}/assignments`, { headers: { Authorization: `Bearer ${token}` } }).subscribe({
      next: r => {
        this.assignments.set(r.data || []);
        this.buildCalendar();
        this.loading.set(false);
      },
      error: () => {
        this.buildCalendar();
        this.loading.set(false);
      }
    });
  }

  loadMySubmissions() {
    const token = sessionStorage.getItem('rbt_token');
    this.http.get<any>(`${this.api}/assignments/my-submissions`, { headers: { Authorization: `Bearer ${token}` } }).subscribe({
      next: r => {
        const map: { [assignmentId: number]: any } = {};
        (r.data || []).forEach((sub: any) => {
          map[sub.assignment_id] = sub;
          if (sub.catatan) this.commentsState[sub.assignment_id] = sub.catatan;
        });
        this.submissions.set(map);
      }
    });
  }

  getSubmission(assignmentId: number): any {
    return this.submissions()[assignmentId] || null;
  }

  toggleEdit(assignmentId: number) {
    this.editMode[assignmentId] = !this.editMode[assignmentId];
    if (this.editMode[assignmentId]) {
      const existing = this.getSubmission(assignmentId);
      if (existing && existing.catatan) {
        this.commentsState[assignmentId] = existing.catatan;
      }
    }
  }

  onFileSelected(event: any, assignmentId: number) {
    const file = event.target.files[0];
    if (!file) return;

    this.uploadingState[assignmentId] = true;
    const formData = new FormData();
    formData.append('file', file);
    const token = sessionStorage.getItem('rbt_token');

    this.http.post<any>(`${this.api}/assignments/upload-file`, formData, { headers: { Authorization: `Bearer ${token}` } }).subscribe({
      next: res => {
        this.uploadingState[assignmentId] = false;
        this.uploadedFiles[assignmentId] = {
          file_url: res.data.file_url,
          file_name: res.data.file_name
        };
        this.msg(`File "${res.data.file_name}" siap dikumpulkan!`, 'success');
      },
      error: err => {
        this.uploadingState[assignmentId] = false;
        this.msg(err.error?.message || 'Gagal mengunggah file.', 'error');
      }
    });
  }

  submitAssignment(assignmentId: number) {
    const existing = this.getSubmission(assignmentId);
    const uploaded = this.uploadedFiles[assignmentId];
    
    let fileUrl = uploaded ? uploaded.file_url : (existing ? existing.file_url : '');
    let fileName = uploaded ? uploaded.file_name : (existing ? existing.file_name : '');
    let catatan = this.commentsState[assignmentId] || (existing ? existing.catatan : '');

    if (!fileUrl && !catatan) {
      this.msg('Unggah file tugas (PDF/DOCX/PPT) atau isi catatan komentar terlebih dahulu.', 'error');
      return;
    }

    const token = sessionStorage.getItem('rbt_token');
    this.http.post<any>(`${this.api}/assignments/${assignmentId}/submit`, {
      file_url: fileUrl,
      file_name: fileName,
      catatan: catatan
    }, { headers: { Authorization: `Bearer ${token}` } }).subscribe({
      next: res => {
        this.msg(res.message || 'Tugas berhasil dikumpulkan!', 'success');
        this.editMode[assignmentId] = false;
        this.loadMySubmissions();
      },
      error: () => this.msg('Gagal mengumpulkan tugas.', 'error')
    });
  }

  // Calendar Logic
  buildCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    let startDayIdx = firstDayOfMonth.getDay() - 1;
    if (startDayIdx === -1) startDayIdx = 6;

    const days: CalendarDay[] = [];
    const today = new Date();

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayIdx - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        isToday: this.isSameDate(d, today),
        tasks: this.getTasksForDate(d)
      });
    }

    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        dayNum: i,
        isCurrentMonth: true,
        isToday: this.isSameDate(d, today),
        tasks: this.getTasksForDate(d)
      });
    }

    const totalGrid = days.length > 35 ? 42 : 35;
    const remaining = totalGrid - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        dayNum: i,
        isCurrentMonth: false,
        isToday: this.isSameDate(d, today),
        tasks: this.getTasksForDate(d)
      });
    }

    this.calendarDays = days;
  }

  changeMonth(delta: number) {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + delta, 1);
    this.buildCalendar();
  }

  goToToday() {
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.buildCalendar();
    this.loadNoteForSelectedDate();
  }

  selectDate(d: CalendarDay) {
    this.selectedDate = d.date;
    this.loadNoteForSelectedDate();
  }

  isSelectedDate(date: Date): boolean {
    return this.isSameDate(date, this.selectedDate);
  }

  isSameDate(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  getTasksForDate(date: Date): any[] {
    return this.assignments().filter(a => {
      if (!a.tenggat) return false;
      const tDate = new Date(a.tenggat);
      return this.isSameDate(tDate, date);
    });
  }

  getSelectedDayTasks(): any[] {
    return this.getTasksForDate(this.selectedDate);
  }

  // Personal Notes Logic
  loadNotesFromStorage() {
    try {
      const saved = localStorage.getItem('rbt_siswa_notes');
      if (saved) this.personalNotes = JSON.parse(saved);
    } catch (e) {}
    this.loadNoteForSelectedDate();
  }

  loadNoteForSelectedDate() {
    this.currentNote = this.personalNotes[this.selectedDateKey] || '';
  }

  savePersonalNote() {
    if (!this.currentNote.trim()) return;
    this.personalNotes[this.selectedDateKey] = this.currentNote.trim();
    localStorage.setItem('rbt_siswa_notes', JSON.stringify(this.personalNotes));
    this.msg('Catatan pengingat tugas disimpan!', 'success');
  }

  deleteNote() {
    delete this.personalNotes[this.selectedDateKey];
    this.currentNote = '';
    localStorage.setItem('rbt_siswa_notes', JSON.stringify(this.personalNotes));
    this.msg('Catatan dihapus.', 'success');
  }

  formatDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  formatDate(d: string) {
    return d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
  }

  private msg(m: string, t: 'success'|'error') {
    this.toast.set(m); this.toastType.set(t);
    setTimeout(() => this.toast.set(''), 3000);
  }
}
