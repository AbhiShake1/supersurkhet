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
import { gun } from "@/lib/gun";
import { DialogClose } from '@radix-ui/react-dialog';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from "react";
import { toast } from 'sonner';

export const Route = createFileRoute('/_restaurants/rbd')({
    component: RouteComponent,
})

type Message = {
    text: string;
    sender: string;
    timestamp: string;
    // Gun adds a unique identifier (`_`) to each data item.  We'll make it optional
    _: {
        soul: string;
    };
}

function RouteComponent() {
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        const chatRoom = gun.get("rbd").map();

        chatRoom.on((data, key: string) => {
            if (data) {
                setMessages((prevMessages) => {
                    // Avoid duplicates if Gun sends the same data multiple times
                    if (!prevMessages.find((msg) => msg._?.soul === key)) {
                        //  Handle the case where data might not have the soul.
                        const messageWithSoul: Message = {
                            ...data,
                            _: { soul: key } // Ensure every message has the soul
                        }
                        return [...prevMessages, messageWithSoul];
                    }
                    return prevMessages;
                });
            }
        });
        
        return () => {
            chatRoom.off();
        };
    }, [])

    const sendMessage = (newMessage: string) => {
        if (newMessage.trim()) {
            const messageObject: Omit<Message, '_'> = { // Omit the _ property since Gun will add it.
                text: newMessage,
                sender: 'Anonymous', // In a real app, you'd handle user identity
                timestamp: new Date().toLocaleTimeString(),
            };
            gun.get("rbd").set(messageObject);
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
        <section className="flex flex-col gap-1">
            {messages.map(m => <h3>{`${m.sender} says ==> ${m.text} at ${m.timestamp}`}</h3>)}
        </section>
    </div>
}
