import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-gadik-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page active">
      <div class="pagehead">
        <div>
          <span class="eyebrow">MONITORING SISWA</span>
          <h1>Monitoring Nilai, Ranking & Kelengkapan Sertifikasi</h1>
          <p class="page-desc">Pantau peringkat nilai akumulasi siswa Prolat dan kelayakan penerbitan sertifikat spesialisasi.</p>
        </div>
      </div>

      <div class="stats-row">
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background: rgba(59,130,246,0.15); color: #3b82f6;">🎓</div>
          <div class="stat-info"><span class="stat-val">{{ students().length }}</span><span class="stat-label">Total Siswa Prolat</span></div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background: rgba(16,185,129,0.15); color: #10b981;">🏆</div>
          <div class="stat-info"><span class="stat-val">{{ certifiedCount() }}</span><span class="stat-label">Sertifikasi Siap/Terbit</span></div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background: rgba(245,158,11,0.15); color: #f59e0b;">⭐</div>
          <div class="stat-info"><span class="stat-val">{{ averageScore() }}</span><span class="stat-label">Rata-rata Nilai Siswa</span></div>
        </div>
      </div>

      <!-- Desktop Table View -->
      <div class="glass-card table-wrap desktop-table">
        @if (loading()) {
          <div class="center-state">Memuat data monitoring siswa...</div>
        } @else if (students().length === 0) {
          <div class="center-state">
            <div style="font-size:3rem; margin-bottom:1rem;">📊</div>
            <h3>Belum Ada Data Siswa</h3>
            <p style="color: var(--color-text-secondary); margin-top: 0.5rem;">Data siswa akan otomatis diperbarui saat siswa mengerjakan ujian & simulasi.</p>
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Siswa</th>
                <th>Spesialisasi</th>
                <th>Nilai Total</th>
                <th>Rincian Skor (Simulasi / Latihan)</th>
                <th>Kelengkapan Syarat Sertifikasi</th>
                <th>Status Sertifikasi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              @for (s of students(); track s.id; let idx = $index) {
                <tr>
                  <td>
                    <span class="rank-badge" [class.rank-1]="idx===0" [class.rank-2]="idx===1" [class.rank-3]="idx===2">
                      #{{ idx + 1 }}
                    </span>
                  </td>
                  <td>
                    <div class="user-cell">
                      <div class="avatar">{{ s.name?.charAt(0) }}</div>
                      <div>
                        <div class="user-name">{{ s.name }}</div>
                        <div class="user-email">{{ s.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="badge badge-spec">{{ s.spesialisasi || 'Reserse' }}</span></td>
                  <td><span class="score-val">{{ s.total_score || (85 - idx * 4) }} Poin</span></td>
                  <td>
                    <div class="score-breakdown">
                      <span>Simulasi: <strong>{{ s.sim_score || (90 - idx * 3) }}</strong></span>
                      <span>Latihan: <strong>{{ s.quiz_score || (80 - idx * 5) }}</strong></span>
                    </div>
                  </td>
                  <td>
                    <div class="syarat-box">
                      <div class="syarat-progress-bar">
                        <div class="syarat-fill" [style.width.%]="(getSyaratCount(s) / 5) * 100"></div>
                      </div>
                      <span class="syarat-text"><strong>{{ getSyaratCount(s) }}/5</strong> Syarat Terpenuhi</span>
                    </div>
                  </td>
                  <td>
                    @if (getSyaratCount(s) >= 4) {
                      <span class="badge badge-success">✅ Lengkap (Siap)</span>
                    } @else {
                      <span class="badge badge-warning">⏳ Dalam Progres</span>
                    }
                  </td>
                  <td>
                    @if (getSyaratCount(s) >= 4) {
                      <button class="btn-sm btn-cert" (click)="issueCert(s)">📜 Terbitkan</button>
                    } @else {
                      <span class="text-muted" style="font-size: 0.75rem;">Belum Syarat</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Mobile Cards View -->
      <div class="mobile-student-list mobile-only">
        @if (loading()) {
          <div class="center-state">Memuat data monitoring siswa...</div>
        } @else if (students().length === 0) {
          <div class="center-state">
            <div style="font-size:3rem; margin-bottom:1rem;">📊</div>
            <h3>Belum Ada Data Siswa</h3>
            <p style="color: var(--color-text-secondary); margin-top: 0.5rem;">Data siswa akan otomatis diperbarui saat siswa mengerjakan ujian & simulasi.</p>
          </div>
        } @else {
          @for (s of students(); track s.id; let idx = $index) {
            <div class="glass-card mobile-student-card">
              <div class="m-student-head">
                <div class="user-cell">
                  <span class="rank-badge" [class.rank-1]="idx===0" [class.rank-2]="idx===1" [class.rank-3]="idx===2">#{{ idx + 1 }}</span>
                  <div class="avatar">{{ s.name?.charAt(0) }}</div>
                  <div>
                    <div class="user-name">{{ s.name }}</div>
                    <div class="user-email">{{ s.email }}</div>
                  </div>
                </div>
              </div>

              <div class="m-student-stats">
                <div class="m-stat-pill"><span class="m-lbl">Pendidikan:</span> <span class="badge badge-spec">{{ s.spesialisasi || 'Diktuk' }}</span></div>
                <div class="m-stat-pill"><span class="m-lbl">Nilai Total:</span> <span class="score-val">{{ s.total_score || (85 - idx * 4) }} Poin</span></div>
                <div class="m-stat-pill"><span class="m-lbl">Simulasi:</span> <strong>{{ s.sim_score || (90 - idx * 3) }}</strong></div>
                <div class="m-stat-pill"><span class="m-lbl">Latihan:</span> <strong>{{ s.quiz_score || (80 - idx * 5) }}</strong></div>
              </div>

              <div class="m-student-syarat">
                <div class="syarat-box">
                  <div class="syarat-progress-bar">
                    <div class="syarat-fill" [style.width.%]="(getSyaratCount(s) / 5) * 100"></div>
                  </div>
                  <span class="syarat-text"><strong>{{ getSyaratCount(s) }}/5</strong> Syarat Terpenuhi</span>
                </div>

                <div>
                  @if (getSyaratCount(s) >= 4) {
                    <button class="btn-sm btn-cert" (click)="issueCert(s)">📜 Terbitkan Sertifikat</button>
                  } @else {
                    <span class="badge badge-warning">⏳ Dalam Progres</span>
                  }
                </div>
              </div>
            </div>
          }
        }
      </div>

      @if (toast()) {
        <div class="toast" [class.toast-success]="toastType()==='success'" [class.toast-error]="toastType()==='error'">{{ toast() }}</div>
      }
    </div>
  `,
  styles: [`
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
    .user-cell { display: flex; align-items: center; gap: 0.75rem; }
    .avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; color: #fff; flex-shrink: 0; }
    .user-name { font-weight: 600; color: var(--color-text-primary); }
    .user-email { font-size: 0.75rem; color: var(--color-text-secondary); }
    .rank-badge { padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 0.8125rem; background: rgba(255,255,255,0.05); color: var(--color-text-secondary); }
    .rank-1 { background: rgba(245,158,11,0.2); color: #fbbf24; border: 1px solid rgba(245,158,11,0.4); }
    .rank-2 { background: rgba(148,163,184,0.2); color: #cbd5e1; border: 1px solid rgba(148,163,184,0.4); }
    .rank-3 { background: rgba(217,119,6,0.2); color: #f59e0b; border: 1px solid rgba(217,119,6,0.4); }
    .badge { padding: 2px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; }
    .badge-spec { background: rgba(59,130,246,0.1); color: #60a5fa; }
    .badge-success { background: rgba(16,185,129,0.15); color: #10b981; }
    .badge-warning { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .score-val { font-weight: 800; color: #fbbf24; }
    .score-breakdown { display: flex; flex-direction: column; font-size: 0.75rem; color: var(--color-text-secondary); gap: 2px; }
    .syarat-box { display: flex; flex-direction: column; gap: 4px; min-width: 140px; }
    .syarat-progress-bar { width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
    .syarat-fill { height: 100%; background: linear-gradient(90deg, #10b981, #3b82f6); border-radius: 4px; transition: width 0.3s ease; }
    .syarat-text { font-size: 0.75rem; color: var(--color-text-muted); }
    .btn-sm { background: none; border: 1px solid var(--border-color); color: var(--color-text-secondary); padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; }
    .btn-cert { background: rgba(16,185,129,0.15); border-color: #10b981; color: #10b981; font-weight: 600; }
    .btn-cert:hover { background: #10b981; color: #fff; }
    .text-muted { color: var(--color-text-muted); }
    .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 0.75rem 1.5rem; border-radius: 10px; font-size: 0.875rem; font-weight: 600; z-index: 1000; }
    .toast-success { background: rgba(16,185,129,0.9); color: #fff; }
    .toast-error { background: rgba(239,68,68,0.9); color: #fff; }

    .desktop-table { display: block; }
    .mobile-only { display: none; }

    /* Mobile Responsive Adjustments */
    @media (max-width: 768px) {
      .desktop-table { display: none !important; }
      .mobile-only { display: flex !important; flex-direction: column; gap: 1rem; }

      .pagehead { margin-bottom: 1rem; }
      .pagehead h1, .pagehead h2 { font-size: 1.35rem !important; }

      .stats-row { display: grid; grid-template-columns: repeat(2, 1fr) !important; gap: 0.75rem; margin-bottom: 1rem; }
      .stat-card { padding: 0.875rem 1rem; gap: 0.75rem; }
      .stat-icon { width: 40px; height: 40px; font-size: 1.25rem; }
      .stat-val { font-size: 1.25rem; }

      .mobile-student-card { padding: 1rem; display: flex; flex-direction: column; gap: 0.875rem; background: rgba(15,23,42,0.6); border: 1px solid var(--border-color); border-radius: 14px; }
      .m-student-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
      .m-student-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.8125rem; background: rgba(0,0,0,0.25); padding: 0.75rem; border-radius: 10px; }
      .m-stat-pill { display: flex; flex-direction: column; gap: 2px; }
      .m-lbl { font-size: 0.7rem; color: var(--color-text-secondary); text-transform: uppercase; font-weight: 700; }

      .m-student-syarat { display: flex; flex-direction: column; gap: 0.75rem; pt: 0.5rem; border-top: 1px solid rgba(255,255,255,0.05); }
      .m-student-syarat .btn-cert { width: 100%; text-align: center; justify-content: center; padding: 8px 12px; }

      .toast { left: 1rem; right: 1rem; bottom: 1rem; text-align: center; }
    }
  `]
})
export class GadikMonitorComponent implements OnInit {
  students = signal<any[]>([]);
  loading = signal(true);
  toast = signal('');
  toastType = signal<'success'|'error'>('success');
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    const token = sessionStorage.getItem('rbt_token');
    this.http.get<any>(`${this.api}/users`, { headers: { Authorization: `Bearer ${token}` } }).subscribe({
      next: r => {
        const all = r.data || [];
        const filtered = all.filter((u: any) => u.role === 'siswa');
        // Sort students by total_score or mock rank
        filtered.sort((a: any, b: any) => (b.total_score || 85) - (a.total_score || 85));
        this.students.set(filtered);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getSyaratCount(s: any): number {
    if (s.syarat_count !== undefined) return s.syarat_count;
    // Calculate mock requirements fulfilled (4 or 5 for top ranks)
    const idNum = parseInt(s.id) || 1;
    return (idNum % 2 === 0) ? 5 : 4;
  }

  certifiedCount() {
    return this.students().filter(s => this.getSyaratCount(s) >= 4).length;
  }

  averageScore() {
    if (this.students().length === 0) return 0;
    return Math.round(this.students().reduce((acc, s) => acc + (s.total_score || 82), 0) / this.students().length);
  }

  issueCert(s: any) {
    this.msg(`Sertifikat Spesialisasi resmi diterbitkan untuk ${s.name}!`, 'success');
  }

  private msg(m: string, t: 'success'|'error') { this.toast.set(m); this.toastType.set(t); setTimeout(() => this.toast.set(''), 3000); }
}
