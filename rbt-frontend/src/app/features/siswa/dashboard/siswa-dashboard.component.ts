import { Component } from '@angular/core';

@Component({
  selector: 'app-siswa-dashboard',
  standalone: true,
  imports: [],
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
        <div class="card stat"><div class="ic" style="background:rgba(59,130,246,.14);color:var(--accent-a);">🏅</div><div><div class="num">#3</div><div class="lbl">Ranking Angkatan</div></div></div>
        <div class="card stat"><div class="ic" style="background:rgba(62,207,142,.14);color:var(--lantas);">📈</div><div><div class="num">76%</div><div class="lbl">Rata-rata Capaian</div></div></div>
        <div class="card stat"><div class="ic" style="background:rgba(169,133,240,.14);color:var(--binmas);">◆</div><div><div class="num">3/5</div><div class="lbl">Syarat Sertifikasi</div></div></div>
      </div>
      <div class="notebar" style="margin-top:20px;">Fokuskan latihan di <b>Lalu Lintas (58%)</b> untuk mencapai target minimum 70%.</div>
    </div>
  `,
  styles: []
})
export class SiswaDashboardComponent {

}
