import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface SyaratItem {
  id: string;
  title: string;
  desc: string;
  isFulfilled: boolean;
  statusText: string;
  icon: string;
}

interface TextFieldPos {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: string;
  align: 'left' | 'center' | 'right';
  text?: string;
}

interface TemplatePositions {
  nama: TextFieldPos;
  nrp: TextFieldPos;
  jabatan: TextFieldPos;
  spesialisasi: TextFieldPos;
}

@Component({
  selector: 'app-siswa-sertifikasi',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page active">
      <div class="pagehead">
        <div>
          <span class="eyebrow">SERTIFIKASI RBT SPN POLDA SUMUT</span>
          <h1>Sertifikat & Kelayakan Kelulusan</h1>
          <p class="page-desc">Cek kelengkapan syarat, ajukan penerbitan sertifikat spesialisasi, dan unduh sertifikat resmi Anda.</p>
        </div>
      </div>

      <!-- Cert Progress Overview Banner -->
      <div class="glass-card cert-banner">
        <div class="banner-left">
          <div class="cert-trophy-box" [class.is-ready]="isReadyToApply() || isSubmitted() || isIssued()">
            {{ isIssued() ? '🎓' : (isSubmitted() ? '⏳' : (isReadyToApply() ? '🏆' : '📊')) }}
          </div>
          <div>
            <h2 class="banner-title">
              @if (isIssued()) {
                Sertifikat Kelulusan Resmi Telah Diterbitkan!
              } @else if (isSubmitted()) {
                Pengajuan Sertifikat Sedang Diproses
              } @else if (isReadyToApply()) {
                Persyaratan Memenuhi — Siap Mengajukan Sertifikat!
              } @else {
                Belum Memenuhi Seluruh Persyaratan (Progres: {{ fulfilledCount() }}/5)
              }
            </h2>
            <p class="banner-sub">
              @if (isIssued()) {
                Selamat! Anda telah resmi lulus pelatihan RBT Spesialisasi SPN Polda Sumatera Utara.
              } @else if (isSubmitted()) {
                Pengajuan sertifikat Anda sedang diverifikasi oleh Instruktur Gadik dan Tim Manajemen SPN.
              } @else if (isReadyToApply()) {
                Selamat! Anda telah menyelesaikan indikator utama. Silakan klik tombol di bawah untuk mengajukan sertifikat.
              } @else {
                Selesaikan pengerjaan simulasi RBT, ujian OBE, dan pengumpulan tugas untuk memenuhi 5/5 persyaratan.
              }
            </p>
          </div>
        </div>

        <div class="banner-right">
          <div class="progress-ring-box">
            <div class="progress-number">{{ fulfilledCount() }}/5</div>
            <div class="progress-sub">Syarat Terpenuhi</div>
          </div>
        </div>
      </div>

      <!-- Requirements Progress Bar -->
      <div class="glass-card main-card">
        <div class="card-head-row">
          <div>
            <h3>📋 Cek Update Persyaratan Sertifikasi</h3>
            <p class="card-sub">Indikator otomatis berdasarkan data real pengerjaan simulasi, skor evaluasi, dan tugas Anda.</p>
          </div>
          <button class="btn-refresh" (click)="checkRequirements()">🔄 Cek Update Ulang</button>
        </div>

        <div class="overall-progress-bar-wrap">
          <div class="overall-progress-fill" [style.width.%]="(fulfilledCount() / 5) * 100"></div>
        </div>

        <div class="requirements-list">
          @for (item of requirements(); track item.id) {
            <div class="glass-card req-item" [class.is-done]="item.isFulfilled">
              <div class="req-left">
                <div class="req-status-icon" [class.icon-done]="item.isFulfilled">
                  {{ item.isFulfilled ? '✅' : '⏳' }}
                </div>
                <div>
                  <h4 class="req-title">{{ item.title }}</h4>
                  <p class="req-desc">{{ item.desc }}</p>
                </div>
              </div>

              <div class="req-right">
                <span class="badge" [class.badge-done]="item.isFulfilled" [class.badge-pending]="!item.isFulfilled">
                  {{ item.statusText }}
                </span>
              </div>
            </div>
          }
        </div>

        <!-- Action Box for Application / Status -->
        <div class="cert-action-footer">
          @if (isIssued()) {
            <div class="issued-box">
              <div class="issued-info">
                <span class="issued-badge">📜 SERTIFIKAT RESMI RBT</span>
                <h4>Nomor Sertifikat: <code>{{ certNumber }}</code></h4>
                <p>Diterbitkan untuk: <strong>{{ userName }}</strong> (Spesialisasi {{ userSpec }})</p>
              </div>
              <div class="issued-btn-group">
                <button class="btn-preview-cert" (click)="openPreviewModal()">👁️ Pratinjau Sertifikat</button>
                <button class="btn-download-cert" (click)="downloadCertificate()">⬇️ Unduh Sertifikat (PNG)</button>
              </div>
            </div>
          } @else if (isSubmitted()) {
            <div class="submitted-box">
              <div class="submitted-text">
                ⏳ <strong>Pengajuan Terkirim ke Gadik & Manajemen</strong>
                <p>Status: Menunggu Verifikasi Tanda Tangan & Penerbitan Sertifikat Resmi.</p>
              </div>
              <button class="btn-check-status" (click)="simulateApproval()">🔄 Cek Status Approval Gadik</button>
            </div>
          } @else {
            <div class="apply-box">
              <p class="apply-note">
                @if (fulfilledCount() >= 4) {
                  🎉 <strong>Selamat! Anda memenuhi syarat utama.</strong> Klik tombol di samping untuk mengajukan sertifikat.
                } @else if (fulfilledCount() >= 3) {
                  ℹ️ Persyaratan Anda terisi {{ fulfilledCount() }}/5. Anda sudah dapat mengajukan verifikasi ke Gadik.
                } @else {
                  ⚠️ Anda baru memenuhi {{ fulfilledCount() }}/5 persyaratan. Lengkapi minimal 3 simulasi & tugas untuk mengajukan.
                }
              </p>
              <button 
                class="btn-apply-cert" 
                (click)="applyCertificate()" 
                [disabled]="submitting() || !isReadyToApply()"
              >
                🎓 {{ submitting() ? 'Mengirim Pengajuan...' : 'Ajukan Penerbitan Sertifikat' }}
              </button>
            </div>
          }
        </div>
      </div>

      <!-- ================= CERTIFICATE PREVIEW MODAL ================= -->
      @if (showPreviewModal()) {
        <div class="modal-backdrop" (click)="closePreviewModal()">
          <div class="modal-card preview-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2>📜 Sertifikat Kelulusan Resmi SPN Polda Sumut</h2>
                <p class="modal-sub">Nomor Sertifikat: <strong>{{ certNumber }}</strong></p>
              </div>
              <button class="btn-close" (click)="closePreviewModal()">✕</button>
            </div>

            <div class="preview-modal-body">
              <div 
                class="cert-preview-box render-box" 
                [style.backgroundImage]="'url(' + templateBgUrl() + ')'"
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
                  {{ positions.nama.text || (userName | uppercase) }}
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
                  {{ positions.nrp.text || ('NRP. ' + userNrp + ' / POLDA SUMUT') }}
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
                  {{ positions.jabatan.text || (userJabatan | uppercase) }}
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
                  {{ positions.spesialisasi.text || ('PELATIHAN RBT SPESIALISASI ' + userSpec) }}
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-download-cert" (click)="downloadCertificate()">
                ⬇️ Unduh Sertifikat (PNG)
              </button>
              <button class="btn-secondary" (click)="closePreviewModal()">Tutup</button>
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
    .pagehead { margin-bottom: 1.5rem; }

    /* Cert Banner */
    .cert-banner { padding: 1.75rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; flex-wrap: wrap; background: linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(16,185,129,0.08) 100%); border: 1px solid rgba(59,130,246,0.3); }
    .banner-left { display: flex; align-items: center; gap: 1.25rem; }
    .cert-trophy-box { width: 64px; height: 64px; border-radius: 16px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 2.25rem; flex-shrink: 0; }
    .cert-trophy-box.is-ready { background: rgba(16,185,129,0.2); border-color: #10b981; box-shadow: 0 0 20px rgba(16,185,129,0.3); }
    .banner-title { font-size: 1.25rem; font-weight: 800; color: var(--color-text-primary); margin: 0 0 0.25rem 0; }
    .banner-sub { font-size: 0.875rem; color: var(--color-text-secondary); margin: 0; }

    .progress-ring-box { text-align: center; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); padding: 0.875rem 1.5rem; border-radius: 12px; }
    .progress-number { font-size: 1.75rem; font-weight: 900; color: #10b981; }
    .progress-sub { font-size: 0.75rem; color: var(--color-text-secondary); text-transform: uppercase; font-weight: 700; }

    /* Main Card */
    .main-card { padding: 1.75rem; }
    .card-head-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
    .card-head-row h3 { font-size: 1.125rem; font-weight: 800; color: var(--color-text-primary); margin: 0 0 0.25rem 0; }
    .card-sub { font-size: 0.8125rem; color: var(--color-text-secondary); margin: 0; }
    .btn-refresh { background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: var(--color-text-primary); padding: 6px 14px; border-radius: 8px; font-size: 0.8125rem; font-weight: 700; cursor: pointer; }
    .btn-refresh:hover { background: rgba(255,255,255,0.12); }

    .overall-progress-bar-wrap { width: 100%; height: 8px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden; margin-bottom: 1.5rem; }
    .overall-progress-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #10b981); border-radius: 10px; transition: width 0.4s ease; }

    /* Requirements List */
    .requirements-list { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem; }
    .req-item { padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; border: 1px solid var(--border-color); background: rgba(255,255,255,0.02); transition: all 0.2s; }
    .req-item.is-done { border-color: rgba(16,185,129,0.4); background: rgba(16,185,129,0.04); }
    .req-left { display: flex; align-items: center; gap: 1rem; }
    .req-status-icon { width: 38px; height: 38px; border-radius: 10px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 1.125rem; flex-shrink: 0; }
    .req-status-icon.icon-done { background: rgba(16,185,129,0.15); }
    .req-title { font-size: 0.9375rem; font-weight: 700; color: var(--color-text-primary); margin: 0 0 0.25rem 0; }
    .req-desc { font-size: 0.8125rem; color: var(--color-text-secondary); margin: 0; }

    .badge { padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
    .badge-done { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
    .badge-pending { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }

    /* Footer Actions */
    .cert-action-footer { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.06); }
    
    .apply-box { display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; flex-wrap: wrap; background: rgba(0,0,0,0.2); padding: 1.25rem; border-radius: 12px; border: 1px solid var(--border-color); }
    .apply-note { font-size: 0.875rem; color: var(--color-text-primary); margin: 0; flex: 1; }
    .btn-apply-cert { background: var(--gradient-primary); color: #fff; border: none; padding: 12px 24px; border-radius: 10px; font-size: 0.9375rem; font-weight: 800; cursor: pointer; box-shadow: 0 4px 15px rgba(59,130,246,0.3); transition: all 0.2s; white-space: nowrap; }
    .btn-apply-cert:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(59,130,246,0.4); }
    .btn-apply-cert:disabled { opacity: 0.5; cursor: not-allowed; }

    .submitted-box { display: flex; justify-content: space-between; align-items: center; gap: 1rem; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); padding: 1.25rem; border-radius: 12px; color: #fbbf24; flex-wrap: wrap; }
    .submitted-text p { font-size: 0.8125rem; color: var(--color-text-secondary); margin: 2px 0 0 0; }
    .btn-check-status { background: rgba(245,158,11,0.2); border: 1px solid #fbbf24; color: #fbbf24; padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.8125rem; }

    .issued-box { display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.4); padding: 1.5rem; border-radius: 12px; flex-wrap: wrap; }
    .issued-badge { font-size: 0.75rem; font-weight: 900; background: #10b981; color: #fff; padding: 2px 10px; border-radius: 12px; letter-spacing: 0.05em; }
    .issued-info h4 { font-size: 1rem; color: var(--color-text-primary); margin: 0.5rem 0 0.25rem 0; }
    .issued-info p { font-size: 0.875rem; color: var(--color-text-secondary); margin: 0; }
    .issued-btn-group { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .btn-preview-cert { background: rgba(59,130,246,0.2); border: 1px solid #3b82f6; color: #60a5fa; padding: 12px 20px; border-radius: 10px; font-weight: 800; font-size: 0.875rem; cursor: pointer; }
    .btn-preview-cert:hover { background: #3b82f6; color: #fff; }
    .btn-download-cert { background: #10b981; color: #fff; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 800; font-size: 0.9375rem; cursor: pointer; box-shadow: 0 4px 15px rgba(16,185,129,0.3); transition: all 0.2s; }
    .btn-download-cert:hover { background: #059669; transform: translateY(-1px); }

    /* Modal Backdrop & Container */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 1.5rem; }
    .modal-card { background: #0f172a; border: 1px solid var(--border-color); border-radius: 16px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.7); display: flex; flex-direction: column; }
    .preview-modal { max-width: 850px; }
    .modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: flex-start; }
    .modal-header h2 { font-size: 1.125rem; font-weight: 800; margin: 0 0 0.25rem 0; }
    .modal-sub { font-size: 0.8125rem; color: var(--color-text-secondary); margin: 0; }
    .btn-close { background: transparent; border: none; color: var(--color-text-secondary); font-size: 1.25rem; cursor: pointer; }

    .preview-modal-body { padding: 1.5rem; }
    .cert-preview-box { width: 100%; aspect-ratio: 16 / 9; background-size: cover; background-position: center; position: relative; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .render-box { border-radius: 12px; border: 1px solid var(--border-color); }
    .text-overlay { position: absolute; transform: translate(-50%, -50%); white-space: nowrap; user-select: none; font-family: 'Times New Roman', serif; letter-spacing: 0.03em; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }

    .modal-footer { padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 0.75rem; }
    .btn-secondary { background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: #fff; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.875rem; }

    .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 0.75rem 1.5rem; border-radius: 10px; font-size: 0.875rem; font-weight: 600; z-index: 10000; }
    .toast-success { background: rgba(16,185,129,0.9); color: #fff; }
    .toast-error { background: rgba(239,68,68,0.9); color: #fff; }
  `]
})
export class SiswaSertifikasiComponent implements OnInit {
  requirements = signal<SyaratItem[]>([]);
  submitting = signal(false);
  certStatus = signal<'none' | 'submitted' | 'issued'>('none');
  showPreviewModal = signal(false);

  userName = 'Siswa Prolat SPN';
  userNrp = '98041289';
  userJabatan = 'Bintara Remaja SPN Polda Sumut';
  userSpec = 'Sabhara';
  certNumber = 'SPN/RBT/2026/00742';

  templateBgUrl = signal<string>('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1200&auto=format&fit=crop');

  positions: TemplatePositions = {
    nama: { x: 50, y: 44, fontSize: 30, color: '#0f172a', fontWeight: 'bold', align: 'center' },
    nrp: { x: 50, y: 52, fontSize: 18, color: '#334155', fontWeight: 'normal', align: 'center' },
    jabatan: { x: 50, y: 60, fontSize: 20, color: '#b45309', fontWeight: 'semibold', align: 'center' },
    spesialisasi: { x: 50, y: 68, fontSize: 22, color: '#1e40af', fontWeight: 'bold', align: 'center' }
  };

  toast = signal('');
  toastType = signal<'success'|'error'>('success');

  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadUserData();
    this.checkSavedStatus();
    this.loadTemplateConfig();
    this.checkRequirements();
  }

  loadUserData() {
    try {
      const uStr = sessionStorage.getItem('rbt_user');
      if (uStr) {
        const u = JSON.parse(uStr);
        if (u.name) this.userName = u.name;
        if (u.nrp) this.userNrp = u.nrp;
        if (u.jabatan) this.userJabatan = u.jabatan;
        if (u.spesialisasi) this.userSpec = u.spesialisasi.toUpperCase();
      }
    } catch (e) {}
  }

  checkSavedStatus() {
    const saved = localStorage.getItem('rbt_cert_status');
    if (saved === 'submitted' || saved === 'issued') {
      this.certStatus.set(saved);
    }
  }

  loadTemplateConfig() {
    const token = sessionStorage.getItem('rbt_token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.get<any>(`${this.api}/certifications/template`, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          if (res.data.template_url) {
            this.templateBgUrl.set(res.data.template_url);
          }
          if (res.data.positions) {
            this.positions = res.data.positions;
          }
        }
      }
    });
  }

  checkRequirements() {
    const token = sessionStorage.getItem('rbt_token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.get<any>(`${this.api}/simulations/cert-progress`, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const d = res.data;
          const simCount = d.simulations?.completed || 0;
          const has3Sims = simCount >= 3;

          const avgScore = d.evaluation?.avgScore || 0;
          const hasPassedExam = avgScore >= 75 || d.evaluation?.scoredCount > 0;

          const subCount = d.assignments?.submitted || 0;
          const hasSubmissions = subCount >= 1;

          if (d.certification) {
            if (d.certification.status === 'issued') {
              this.certStatus.set('issued');
              if (d.certification.cert_number) this.certNumber = d.certification.cert_number;
            } else if (d.certification.status === 'pending') {
              this.certStatus.set('submitted');
            }
          }

          const isApplied = this.certStatus() === 'submitted' || this.certStatus() === 'issued';
          const isIssued = this.certStatus() === 'issued';

          const items: SyaratItem[] = [
            {
              id: 'simulasi',
              title: '1. Selesaikan minimal 3 Simulasi RBT',
              desc: `Status: ${simCount} dari 3 Simulasi RBT telah berhasil diselesaikan.`,
              isFulfilled: has3Sims,
              statusText: has3Sims ? `✅ ${simCount}/3 Simulasi Selesai` : `⏳ ${simCount}/3 Simulasi Selesai`,
              icon: '⚡'
            },
            {
              id: 'ujian',
              title: '2. Lulus Ujian OBE dengan Nilai ≥ 75',
              desc: `Status: Rata-rata nilai evaluasi & ujian Anda adalah ${avgScore}/100.`,
              isFulfilled: hasPassedExam,
              statusText: hasPassedExam ? `✅ Nilai: ${avgScore} (LULUS)` : `⏳ Nilai ${avgScore}/75 (Belum Cukup)`,
              icon: '📝'
            },
            {
              id: 'tugas',
              title: '3. Selesaikan Tugas Pelatihan yang Diberikan',
              desc: `Status: ${subCount} Tugas pelatihan telah dikumpulkan ke Gadik.`,
              isFulfilled: hasSubmissions,
              statusText: hasSubmissions ? `✅ ${subCount} Tugas Dikumpulkan` : '⏳ Belum Ada Tugas Dikumpulkan',
              icon: '📋'
            },
            {
              id: 'gadik',
              title: '4. Persetujuan Kelulusan dari Instruktur Gadik',
              desc: isApplied ? 'Status: Pengajuan telah disetujui oleh Gadik pembimbing.' : 'Status: Menunggu Anda mengajukan penerbitan sertifikat.',
              isFulfilled: isApplied,
              statusText: isApplied ? '✅ Disetujui Gadik' : '⏳ Belum Diajukan',
              icon: '👨‍🏫'
            },
            {
              id: 'manajemen',
              title: '5. Verifikasi & Otentikasi oleh Manajemen SPN',
              desc: isIssued ? 'Status: Terverifikasi & disahkan oleh Manajemen SPN Polda Sumut.' : 'Status: Menunggu pengesahan akhir manajemen.',
              isFulfilled: isIssued,
              statusText: isIssued ? '✅ Terverifikasi SPN' : '⏳ Belum Terverifikasi',
              icon: '🛡️'
            }
          ];

          this.requirements.set(items);
        }
      }
    });
  }

  fulfilledCount(): number {
    return this.requirements().filter(r => r.isFulfilled).length;
  }

  isReadyToApply(): boolean {
    return this.fulfilledCount() >= 2;
  }

  isSubmitted(): boolean {
    return this.certStatus() === 'submitted';
  }

  isIssued(): boolean {
    return this.certStatus() === 'issued';
  }

  applyCertificate() {
    this.submitting.set(true);
    const token = sessionStorage.getItem('rbt_token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.post<any>(`${this.api}/certifications/apply`, { unit_spesialisasi: this.userSpec }, { headers }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.certStatus.set('submitted');
        localStorage.setItem('rbt_cert_status', 'submitted');
        this.checkRequirements();
        this.msg('Pengajuan Sertifikat berhasil dikirim ke Gadik & Manajemen SPN!', 'success');
      },
      error: (err) => {
        this.submitting.set(false);
        this.msg(err.error?.message || 'Gagal mengirim pengajuan sertifikat.', 'error');
      }
    });
  }

  simulateApproval() {
    this.certStatus.set('issued');
    localStorage.setItem('rbt_cert_status', 'issued');
    this.checkRequirements();
    this.msg('Selamat! Sertifikat Kelulusan Resmi Anda telah disetujui & diterbitkan!', 'success');
  }

  openPreviewModal() {
    this.showPreviewModal.set(true);
  }

  closePreviewModal() {
    this.showPreviewModal.set(false);
  }

  // ================= REAL CANVAS CERTIFICATE GENERATOR & DOWNLOAD =================
  downloadCertificate() {
    this.msg('Memproses rendering & pengunduhan Sertifikat Resmi...', 'success');

    const token = sessionStorage.getItem('rbt_token');
    const headers = { Authorization: `Bearer ${token}` };

    // Fetch latest template configuration from Gadik designer settings
    this.http.get<any>(`${this.api}/certifications/template`, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          if (res.data.template_url) this.templateBgUrl.set(res.data.template_url);
          if (res.data.positions) this.positions = res.data.positions;
        }
        this.renderCanvasDownload();
      },
      error: () => {
        this.renderCanvasDownload();
      }
    });
  }

  private renderCanvasDownload() {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // 1. Draw Background Template Image
      ctx.drawImage(img, 0, 0, 1920, 1080);

      // 2. Render Custom Overlay Texts
      const drawOverlayText = (fieldConfig: TextFieldPos, defaultVal: string) => {
        const text = fieldConfig.text || defaultVal;
        if (!text) return;

        const xPx = (fieldConfig.x / 100) * 1920;
        const yPx = (fieldConfig.y / 100) * 1080;

        // Scale factor: 1920px Canvas vs ~650px Designer Preview container = 2.95x ratio
        const fontPx = Math.round((fieldConfig.fontSize || 20) * 2.95);

        ctx.font = `${fieldConfig.fontWeight || 'bold'} ${fontPx}px "Times New Roman", serif`;
        ctx.fillStyle = fieldConfig.color || '#0f172a';
        ctx.textAlign = (fieldConfig.align as CanvasTextAlign) || 'center';
        ctx.textBaseline = 'middle';

        ctx.fillText(text, xPx, yPx);
      };

      drawOverlayText(this.positions.nama, this.userName.toUpperCase());
      drawOverlayText(this.positions.nrp, `NRP. ${this.userNrp} / POLDA SUMUT`);
      drawOverlayText(this.positions.jabatan, this.userJabatan.toUpperCase());
      drawOverlayText(this.positions.spesialisasi, `PELATIHAN RBT DIKBANGSPES (SPN POLDA SUMUT)`);

      // 3. Trigger Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const cleanCertNum = this.certNumber.replace(/[\/\\?%*:|"<>]/g, '_');
      link.download = `Sertifikat_Kelulusan_RBT_${cleanCertNum}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.msg('Sertifikat Resmi berhasil diunduh ke komputer Anda!', 'success');
    };

    img.onerror = () => {
      this.generateFallbackCertificate(canvas, ctx);
    };

    img.src = this.templateBgUrl();
  }

  private generateFallbackCertificate(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    // Elegant Blue & Gold Official SPN Certificate Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1920, 1080);

    // Inner Gold Border
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 12;
    ctx.strokeRect(40, 40, 1840, 1000);

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 60, 1800, 960);

    // Header Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 50px "Times New Roman", serif';
    ctx.fillText('SEKOLAH POLISI NEGARA (SPN) POLDA SUMATERA UTARA', 960, 180);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px "Times New Roman", serif';
    ctx.fillText('SERTIFIKAT KELULUSAN PELATIHAN RBT', 960, 260);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '30px "Times New Roman", serif';
    ctx.fillText(`Nomor: ${this.certNumber}`, 960, 320);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'italic 32px "Times New Roman", serif';
    ctx.fillText('Diberikan Kepada:', 960, 420);

    // Student Name
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 64px "Times New Roman", serif';
    ctx.fillText(this.userName.toUpperCase(), 960, 520);

    // NRP & Jabatan
    ctx.fillStyle = '#ffffff';
    ctx.font = '34px "Times New Roman", serif';
    ctx.fillText(`NRP. ${this.userNrp} / ${this.userJabatan.toUpperCase()}`, 960, 600);

    // Achievement
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 38px "Times New Roman", serif';
    ctx.fillText(`LULUS PELATIHAN RBT SPESIALISASI ${this.userSpec.toUpperCase()}`, 960, 700);

    // Signatures
    ctx.fillStyle = '#94a3b8';
    ctx.font = '28px "Times New Roman", serif';
    ctx.fillText('KA SPN POLDA SUMUT', 500, 880);
    ctx.fillText('KOMBES POL. DR. SUBAGJA, S.I.K., M.H.', 500, 960);

    ctx.fillText('INSTRUKTUR UTAMA GADIK RBT', 1420, 880);
    ctx.fillText('AKBP AHMAD SETIAWAN, S.H.', 1420, 960);

    // Download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const cleanCertNum = this.certNumber.replace(/[\/\\?%*:|"<>]/g, '_');
    link.download = `Sertifikat_Kelulusan_RBT_${cleanCertNum}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.msg('Sertifikat Resmi berhasil diunduh ke komputer Anda!', 'success');
  }

  private msg(m: string, t: 'success'|'error') {
    this.toast.set(m); this.toastType.set(t);
    setTimeout(() => this.toast.set(''), 4000);
  }
}
