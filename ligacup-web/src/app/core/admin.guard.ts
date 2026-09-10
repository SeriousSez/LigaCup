import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return auth.isLoggedIn()
        ? true
        : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Account management is limited to administrators. */
export const administratorGuard: CanActivateFn = (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) {
        return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    return auth.isAdmin() ? true : router.createUrlTree(['/admin']);
};
