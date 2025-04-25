import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useGet } from '@/lib/gun/hooks'
import { cn } from '@/lib/utils'
import { createFileRoute } from '@tanstack/react-router'
import { Filter, Search, Share2, Star } from 'lucide-react'

export const Route = createFileRoute('/_business/_demos/restaurant/')({
  component: RouteComponent,
})

function RouteComponent() {
  const menuItems = useGet("menuItem", "restaurant")

  return (
    <div className="min-h-screen bg-white">
      <main className="p-4 pb-20">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="search"
            placeholder="Search our delicious menu..."
            className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-200 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
        </div>

        {/* Promotional Banner */}
        <div className="mb-8 relative">
          <div className="overflow-x-auto hide-scrollbar">
            <div className="flex gap-4">
              <div className="min-w-[300px] h-[150px] rounded-xl overflow-hidden relative">
                <img src="/promo-1.jpg" alt="Special Offer" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex items-center p-6">
                  <div className="text-white">
                    <h3 className="text-2xl font-bold mb-2">Family Special</h3>
                    <p className="text-sm">20% off on family platters</p>
                  </div>
                </div>
              </div>
              <div className="min-w-[300px] h-[150px] rounded-xl overflow-hidden relative">
                <img src="/promo-2.jpg" alt="Happy Hours" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex items-center p-6">
                  <div className="text-white">
                    <h3 className="text-2xl font-bold mb-2">Happy Hours</h3>
                    <p className="text-sm">15% off between 2-5 PM</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-600" />
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <div className="w-2 h-2 rounded-full bg-gray-300" />
          </div>
        </div>

        {/* Menu Categories */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Our Menu</h2>
            <Filter className="w-5 h-5 text-gray-400" />
          </div>
          <div className="overflow-x-auto hide-scrollbar">
            <div className="flex gap-6">
              {[
                { name: 'Starters', icon: '🥗' },
                { name: 'Main Course', icon: '🍛' },
                { name: 'Breads', icon: '🫓' },
                { name: 'Beverages', icon: '🥤' },
                { name: 'Desserts', icon: '🍨' }
              ].map((category) => (
                <div key={category.name} className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl">
                    {category.icon}
                  </div>
                  <span className="text-sm text-gray-700">{category.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Today's Hot Deals */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">Featured Dishes</h2>
              <p className="text-sm text-gray-500">Our chef's special recommendations</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {menuItems ? menuItems.map((item, index) => (
              <Card key={index} className="overflow-hidden border-gray-200">
                <div className="relative">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-48 object-cover"
                  />
                  {item.isSpecial && (
                    <div className="absolute top-3 left-3 bg-red-600 text-white text-sm px-2 py-1 rounded">
                      Chef's Special
                    </div>
                  )}
                  <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-gray-600">4.5</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-red-600 font-semibold">Rs. {item.price}</span>
                    </div>
                    <Button className="bg-red-600 hover:bg-red-700 text-white">
                      Add to Cart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )) : null}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3">
        <div className="flex items-center justify-around">
          {[
            { icon: '🏠', label: 'Home', active: true },
            { icon: '❤️', label: 'Favorites' },
            { icon: '🛒', label: 'Cart' },
            { icon: '👤', label: 'Profile' }
          ].map((item) => (
            <button
              key={item.label}
              className={cn(
                'flex flex-col items-center gap-1',
                item.active ? 'text-red-600' : 'text-gray-500'
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <style>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
