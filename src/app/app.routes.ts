import { Routes } from '@angular/router';
import { Dashboard } from './components/dashboard/dashboard';
import { Login } from './components/login/login';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', component: Dashboard, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];