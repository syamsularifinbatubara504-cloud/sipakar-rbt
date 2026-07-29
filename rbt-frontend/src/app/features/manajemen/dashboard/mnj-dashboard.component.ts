import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-mnj-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page active">
      <div class="pagehead">
        <div>
          <span class="eyebrow">Tata Kelola Sistem</span>
          <h2>Dashboard Manajemen</h2>
          <p>Kontrol data, konten, dan integrasi yang menopang seluruh SIPAKAR RBT.</p>
        </div>
      </div>
      <div class="grid cols-3">
        <div class="card stat">
          <div class="ic" style="background:rgba(59,130,246,.14);color:var(--accent-a);">🧑‍💼</div>
          <div>
            <div class="num">{{ stats().totalUsers }}</div>
            <div class="lbl">Total Akun</div>
          </div>
        </div>
        <div class="card stat">
          <div class="ic" style="background:rgba(245,183,74,.14);color:var(--intel);">📚</div>
          <div>
            <div class="num">{{ stats().verifiedQuestions }}</div>
            <div class="lbl">Soal Terverifikasi</div>
          </div>
        </div>
        <div class="card stat">
          <div class="ic" style="background:rgba(62,207,142,.14);color:var(--lantas);">🔌</div>
          <div>
            <div class="num">{{ stats().activeApiIntegrations }}</div>
            <div class="lbl">Integrasi API Aktif</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class MnjDashboardComponent implements OnInit {
  private api = environment.apiUrl;
  stats = signal<any>({
    totalUsers: 0,
    verifiedQuestions: 0,
    activeApiIntegrations: '2/2'
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
