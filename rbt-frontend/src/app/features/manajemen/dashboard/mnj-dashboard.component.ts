import { Component } from '@angular/core';

@Component({
  selector: 'app-mnj-dashboard',
  standalone: true,
  imports: [],
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
        <div class="card stat"><div class="ic" style="background:rgba(59,130,246,.14);color:var(--accent-a);">🧑‍💼</div><div><div class="num">214</div><div class="lbl">Total Akun</div></div></div>
        <div class="card stat"><div class="ic" style="background:rgba(245,183,74,.14);color:var(--intel);">📚</div><div><div class="num">346</div><div class="lbl">Soal Terverifikasi</div></div></div>
        <div class="card stat"><div class="ic" style="background:rgba(62,207,142,.14);color:var(--lantas);">🔌</div><div><div class="num">2/2</div><div class="lbl">Integrasi API Aktif</div></div></div>
      </div>
    </div>
  `,
  styles: []
})
export class MnjDashboardComponent {

}
