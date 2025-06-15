import { gun } from '@/lib/gun';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'


export const Route = createFileRoute('/_auth')({
    beforeLoad({location}) {
        const user = gun.user().recall({ sessionStorage: true })
        const isLoggedIn = !!user.is
        if (!isLoggedIn && location.pathname !== '/auth') {
            throw redirect({ to: '/auth', search: { m: 'login', redirect: location.pathname }, replace: true });
        }
        return true;
    },
    component: Outlet,
})