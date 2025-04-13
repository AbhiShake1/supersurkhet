import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'

type Testimonial = {
    name: string
    role: string
    image: string
    quote: string
}

const testimonials: Testimonial[] = [
    {
        name: 'Sarita Thapa',
        role: 'Owner, Surkhet Handicrafts',
        image: 'https://randomuser.me/api/portraits/women/1.jpg',
        quote: 'As a small business owner, I was hesitant about going digital. But with SuperSurkhet\'s free platform, I\'ve been able to showcase my handicrafts to customers across Nepal without any cost. The platform is so easy to use!',
    },
    {
        name: 'Ramesh Poudel',
        role: 'CEO, TechVally Solutions',
        image: 'https://randomuser.me/api/portraits/men/2.jpg',
        quote: 'The data ownership aspect of SuperSurkhet is revolutionary. As a tech company, we value having complete control over our client data while still being able to leverage powerful cloud infrastructure.',
    },
    {
        name: 'Binita Sharma',
        role: 'Founder, Digital Farmers Nepal',
        image: 'https://randomuser.me/api/portraits/women/3.jpg',
        quote: 'SuperSurkhet has transformed how we connect farmers with buyers. Their platform helped us create a digital marketplace that\'s free for small farmers, making technology accessible to everyone.',
    },
    {
        name: 'Krishna KC',
        role: 'Manager, Surkhet Retail Association',
        image: 'https://randomuser.me/api/portraits/men/4.jpg',
        quote: 'The decentralized infrastructure has given our local retailers the confidence to go digital. We know our business data stays in Surkhet, and the free tier has helped many small shops start their digital journey.',
    },
    {
        name: 'Anjali Gurung',
        role: 'Director, Mountain View Academy',
        image: 'https://randomuser.me/api/portraits/women/5.jpg',
        quote: 'As our school grew, SuperSurkhet\'s enterprise solutions scaled perfectly with us. Their platform has helped us digitize our entire administration while keeping student data secure and locally hosted.',
    },
    {
        name: 'Dipak Adhikari',
        role: 'Owner, Fresh Foods Market',
        image: 'https://randomuser.me/api/portraits/men/6.jpg',
        quote: 'Starting with their free tier helped us test digital ordering without any risk. Now we\'re handling hundreds of orders daily through their platform, and our customers love the convenience.',
    }
]

const chunkArray = (array: Testimonial[], chunkSize: number): Testimonial[][] => {
    const result: Testimonial[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize))
    }
    return result
}

const testimonialChunks = chunkArray(testimonials, Math.ceil(testimonials.length / 3))

export default function WallOfLoveSection() {
    return (
        <section id="customers">
            <div className="py-16 md:py-32">
                <div className="mx-auto max-w-6xl px-6">
                    <div className="text-center">
                        <h2 className="text-title text-3xl font-semibold">Trusted by Surkhet's Business Leaders</h2>
                        <p className="text-body mt-6">See how local businesses are driving Surkhet's digital transformation</p>
                    </div>
                    <div className="mt-8 grid gap-3 sm:grid-cols-2 md:mt-12 lg:grid-cols-3">
                        {testimonialChunks.map((chunk, chunkIndex) => (
                            <div key={chunkIndex} className="space-y-3">
                                {chunk.map(({ name, role, quote, image }, index) => (
                                    <Card key={index}>
                                        <CardContent className="grid grid-cols-[auto_1fr] gap-3 pt-6">
                                            <Avatar className="size-9">
                                                <AvatarImage alt={name} src={image} loading="lazy" width="120" height="120" />
                                                <AvatarFallback>ST</AvatarFallback>
                                            </Avatar>

                                            <div>
                                                <h3 className="font-medium">{name}</h3>

                                                <span className="text-muted-foreground block text-sm tracking-wide">{role}</span>

                                                <blockquote className="mt-3">
                                                    <p className="text-gray-700 dark:text-gray-300">{quote}</p>
                                                </blockquote>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
