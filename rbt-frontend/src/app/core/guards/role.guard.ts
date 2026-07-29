import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const gadikGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.user()?.role;
  
  if (role === 'gadik' || role === 'manajemen') {
    return true;
  }
  
  if (role === 'siswa') return router.parseUrl('/siswa/dashboard');
  return router.parseUrl('/login');
};

export const siswaGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.user()?.role;
  
  if (role === 'siswa' || role === 'manajemen') {
    return true;
  }
  
  if (role === 'gadik') return router.parseUrl('/gadik/dashboard');
  return router.parseUrl('/login');
};

export const manajemenGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  if (auth.user()?.role === 'manajemen') {
    return true;
  }
  
  const role = auth.user()?.role;
  if (role === 'gadik') return router.parseUrl('/gadik/dashboard');
  if (role === 'siswa') return router.parseUrl('/siswa/dashboard');
  
  return router.parseUrl('/login');
};

export const gadikOrManajemenGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  const role = auth.user()?.role;
  if (role === 'gadik' || role === 'manajemen') {
    return true;
  }
  
  if (role === 'siswa') return router.parseUrl('/siswa/dashboard');
  return router.parseUrl('/login');
};
