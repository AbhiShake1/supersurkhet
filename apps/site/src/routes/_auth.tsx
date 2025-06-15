import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';


export const Route = createFileRoute('/_auth')({
    beforeLoad({ location, context }) {
        if (!context.auth.isAuthenticated && location.pathname !== '/auth') {
            throw redirect({ to: '/auth', search: { m: 'login', redirect: location.pathname }, replace: true });
        }
        return true;
    },
    component: Outlet,
})