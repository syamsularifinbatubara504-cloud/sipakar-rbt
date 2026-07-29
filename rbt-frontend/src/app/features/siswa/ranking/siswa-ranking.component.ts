import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-siswa-ranking',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page active">
      <div class="pagehead">
        <div>
          <span class="eyebrow">LEADERBOARD</span>
          <h1>Peringkat Siswa</h1>
          <p class="page-desc">Lihat posisi Anda di antara seluruh siswa Prolat.</p>
        </div>
      </div>

      <div class="glass-card podium-card">
        <div class="podium">
          <div class="podium-slot second">
            <div class="podium-avatar">🥈</div>
            <p class="podium-name">-</p>
            <p class="podium-score">0 pts</p>
            <div class="podium-bar bar-2"></div>
          </div>
          <div class="podium-slot first">
            <div class="podium-avatar">🥇</div>
            <p class="podium-name">-</p>
            <p class="podium-score">0 pts</p>
            <div class="podium-bar bar-1"></div>
          </div>
          <div class="podium-slot third">
            <div class="podium-avatar">🥉</div>
            <p class="podium-name">-</p>
            <p class="podium-score">0 pts</p>
            <div class="podium-bar bar-3"></div>
          </div>
        </div>
        <p class="podium-note">Peringkat akan diperbarui saat siswa menyelesaikan simulasi, latihan, dan ujian.</p>
      </div>
    </div>
  `,
  styles: [`
    .podium-card { padding: 2rem; text-align: center; }
    .podium { display: flex; justify-content: center; align-items: flex-end; gap: 1.5rem; margin-bottom: 2rem; }
    .podium-slot { display: flex; flex-direction: column; align-items: center; }
    .podium-avatar { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .podium-name { font-size: 0.875rem; font-weight: 700; margin-bottom: 0.25rem; }
    .podium-score { font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 0.5rem; }
    .podium-bar { width: 80px; border-radius: 8px 8px 0 0; }
    .bar-1 { height: 120px; background: linear-gradient(to top, #f59e0b, #fbbf24); }
    .bar-2 { height: 90px; background: linear-gradient(to top, #94a3b8, #cbd5e1); }
    .bar-3 { height: 70px; background: linear-gradient(to top, #d97706, #f59e0b); }
    .first .podium-avatar { transform: scale(1.2); }
    .podium-note { color: var(--color-text-muted); font-size: 0.8125rem; max-width: 400px; margin: 0 auto; }
  `]
})
export class SiswaRankingComponent {}
