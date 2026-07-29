import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component').then(m => m.LandingComponent),
    pathMatch: 'full',
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'dashboard',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'gadik/dashboard',
    canActivate: [authGuard, () => import('./core/guards/role.guard').then(m => m.gadikGuard)],
    loadComponent: () =>
      import('./features/gadik/dashboard/gadik-dashboard.component').then(m => m.GadikDashboardComponent),
  },
  {
    path: 'siswa/dashboard',
    canActivate: [authGuard, () => import('./core/guards/role.guard').then(m => m.siswaGuard)],
    loadComponent: () =>
      import('./features/siswa/dashboard/siswa-dashboard.component').then(m => m.SiswaDashboardComponent),
  },
  {
    path: 'mnj/dashboard',
    canActivate: [authGuard, () => import('./core/guards/role.guard').then(m => m.manajemenGuard)],
    loadComponent: () =>
      import('./features/manajemen/dashboard/mnj-dashboard.component').then(m => m.MnjDashboardComponent),
  },
  // Gadik Features
  { path: 'gadik/materi', canActivate: [authGuard], loadComponent: () => import('./features/gadik/materi/gadik-materi.component').then(m => m.GadikMateriComponent) },
  { path: 'gadik/tugas', canActivate: [authGuard], loadComponent: () => import('./features/gadik/tugas/gadik-tugas.component').then(m => m.GadikTugasComponent) },
  { path: 'gadik/monitor', canActivate: [authGuard], loadComponent: () => import('./features/gadik/monitor/gadik-monitor.component').then(m => m.GadikMonitorComponent) },
  { path: 'gadik/realtime', canActivate: [authGuard], loadComponent: () => import('./features/gadik/realtime/gadik-realtime.component').then(m => m.GadikRealtimeComponent) },
  { path: 'gadik/soal', canActivate: [authGuard], loadComponent: () => import('./features/gadik/soal/gadik-soal.component').then(m => m.GadikSoalComponent) },
  { path: 'gadik/sertifikasi', canActivate: [authGuard], loadComponent: () => import('./features/gadik/sertifikasi/gadik-sertifikasi.component').then(m => m.GadikSertifikasiComponent) },
  // Siswa Features
  { path: 'siswa/simulasi', canActivate: [authGuard], loadComponent: () => import('./features/siswa/simulasi/siswa-simulasi.component').then(m => m.SiswaSimulasiComponent) },
  { path: 'siswa/tugas', canActivate: [authGuard], loadComponent: () => import('./features/siswa/tugas/siswa-tugas.component').then(m => m.SiswaTugasComponent) },
  { path: 'siswa/latihan', canActivate: [authGuard], loadComponent: () => import('./features/siswa/latihan/siswa-latihan.component').then(m => m.SiswaLatihanComponent) },
  { path: 'siswa/ranking', canActivate: [authGuard], loadComponent: () => import('./features/siswa/ranking/siswa-ranking.component').then(m => m.SiswaRankingComponent) },
  { path: 'siswa/sertifikasi', canActivate: [authGuard], loadComponent: () => import('./features/siswa/sertifikasi/siswa-sertifikasi.component').then(m => m.SiswaSertifikasiComponent) },
  // Manajemen Features
  { path: 'mnj/akun', canActivate: [authGuard], loadComponent: () => import('./features/manajemen/akun/mnj-akun.component').then(m => m.MnjAkunComponent) },
  { path: 'mnj/soal', canActivate: [authGuard], loadComponent: () => import('./features/manajemen/soal/mnj-soal.component').then(m => m.MnjSoalComponent) },
  { path: 'mnj/materi', canActivate: [authGuard], loadComponent: () => import('./features/manajemen/materi/mnj-materi.component').then(m => m.MnjMateriComponent) },
  { path: 'mnj/api', canActivate: [authGuard], loadComponent: () => import('./features/manajemen/api/mnj-api.component').then(m => m.MnjApiComponent) },
  
  {
    path: 'simulation',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/simulation/input/simulation-input.component').then(m => m.SimulationInputComponent),
  },
  {
    path: 'simulation/result/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/simulation/result/simulation-result.component').then(m => m.SimulationResultComponent),
  },
  {
    path: 'history',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/history/history.component').then(m => m.HistoryComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
