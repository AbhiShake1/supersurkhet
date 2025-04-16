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
import { Label } from "@/components/ui/label";
import { Scanner } from '@/components/ui/scanner';
import { useDelete, useGet, useCreate, useUpdate } from "@/lib/gun/index";
import { DialogClose } from '@radix-ui/react-dialog';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/_restaurants/rbd')({ component: RouteComponent })

interface RestaurantFormData {
    name: string;
    address: string;
    city: string;
}

function RouteComponent() {
    const messages = useGet("business.restaurant", "rbdtest2")
    const syncMessage = useCreate("business.restaurant", "rbdtest2")
    const deleteMessage = useDelete("business.restaurant", "rbdtest2")
    const updateMessage = useUpdate("business.restaurant", "rbdtest2")

    const [editingRestaurant, setEditingRestaurant] = useState<typeof messages[number] | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false)

    const handleDelete = (restaurant: typeof messages[number]): void => {
        if (!restaurant._?.soul) return;
        if (window.confirm('Are you sure you want to delete this restaurant?')) {
            deleteMessage(restaurant._?.soul)
            toast.success('Restaurant deleted successfully')
        }
    }

    const handleEdit = (restaurant: typeof messages[number]): void => {
        setEditingRestaurant(restaurant)
        setIsEditDialogOpen(true)
    }

    const handleUpdate = (message: typeof messages[number]): void => {
        if (!editingRestaurant?._?.soul) return;
        updateMessage(editingRestaurant._?.soul, {
            ...message,
            timestamp: Date.now(),
        })
        setIsEditDialogOpen(false)
        setEditingRestaurant(null)
        toast.success('Restaurant updated successfully')
    }

    const handleCreate = (formData: RestaurantFormData): void => {
        syncMessage({
            ...formData,
            created_by: "Anon",
            timestamp: Date.now(),
        })
        setIsEditDialogOpen(false)
        toast.success('Restaurant created successfully')
    }

    return <div className='container mx-auto p-4'>
        <div className='flex justify-between items-center mb-6'>
            <h1 className='text-2xl font-bold'>Restaurants</h1>
            <Button onClick={() => {
                setEditingRestaurant(null)
                setIsEditDialogOpen(true)
            }}>Add Restaurant</Button>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {messages.map((restaurant, i) => (
                <div key={restaurant._?.soul ?? i} className='bg-card rounded-lg shadow-md p-4'>
                    <div className='flex justify-between items-start mb-4'>
                        <div>
                            <h3 className='text-lg font-semibold'>{restaurant.name}</h3>
                            <p className='text-sm text-muted-foreground'>{restaurant.address}, {restaurant.city}</p>
                        </div>
                        <div className='flex gap-2'>
                            <Button variant='outline' size='sm' onClick={() => handleEdit(restaurant)}>Edit</Button>
                            <Button variant='destructive' size='sm' onClick={() => handleDelete(restaurant)}>Delete</Button>
                        </div>
                    </div>
                    <p className='text-sm text-muted-foreground'>Added by {restaurant.created_by}</p>
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingRestaurant ? 'Edit Restaurant' : 'Add Restaurant'}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={(e) => {
                                e.preventDefault()
                                const formData = new FormData(e.currentTarget)
                                const data = {
                                    name: formData.get('name') as string,
                                    address: formData.get('address') as string,
                                    city: formData.get('city') as string,
                                }
                                if (editingRestaurant) {
                                    handleUpdate({...restaurant, ...data})
                                } else {
                                    handleCreate(data)
                                }
                            }} className='space-y-4'>
                                <div className='space-y-2'>
                                    <Label htmlFor='name'>Name</Label>
                                    <Input
                                        id='name'
                                        name='name'
                                        defaultValue={editingRestaurant?.name}
                                        required
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='address'>Address</Label>
                                    <Input
                                        id='address'
                                        name='address'
                                        defaultValue={editingRestaurant?.address}
                                        required
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='city'>City</Label>
                                    <Input
                                        id='city'
                                        name='city'
                                        defaultValue={editingRestaurant?.city}
                                        required
                                    />
                                </div>
                                <DialogFooter>
                                    <Button type='submit'>{editingRestaurant ? 'Update' : 'Create'}</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            ))}
        </div>

        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className='fixed bottom-4 right-4'>Open QR Scanner</Button>
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
    </div>
}
