import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from '@tanstack/react-router'
import { Check } from 'lucide-react'

export default function Pricing() {
    return (
        <section className="py-16 md:py-32">
            <div className="mx-auto max-w-6xl px-6">
                <div className="mx-auto max-w-2xl space-y-6 text-center">
                    <h1 className="text-center text-4xl font-semibold lg:text-5xl">Community-First Pricing</h1>
                    <p>Empowering Surkhet's businesses with accessible technology. Our pricing reflects our commitment to making digital transformation possible for everyone in our community.</p>
                </div>

                <div className="mt-8 grid gap-6 md:mt-20 md:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-medium">Community</CardTitle>

                            <span className="my-3 block text-2xl font-semibold">Free</span>

                            <CardDescription className="text-sm">For Small Businesses</CardDescription>
                            <Button asChild variant="outline" className="mt-4 w-full">
                                <Link to="/">Get Started</Link>
                            </Button>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <hr className="border-dashed" />

                            <ul className="list-outside space-y-3 text-sm">
                                {['Full Business Profile', 'Local Data Storage', 'Digital Storefront', 'Basic Analytics', 'Community Support', 'Zero Commission'].map((item, index) => (
                                    <li key={index} className="flex items-center gap-2">
                                        <Check className="size-3" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="relative">
                        <span className="bg-linear-to-br/increasing absolute inset-x-0 -top-3 mx-auto flex h-6 w-fit items-center rounded-full from-purple-400 to-amber-300 px-3 py-1 text-xs font-medium text-amber-950 ring-1 ring-inset ring-white/20 ring-offset-1 ring-offset-gray-950/5">Popular</span>

                        <CardHeader>
                            <CardTitle className="font-medium">Growth</CardTitle>

                            <span className="my-3 block text-2xl font-semibold">Starting at ₨. 499/mo</span>

                            <CardDescription className="text-sm">For Growing Businesses</CardDescription>

                            <Button asChild className="mt-4 w-full">
                                <Link to="/">Get Started</Link>
                            </Button>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <hr className="border-dashed" />

                            <ul className="list-outside space-y-3 text-sm">
                                {['All Community Features', 'Advanced Analytics', 'Priority Support', 'Custom Domain', 'Multiple User Access', 'Inventory Management', 'Payment Integration', 'Marketing Tools', 'API Access', 'Enhanced Security'].map((item, index) => (
                                    <li key={index} className="flex items-center gap-2">
                                        <Check className="size-3" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="font-medium">Enterprise</CardTitle>

                            <span className="my-3 block text-2xl font-semibold">Custom</span>

                            <CardDescription className="text-sm">For Large Organizations</CardDescription>

                            <Button asChild variant="outline" className="mt-4 w-full">
                                <Link to="/">Get Started</Link>
                            </Button>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <hr className="border-dashed" />

                            <ul className="list-outside space-y-3 text-sm">
                                {['All Growth Features', 'Unlimited Storage', 'Dedicated Support', 'Custom Integration', 'Advanced Security', 'SLA Guarantee', 'Compliance Support', 'Training & Onboarding'].map((item, index) => (
                                    <li key={index} className="flex items-center gap-2">
                                        <Check className="size-3" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    )
}
