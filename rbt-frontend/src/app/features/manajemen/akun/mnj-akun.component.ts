import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-mnj-akun',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page active">
      <div class="pagehead">
        <div>
          <span class="eyebrow">MANAJEMEN AKUN</span>
          <h1>Kelola Pengguna Sistem</h1>
          <p class="page-desc">Tambah, edit profil, ubah role, dan kelola semua akun pengguna SIPAKAR RBT.</p>
        </div>
        <div class="head-actions">
          <button class="btn-action-add" (click)="openAddModal()">
            ➕ Tambah Akun Baru
          </button>
          <button class="btn-action-batch" (click)="openBatchModal()">
            📊 Import Batch (Excel)
          </button>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background: rgba(59,130,246,0.15); color: #3b82f6;">👥</div>
          <div class="stat-info"><span class="stat-val">{{ users().length }}</span><span class="stat-label">Total Pengguna</span></div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background: rgba(16,185,129,0.15); color: #10b981;">🎓</div>
          <div class="stat-info"><span class="stat-val">{{ countRole('gadik') }}</span><span class="stat-label">Gadik</span></div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background: rgba(245,158,11,0.15); color: #f59e0b;">📚</div>
          <div class="stat-info"><span class="stat-val">{{ countRole('siswa') }}</span><span class="stat-label">Siswa</span></div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background: rgba(239,68,68,0.15); color: #ef4444;">⚙️</div>
          <div class="stat-info"><span class="stat-val">{{ countRole('manajemen') }}</span><span class="stat-label">Admin</span></div>
        </div>
      </div>

      <!-- Search -->
      <div class="glass-card" style="margin-bottom: 1.5rem; padding: 1rem 1.25rem;">
        <input type="text" placeholder="🔍 Cari pengguna berdasarkan nama, email, NRP, atau jabatan..."
               [(ngModel)]="searchTerm" class="search-input" />
      </div>

      <!-- Desktop Table View -->
      <div class="glass-card table-wrap desktop-table">
        @if (loading()) {
          <div class="loading-state">Memuat data pengguna...</div>
        } @else if (filteredUsers().length === 0) {
          <div class="empty-state">Tidak ada pengguna ditemukan.</div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Pendidikan</th>
                <th>NRP</th>
                <th>Jabatan</th>
                <th>Terdaftar</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              @for (u of filteredUsers(); track u.id) {
                <tr>
                  <td>
                    <div class="user-cell">
                      <div class="avatar">{{ u.name?.charAt(0) || '?' }}</div>
                      <span class="user-name-text">{{ u.name }}</span>
                    </div>
                  </td>
                  <td><span class="email-text">{{ u.email }}</span></td>
                  <td>
                    <select class="role-select" [ngModel]="u.role" (ngModelChange)="changeRole(u, $event)">
                      <option value="gadik">Gadik</option>
                      <option value="siswa">Siswa</option>
                      <option value="manajemen">Manajemen</option>
                    </select>
                  </td>
                  <td><span class="badge badge-spec">{{ u.spesialisasi || '-' }}</span></td>
                  <td><span class="nrp-text">{{ u.nrp || '-' }}</span></td>
                  <td><span class="jabatan-text">{{ u.jabatan || '-' }}</span></td>
                  <td>{{ formatDate(u.created_at) }}</td>
                  <td>
                    <div class="action-btn-group">
                      <button class="btn-action btn-view" (click)="openViewModal(u)" title="Lihat Detail Profil">
                        👁️ Detail
                      </button>
                      <button class="btn-action btn-edit" (click)="openEditModal(u)" title="Edit Profil Akun">
                        ✏️ Edit
                      </button>
                      <button class="btn-icon btn-danger" (click)="deleteUser(u)" title="Hapus pengguna">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Mobile Cards View -->
      <div class="mobile-user-list mobile-only">
        @if (loading()) {
          <div class="loading-state">Memuat data pengguna...</div>
        } @else if (filteredUsers().length === 0) {
          <div class="empty-state">Tidak ada pengguna ditemukan.</div>
        } @else {
          @for (u of filteredUsers(); track u.id) {
            <div class="glass-card mobile-user-card">
              <div class="m-user-head">
                <div class="user-cell">
                  <div class="avatar">{{ u.name?.charAt(0) || '?' }}</div>
                  <div>
                    <div class="user-name-text">{{ u.name }}</div>
                    <div class="email-text">{{ u.email }}</div>
                  </div>
                </div>
                <select class="role-select" [ngModel]="u.role" (ngModelChange)="changeRole(u, $event)">
                  <option value="gadik">Gadik</option>
                  <option value="siswa">Siswa</option>
                  <option value="manajemen">Manajemen</option>
                </select>
              </div>
              <div class="m-user-body">
                <div class="m-info-item"><span class="m-lbl">Pendidikan:</span> <span class="badge badge-spec">{{ u.spesialisasi || '-' }}</span></div>
                <div class="m-info-item"><span class="m-lbl">NRP / NIP:</span> <span class="nrp-text">{{ u.nrp || '-' }}</span></div>
                <div class="m-info-item" style="grid-column: span 2;"><span class="m-lbl">Jabatan:</span> <span class="jabatan-text">{{ u.jabatan || '-' }}</span></div>
              </div>
              <div class="m-user-actions">
                <button class="btn-action btn-view" (click)="openViewModal(u)">👁️ Detail</button>
                <button class="btn-action btn-edit" (click)="openEditModal(u)">✏️ Edit</button>
                <button class="btn-icon btn-danger" (click)="deleteUser(u)" title="Hapus pengguna">🗑️ Hapus</button>
              </div>
            </div>
          }
        }
      </div>

      <!-- ================= MODAL 1: VIEW USER DETAIL ================= -->
      @if (showViewModal()) {
        <div class="modal-backdrop" (click)="closeViewModal()">
          <div class="modal-card detail-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>👁️ Detail Profil Akun Pengguna</h2>
              <button class="btn-close" (click)="closeViewModal()">✕</button>
            </div>
            <div class="modal-body">
              <div class="detail-profile-header">
                <div class="big-avatar">{{ selectedUser()?.name?.charAt(0) || '?' }}</div>
                <div>
                  <h3>{{ selectedUser()?.name }}</h3>
                  <span class="email-sub">{{ selectedUser()?.email }}</span>
                  <div class="role-badge-pill" [class.gadik]="selectedUser()?.role==='gadik'" [class.manajemen]="selectedUser()?.role==='manajemen'">
                    {{ (selectedUser()?.role | uppercase) }}
                  </div>
                </div>
              </div>

              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">NRP / NIP</span>
                  <span class="detail-val">{{ selectedUser()?.nrp || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Jabatan / Instansi</span>
                  <span class="detail-val">{{ selectedUser()?.jabatan || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Pendidikan</span>
                  <span class="detail-val highlight">{{ selectedUser()?.spesialisasi || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Tanggal Terdaftar</span>
                  <span class="detail-val">{{ formatDate(selectedUser()?.created_at) }}</span>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" (click)="closeViewModal()">Tutup</button>
              <button class="btn-action btn-edit-lg" (click)="closeViewModal(); openEditModal(selectedUser())">
                ✏️ Edit Akun Ini
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ================= MODAL 2: EDIT USER ================= -->
      @if (showEditModal()) {
        <div class="modal-backdrop" (click)="closeEditModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>✏️ Edit Data Profil Pengguna</h2>
              <button class="btn-close" (click)="closeEditModal()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-grid">
                <div class="form-group">
                  <label>Nama Lengkap <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="editUser.name" class="form-input" />
                </div>
                <div class="form-group">
                  <label>Email <span class="required">*</span></label>
                  <input type="email" [(ngModel)]="editUser.email" class="form-input" />
                </div>
                <div class="form-group">
                  <label>Password Saat Ini</label>
                  <div class="current-pass-box">
                    <code class="current-pass-display">{{ editUser.plain_password || '(terenkripsi)' }}</code>
                  </div>
                </div>
                <div class="form-group">
                  <label>Password Baru (Kosongkan jika tidak ubah)</label>
                  <input type="text" [(ngModel)]="editUser.password" placeholder="Kosongkan jika tidak ingin ubah..." class="form-input" />
                </div>
                <div class="form-group">
                  <label>Role</label>
                  <select [(ngModel)]="editUser.role" class="form-input">
                    <option value="siswa">Siswa</option>
                    <option value="gadik">Gadik (Instruktur)</option>
                    <option value="manajemen">Manajemen (Admin)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>NRP / NIP</label>
                  <input type="text" [(ngModel)]="editUser.nrp" placeholder="Contoh: 98041289" class="form-input" />
                </div>
                <div class="form-group">
                  <label>Jabatan</label>
                  <input type="text" [(ngModel)]="editUser.jabatan" placeholder="Contoh: Bintara Remaja" class="form-input" />
                </div>
                <div class="form-group full-width">
                  <label>Pendidikan</label>
                  <select [(ngModel)]="editUser.spesialisasi" class="form-input">
                    <option value="">-- Belum Dipilih --</option>
                    <option value="Diktuk (Pendidikan Pembentukan)">Diktuk (Pendidikan Pembentukan)</option>
                    <option value="Dikbang (Pendidikan Pengembangan)">Dikbang (Pendidikan Pengembangan)</option>
                    <option value="Dikbangspes (Pendidikan Pengembangan Spesialisasi)">Dikbangspes (Pendidikan Pengembangan Spesialisasi)</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" (click)="closeEditModal()">Batal</button>
              <button class="btn-save" (click)="saveEditUser()" [disabled]="submitting()">
                {{ submitting() ? 'Menyimpan...' : '💾 Simpan Perubahan' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ================= MODAL 3: TAMBAH AKUN BARU ================= -->
      @if (showAddModal()) {
        <div class="modal-backdrop" (click)="closeAddModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>➕ Tambah Akun Pengguna Baru</h2>
              <button class="btn-close" (click)="closeAddModal()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-grid">
                <div class="form-group">
                  <label>Nama Lengkap <span class="required">*</span></label>
                  <input type="text" [(ngModel)]="newUser.name" placeholder="Contoh: BRIPDA Ahmad Subagja" class="form-input" />
                </div>
                <div class="form-group">
                  <label>Email <span class="required">*</span></label>
                  <input type="email" [(ngModel)]="newUser.email" placeholder="Contoh: ahmad@spn.polri.go.id" class="form-input" />
                </div>
                <div class="form-group">
                  <label>Password</label>
                  <input type="text" [(ngModel)]="newUser.password" placeholder="Default: 123456" class="form-input" />
                </div>
                <div class="form-group">
                  <label>Role</label>
                  <select [(ngModel)]="newUser.role" class="form-input">
                    <option value="siswa">Siswa</option>
                    <option value="gadik">Gadik (Instruktur)</option>
                    <option value="manajemen">Manajemen (Admin)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>NRP / NIP</label>
                  <input type="text" [(ngModel)]="newUser.nrp" placeholder="Contoh: 98041289" class="form-input" />
                </div>
                <div class="form-group">
                  <label>Jabatan</label>
                  <input type="text" [(ngModel)]="newUser.jabatan" placeholder="Contoh: Bintara Remaja" class="form-input" />
                </div>
                <div class="form-group full-width">
                  <label>Pendidikan</label>
                  <select [(ngModel)]="newUser.spesialisasi" class="form-input">
                    <option value="">-- Belum Dipilih --</option>
                    <option value="Diktuk (Pendidikan Pembentukan)">Diktuk (Pendidikan Pembentukan)</option>
                    <option value="Dikbang (Pendidikan Pengembangan)">Dikbang (Pendidikan Pengembangan)</option>
                    <option value="Dikbangspes (Pendidikan Pengembangan Spesialisasi)">Dikbangspes (Pendidikan Pengembangan Spesialisasi)</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" (click)="closeAddModal()">Batal</button>
              <button class="btn-save" (click)="createSingleUser()" [disabled]="submitting()">
                {{ submitting() ? 'Menyimpan...' : '💾 Simpan Akun Baru' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ================= MODAL 4: IMPORT BATCH EXCEL ================= -->
      @if (showBatchModal()) {
        <div class="modal-backdrop" (click)="closeBatchModal()">
          <div class="modal-card batch-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2>📊 Import Akun Batch dari File Excel / CSV</h2>
                <p class="modal-sub">Upload file Excel (.xlsx/.csv) untuk mendaftarkan banyak akun sekaligus.</p>
              </div>
              <button class="btn-close" (click)="closeBatchModal()">✕</button>
            </div>
            <div class="modal-body">
              <div class="guide-card">
                <div class="guide-header-row">
                  <div>
                    <h4>📋 Format Kolom Excel yang Diperlukan</h4>
                    <p class="guide-hint">Buat file Excel dengan header kolom sebagai berikut (baris 1 = header):</p>
                  </div>
                  <button class="btn-download-template" (click)="downloadExcelTemplate()">
                    📥 Unduh Format Template (.csv)
                  </button>
                </div>
                <div class="table-responsive">
                  <table class="guide-table">
                    <thead>
                      <tr>
                        <th>Nama *</th>
                        <th>Email *</th>
                        <th>Password</th>
                        <th>Role</th>
                        <th>Pendidikan</th>
                        <th>NRP</th>
                        <th>Jabatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>BRIPDA Ahmad</td>
                        <td>ahmad&#64;spn.go.id</td>
                        <td>123456</td>
                        <td>siswa</td>
                        <td>Dikbangspes</td>
                        <td>98041289</td>
                        <td>Bintara Remaja</td>
                      </tr>
                      <tr>
                        <td>BRIPDA Siti</td>
                        <td>siti&#64;spn.go.id</td>
                        <td>123456</td>
                        <td>siswa</td>
                        <td>Diktuk</td>
                        <td>98041290</td>
                        <td>Bintara Remaja</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p class="guide-note">* Kolom <strong>Nama</strong> dan <strong>Email</strong> wajib diisi. Password default: <code>123456</code>. Role default: <code>siswa</code>.</p>
              </div>

              <div class="upload-zone" (click)="batchFileInput.click()" (dragover)="$event.preventDefault()" (drop)="onBatchFileDrop($event)">
                <input type="file" #batchFileInput (change)="onBatchFileSelected($event)" accept=".xlsx,.xls,.csv" style="display: none;">
                @if (batchFileName()) {
                  <div class="file-icon">📄</div>
                  <span class="file-name">{{ batchFileName() }}</span>
                  <span class="file-info">{{ batchParsedCount() }} data akun terdeteksi — siap diimpor</span>
                } @else {
                  <div class="upload-icon">📤</div>
                  <span class="upload-text">Klik atau Seret File Excel / CSV ke Sini</span>
                  <span class="upload-hint">Format: .xlsx, .xls, .csv — Maksimal 500 akun per file</span>
                }
              </div>

              @if (batchPreviewData().length > 0) {
                <div class="preview-section">
                  <h4>📑 Preview {{ batchPreviewData().length }} Akun yang Akan Diimpor</h4>
                  <div class="table-responsive">
                    <table class="data-table preview-table">
                      <thead>
                        <tr>
                          <th>No</th>
                          <th>Nama</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Pendidikan</th>
                          <th>NRP</th>
                          <th>Jabatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (row of batchPreviewData(); track $index; let i = $index) {
                          <tr>
                            <td>{{ i + 1 }}</td>
                            <td>{{ row.name || row.Nama || '-' }}</td>
                            <td>{{ row.email || row.Email || '-' }}</td>
                            <td>{{ row.role || row.Role || 'siswa' }}</td>
                            <td>{{ row.spesialisasi || row.Pendidikan || row.Spesialisasi || '-' }}</td>
                            <td>{{ row.nrp || row.NRP || '-' }}</td>
                            <td>{{ row.jabatan || row.Jabatan || '-' }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              }
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" (click)="closeBatchModal()">Batal</button>
              <button 
                class="btn-save" 
                (click)="submitBatchImport()" 
                [disabled]="batchPreviewData().length === 0 || submitting()"
              >
                {{ submitting() ? 'Mengimpor...' : '🚀 Impor ' + batchPreviewData().length + ' Akun Sekaligus' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Feedback toast -->
      @if (toast()) {
        <div class="toast" [class.toast-success]="toastType() === 'success'" [class.toast-error]="toastType() === 'error'">
          {{ toast() }}
        </div>
      }
    </div>
  `,
  styles: [`
    .pagehead { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
    .head-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn-action-add { background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 800; font-size: 0.8125rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(16,185,129,0.3); }
    .btn-action-add:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(16,185,129,0.4); }
    .btn-action-batch { background: linear-gradient(135deg, #3b82f6, #6366f1); color: #fff; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 800; font-size: 0.8125rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
    .btn-action-batch:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(59,130,246,0.4); }

    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .stat-card { display: flex; align-items: center; gap: 1rem; padding: 1.25rem; }
    .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-val { font-size: 1.5rem; font-weight: 800; }
    .stat-label { font-size: 0.75rem; color: var(--color-text-secondary); }
    .search-input { width: 100%; background: transparent; border: none; color: var(--color-text-primary); font-size: 0.9rem; outline: none; font-family: var(--font-body); }
    .table-wrap { overflow-x: auto; padding: 0; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th { padding: 0.875rem 1.25rem; text-align: left; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); border-bottom: 1px solid var(--border-color); }
    .data-table td { padding: 0.875rem 1.25rem; font-size: 0.875rem; border-bottom: 1px solid rgba(255,255,255,0.03); }
    .data-table tr:hover { background: rgba(255,255,255,0.02); }
    .user-cell { display: flex; align-items: center; gap: 0.75rem; }
    .user-name-text { font-weight: 700; color: #fff; }
    .avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800; color: #fff; flex-shrink: 0; }
    .email-text { color: var(--color-text-secondary); font-size: 0.8125rem; }
    .nrp-text, .jabatan-text { color: var(--color-text-secondary); font-size: 0.8125rem; }
    .role-select { background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--color-text-primary); padding: 4px 8px; border-radius: 6px; font-size: 0.8125rem; cursor: pointer; font-family: var(--font-body); }
    .role-select:focus { outline: none; border-color: var(--color-primary); }
    .badge { padding: 2px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
    .badge-spec { background: rgba(59,130,246,0.12); color: #60a5fa; border: 1px solid rgba(59,130,246,0.25); }

    /* Action buttons */
    .action-btn-group { display: flex; align-items: center; gap: 0.375rem; }
    .btn-action { border: none; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
    .btn-view { background: rgba(59,130,246,0.15); color: #60a5fa; border: 1px solid rgba(59,130,246,0.3); }
    .btn-view:hover { background: #3b82f6; color: #fff; }
    .btn-edit { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }
    .btn-edit:hover { background: #f59e0b; color: #fff; }
    .btn-icon { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 4px 8px; border-radius: 6px; transition: background 0.2s; }
    .btn-icon:hover { background: rgba(255,255,255,0.05); }
    .btn-danger:hover { background: rgba(239,68,68,0.15); }
    .loading-state, .empty-state { padding: 3rem; text-align: center; color: var(--color-text-secondary); }

    /* Modal Styles */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1.5rem; }
    .modal-card { background: #0f172a; border: 1px solid var(--border-color); border-radius: 16px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.7); }
    .detail-modal { max-width: 520px; }
    .batch-modal { max-width: 850px; }
    .modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: flex-start; }
    .modal-header h2 { font-size: 1.125rem; font-weight: 800; margin: 0; }
    .modal-sub { font-size: 0.8125rem; color: var(--color-text-secondary); margin: 0.25rem 0 0 0; }
    .btn-close { background: transparent; border: none; color: var(--color-text-secondary); font-size: 1.25rem; cursor: pointer; }
    .modal-body { padding: 1.5rem; }
    .modal-footer { padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 0.75rem; }
    .btn-secondary { background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: #fff; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.875rem; }
    .btn-save { background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; padding: 10px 22px; border-radius: 10px; font-weight: 800; font-size: 0.875rem; cursor: pointer; box-shadow: 0 4px 12px rgba(16,185,129,0.3); }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-edit-lg { background: #f59e0b; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 800; font-size: 0.875rem; cursor: pointer; }

    /* Profile Detail Modal Styling */
    .detail-profile-header { display: flex; align-items: center; gap: 1.25rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1.25rem; }
    .big-avatar { width: 64px; height: 64px; border-radius: 50%; background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; font-weight: 900; color: #fff; }
    .detail-profile-header h3 { font-size: 1.25rem; font-weight: 800; margin: 0 0 0.25rem 0; }
    .email-sub { font-size: 0.875rem; color: var(--color-text-secondary); display: block; margin-bottom: 0.5rem; }
    .role-badge-pill { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; background: rgba(59,130,246,0.2); color: #60a5fa; border: 1px solid #3b82f6; }
    .role-badge-pill.gadik { background: rgba(16,185,129,0.2); color: #10b981; border-color: #10b981; }
    .role-badge-pill.manajemen { background: rgba(239,68,68,0.2); color: #ef4444; border-color: #ef4444; }

    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .detail-item { display: flex; flex-direction: column; gap: 0.25rem; background: rgba(0,0,0,0.2); padding: 0.875rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); }
    .detail-label { font-size: 0.75rem; color: var(--color-text-secondary); text-transform: uppercase; font-weight: 700; }
    .detail-val { font-size: 0.9375rem; font-weight: 700; color: #fff; }
    .detail-val.highlight { color: #60a5fa; }

    /* Form */
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.375rem; }
    .form-group.full-width { grid-column: span 2; }
    .form-group label { font-size: 0.75rem; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.03em; }
    .required { color: #ef4444; }
    .form-input { background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; padding: 10px 14px; border-radius: 8px; font-size: 0.875rem; font-family: var(--font-body); outline: none; transition: border-color 0.2s; }
    .form-input:focus { border-color: #3b82f6; }

    /* Batch Import */
    .guide-card { background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.25); padding: 1.25rem; border-radius: 12px; margin-bottom: 1.25rem; }
    .guide-header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .btn-download-template { background: rgba(59,130,246,0.2); border: 1px solid #3b82f6; color: #60a5fa; padding: 6px 14px; border-radius: 8px; font-weight: 800; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; }
    .btn-download-template:hover { background: #3b82f6; color: #fff; }
    .guide-card h4 { font-size: 0.9375rem; font-weight: 800; margin: 0 0 0.25rem 0; }
    .guide-hint { font-size: 0.8125rem; color: var(--color-text-secondary); margin: 0; }
    .guide-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
    .guide-table th { background: rgba(59,130,246,0.2); color: #60a5fa; padding: 6px 10px; font-weight: 700; border: 1px solid rgba(59,130,246,0.3); }
    .guide-table td { padding: 6px 10px; border: 1px solid rgba(255,255,255,0.06); color: var(--color-text-secondary); }
    .guide-note { font-size: 0.75rem; color: var(--color-text-secondary); margin: 0.75rem 0 0 0; }
    .guide-note code { background: rgba(255,255,255,0.1); padding: 1px 5px; border-radius: 4px; font-size: 0.75rem; }
    .table-responsive { overflow-x: auto; }

    .upload-zone { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; border: 2px dashed rgba(59,130,246,0.4); border-radius: 12px; padding: 2rem; cursor: pointer; background: rgba(59,130,246,0.04); transition: all 0.2s; margin-bottom: 1.25rem; text-align: center; }
    .upload-zone:hover { background: rgba(59,130,246,0.1); border-color: #3b82f6; }
    .upload-icon, .file-icon { font-size: 2.5rem; }
    .upload-text { font-weight: 700; font-size: 0.9375rem; color: var(--color-text-primary); }
    .upload-hint { font-size: 0.75rem; color: var(--color-text-secondary); }
    .file-name { font-weight: 800; font-size: 1rem; color: #10b981; }
    .file-info { font-size: 0.8125rem; color: var(--color-text-secondary); }

    .preview-section h4 { font-size: 0.9375rem; font-weight: 800; margin: 0 0 0.75rem 0; }
    .preview-table { font-size: 0.75rem; }
    .preview-table th, .preview-table td { padding: 6px 10px; }

    .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 0.75rem 1.5rem; border-radius: 10px; font-size: 0.875rem; font-weight: 600; z-index: 10000; animation: slideUp 0.3s ease; }
    .toast-success { background: rgba(16,185,129,0.9); color: #fff; }
    .toast-error { background: rgba(239,68,68,0.9); color: #fff; }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .desktop-table { display: block; }
    .mobile-only { display: none; }

    /* Mobile Responsive Adjustments */
    @media (max-width: 768px) {
      .desktop-table { display: none !important; }
      .mobile-only { display: flex !important; flex-direction: column; gap: 1rem; }

      .pagehead { flex-direction: column; align-items: stretch; gap: 0.75rem; margin-bottom: 1rem; }
      .pagehead h1, .pagehead h2 { font-size: 1.35rem !important; }
      .head-actions { width: 100%; display: flex; flex-direction: column; gap: 0.5rem; }
      .btn-action-add, .btn-action-batch { width: 100%; justify-content: center; text-align: center; }

      .stats-row { display: grid; grid-template-columns: repeat(2, 1fr) !important; gap: 0.75rem; }
      .stat-card { padding: 0.875rem 1rem; gap: 0.75rem; }
      .stat-icon { width: 40px; height: 40px; font-size: 1.25rem; }
      .stat-val { font-size: 1.25rem; }

      .mobile-user-card { padding: 1rem; display: flex; flex-direction: column; gap: 0.875rem; background: rgba(15,23,42,0.6); border: 1px solid var(--border-color); border-radius: 14px; }
      .m-user-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
      .m-user-body { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.8125rem; background: rgba(0,0,0,0.25); padding: 0.75rem; border-radius: 10px; }
      .m-info-item { display: flex; flex-direction: column; gap: 2px; }
      .m-lbl { font-size: 0.7rem; color: var(--color-text-secondary); text-transform: uppercase; font-weight: 700; }
      .m-user-actions { display: flex; align-items: center; gap: 0.5rem; justify-content: flex-end; pt: 0.5rem; border-top: 1px solid rgba(255,255,255,0.05); }
      .m-user-actions .btn-action { flex: 1; text-align: center; justify-content: center; padding: 8px 12px; }

      .action-btn-group { flex-wrap: wrap; gap: 4px; }
      .modal-card { width: 95%; margin: 0.5rem; max-height: 92vh; }
      .form-grid, .detail-grid { grid-template-columns: 1fr !important; }
      .form-group.full-width { grid-column: span 1 !important; }
      .guide-header-row { flex-direction: column; align-items: stretch; }
      .btn-download-template { width: 100%; text-align: center; }
    }

    @media (max-width: 480px) {
      .modal-header { padding: 1rem; }
      .modal-body { padding: 1rem; }
      .modal-footer { padding: 0.875rem 1rem; flex-direction: column-reverse; width: 100%; }
      .btn-secondary, .btn-save, .btn-edit-lg { width: 100%; text-align: center; justify-content: center; }
      .detail-profile-header { flex-direction: column; text-align: center; }
      .big-avatar { margin: 0 auto; }
      .toast { left: 1rem; right: 1rem; bottom: 1rem; text-align: center; }
    }
  `]
})
export class MnjAkunComponent implements OnInit {
  users = signal<any[]>([]);
  loading = signal(true);
  searchTerm = '';
  toast = signal('');
  toastType = signal<'success' | 'error'>('success');
  submitting = signal(false);

  // View User Modal
  showViewModal = signal(false);
  selectedUser = signal<any>(null);

  // Edit User Modal
  showEditModal = signal(false);
  editUser: any = { id: null, name: '', email: '', password: '', role: 'siswa', spesialisasi: '', nrp: '', jabatan: '' };

  // Add Single User Modal
  showAddModal = signal(false);
  newUser: any = { name: '', email: '', password: '', role: 'siswa', spesialisasi: '', nrp: '', jabatan: '' };

  // Batch Import Modal
  showBatchModal = signal(false);
  batchFileName = signal('');
  batchParsedCount = signal(0);
  batchPreviewData = signal<any[]>([]);

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    const token = sessionStorage.getItem('rbt_token');
    this.http.get<any>(`${this.apiUrl}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => { this.users.set(res.data || []); this.loading.set(false); },
      error: () => { this.loading.set(false); this.showToast('Gagal memuat data.', 'error'); }
    });
  }

  filteredUsers() {
    const term = this.searchTerm.toLowerCase();
    if (!term) return this.users();
    return this.users().filter(u =>
      u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term) ||
      (u.nrp || '').toLowerCase().includes(term) || (u.jabatan || '').toLowerCase().includes(term) ||
      (u.spesialisasi || '').toLowerCase().includes(term)
    );
  }

  countRole(role: string): number {
    return this.users().filter(u => u.role === role).length;
  }

  changeRole(user: any, newRole: string): void {
    const token = sessionStorage.getItem('rbt_token');
    this.http.put<any>(`${this.apiUrl}/users/${user.id}/role`, { role: newRole }, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => { user.role = newRole; this.showToast(`Role ${user.name} diubah ke ${newRole}.`, 'success'); },
      error: () => this.showToast('Gagal mengubah role.', 'error')
    });
  }

  deleteUser(user: any): void {
    if (!confirm(`Yakin ingin menghapus ${user.name}?`)) return;
    const token = sessionStorage.getItem('rbt_token');
    this.http.delete<any>(`${this.apiUrl}/users/${user.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => { this.users.update(arr => arr.filter(u => u.id !== user.id)); this.showToast('Pengguna dihapus.', 'success'); },
      error: () => this.showToast('Gagal menghapus.', 'error')
    });
  }

  // ================= VIEW USER DETAIL =================
  openViewModal(user: any) {
    this.selectedUser.set(user);
    this.showViewModal.set(true);
  }

  closeViewModal() {
    this.showViewModal.set(false);
  }

  // ================= EDIT USER =================
  openEditModal(user: any) {
    this.editUser = {
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'siswa',
      spesialisasi: user.spesialisasi || '',
      nrp: user.nrp || '',
      jabatan: user.jabatan || ''
    };
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
  }

  saveEditUser() {
    if (!this.editUser.name || !this.editUser.email) {
      this.showToast('Nama dan Email wajib diisi.', 'error');
      return;
    }
    this.submitting.set(true);
    const token = sessionStorage.getItem('rbt_token');
    this.http.put<any>(`${this.apiUrl}/users/${this.editUser.id}`, this.editUser, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.showToast(res.message || 'Profil akun berhasil diperbarui!', 'success');
        this.closeEditModal();
        this.loadUsers();
      },
      error: (err) => {
        this.submitting.set(false);
        this.showToast(err.error?.message || 'Gagal memperbarui akun.', 'error');
      }
    });
  }

  // ================= SINGLE USER CREATION =================
  openAddModal() {
    this.newUser = { name: '', email: '', password: '', role: 'siswa', spesialisasi: '', nrp: '', jabatan: '' };
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  createSingleUser() {
    if (!this.newUser.name || !this.newUser.email) {
      this.showToast('Nama dan Email wajib diisi.', 'error');
      return;
    }
    this.submitting.set(true);
    const token = sessionStorage.getItem('rbt_token');
    this.http.post<any>(`${this.apiUrl}/users`, this.newUser, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.showToast(res.message || 'Akun berhasil dibuat!', 'success');
        this.closeAddModal();
        this.loadUsers();
      },
      error: (err) => {
        this.submitting.set(false);
        this.showToast(err.error?.message || 'Gagal membuat akun.', 'error');
      }
    });
  }

  // ================= BATCH EXCEL IMPORT =================
  downloadExcelTemplate() {
    const csvContent = 'data:text/csv;charset=utf-8,' +
      'Nama,Email,Password,Role,Pendidikan,NRP,Jabatan\n' +
      'BRIPDA Ahmad Subagja,ahmad@spn.polri.go.id,123456,siswa,Dikbangspes,98041289,Bintara Remaja\n' +
      'BRIPDA Siti Rahma,siti@spn.polri.go.id,123456,siswa,Diktuk,98041290,Bintara Remaja\n' +
      'AIPTU Budi Santoso,budi@spn.polri.go.id,123456,gadik,Dikbang,85031122,Instruktur Utama';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Template_Import_Akun_SIPAKAR_RBT.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('Template file Excel/CSV berhasil diunduh!', 'success');
  }

  openBatchModal() {
    this.batchFileName.set('');
    this.batchParsedCount.set(0);
    this.batchPreviewData.set([]);
    this.showBatchModal.set(true);
  }

  closeBatchModal() {
    this.showBatchModal.set(false);
  }

  onBatchFileDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.parseBatchFile(file);
  }

  onBatchFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) this.parseBatchFile(file);
  }

  parseBatchFile(file: File) {
    this.batchFileName.set(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const rows = this.parseCSV(text);
        this.batchPreviewData.set(rows);
        this.batchParsedCount.set(rows.length);
      };
      reader.readAsText(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as ArrayBuffer;
        const rows = this.parseXLSXSimple(data);
        this.batchPreviewData.set(rows);
        this.batchParsedCount.set(rows.length);
      };
      reader.readAsArrayBuffer(file);
    } else {
      this.showToast('Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv', 'error');
    }
  }

  parseCSV(text: string): any[] {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = this.splitCSVLine(lines[0]);
    const result: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = this.splitCSVLine(lines[i]);
      if (cols.length < 2) continue;

      const row: any = {};
      headers.forEach((h, idx) => {
        const key = h.trim();
        row[key] = (cols[idx] || '').trim();
      });

      if (!row.name && row.Nama) row.name = row.Nama;
      if (!row.email && row.Email) row.email = row.Email;
      if (!row.role && row.Role) row.role = row.Role;
      if (!row.spesialisasi && (row.Pendidikan || row.Spesialisasi)) row.spesialisasi = row.Pendidikan || row.Spesialisasi;

      if (row.name || row.Nama || row.email || row.Email) {
        result.push(row);
      }
    }
    return result;
  }

  splitCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === ';') && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  parseXLSXSimple(data: ArrayBuffer): any[] {
    try {
      const uint8 = new Uint8Array(data);
      const files = this.unzipSimple(uint8);
      const sharedStringsXml = files['xl/sharedStrings.xml'] || '';
      const strings = this.extractSharedStrings(sharedStringsXml);
      const sheetXml = files['xl/worksheets/sheet1.xml'] || '';
      return this.extractSheetRows(sheetXml, strings);
    } catch (e) {
      const text = new TextDecoder().decode(data);
      return this.parseCSV(text);
    }
  }

  unzipSimple(data: Uint8Array): { [key: string]: string } {
    const files: { [key: string]: string } = {};
    let offset = 0;
    const view = new DataView(data.buffer);

    while (offset < data.length - 4) {
      const sig = view.getUint32(offset, true);
      if (sig !== 0x04034b50) break;

      const compMethod = view.getUint16(offset + 8, true);
      const compSize = view.getUint32(offset + 18, true);
      const uncompSize = view.getUint32(offset + 22, true);
      const nameLen = view.getUint16(offset + 26, true);
      const extraLen = view.getUint16(offset + 28, true);
      const nameBytes = data.slice(offset + 30, offset + 30 + nameLen);
      const fileName = new TextDecoder().decode(nameBytes);
      const dataStart = offset + 30 + nameLen + extraLen;

      if (compMethod === 0) {
        const content = data.slice(dataStart, dataStart + uncompSize);
        files[fileName] = new TextDecoder().decode(content);
      } else {
        const content = data.slice(dataStart, dataStart + compSize);
        try {
          const decompressed = this.inflateRaw(content);
          files[fileName] = new TextDecoder().decode(decompressed);
        } catch {}
      }

      offset = dataStart + compSize;
    }
    return files;
  }

  inflateRaw(data: Uint8Array): Uint8Array {
    return data;
  }

  extractSharedStrings(xml: string): string[] {
    const strings: string[] = [];
    const regex = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      strings.push(match[1]);
    }
    return strings;
  }

  extractSheetRows(xml: string, strings: string[]): any[] {
    const rows: any[] = [];
    const rowRegex = /<row[^>]*>([\s\S]*?)<\/row>/g;
    const cellRegex = /<c[^>]*r="([A-Z])(\d+)"[^>]*(?:t="([^"]*)")?[^>]*>(?:<v>([^<]*)<\/v>)?/g;
    
    let rowMatch;
    let headers: string[] = [];
    
    while ((rowMatch = rowRegex.exec(xml)) !== null) {
      const rowContent = rowMatch[1];
      const cells: { [key: string]: string } = {};
      let cellMatch;
      
      cellRegex.lastIndex = 0;
      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        const col = cellMatch[1];
        const type = cellMatch[3];
        const value = cellMatch[4] || '';
        
        if (type === 's' && strings[parseInt(value)]) {
          cells[col] = strings[parseInt(value)];
        } else {
          cells[col] = value;
        }
      }

      const rowData = Object.keys(cells).sort().map(k => cells[k]);
      
      if (headers.length === 0) {
        headers = rowData;
      } else if (rowData.length > 0) {
        const obj: any = {};
        headers.forEach((h, i) => {
          obj[h.trim()] = (rowData[i] || '').trim();
        });
        if (obj.Nama || obj.name || obj.Email || obj.email) {
          if (!obj.name && obj.Nama) obj.name = obj.Nama;
          if (!obj.email && obj.Email) obj.email = obj.Email;
          if (!obj.spesialisasi && (obj.Pendidikan || obj.Spesialisasi)) obj.spesialisasi = obj.Pendidikan || obj.Spesialisasi;
          rows.push(obj);
        }
      }
    }
    return rows;
  }

  submitBatchImport() {
    const data = this.batchPreviewData();
    if (data.length === 0) return;

    this.submitting.set(true);
    const token = sessionStorage.getItem('rbt_token');
    this.http.post<any>(`${this.apiUrl}/users/batch`, { users: data }, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.showToast(res.message || 'Impor batch selesai!', 'success');
        this.closeBatchModal();
        this.loadUsers();
      },
      error: (err) => {
        this.submitting.set(false);
        this.showToast(err.error?.message || 'Gagal mengimpor batch.', 'error');
      }
    });
  }

  formatDate(d: string): string {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toast.set(msg);
    this.toastType.set(type);
    setTimeout(() => this.toast.set(''), 4000);
  }
}
