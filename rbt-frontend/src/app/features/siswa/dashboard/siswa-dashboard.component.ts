import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-siswa-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page active">
      <div class="pagehead">
        <div>
          <span class="eyebrow">Capaian Kompetensi</span>
          <h2>Dashboard Siswa</h2>
          <p>Ringkasan progres belajar dan posisi kamu di angkatan.</p>
        </div>
      </div>
      <div class="grid cols-3">
        <div class="card stat">
          <div class="ic" style="background:rgba(59,130,246,.14);color:var(--accent-a);">🏅</div>
          <div>
            <div class="num">{{ stats().studentRank }}</div>
            <div class="lbl">Ranking Angkatan</div>
          </div>
        </div>
        <div class="card stat">
          <div class="ic" style="background:rgba(62,207,142,.14);color:var(--lantas);">📈</div>
          <div>
            <div class="num">{{ stats().studentAverage }}</div>
            <div class="lbl">Rata-rata Capaian</div>
          </div>
        </div>
        <div class="card stat">
          <div class="ic" style="background:rgba(169,133,240,.14);color:var(--binmas);">🎓</div>
          <div>
            <div class="num">{{ stats().studentCertRequirements }}</div>
            <div class="lbl">Syarat Sertifikasi</div>
          </div>
        </div>
      </div>
      <div class="notebar" style="margin-top:20px;">{{ stats().studentFocusRecommendation }}</div>
    </div>
  `,
  styles: []
})
export class SiswaDashboardComponent implements OnInit {
  private api = environment.apiUrl;
  stats = signal<any>({
    studentRank: '#1',
    studentAverage: '0%',
    studentCertRequirements: '0/5',
    studentFocusRecommendation: 'Lakukan Simulasi RBT pertama Anda untuk mengukur capaian kompetensi.'
  });

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    const token = sessionStorage.getItem('rbt_token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.get<any>(`${this.api}/users/dashboard-stats`, { headers }).subscribe({
      next: (res) => {
        if (res.success) {
          this.stats.set(res.data);
        }
      },
      error: () => {}
    });
  }
}
