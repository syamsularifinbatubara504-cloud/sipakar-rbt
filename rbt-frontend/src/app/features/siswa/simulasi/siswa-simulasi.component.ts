import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-siswa-simulasi',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page active">
      <div class="pagehead">
        <div>
          <span class="eyebrow">SIMULASI RBT</span>
          <h1>Simulasi Reality-Based Training</h1>
          <p class="page-desc">Jalankan simulasi skenario pelatihan berbasis AI untuk meningkatkan keterampilan.</p>
        </div>
      </div>

      <div class="sim-grid">
        <a routerLink="/simulation" class="glass-card sim-card">
          <div class="sim-icon">🎯</div>
          <h3>Mulai Simulasi Baru</h3>
          <p>Buat skenario RBT baru dengan bantuan AI Gemini untuk latihan Anda.</p>
          <span class="sim-action">Mulai →</span>
        </a>
        <a routerLink="/history" class="glass-card sim-card">
          <div class="sim-icon">📜</div>
          <h3>Riwayat Simulasi</h3>
          <p>Lihat semua simulasi yang pernah Anda jalankan beserta hasilnya.</p>
          <span class="sim-action">Lihat Riwayat →</span>
        </a>
      </div>

      <div class="glass-card info-section">
        <h3>Cara Kerja Simulasi</h3>
        <div class="steps">
          <div class="step">
            <div class="step-num">1</div>
            <div><strong>Input Skenario</strong><p>Masukkan kasus atau narasi skenario pelatihan yang ingin disimulasikan.</p></div>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <div><strong>Analisis AI</strong><p>Gemini AI akan menganalisis skenario dan menghasilkan rencana pelatihan RBT.</p></div>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <div><strong>Referensi Hukum</strong><p>Pasal.id API akan mencari referensi hukum yang relevan dengan skenario.</p></div>
          </div>
          <div class="step">
            <div class="step-num">4</div>
            <div><strong>Evaluasi</strong><p>Anda dapat mengevaluasi dan memberi nilai pada hasil simulasi.</p></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sim-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem; }
    .sim-card { padding: 1.5rem; text-decoration: none; color: inherit; cursor: pointer; transition: all 0.3s; border: 1px solid transparent; }
    .sim-card:hover { border-color: var(--color-primary); transform: translateY(-2px); }
    .sim-icon { font-size: 2.5rem; margin-bottom: 1rem; }
    .sim-card h3 { font-size: 1rem; margin-bottom: 0.5rem; }
    .sim-card p { font-size: 0.8125rem; color: var(--color-text-secondary); line-height: 1.5; margin-bottom: 1rem; }
    .sim-action { font-size: 0.8125rem; font-weight: 600; color: var(--color-primary); }
    .info-section { padding: 1.5rem; }
    .info-section h3 { margin-bottom: 1.25rem; }
    .steps { display: flex; flex-direction: column; gap: 1rem; }
    .step { display: flex; gap: 1rem; align-items: flex-start; }
    .step-num { width: 32px; height: 32px; border-radius: 50%; background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.875rem; color: #fff; flex-shrink: 0; }
    .step strong { font-size: 0.875rem; }
    .step p { font-size: 0.8125rem; color: var(--color-text-secondary); margin-top: 0.25rem; }
  `]
})
export class SiswaSimulasiComponent {}
