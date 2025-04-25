import { useGet } from '@/lib/gun/hooks'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_business/_demos/restaurant/')({
  component: RouteComponent,
})

function RouteComponent() {
  const menuItems = useGet("menuItem", "restaurant")

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Search and Filter Section */}
      <div className="flex gap-2">
        <Input
          type="search"
          placeholder="Search your favorite food"
          className="flex-1"
        />
        <Button variant="default" className="">
          Filter
        </Button>
      </div>

      {/* Categories Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Category</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
          {['Food', 'Drink', 'Snack', 'Bakery', 'Cake'].map((category) => (
            <Card key={category} className="p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-0 flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  {/* Icon placeholder */}
                </div>
                <span className="text-sm font-medium">{category}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Menu Items Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recommended Menu</h2>
          <button className="text-gray-500">•••</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems ? menuItems.map((item, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-48 object-cover"
              />
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-500">Food</p>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-accent-foreground font-semibold">Rs. {item.price}</span>
                  <Button variant="default" className="">
                    Detail
                  </Button>
                </div>
              </CardContent>
            </Card>
          )) : null}
        </div>
      </div>
    </div>
  )
}
