import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Scanner } from '@/components/ui/scanner';
import { useGet, useSet } from "@/lib/gun/index";
// import { useGet, useSet } from "@/lib/gun";
import { DialogClose } from '@radix-ui/react-dialog';
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';

export const Route = createFileRoute('/_restaurants/rbd')({
    component: RouteComponent,
})

function RouteComponent() {
    const messages = useGet("business.restaurant", "rbdtest2")
    const syncMessage = useSet("business.restaurant", "rbdtest2")

    const sendMessage = (newMessage: string) => {
        if (newMessage.trim()) {
            syncMessage({
                address: "surkhet",
                city: "birendranagar",
                created_by: "Anon",
                name: newMessage,
                // menu: [],
                timestamp: Date.now(),
            })
        }
    };

    return <div className='h-screen w-screen flex flex-col gap-2 items-center justify-center'>
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">Open QR Scanner</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Surkhet</DialogTitle>
                    <DialogDescription>
                        Scan QR Code to get restaurant details
                    </DialogDescription>
                </DialogHeader>
                <Scanner scanDelay={4000} onScan={(result) => toast.info(result?.[0]?.rawValue)} />
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <form className='flex flex-row gap-2' onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const message = formData.get('message')
            if (!message) return;
            sendMessage(message as string)
            toast.info("posted")
        }}>
            <Input name="message" placeholder='say something' />
            <Button type='submit'>Post</Button>
        </form>
        <ScrollArea className="flex flex-col gap-1 h-96">
            {messages.map((m, i) => <h3 key={m._?.soul ?? i}>{`${m.created_by} says ==> ${m.name} at ${m.timestamp}`}</h3>)}
        </ScrollArea>
    </div>
}
