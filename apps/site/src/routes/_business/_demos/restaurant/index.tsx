import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Carousel } from '@/components/ui/carousel'
import { Credenza, CredenzaContent } from '@/components/ui/credenza'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useGet } from '@/lib/gun/hooks'
import { createFileRoute } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Coffee, Dessert, MinusCircle, MinusIcon, PlusCircle, PlusIcon, Search, ShoppingCart, ShoppingCartIcon, Soup, Star, Trash2, UtensilsCrossed } from 'lucide-react'
import { createContext, useContext, useEffect, useState } from 'react'

export const Route = createFileRoute('/_business/_demos/restaurant/')({
  component: () => <CartProvider>
    <RouteComponent />
  </CartProvider>,
})

export interface CartItem extends MenuItemType {
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: MenuItemType, quantity: number) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  itemCount: number
  subtotal: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [itemCount, setItemCount] = useState(0)
  const [subtotal, setSubtotal] = useState(0)

  // Update counts when items change
  useEffect(() => {
    const count = items.reduce((total, item) => total + item.quantity, 0)
    const total = items.reduce((total, item) => total + item.price * item.quantity, 0)

    setItemCount(count)
    setSubtotal(total)
  }, [items])

  const addItem = (item: MenuItemType, quantity: number) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id)

      if (existingItem) {
        return prevItems.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i))
      } else {
        return [...prevItems, { ...item, quantity }]
      }
    })
  }

  const removeItem = (itemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId))
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId)
      return
    }

    setItems((prevItems) => prevItems.map((item) => (item.id === itemId ? { ...item, quantity } : item)))
  }

  const clearCart = () => {
    setItems([])
  }

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

interface MenuItemProps {
  item: MenuItemType
}

export function MenuItem({ item }: MenuItemProps) {
  const [quantity, setQuantity] = useState(0)
  const [isAdding, setIsAdding] = useState(false)
  const { addItem } = useCart()

  const incrementQuantity = () => {
    setQuantity(quantity + 1)
  }

  const decrementQuantity = () => {
    if (quantity > 0) {
      setQuantity(quantity - 1)
    }
  }

  const addToCart = () => {
    if (quantity > 0) {
      setIsAdding(true)

      addItem(item, quantity)
      setIsAdding(false)
      setQuantity(0)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5 }}
    >
      <Card className="overflow-clip h-full flex flex-col border-muted bg-card/50 backdrop-blur-sm dark:bg-card/30 dark:border-muted/30 hover:shadow-lg hover:shadow-amber-500/5 dark:hover:shadow-amber-400/5 transition-all duration-300">
        <div className="relative h-56 w-full overflow-hidden group  rounded-t-md">
          <img
            src={item.image}
            alt={item.name}
            className="object-cover transition-transform duration-500 group-hover:scale-110 w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {item.isSpecial && (
            <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
              Chef's Special
            </div>
          )}

          {item.rating && (
            <div className="absolute bottom-3 left-3 flex items-center bg-black/60 text-white px-2 py-1 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${i < (item.rating ?? 0) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`}
                />
              ))}
              <span className="ml-1">{item.rating}</span>
            </div>
          )}
        </div>

        <CardContent className="pt-5 flex-grow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-semibold">{item.name}</h3>
            <span className="font-bold text-lg text-amber-600 dark:text-amber-400">${item.price.toFixed(2)}</span>
          </div>
          <p className="text-muted-foreground text-sm mb-4">{item.description}</p>
          {item.dietaryInfo && (
            <div className="flex flex-wrap gap-1 mb-2">
              {item.dietaryInfo.map((info) => (
                <span
                  key={info}
                  className="px-2 py-1 bg-muted/50 dark:bg-muted/20 text-xs rounded-full border border-muted/50 dark:border-muted/30"
                >
                  {info}
                </span>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t border-muted/50 dark:border-muted/30 pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-amber-500/50 dark:border-amber-400/50 hover:bg-amber-500/10 dark:hover:bg-amber-400/10"
                onClick={decrementQuantity}
                disabled={quantity === 0}
              >
                <MinusIcon className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-amber-500/50 dark:border-amber-400/50 hover:bg-amber-500/10 dark:hover:bg-amber-400/10"
                onClick={incrementQuantity}
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={addToCart}
              disabled={quantity === 0 || isAdding}
              className={`flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500 hover:from-amber-600 hover:to-orange-700 dark:hover:from-amber-500 dark:hover:to-orange-600 text-white ${isAdding ? "animate-pulse" : ""}`}
            >
              {isAdding ? (
                "Adding..."
              ) : (
                <>
                  <ShoppingCartIcon className="h-4 w-4" />
                  Add to Cart
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

interface MenuSectionProps {
  title: string
  items: MenuItemType[]
}

export function MenuSection({ title, items }: MenuSectionProps) {
  const getCategoryIcon = () => {
    switch (title) {
      case "Appetizers":
        return <Soup className="h-6 w-6 mr-2 text-amber-500 dark:text-amber-400" />
      case "Main Courses":
        return <UtensilsCrossed className="h-6 w-6 mr-2 text-amber-500 dark:text-amber-400" />
      case "Desserts":
        return <Dessert className="h-6 w-6 mr-2 text-amber-500 dark:text-amber-400" />
      case "Beverages":
        return <Coffee className="h-6 w-6 mr-2 text-amber-500 dark:text-amber-400" />
      default:
        return <UtensilsCrossed className="h-6 w-6 mr-2 text-amber-500 dark:text-amber-400" />
    }
  }

  return (
    <section className="mb-16">
      <div className="flex items-center mb-6">
        {getCategoryIcon()}
        <h2 className="text-2xl font-semibold pb-2 border-b border-amber-500/30 dark:border-amber-400/30">{title}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {items.map((item) => (
          <MenuItem key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}

export interface MenuItemType {
  id: string
  name: string
  description: string
  price: number
  image: string
  isSpecial?: boolean
  dietaryInfo?: string[]
  rating?: number
}

type MenuDataType = {
  [key: string]: MenuItemType[]
}

export const menuData: MenuDataType = {
  Appetizers: [
    {
      id: "app1",
      name: "Crispy Calamari",
      description: "Lightly fried calamari served with a zesty marinara sauce and lemon wedges.",
      price: 12.99,
      image: "https://images.unsplash.com/photo-1604152135912-04a022e23696?w=600&h=400&q=80",
      dietaryInfo: ["Seafood"],
      rating: 4,
    },
    {
      id: "app2",
      name: "Bruschetta",
      description: "Toasted baguette topped with fresh tomatoes, basil, garlic, and extra virgin olive oil.",
      price: 9.99,
      image: "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&h=400&q=80",
      dietaryInfo: ["Vegetarian"],
      rating: 5,
    },
    {
      id: "app3",
      name: "Spinach Artichoke Dip",
      description: "Creamy blend of spinach, artichokes, and cheeses, served with tortilla chips.",
      price: 10.99,
      image: "https://images.unsplash.com/photo-1576506295286-5cda18df43e7?w=600&h=400&q=80",
      dietaryInfo: ["Vegetarian", "Gluten-Free"],
      rating: 4,
    },
  ],
  "Main Courses": [
    {
      id: "main1",
      name: "Grilled Salmon",
      description:
        "Fresh Atlantic salmon fillet, grilled to perfection, served with seasonal vegetables and lemon herb sauce.",
      price: 24.99,
      image: "https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=600&h=400&q=80",
      isSpecial: true,
      dietaryInfo: ["Seafood", "Gluten-Free"],
      rating: 5,
    },
    {
      id: "main2",
      name: "Filet Mignon",
      description: "8oz center-cut beef tenderloin, served with garlic mashed potatoes and roasted asparagus.",
      price: 32.99,
      image: "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=600&h=400&q=80",
      rating: 5,
    },
    {
      id: "main3",
      name: "Mushroom Risotto",
      description: "Creamy Arborio rice with wild mushrooms, white wine, and Parmesan cheese.",
      price: 18.99,
      image: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&h=400&q=80",
      dietaryInfo: ["Vegetarian", "Gluten-Free"],
      rating: 4,
    },
    {
      id: "main4",
      name: "Chicken Parmesan",
      description: "Breaded chicken breast topped with marinara sauce and melted mozzarella, served with spaghetti.",
      price: 19.99,
      image: "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=600&h=400&q=80",
      rating: 4,
    },
  ],
  Desserts: [
    {
      id: "des1",
      name: "Tiramisu",
      description: "Classic Italian dessert with layers of coffee-soaked ladyfingers and mascarpone cream.",
      price: 8.99,
      image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&h=400&q=80",
      isSpecial: true,
      rating: 5,
    },
    {
      id: "des2",
      name: "Chocolate Lava Cake",
      description: "Warm chocolate cake with a molten center, served with vanilla ice cream.",
      price: 9.99,
      image: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&h=400&q=80",
      rating: 4,
    },
    {
      id: "des3",
      name: "New York Cheesecake",
      description: "Rich and creamy cheesecake with a graham cracker crust, topped with fresh berries.",
      price: 8.99,
      image: "https://images.unsplash.com/photo-1567327825194-4b5f285561c9?w=600&h=400&q=80",
      rating: 4,
    },
  ],
  Beverages: [
    {
      id: "bev1",
      name: "Fresh Fruit Smoothie",
      description: "Blend of seasonal fruits with yogurt and honey.",
      price: 6.99,
      image: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=600&h=400&q=80",
      dietaryInfo: ["Vegetarian", "Gluten-Free"],
      rating: 4,
    },
    {
      id: "bev2",
      name: "Craft Lemonade",
      description: "Freshly squeezed lemons with a hint of mint and honey.",
      price: 4.99,
      image: "https://images.unsplash.com/photo-1499638673689-79a0b5115d87?w=600&h=400&q=80",
      dietaryInfo: ["Vegan", "Gluten-Free"],
      rating: 4,
    },
    {
      id: "bev3",
      name: "Espresso",
      description: "Rich, full-bodied espresso made from premium coffee beans.",
      price: 3.99,
      image: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&h=400&q=80",
      dietaryInfo: ["Vegan", "Gluten-Free"],
      rating: 5,
    },
  ],
}

interface CartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CartDialog({ open, onOpenChange }: CartDialogProps) {
  const { items, removeItem, updateQuantity, clearCart, subtotal } = useCart()

  const cartContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Your Order</h2>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <Separator className="mb-4" />

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-grow py-8 text-center">
          <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">Your cart is empty</h3>
          <p className="text-muted-foreground">Add some delicious items to get started!</p>
          <Button
            className="mt-6 bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500"
            onClick={() => onOpenChange(false)}
          >
            Browse Menu
          </Button>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-grow pr-4 -mr-4">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-3 py-3">
                    <div className="relative h-16 w-16 rounded-md overflow-hidden flex-shrink-0">
                      <img src={item.image} alt={item.name} className="object-cover" />
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-medium">{item.name}</h4>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full p-0"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <MinusCircle className="h-4 w-4" />
                          </Button>
                          <span className="w-6 text-center">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full p-0"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </motion.div>
              ))}
            </AnimatePresence>
          </ScrollArea>

          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between font-medium">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Tax</span>
              <span>${(subtotal * 0.08).toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between font-bold text-lg">
              <span>Total</span>
              <span>${(subtotal * 1.08).toFixed(2)}</span>
            </div>
            <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500 hover:from-amber-600 hover:to-orange-700">
              Proceed to Checkout
            </Button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaContent className="sm:max-w-[425px] max-h-[85vh]">{cartContent}</CredenzaContent>
    </Credenza>
  )
}

export function CartButton() {
  const { itemCount } = useCart()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {itemCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <Button
                onClick={() => setIsOpen(true)}
                className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500 hover:from-amber-600 hover:to-orange-700"
              >
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -top-2 -right-2 bg-white dark:bg-black text-amber-600 dark:text-amber-400 rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold">
                  {itemCount}
                </span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <CartDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}

function RouteComponent() {
  const menuItems = useGet("menuItem", "restaurant")

  return (
    <div className="min-h-screen overflow-x-hidden">
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

        {Object.entries(menuData).map(([category, items]) => (
          <MenuSection key={category} title={category} items={items} />
        ))}

        {/* Menu Categories */}
        {/* <div className="mb-8">
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
        </div> */}

        {/* Today's Hot Deals */}
        {/* <div>
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
        </div> */}
      </main>

      <CartButton />

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
