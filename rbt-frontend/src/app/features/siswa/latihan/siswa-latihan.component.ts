import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface SpecializationInfo {
  key: string;
  name: string;
  desc: string;
  icon: string;
}

@Component({
  selector: 'app-siswa-latihan',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page active">
      
      <!-- ================= PHASE 1: SELECTION PHASE ================= -->
      @if (!isExamStarted() && submittedScore() === null) {
        <div class="pagehead">
          <div>
            <span class="eyebrow">PORTAL UJIAN & LATIHAN OBE</span>
            <h1>Pilih Spesialisasi Ujian Kepolisian</h1>
            <p class="page-desc">Pilih salah satu unit spesialisasi di bawah ini untuk membuka lembar soal ujian bertimer 60 menit.</p>
          </div>
        </div>

        <!-- Specialization Cards Grid -->
        <div class="spec-grid">
          @for (spec of specs; track spec.key) {
            <div 
              class="glass-card spec-card" 
              [class.selected]="selectedCategory() === spec.key"
              (click)="selectCategory(spec.key)"
            >
              <div class="spec-card-header">
                <span class="spec-icon">{{ spec.icon }}</span>
                <span class="badge badge-count">{{ getCategoryCount(spec.key) }} Soal</span>
              </div>
              <h3 class="spec-name">{{ spec.name }}</h3>
              <p class="spec-desc">{{ spec.desc }}</p>
              
              <div class="spec-footer">
                <span class="spec-poin">⭐ {{ getCategoryTotalPoints(spec.key) }} Poin Max</span>
                <span class="select-indicator">
                  {{ selectedCategory() === spec.key ? '✅ Terpilih' : 'Pilih Unit ➔' }}
                </span>
              </div>
            </div>
          }
        </div>

        <!-- Exam Rules & Start Action Card -->
        <div class="glass-card rules-card">
          <div class="rules-header">
            <div class="rules-icon">📋</div>
            <div>
              <h3>Ketentuan & Aturan Pengerjaan Ujian</h3>
              <p class="rules-sub">Harap baca petunjuk berikut sebelum menekan tombol Mulai Ujian.</p>
            </div>
          </div>

          <div class="rules-grid">
            <div class="rule-box">
              <span class="rule-icon">⏱️</span>
              <div>
                <strong>Alokasi Waktu Ujian</strong>
                <p>60 Menit (Hitung Mundur Otomatis)</p>
              </div>
            </div>
            <div class="rule-box">
              <span class="rule-icon">📝</span>
              <div>
                <strong>Format Soal</strong>
                <p>Pilihan Ganda Berbasis Kasus & Hukum</p>
              </div>
            </div>
            <div class="rule-box">
              <span class="rule-icon">🎯</span>
              <div>
                <strong>Target Minimum</strong>
                <p>70 Poin untuk Kelulusan Sertifikasi</p>
              </div>
            </div>
            <div class="rule-box">
              <span class="rule-icon">⚡</span>
              <div>
                <strong>Auto-Submit System</strong>
                <p>Jawaban dikumpulkan otomatis saat timer 00:00</p>
              </div>
            </div>
          </div>

          <div class="start-action-row">
            @if (selectedCategory()) {
              <div class="selected-summary">
                Unit Terpilih: <strong>{{ getSelectedSpecName() }}</strong> ({{ filteredQuestions().length }} Soal)
              </div>
            } @else {
              <div class="selected-summary hint">
                👈 Silakan klik salah satu kartu unit spesialisasi di atas untuk melanjutkan.
              </div>
            }

            <button 
              class="btn-start-exam" 
              [disabled]="!selectedCategory() || filteredQuestions().length === 0 || loading()"
              (click)="startExam()"
            >
              {{ loading() ? 'Memuat Soal...' : '🚀 Mulai Ujian Spesialisasi (' + getSelectedSpecName() + ')' }}
            </button>
          </div>
        </div>
      }

      <!-- ================= PHASE 2: EXAM MODE (TIMER 60 MIN) ================= -->
      @if (isExamStarted() && submittedScore() === null) {
        
        <!-- Sticky Exam Top Header -->
        <div class="sticky-exam-bar glass-card">
          <div class="exam-title-box">
            <span class="exam-badge-icon">{{ getSelectedSpecIcon() }}</span>
            <div>
              <h2 class="exam-title">Lembar Ujian Unit {{ getSelectedSpecName() }}</h2>
              <span class="exam-sub">{{ getAnsweredCount() }} dari {{ filteredQuestions().length }} Soal Terjawab</span>
            </div>
          </div>

          <!-- 60 Minute Countdown Timer Display -->
          <div class="timer-display" [class.timer-warning]="timeLeft() <= 300">
            <span class="timer-label">⏱️ WAKTU TERSISA:</span>
            <span class="timer-val">{{ getTimerDisplay() }}</span>
          </div>

          <button class="btn-submit-exam" (click)="submitQuiz(false)">
            🚀 Selesaikan & Kumpulkan Ujian
          </button>
        </div>

        <!-- Question Navigator Bar -->
        <div class="glass-card nav-card">
          <span class="nav-label">Navigasi Soal:</span>
          <div class="nav-pills">
            @for (q of filteredQuestions(); track q.id; let i = $index) {
              <button 
                class="nav-pill" 
                [class.answered]="answers[q.id] !== undefined"
                (click)="scrollToQuestion(i)"
              >
                {{ i + 1 }}
              </button>
            }
          </div>
        </div>

        <!-- Questions List View -->
        <div class="exam-questions-list">
          @for (q of filteredQuestions(); track q.id; let i = $index) {
            <div [id]="'q-item-' + i" class="glass-card quiz-item">
              <div class="quiz-header">
                <div class="quiz-num">Soal #{{ i + 1 }}</div>
                <div class="quiz-meta">
                  <span class="badge badge-poin">⭐ {{ q.poin || 10 }} Poin</span>
                  <span class="badge badge-spec">{{ q.unit_spesialisasi }}</span>
                  <span class="badge" [class]="'badge-' + q.tingkat_kesulitan">{{ q.tingkat_kesulitan || 'Sedang' }}</span>
                </div>
              </div>

              <p class="quiz-text">{{ q.soal }}</p>

              <!-- Options -->
              <div class="options-grid">
                @for (opt of getOptions(q); track $index) {
                  <label class="option-card" [class.selected]="answers[q.id] === $index">
                    <input 
                      type="radio" 
                      [name]="'q_' + q.id" 
                      [value]="$index" 
                      [(ngModel)]="answers[q.id]" 
                    />
                    <span class="opt-key-badge">{{ getOptionKey($index) }}</span>
                    <span class="opt-text">{{ opt }}</span>
                  </label>
                }
              </div>
            </div>
          }

          <div class="bottom-action-bar">
            <button class="btn-submit-exam large" (click)="submitQuiz(false)">
              🚀 Selesaikan & Kumpulkan Ujian Sekarang
            </button>
          </div>
        </div>
      }

      <!-- ================= SCORE RESULT PHASE ================= -->
      @if (submittedScore() !== null) {
        <div class="glass-card score-result-card">
          <div class="score-icon">🎉</div>
          <h2>Hasil Ujian {{ getSelectedSpecName() | uppercase }}</h2>
          <p class="score-sub">Ujian telah selesai dikumpulkan dan dihitung nilainya.</p>

          <div class="score-main-badge">{{ submittedScore() }} Poin</div>
          
          <div class="score-details-row">
            <div class="score-detail-box">
              <span class="sd-val">{{ getAnsweredCount() }} / {{ filteredQuestions().length }}</span>
              <span class="sd-lbl">Soal Dijawab</span>
            </div>
            <div class="score-detail-box">
              <span class="sd-val" [style.color]="submittedScore()! >= 70 ? '#10b981' : '#ef4444'">
                {{ submittedScore()! >= 70 ? 'LULUS (MEMENUHI SYARAT)' : 'BELUM LULUS' }}
              </span>
              <span class="sd-lbl">Status Kelulusan</span>
            </div>
          </div>

          <button class="btn-primary" (click)="resetQuiz()" style="margin-top: 1.5rem;">
            🔄 Uji Ulang / Pilih Spesialisasi Lain
          </button>
        </div>
      }

      @if (toast()) {
        <div class="toast" [class.toast-success]="toastType()==='success'" [class.toast-error]="toastType()==='error'">{{ toast() }}</div>
      }
    </div>
  `,
  styles: [`
    .pagehead { margin-bottom: 1.5rem; }

    /* Specialization Grid */
    .spec-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem; }
    .spec-card { padding: 1.5rem; cursor: pointer; border: 1px solid var(--border-color); transition: all 0.25s ease; position: relative; }
    .spec-card:hover { transform: translateY(-3px); border-color: rgba(59,130,246,0.4); box-shadow: 0 8px 25px rgba(0,0,0,0.3); }
    .spec-card.selected { border-color: #3b82f6; background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.08)); box-shadow: 0 0 20px rgba(59,130,246,0.3); }
    .spec-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .spec-icon { font-size: 2.25rem; }
    .badge-count { background: rgba(59,130,246,0.15); color: #60a5fa; border: 1px solid rgba(59,130,246,0.3); }
    .spec-name { font-size: 1.125rem; font-weight: 800; color: var(--color-text-primary); margin: 0 0 0.375rem 0; }
    .spec-desc { font-size: 0.8125rem; color: var(--color-text-secondary); line-height: 1.4; margin-bottom: 1rem; }
    .spec-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.75rem; font-size: 0.75rem; }
    .spec-poin { color: #fbbf24; font-weight: 700; }
    .select-indicator { font-weight: 700; color: #60a5fa; }

    /* Rules Card */
    .rules-card { padding: 1.75rem; border: 1px solid rgba(59,130,246,0.3); margin-bottom: 2rem; background: linear-gradient(135deg, rgba(15,23,42,0.6), rgba(30,41,59,0.5)); }
    .rules-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
    .rules-icon { width: 44px; height: 44px; border-radius: 10px; background: rgba(59,130,246,0.2); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; }
    .rules-header h3 { font-size: 1.125rem; font-weight: 800; margin: 0; }
    .rules-sub { font-size: 0.8125rem; color: var(--color-text-secondary); margin-top: 2px; }
    .rules-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .rule-box { display: flex; align-items: center; gap: 0.875rem; padding: 0.875rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; }
    .rule-icon { font-size: 1.5rem; flex-shrink: 0; }
    .rule-box strong { display: block; font-size: 0.8125rem; color: var(--color-text-primary); }
    .rule-box p { font-size: 0.75rem; color: var(--color-text-secondary); margin: 2px 0 0 0; }
    
    .start-action-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1.25rem; }
    .selected-summary { font-size: 0.875rem; color: var(--color-text-primary); }
    .selected-summary.hint { color: #fbbf24; font-style: italic; }
    .btn-start-exam { background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; padding: 12px 28px; border-radius: 10px; font-weight: 800; font-size: 0.9375rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px rgba(16,185,129,0.3); }
    .btn-start-exam:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16,185,129,0.4); }
    .btn-start-exam:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Sticky Exam Bar */
    .sticky-exam-bar { position: sticky; top: 1rem; z-index: 100; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border: 1px solid rgba(59,130,246,0.4); background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(12px); box-shadow: 0 10px 30px rgba(0,0,0,0.5); border-radius: 12px; margin-bottom: 1rem; }
    .exam-title-box { display: flex; align-items: center; gap: 0.875rem; }
    .exam-badge-icon { width: 40px; height: 40px; border-radius: 8px; background: rgba(59,130,246,0.2); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; }
    .exam-title { font-size: 1rem; font-weight: 800; margin: 0; }
    .exam-sub { font-size: 0.75rem; color: var(--color-text-secondary); }
    
    .timer-display { display: flex; align-items: center; gap: 0.5rem; background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.4); padding: 8px 16px; border-radius: 8px; transition: all 0.3s; }
    .timer-label { font-size: 0.75rem; font-weight: 800; color: #fbbf24; letter-spacing: 0.05em; }
    .timer-val { font-size: 1.35rem; font-weight: 900; font-family: monospace; color: #fbbf24; letter-spacing: 0.05em; }
    .timer-display.timer-warning { background: rgba(239,68,68,0.2); border-color: #ef4444; animation: timerPulse 1s infinite alternate; }
    .timer-display.timer-warning .timer-label, .timer-display.timer-warning .timer-val { color: #f87171; }
    @keyframes timerPulse { from { transform: scale(1); } to { transform: scale(1.05); } }

    .btn-submit-exam { background: linear-gradient(135deg, #3b82f6, #6366f1); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 800; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; }
    .btn-submit-exam:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(59,130,246,0.4); }
    .btn-submit-exam.large { padding: 14px 32px; font-size: 1rem; border-radius: 10px; }

    /* Nav Pills Bar */
    .nav-card { padding: 1rem 1.25rem; display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; overflow-x: auto; }
    .nav-label { font-size: 0.75rem; font-weight: 800; color: var(--color-text-secondary); text-transform: uppercase; flex-shrink: 0; }
    .nav-pills { display: flex; gap: 0.375rem; flex-wrap: wrap; }
    .nav-pill { width: 30px; height: 30px; border-radius: 6px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.04); color: var(--color-text-secondary); font-weight: 800; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .nav-pill:hover { background: rgba(255,255,255,0.1); }
    .nav-pill.answered { background: #10b981; color: #fff; border-color: #10b981; }

    /* Exam Questions */
    .exam-questions-list { display: flex; flex-direction: column; gap: 1.25rem; }
    .quiz-item { padding: 1.5rem; border: 1px solid var(--border-color); }
    .quiz-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .quiz-num { font-weight: 800; color: #60a5fa; font-size: 1.125rem; }
    .quiz-meta { display: flex; gap: 0.5rem; }
    .quiz-text { font-size: 1rem; font-weight: 600; line-height: 1.5; color: var(--color-text-primary); margin-bottom: 1.25rem; }
    
    .options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    @media (max-width: 768px) { .options-grid { grid-template-columns: 1fr; } }
    .option-card { display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1.25rem; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; font-size: 0.875rem; color: var(--color-text-secondary); transition: all 0.2s; }
    .option-card:hover { background: rgba(255,255,255,0.06); }
    .option-card.selected { background: rgba(59,130,246,0.15); border-color: #3b82f6; color: #fff; font-weight: 600; }
    .opt-key-badge { width: 26px; height: 26px; border-radius: 6px; background: rgba(255,255,255,0.08); font-weight: 800; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .selected .opt-key-badge { background: #3b82f6; color: #fff; }
    .opt-text { flex: 1; }

    .bottom-action-bar { display: flex; justify-content: center; margin-top: 1rem; margin-bottom: 2rem; }

    /* Score Result */
    .score-result-card { padding: 2.5rem; text-align: center; margin: 2rem auto; max-width: 600px; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.3); }
    .score-icon { font-size: 3.5rem; margin-bottom: 0.5rem; }
    .score-sub { font-size: 0.875rem; color: var(--color-text-secondary); }
    .score-main-badge { font-size: 2.5rem; font-weight: 900; color: #fbbf24; margin: 1rem 0; text-shadow: 0 0 20px rgba(251,191,36,0.3); }
    .score-details-row { display: flex; justify-content: center; gap: 1.5rem; margin-top: 1rem; }
    .score-detail-box { background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); padding: 1rem 1.5rem; border-radius: 10px; }
    .sd-val { font-size: 1.125rem; font-weight: 800; display: block; color: var(--color-text-primary); }
    .sd-lbl { font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 2px; display: block; }

    .badge { padding: 2px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; }
    .badge-poin { background: rgba(245,158,11,0.15); color: #fbbf24; }
    .badge-spec { background: rgba(59,130,246,0.1); color: #60a5fa; }
    .badge-mudah { background: rgba(16,185,129,0.1); color: #10b981; }
    .badge-sedang { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .badge-sulit { background: rgba(239,68,68,0.1); color: #ef4444; }

    .btn-primary { background: var(--gradient-primary); color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; font-family: var(--font-body); }
    .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 0.75rem 1.5rem; border-radius: 10px; font-size: 0.875rem; font-weight: 600; z-index: 1000; }
    .toast-success { background: rgba(16,185,129,0.9); color: #fff; }
    .toast-error { background: rgba(239,68,68,0.9); color: #fff; }
  `]
})
export class SiswaLatihanComponent implements OnInit, OnDestroy {
  questions = signal<any[]>([]);
  filteredQuestions = signal<any[]>([]);
  selectedCategory = signal<string>('');
  isExamStarted = signal<boolean>(false);
  loading = signal(true);
  
  // Timer State (60 minutes = 3600 seconds)
  timeLeft = signal<number>(3600);
  private timerInterval: any = null;

  answers: { [key: number]: number } = {};
  submittedScore = signal<number | null>(null);
  toast = signal('');
  toastType = signal<'success'|'error'>('success');
  
  private api = environment.apiUrl;

  specs: SpecializationInfo[] = [
    { key: 'sabhara', name: 'Unit Sabhara', desc: 'Turjavali, Pengaturan, Penjagaan, Patroli & TPTKP Kepolisian.', icon: '🛡️' },
    { key: 'reserse', name: 'Unit Reserse', desc: 'Penyidikan Pidana, Olah TKP, Penindakan Hukum & Penggeledahan.', icon: '🔍' },
    { key: 'intel', name: 'Unit Intelkam', desc: 'Intelijen Keamanan, Deteksi Dini, Pemetaan Potensi Konflik.', icon: '📡' },
    { key: 'lantas', name: 'Unit Lalu Lintas', desc: 'Kamseltibcarlantas, Penanganan Lakalantas, ETLE & Tilang.', icon: '🚦' },
    { key: 'binmas', name: 'Unit Binmas', desc: 'Pembinaan Masyarakat, Bhabinkamtibmas & Penyuluhan Hukum.', icon: '🤝' }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.load();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  load() {
    this.loading.set(true);
    const token = sessionStorage.getItem('rbt_token');
    this.http.get<any>(`${this.api}/questions`, { headers: { Authorization: `Bearer ${token}` } }).subscribe({
      next: r => {
        const available = (r.data || []).filter((q: any) => q.status !== 'rejected');
        this.questions.set(available);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  selectCategory(catKey: string) {
    this.selectedCategory.set(catKey);
    const qList = this.questions().filter(q => (q.unit_spesialisasi || '').toLowerCase() === catKey.toLowerCase());
    this.filteredQuestions.set(qList);
    this.answers = {};
  }

  getCategoryCount(catKey: string): number {
    return this.questions().filter(q => (q.unit_spesialisasi || '').toLowerCase() === catKey.toLowerCase()).length;
  }

  getCategoryTotalPoints(catKey: string): number {
    const qList = this.questions().filter(q => (q.unit_spesialisasi || '').toLowerCase() === catKey.toLowerCase());
    return qList.reduce((acc, q) => acc + (parseInt(q.poin) || 10), 0);
  }

  getSelectedSpecName(): string {
    const spec = this.specs.find(s => s.key === this.selectedCategory());
    return spec ? spec.name : 'Umum';
  }

  getSelectedSpecIcon(): string {
    const spec = this.specs.find(s => s.key === this.selectedCategory());
    return spec ? spec.icon : '📝';
  }

  // ================= EXAM ENGINE & TIMER (60 MIN) =================
  startExam() {
    if (!this.selectedCategory()) {
      this.msg('Pilih unit spesialisasi terlebih dahulu.', 'error');
      return;
    }
    if (this.filteredQuestions().length === 0) {
      this.msg('Belum ada soal terverifikasi untuk spesialisasi ini.', 'error');
      return;
    }

    this.isExamStarted.set(true);
    this.submittedScore.set(null);
    this.answers = {};
    
    // Reset timer to 60 Minutes (3600 Seconds)
    this.timeLeft.set(3600);
    this.startTimer();
    this.msg(`Ujian ${this.getSelectedSpecName()} dimulai! Waktu Anda: 60 Menit.`, 'success');
  }

  private startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      const current = this.timeLeft();
      if (current <= 1) {
        this.stopTimer();
        this.timeLeft.set(0);
        this.msg('⏰ Waktu 60 menit telah habis! Jawaban Anda otomatis dikumpulkan.', 'error');
        this.submitQuiz(true);
      } else {
        this.timeLeft.set(current - 1);
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  getTimerDisplay(): string {
    const seconds = this.timeLeft();
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const mStr = mins < 10 ? '0' + mins : '' + mins;
    const sStr = secs < 10 ? '0' + secs : '' + secs;
    return `${mStr}:${sStr}`;
  }

  getAnsweredCount(): number {
    return Object.keys(this.answers).length;
  }

  scrollToQuestion(index: number) {
    const el = document.getElementById(`q-item-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  getOptions(q: any): string[] {
    if (!q.opsi_jawaban) return [];
    if (Array.isArray(q.opsi_jawaban)) return q.opsi_jawaban;
    try {
      return JSON.parse(q.opsi_jawaban);
    } catch {
      return q.opsi_jawaban.split('\n').filter((l: string) => l.trim());
    }
  }

  getOptionKey(index: number): string {
    return ['A', 'B', 'C', 'D'][index] || '';
  }

  submitQuiz(isAuto: boolean = false) {
    this.stopTimer();
    const qList = this.filteredQuestions();
    if (qList.length === 0) return;

    let totalScore = 0;
    qList.forEach(q => {
      const selected = this.answers[q.id];
      const correctIndex = parseInt(q.jawaban_benar) || 0;
      if (selected !== undefined && selected === correctIndex) {
        totalScore += (parseInt(q.poin) || 10);
      }
    });

    this.submittedScore.set(totalScore);
    this.isExamStarted.set(false);

    if (!isAuto) {
      this.msg(`Ujian Selesai! Total Nilai Anda: ${totalScore} Poin`, 'success');
    }
  }

  resetQuiz() {
    this.stopTimer();
    this.isExamStarted.set(false);
    this.submittedScore.set(null);
    this.answers = {};
    this.selectedCategory.set('');
    this.filteredQuestions.set([]);
  }

  private msg(m: string, t: 'success'|'error') { this.toast.set(m); this.toastType.set(t); setTimeout(() => this.toast.set(''), 4000); }
}
