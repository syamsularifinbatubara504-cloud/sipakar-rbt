import { Component, OnInit, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface CertApplication {
  id: number;
  siswa_id: number;
  siswa_name: string;
  siswa_email: string;
  siswa_nrp: string;
  siswa_jabatan: string;
  unit_spesialisasi: string;
  syarat_terpenuhi: number;
  total_syarat: number;
  status: 'pending' | 'issued' | 'rejected';
  cert_number?: string;
  created_at: string;
}

interface TextFieldPos {
  x: number;          // Position X in % (0 to 100)
  y: number;          // Position Y in % (0 to 100)
  fontSize: number;   // Font size in px
  color: string;      // Color hex string
  fontWeight: string; // 'bold' | 'normal'
  align: 'left' | 'center' | 'right';
  text: string;       // Custom text content
}

interface TemplatePositions {
  nama: TextFieldPos;
  nrp: TextFieldPos;
  jabatan: TextFieldPos;
  spesialisasi: TextFieldPos;
}

@Component({
  selector: 'app-gadik-sertifikasi',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page active">
      <div class="pagehead">
        <div>
          <span class="eyebrow">SERTIFIKASI & OTENTIKASI</span>
          <h1>Manajemen Sertifikasi & Template Design</h1>
          <p class="page-desc">Review pengajuan sertifikat siswa, upload template sertifikat PNG, dan atur posisi custom Nama, NRP, dan Jabatan.</p>
        </div>
        <div class="head-actions">
          <button class="btn-template-designer" (click)="openTemplateDesigner()">
            🎨 Atur Template PNG & Posisi Teks
          </button>
        </div>
      </div>

      <!-- Stats Summary Cards -->
      <div class="stats-row">
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background: rgba(16,185,129,0.15); color: #10b981;">🏆</div>
          <div class="stat-info">
            <span class="stat-val">{{ issuedCount() }}</span>
            <span class="stat-label">Sertifikat Terbit</span>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-icon" style="background: rgba(245,158,11,0.15); color: #f59e0b;">⏳</div>
          <div class="stat-info">
            <span class="stat-val">{{ pendingCount() }}</span>
            <span class="stat-label">Menunggu Review</span>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-icon" style="background: rgba(59,130,246,0.15); color: #3b82f6;">📄</div>
          <div class="stat-info">
            <span class="stat-val">{{ certList().length }}</span>
            <span class="stat-label">Total Pengajuan</span>
          </div>
        </div>
      </div>

      <!-- Main Certifications Management Table -->
      <div class="glass-card table-card">
        <div class="table-header-row">
          <div>
            <h3>Daftar Pengajuan Sertifikat Siswa Prolat</h3>
            <p class="sub-text">Klik persetujuan untuk menerbitkan sertifikat dengan tata letak template PNG yang dikustomisasi.</p>
          </div>
          <button class="btn-refresh" (click)="loadCertifications()">🔄 Refresh Data</button>
        </div>

        @if (loading()) {
          <div class="center-state">Memuat data pengajuan sertifikasi...</div>
        } @else if (certList().length === 0) {
          <div class="center-state">
            <div style="font-size: 3rem; margin-bottom: 0.75rem;">🏆</div>
            <h3>Belum Ada Pengajuan Sertifikasi</h3>
            <p style="color: var(--color-text-secondary); margin-top: 0.5rem; max-width: 450px; margin-left: auto; margin-right: auto;">
              Pengajuan akan otomatis muncul di sini setelah siswa menekan tombol "Ajukan Sertifikat" di dashboard siswa.
            </p>
            <button class="btn-primary" (click)="createDemoApplication()" style="margin-top: 1rem;">
              ➕ Buat 1 Demo Pengajuan Siswa
            </button>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Siswa & NRP</th>
                  <th>Jabatan / Unit</th>
                  <th>Spesialisasi</th>
                  <th>Syarat</th>
                  <th>Status</th>
                  <th>Nomor Sertifikat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                @for (item of certList(); track item.id; let i = $index) {
                  <tr>
                    <td>{{ i + 1 }}</td>
                    <td>
                      <div class="user-meta">
                        <strong class="user-name">{{ item.siswa_name || 'Siswa Prolat' }}</strong>
                        <span class="user-sub">{{ item.siswa_nrp || 'NRP-7492041' }}</span>
                      </div>
                    </td>
                    <td>{{ item.siswa_jabatan || 'Bintara Remaja' }}</td>
                    <td><span class="badge badge-spec">{{ item.unit_spesialisasi || 'Sabhara' }}</span></td>
                    <td>
                      <span class="badge badge-syarat">✅ {{ item.syarat_terpenuhi || 5 }}/5 Syarat</span>
                    </td>
                    <td>
                      <span 
                        class="badge" 
                        [class.badge-pending]="item.status === 'pending'"
                        [class.badge-issued]="item.status === 'issued'"
                        [class.badge-rejected]="item.status === 'rejected'"
                      >
                        {{ item.status === 'pending' ? '⏳ Menunggu Review' : (item.status === 'issued' ? '✅ Terbit' : '❌ Ditolak') }}
                      </span>
                    </td>
                    <td>
                      @if (item.cert_number) {
                        <code>{{ item.cert_number }}</code>
                      } @else {
                        <span class="text-muted">- Belum Diterbitkan -</span>
                      }
                    </td>
                    <td>
                      <div class="action-btn-group">
                        <button class="btn-action btn-preview" (click)="previewCert(item)" title="Pratinjau Sertifikat">
                          👁️ Preview
                        </button>
                        @if (item.status === 'pending') {
                          <button class="btn-action btn-approve" (click)="approveCert(item)" title="Approve Sertifikat">
                            ✅ Approve
                          </button>
                          <button class="btn-action btn-reject" (click)="rejectCert(item)" title="Tolak Pengajuan">
                            ❌
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- ================= MODAL 1: TEMPLATE PNG DESIGNER & POSITIONS ================= -->
      @if (showDesignerModal()) {
        <div class="modal-backdrop" (click)="closeTemplateDesigner()">
          <div class="modal-card designer-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2>🎨 Designer Template & Posisi Teks Sertifikat (PNG)</h2>
                <p class="modal-sub">Unggah background sertifikat PNG dan geser slider posisi X & Y untuk penataan Nama, NRP, dan Jabatan.</p>
              </div>
              <button class="btn-close" (click)="closeTemplateDesigner()">✕</button>
            </div>

            <div class="designer-body">
              <!-- Left Side: Live Preview Canvas -->
              <div class="preview-column">
                <div class="canvas-wrapper">
                  <div 
                    class="cert-preview-box" 
                    #certBox
                    [style.backgroundImage]="'url(' + currentTemplateUrl() + ')'"
                  >
                    <!-- Text Overlay Elements -->
                    <div 
                      class="text-overlay item-nama" 
                      [style.left.%]="positions.nama.x" 
                      [style.top.%]="positions.nama.y"
                      [style.fontSize.px]="positions.nama.fontSize"
                      [style.color]="positions.nama.color"
                      [style.fontWeight]="positions.nama.fontWeight"
                      [style.textAlign]="positions.nama.align"
                      [class.active-target]="activeField() === 'nama'"
                      (click)="setActiveField('nama')"
                    >
                      {{ positions.nama.text || 'BRIPDA AHMAD SUBAGJA, S.H.' }}
                    </div>

                    <div 
                      class="text-overlay item-nrp" 
                      [style.left.%]="positions.nrp.x" 
                      [style.top.%]="positions.nrp.y"
                      [style.fontSize.px]="positions.nrp.fontSize"
                      [style.color]="positions.nrp.color"
                      [style.fontWeight]="positions.nrp.fontWeight"
                      [style.textAlign]="positions.nrp.align"
                      [class.active-target]="activeField() === 'nrp'"
                      (click)="setActiveField('nrp')"
                    >
                      {{ positions.nrp.text || 'NRP. 98041289 / POLDA SUMUT' }}
                    </div>

                    <div 
                      class="text-overlay item-jabatan" 
                      [style.left.%]="positions.jabatan.x" 
                      [style.top.%]="positions.jabatan.y"
                      [style.fontSize.px]="positions.jabatan.fontSize"
                      [style.color]="positions.jabatan.color"
                      [style.fontWeight]="positions.jabatan.fontWeight"
                      [style.textAlign]="positions.jabatan.align"
                      [class.active-target]="activeField() === 'jabatan'"
                      (click)="setActiveField('jabatan')"
                    >
                      {{ positions.jabatan.text || 'BINTARA REMOJA SPN POLDA SUMUT' }}
                    </div>

                    <div 
                      class="text-overlay item-spec" 
                      [style.left.%]="positions.spesialisasi.x" 
                      [style.top.%]="positions.spesialisasi.y"
                      [style.fontSize.px]="positions.spesialisasi.fontSize"
                      [style.color]="positions.spesialisasi.color"
                      [style.fontWeight]="positions.spesialisasi.fontWeight"
                      [style.textAlign]="positions.spesialisasi.align"
                      [class.active-target]="activeField() === 'spesialisasi'"
                      (click)="setActiveField('spesialisasi')"
                    >
                      {{ positions.spesialisasi.text || 'PELATIHAN RBT SPESIALISASI SABHARA' }}
                    </div>
                  </div>
                </div>

                <!-- Template Upload Box -->
                <div class="upload-template-row">
                  <input type="file" #fileInput (change)="onFileSelected($event)" accept="image/png, image/jpeg" style="display: none;">
                  <button class="btn-upload" (click)="fileInput.click()">
                    📤 Upload Gambar Template PNG Baru
                  </button>
                  <span class="upload-hint">Format yang disarankan: PNG High Resolution Landscape (1920x1080)</span>
                </div>
              </div>

              <!-- Right Side: Controls Panel -->
              <div class="controls-column">
                <div class="field-selector-tabs">
                  <button class="field-tab" [class.active]="activeField() === 'nama'" (click)="setActiveField('nama')">
                    👤 Nama Siswa
                  </button>
                  <button class="field-tab" [class.active]="activeField() === 'nrp'" (click)="setActiveField('nrp')">
                    🪪 NRP
                  </button>
                  <button class="field-tab" [class.active]="activeField() === 'jabatan'" (click)="setActiveField('jabatan')">
                    🎖️ Jabatan
                  </button>
                  <button class="field-tab" [class.active]="activeField() === 'spesialisasi'" (click)="setActiveField('spesialisasi')">
                    🎓 Pendidikan
                  </button>
                </div>

                <div class="controls-card glass-card">
                  <h4 class="ctrl-title">Pengaturan Posisi & Format: <u>{{ activeFieldLabel() }}</u></h4>

                  <!-- Custom Text Input -->
                  <div class="control-group">
                    <span class="ctrl-sublabel">✏️ Isi Teks Custom</span>
                    <input 
                      type="text" 
                      [(ngModel)]="getActiveTarget().text" 
                      placeholder="Masukkan teks custom di sini..." 
                      class="text-input-field" 
                    />
                  </div>

                  <!-- Slider X -->
                  <div class="control-group">
                    <div class="ctrl-label-row">
                      <span>Posisi Horisontal X (% Lebar)</span>
                      <strong>{{ getActiveTarget().x }}%</strong>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="0.5" 
                      [(ngModel)]="getActiveTarget().x" 
                      class="slider-input"
                    />
                  </div>

                  <!-- Slider Y -->
                  <div class="control-group">
                    <div class="ctrl-label-row">
                      <span>Posisi Vertikal Y (% Tinggi)</span>
                      <strong>{{ getActiveTarget().y }}%</strong>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="0.5" 
                      [(ngModel)]="getActiveTarget().y" 
                      class="slider-input"
                    />
                  </div>

                  <!-- Font Size -->
                  <div class="control-group">
                    <div class="ctrl-label-row">
                      <span>Ukuran Font (px)</span>
                      <strong>{{ getActiveTarget().fontSize }}px</strong>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="60" 
                      step="1" 
                      [(ngModel)]="getActiveTarget().fontSize" 
                      class="slider-input"
                    />
                  </div>

                  <!-- Color & Align -->
                  <div class="control-row">
                    <div class="control-group flex-1">
                      <span class="ctrl-sublabel">Warna Teks</span>
                      <div class="color-picker-wrap">
                        <input type="color" [(ngModel)]="getActiveTarget().color" class="color-box" />
                        <code>{{ getActiveTarget().color }}</code>
                      </div>
                    </div>

                    <div class="control-group flex-1">
                      <span class="ctrl-sublabel">Font Weight</span>
                      <select [(ngModel)]="getActiveTarget().fontWeight" class="select-input">
                        <option value="bold">Bold (Tebal)</option>
                        <option value="semibold">Semibold</option>
                        <option value="normal">Normal</option>
                      </select>
                    </div>
                  </div>

                  <!-- Preset Quick Buttons -->
                  <div class="preset-buttons-row">
                    <button class="btn-preset" (click)="alignCenter()">🎯 Ratakan Tengah (X = 50%)</button>
                  </div>
                </div>

                <div class="designer-modal-footer">
                  <button class="btn-save-template" (click)="saveTemplatePositions()">
                    💾 Simpan Tata Letak & Posisi Teks
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ================= MODAL 2: CERTIFICATE PREVIEW MODAL ================= -->
      @if (selectedPreviewItem()) {
        <div class="modal-backdrop" (click)="closePreview()">
          <div class="modal-card preview-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2>📜 Pratinjau Sertifikat Kelulusan</h2>
                <p class="modal-sub">Sertifikat resmi untuk: <strong>{{ selectedPreviewItem()?.siswa_name }}</strong> ({{ selectedPreviewItem()?.siswa_nrp }})</p>
              </div>
              <button class="btn-close" (click)="closePreview()">✕</button>
            </div>

            <div class="preview-modal-body">
              <div 
                class="cert-preview-box render-box" 
                [style.backgroundImage]="'url(' + currentTemplateUrl() + ')'"
              >
                <div 
                  class="text-overlay" 
                  [style.left.%]="positions.nama.x" 
                  [style.top.%]="positions.nama.y"
                  [style.fontSize.px]="positions.nama.fontSize"
                  [style.color]="positions.nama.color"
                  [style.fontWeight]="positions.nama.fontWeight"
                  [style.textAlign]="positions.nama.align"
                >
                  {{ selectedPreviewItem()?.siswa_name | uppercase }}
                </div>

                <div 
                  class="text-overlay" 
                  [style.left.%]="positions.nrp.x" 
                  [style.top.%]="positions.nrp.y"
                  [style.fontSize.px]="positions.nrp.fontSize"
                  [style.color]="positions.nrp.color"
                  [style.fontWeight]="positions.nrp.fontWeight"
                  [style.textAlign]="positions.nrp.align"
                >
                  {{ selectedPreviewItem()?.siswa_nrp }} / POLDA SUMUT
                </div>

                <div 
                  class="text-overlay" 
                  [style.left.%]="positions.jabatan.x" 
                  [style.top.%]="positions.jabatan.y"
                  [style.fontSize.px]="positions.jabatan.fontSize"
                  [style.color]="positions.jabatan.color"
                  [style.fontWeight]="positions.jabatan.fontWeight"
                  [style.textAlign]="positions.jabatan.align"
                >
                  {{ selectedPreviewItem()?.siswa_jabatan | uppercase }}
                </div>

                <div 
                  class="text-overlay" 
                  [style.left.%]="positions.spesialisasi.x" 
                  [style.top.%]="positions.spesialisasi.y"
                  [style.fontSize.px]="positions.spesialisasi.fontSize"
                  [style.color]="positions.spesialisasi.color"
                  [style.fontWeight]="positions.spesialisasi.fontWeight"
                  [style.textAlign]="positions.spesialisasi.align"
                >
                  PELATIHAN RBT SPESIALISASI {{ selectedPreviewItem()?.unit_spesialisasi | uppercase }}
                </div>
              </div>
            </div>

            <div class="modal-footer">
              @if (selectedPreviewItem()?.status === 'pending') {
                <button class="btn-approve" (click)="approveCert(selectedPreviewItem()!); closePreview();">
                  ✅ Approve & Terbitkan Sertifikat Ini
                </button>
              }
              <button class="btn-secondary" (click)="closePreview()">Tutup</button>
            </div>
          </div>
        </div>
      }

      @if (toast()) {
        <div class="toast" [class.toast-success]="toastType()==='success'" [class.toast-error]="toastType()==='error'">{{ toast() }}</div>
      }
    </div>
  `,
  styles: [`
    .pagehead { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .btn-template-designer { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: #fff; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 800; font-size: 0.875rem; cursor: pointer; box-shadow: 0 4px 15px rgba(139,92,246,0.3); transition: all 0.2s; }
    .btn-template-designer:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(139,92,246,0.4); }

    /* Stats Row */
    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .stat-card { display: flex; align-items: center; gap: 1rem; padding: 1.25rem; }
    .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-val { font-size: 1.5rem; font-weight: 800; }
    .stat-label { font-size: 0.75rem; color: var(--color-text-secondary); }

    /* Table Card */
    .table-card { padding: 1.5rem; }
    .table-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem; }
    .table-header-row h3 { font-size: 1.125rem; font-weight: 800; margin: 0 0 0.25rem 0; }
    .sub-text { font-size: 0.8125rem; color: var(--color-text-secondary); margin: 0; }
    .btn-refresh { background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: var(--color-text-primary); padding: 6px 14px; border-radius: 8px; font-size: 0.8125rem; font-weight: 700; cursor: pointer; }

    .center-state { padding: 3rem; text-align: center; color: var(--color-text-secondary); }
    .btn-primary { background: var(--gradient-primary); color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; cursor: pointer; }

    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem; }
    .data-table th { padding: 12px 16px; background: rgba(255,255,255,0.03); color: var(--color-text-secondary); font-weight: 700; font-size: 0.75rem; text-transform: uppercase; border-bottom: 1px solid var(--border-color); }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--color-text-primary); vertical-align: middle; }
    .data-table tr:hover td { background: rgba(255,255,255,0.02); }

    .user-meta { display: flex; flex-direction: column; }
    .user-name { font-weight: 700; color: var(--color-text-primary); }
    .user-sub { font-size: 0.75rem; color: var(--color-text-secondary); }

    .badge { padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; }
    .badge-spec { background: rgba(59,130,246,0.15); color: #60a5fa; }
    .badge-syarat { background: rgba(16,185,129,0.15); color: #10b981; }
    .badge-pending { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }
    .badge-issued { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
    .badge-rejected { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
    .text-muted { color: var(--color-text-secondary); font-size: 0.8125rem; font-style: italic; }

    .action-btn-group { display: flex; gap: 0.375rem; }
    .btn-action { padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; }
    .btn-preview { background: rgba(59,130,246,0.15); color: #60a5fa; border: 1px solid rgba(59,130,246,0.3); }
    .btn-preview:hover { background: #3b82f6; color: #fff; }
    .btn-approve { background: #10b981; color: #fff; }
    .btn-approve:hover { background: #059669; }
    .btn-reject { background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid #ef4444; }

    /* Modal Backdrop & Container */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1.5rem; }
    .modal-card { background: #0f172a; border: 1px solid var(--border-color); border-radius: 16px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.7); display: flex; flex-direction: column; }
    .designer-modal { max-width: 1100px; }
    .preview-modal { max-width: 800px; }
    .modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: flex-start; }
    .modal-header h2 { font-size: 1.125rem; font-weight: 800; margin: 0 0 0.25rem 0; }
    .modal-sub { font-size: 0.8125rem; color: var(--color-text-secondary); margin: 0; }
    .btn-close { background: transparent; border: none; color: var(--color-text-secondary); font-size: 1.25rem; cursor: pointer; }

    .designer-body { display: grid; grid-template-columns: 1fr 340px; gap: 1.5rem; padding: 1.5rem; }
    @media (max-width: 900px) { .designer-body { grid-template-columns: 1fr; } }

    /* Canvas Box */
    .canvas-wrapper { border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; background: #000; position: relative; }
    .cert-preview-box { width: 100%; aspect-ratio: 16 / 9; background-size: cover; background-position: center; position: relative; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .render-box { border-radius: 12px; border: 1px solid var(--border-color); }

    /* Overlay Texts */
    .text-overlay { position: absolute; transform: translate(-50%, -50%); white-space: nowrap; cursor: pointer; user-select: none; transition: box-shadow 0.2s, outline 0.2s; font-family: 'Times New Roman', serif; letter-spacing: 0.03em; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }
    .text-overlay.active-target { outline: 2px dashed #fbbf24; outline-offset: 4px; border-radius: 4px; }

    .upload-template-row { display: flex; align-items: center; gap: 1rem; margin-top: 1rem; flex-wrap: wrap; }
    .btn-upload { background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: var(--color-text-primary); padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 0.8125rem; cursor: pointer; }
    .upload-hint { font-size: 0.75rem; color: var(--color-text-secondary); }

    /* Controls Panel */
    .controls-column { display: flex; flex-direction: column; gap: 1rem; }
    .field-selector-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 0.375rem; }
    .field-tab { background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); color: var(--color-text-secondary); padding: 8px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; cursor: pointer; text-align: center; }
    .field-tab.active { background: var(--gradient-primary); color: #fff; border-color: transparent; }

    .controls-card { padding: 1.25rem; }
    .ctrl-title { font-size: 0.875rem; font-weight: 800; color: #fbbf24; margin: 0 0 1rem 0; }
    .control-group { margin-bottom: 1rem; }
    .ctrl-label-row { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 0.375rem; }
    .slider-input { width: 100%; accent-color: #3b82f6; cursor: pointer; }
    .ctrl-sublabel { font-size: 0.75rem; color: var(--color-text-secondary); display: block; margin-bottom: 0.375rem; }
    .text-input-field { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; padding: 8px 12px; border-radius: 8px; font-size: 0.8125rem; font-family: var(--font-body); outline: none; transition: border-color 0.2s; }
    .text-input-field:focus { border-color: #3b82f6; }

    .control-row { display: flex; gap: 0.75rem; }
    .flex-1 { flex: 1; }
    .color-picker-wrap { display: flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-color); }
    .color-box { border: none; width: 28px; height: 28px; background: transparent; cursor: pointer; }
    .select-input { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; padding: 6px; border-radius: 6px; font-size: 0.75rem; }

    .preset-buttons-row { margin-top: 0.5rem; }
    .btn-preset { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--color-text-primary); padding: 6px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer; }

    .btn-save-template { width: 100%; background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; padding: 12px; border-radius: 10px; font-weight: 800; font-size: 0.875rem; cursor: pointer; box-shadow: 0 4px 15px rgba(16,185,129,0.3); }
    
    .preview-modal-body { padding: 1.5rem; }
    .modal-footer { padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 0.75rem; }
    .btn-secondary { background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: #fff; padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; }

    .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 0.75rem 1.5rem; border-radius: 10px; font-size: 0.875rem; font-weight: 600; z-index: 10000; }
    .toast-success { background: rgba(16,185,129,0.9); color: #fff; }
    .toast-error { background: rgba(239,68,68,0.9); color: #fff; }
  `]
})
export class GadikSertifikasiComponent implements OnInit {
  certList = signal<CertApplication[]>([]);
  loading = signal(true);
  showDesignerModal = signal(false);
  selectedPreviewItem = signal<CertApplication | null>(null);
  
  toast = signal('');
  toastType = signal<'success'|'error'>('success');

  // Background PNG template URL
  currentTemplateUrl = signal<string>('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1200&auto=format&fit=crop');

  // Target Field for Positioning Slider Settings
  activeField = signal<'nama' | 'nrp' | 'jabatan' | 'spesialisasi'>('nama');

  // Interactive Text Positions Coordinates & Styling Settings
  positions: TemplatePositions = {
    nama: { x: 50, y: 44, fontSize: 30, color: '#0f172a', fontWeight: 'bold', align: 'center', text: '' },
    nrp: { x: 50, y: 52, fontSize: 18, color: '#334155', fontWeight: 'normal', align: 'center', text: '' },
    jabatan: { x: 50, y: 60, fontSize: 20, color: '#b45309', fontWeight: 'semibold', align: 'center', text: '' },
    spesialisasi: { x: 50, y: 68, fontSize: 22, color: '#1e40af', fontWeight: 'bold', align: 'center', text: '' }
  };

  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadCertifications();
    this.loadTemplateConfig();
  }

  loadCertifications() {
    this.loading.set(true);
    const token = sessionStorage.getItem('rbt_token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.get<any>(`${this.api}/certifications`, { headers }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.certList.set(res.data);
        }
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadTemplateConfig() {
    const token = sessionStorage.getItem('rbt_token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.get<any>(`${this.api}/certifications/template`, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          if (res.data.template_url) {
            this.currentTemplateUrl.set(res.data.template_url);
          }
          if (res.data.positions) {
            this.positions = res.data.positions;
          }
        }
      }
    });
  }

  issuedCount(): number {
    return this.certList().filter(c => c.status === 'issued').length;
  }

  pendingCount(): number {
    return this.certList().filter(c => c.status === 'pending').length;
  }

  // ================= TEMPLATE DESIGNER & POSITIONS =================
  openTemplateDesigner() {
    this.showDesignerModal.set(true);
  }

  closeTemplateDesigner() {
    this.showDesignerModal.set(false);
  }

  setActiveField(field: 'nama' | 'nrp' | 'jabatan' | 'spesialisasi') {
    this.activeField.set(field);
  }

  activeFieldLabel(): string {
    const map = {
      nama: '👤 Nama Siswa',
      nrp: '🪪 Nomor NRP',
      jabatan: '🎖️ Jabatan / Instansi',
      spesialisasi: '🎓 Jenis Pendidikan'
    };
    return map[this.activeField()];
  }

  getActiveTarget(): TextFieldPos {
    return this.positions[this.activeField()];
  }

  alignCenter() {
    this.getActiveTarget().x = 50;
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const token = sessionStorage.getItem('rbt_token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.post<any>(`${this.api}/certifications/upload-template`, formData, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data?.template_url) {
          this.currentTemplateUrl.set(res.data.template_url);
          this.msg('Gambar template sertifikat PNG berhasil diunggah!', 'success');
        }
      },
      error: (err) => {
        this.msg(err.error?.message || 'Gagal mengunggah template.', 'error');
      }
    });
  }

  saveTemplatePositions() {
    const token = sessionStorage.getItem('rbt_token');
    const headers = { Authorization: `Bearer ${token}` };

    const body = {
      template_url: this.currentTemplateUrl(),
      positions: this.positions
    };

    this.http.post<any>(`${this.api}/certifications/save-template`, body, { headers }).subscribe({
      next: (res) => {
        this.msg('Posisi tata letak Nama, NRP & Jabatan berhasil disimpan!', 'success');
        this.closeTemplateDesigner();
      },
      error: () => {
        this.msg('Gagal menyimpan posisi template.', 'error');
      }
    });
  }

  // ================= APPROVAL & PREVIEW =================
  previewCert(item: CertApplication) {
    this.selectedPreviewItem.set(item);
  }

  closePreview() {
    this.selectedPreviewItem.set(null);
  }

  approveCert(item: CertApplication) {
    const token = sessionStorage.getItem('rbt_token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.put<any>(`${this.api}/certifications/${item.id}/approve`, {}, { headers }).subscribe({
      next: (res) => {
        this.msg(`Sertifikat ${item.siswa_name} BERHASIL disetujui & diterbitkan!`, 'success');
        this.loadCertifications();
      },
      error: (err) => {
        this.msg(err.error?.message || 'Gagal menyetujui pengajuan sertifikat.', 'error');
      }
    });
  }

  rejectCert(item: CertApplication) {
    const token = sessionStorage.getItem('rbt_token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.put<any>(`${this.api}/certifications/${item.id}/reject`, {}, { headers }).subscribe({
      next: () => {
        this.msg('Pengajuan sertifikat ditolak.', 'error');
        this.loadCertifications();
      },
      error: () => {
        this.msg('Gagal menolak pengajuan sertifikat.', 'error');
      }
    });
  }

  createDemoApplication() {
    const token = sessionStorage.getItem('rbt_token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.post<any>(`${this.api}/certifications/apply`, { unit_spesialisasi: 'Sabhara', is_demo: true }, { headers }).subscribe({
      next: (res) => {
        this.msg(res.message || 'Demo pengajuan sertifikat siswa berhasil dibuat!', 'success');
        this.loadCertifications();
      },
      error: (err) => {
        this.msg(err.error?.message || 'Gagal membuat demo pengajuan.', 'error');
      }
    });
  }

  private msg(m: string, t: 'success'|'error') { this.toast.set(m); this.toastType.set(t); setTimeout(() => this.toast.set(''), 4000); }
}
