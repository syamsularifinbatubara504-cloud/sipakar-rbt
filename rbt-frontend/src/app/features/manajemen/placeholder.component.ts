import { Component } from '@angular/core';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  template: `
    <div class="page active">
      <div class="pagehead">
        <div>
          <span class="eyebrow">Work in Progress</span>
          <h2>Halaman Fitur Manajemen</h2>
          <p>Fitur ini sedang dalam tahap pengembangan sesuai dengan desain referensi.</p>
        </div>
      </div>
    </div>
  `
})
export class PlaceholderComponent {}
