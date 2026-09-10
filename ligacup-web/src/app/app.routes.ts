import { Routes } from '@angular/router';
import { adminGuard, administratorGuard } from './core/admin.guard';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/home/home').then((module) => module.Home),
        title: 'Liga Cup',
    },
    {
        path: 'login',
        loadComponent: () => import('./pages/login/login').then((module) => module.Login),
        title: 'Sign in - Liga Cup',
    },
    {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/admin/admin-home').then((module) => module.AdminHome),
        title: 'Admin - Liga Cup',
    },
    {
        path: 'admin/users',
        canActivate: [administratorGuard],
        loadComponent: () => import('./pages/admin/admin-users').then((module) => module.AdminUsers),
        title: 'Brugere - Liga Cup',
    },
    {
        path: 'admin/:slug',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/admin/admin-setup').then((module) => module.AdminSetup),
        title: 'Setup - Liga Cup',
    },
    {
        path: 'admin/:slug/live',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/admin/live-console').then((module) => module.LiveConsole),
        title: 'Live console - Liga Cup',
    },
    {
        path: ':slug',
        loadComponent: () => import('./pages/tournament/tournament').then((module) => module.Tournament),
    },
    { path: '**', redirectTo: '' },
];
