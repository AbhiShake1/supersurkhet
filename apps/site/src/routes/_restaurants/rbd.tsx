import { Scanner } from '@/components/ui/scanner';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';

export const Route = createFileRoute('/_restaurants/rbd')({
    component: RouteComponent,
})

function RouteComponent() {
    return <div className='h-screen w-screen flex justify-center'>
        <Scanner scanDelay={4000} onScan={(result) => toast.info(JSON.stringify(result))} />
    </div>
}
