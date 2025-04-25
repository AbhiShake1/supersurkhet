import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useGet } from '@/lib/gun/hooks'
import { cn } from '@/lib/utils'
import { createFileRoute } from '@tanstack/react-router'
import { Filter, Search, Share2, Star } from 'lucide-react'
import { Carousel } from '@/components/ui/carousel'

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
          <Carousel
            slides={[
              {
                title: "Family Special",
                button: "View Offer",
                src: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1974&auto=format&fit=crop"
              },
              {
                title: "Happy Hours",
                button: "Learn More",
                src: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1974&auto=format&fit=crop"
              },
              {
                title: "Weekend Brunch",
                button: "Book Now",
                src: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?q=80&w=1970&auto=format&fit=crop"
              },
              {
                title: "Chef's Table Experience",
                button: "Reserve Now",
                src: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?q=80&w=2070&auto=format&fit=crop"
              },
              {
                title: "Seasonal Menu",
                button: "Explore Menu",
                src: "https://images.unsplash.com/photo-1547496502-affa22d38842?q=80&w=2077&auto=format&fit=crop"
              },
              {
                title: "Wine Tasting Events",
                button: "Join Event",
                src: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=2070&auto=format&fit=crop"
              },
              {
                title: "Private Dining",
                button: "Inquire Now",
                src: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop"
              },
              {
                title: "Cooking Classes",
                button: "Register",
                src: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop"
              },
              {
                title: "Local Ingredients",
                button: "Learn More",
                src: "https://images.unsplash.com/photo-1506484381205-f7945653044d?q=80&w=2070&auto=format&fit=crop"
              },
              {
                title: "Festive Celebrations",
                button: "Book Event",
                src: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1974&auto=format&fit=crop"
              },
              {
                title: "Corporate Events",
                button: "Contact Us",
                src: "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?q=80&w=2070&auto=format&fit=crop"
              },
              {
                title: "Gift Cards",
                button: "Purchase Now",
                src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop"
              }
            ]}
          />
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
                    <h3 className="font-medium">{item.name}</h3>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-secondary">4.5</span>
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
