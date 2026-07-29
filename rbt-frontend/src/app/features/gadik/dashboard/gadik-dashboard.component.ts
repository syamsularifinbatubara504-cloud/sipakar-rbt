import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-gadik-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page active">
      <div class="pagehead">
        <div>
          <span class="eyebrow">Constructive Alignment</span>
          <h2>Dashboard Gadik</h2>
          <p>Ringkasan capaian siswa, aktivitas mengajar, dan status siklus OBE hari ini.</p>
        </div>
      </div>
      <div class="grid cols-4">
        <div class="card stat">
          <div class="ic" style="background:rgba(59,130,246,.14);color:var(--accent-a);">👥</div>
          <div>
            <div class="num">{{ stats().totalSiswa }}</div>
            <div class="lbl">Siswa Aktif</div>
          </div>
        </div>
        <div class="card stat">
          <div class="ic" style="background:rgba(62,207,142,.14);color:var(--lantas);">📈</div>
          <div>
            <div class="num">{{ stats().avgObeScore }}</div>
            <div class="lbl">Rata-rata Skor OBE</div>
          </div>
        </div>
        <div class="card stat">
          <div class="ic" style="background:rgba(245,183,74,.14);color:var(--intel);">📝</div>
          <div>
            <div class="num">{{ stats().totalQuestions }}</div>
            <div class="lbl">Soal di Bank</div>
          </div>
        </div>
        <div class="card stat">
          <div class="ic" style="background:rgba(169,133,240,.14);color:var(--binmas);">🎓</div>
          <div>
            <div class="num">{{ stats().totalCertifications }}</div>
            <div class="lbl">Sertifikasi Disetujui</div>
          </div>
        </div>
      </div>
      <div class="section-title">
        <h3>Status Capaian Pembelajaran Siswa</h3>
        <span>Monitoring Realtime System</span>
      </div>
      <div class="card">
        <div class="list">
          <div class="list-item">
            <span class="l"><span class="badge tag-lantas">Diktuk</span> Standar Pembentukan Dasar — System Realtime</span>
            <span class="r">{{ stats().totalSiswa }} Siswa Terdaftar</span>
          </div>
        </div>
        <div class="notebar"><b>Saran sistem:</b> Gunakan menu <i>Buat Materi & Soal</i> untuk menambah bank soal dan siklus latihan OBE.</div>
      </div>
    </div>
  `,
  styles: []
})
export class GadikDashboardComponent implements OnInit {
  private api = environment.apiUrl;
  stats = signal<any>({
    totalSiswa: 0,
    avgObeScore: '0.0',
    totalQuestions: 0,
    totalCertifications: 0
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
