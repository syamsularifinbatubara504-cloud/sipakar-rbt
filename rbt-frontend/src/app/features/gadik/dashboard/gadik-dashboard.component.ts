import { Component } from '@angular/core';

@Component({
  selector: 'app-gadik-dashboard',
  standalone: true,
  imports: [],
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
        <div class="card stat"><div class="ic" style="background:rgba(59,130,246,.14);color:var(--accent-a);">👥</div><div><div class="num">128</div><div class="lbl">Siswa Aktif</div></div></div>
        <div class="card stat"><div class="ic" style="background:rgba(62,207,142,.14);color:var(--lantas);">📈</div><div><div class="num">82.4</div><div class="lbl">Rata-rata Skor OBE</div></div></div>
        <div class="card stat"><div class="ic" style="background:rgba(245,183,74,.14);color:var(--intel);">📝</div><div><div class="num">346</div><div class="lbl">Soal di Bank</div></div></div>
        <div class="card stat"><div class="ic" style="background:rgba(169,133,240,.14);color:var(--binmas);">🎓</div><div><div class="num">19</div><div class="lbl">Sertifikasi Bulan Ini</div></div></div>
      </div>
      <div class="section-title"><h3>Kompetensi di Bawah Target</h3><span>Perlu perhatian Gadik</span></div>
      <div class="card">
        <div class="list">
          <div class="list-item"><span class="l"><span class="badge tag-lantas">Lantas</span> Penerapan Pasal — 54% dari target 70%</span><span class="r">18 siswa</span></div>
          <div class="list-item"><span class="l"><span class="badge tag-reserse">Reserse</span> Prosedur Olah TKP — 61% dari target 70%</span><span class="r">9 siswa</span></div>
        </div>
        <div class="notebar"><b>Saran sistem:</b> tambahkan materi & soal baru untuk kedua unit ini agar loop continuous improvement tertutup.</div>
      </div>
    </div>
  `,
  styles: []
})
export class GadikDashboardComponent {

}
