import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Carousel } from '@/components/ui/carousel'
import { Credenza, CredenzaBody, CredenzaContent, CredenzaDescription, CredenzaFooter, CredenzaHeader, CredenzaTitle, CredenzaTrigger } from '@/components/ui/credenza'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useCreate, useGet, type NestedSchemaType } from '@gta/react-hooks'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { AnimatePresence, motion } from 'framer-motion'
import { groupBy } from 'lodash'
import { MinusCircle, MinusIcon, PlusCircle, PlusIcon, Search, ShoppingCart, ShoppingCartIcon, Trash2 } from 'lucide-react'
import { createContext, useContext, useEffect, useState } from 'react'
import { z } from 'zod'

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
      const existingItem = prevItems.find((i) => i._?.soul === item._?.soul)

      if (existingItem) {
        return prevItems.map((i) => (i._?.soul === item._?.soul ? { ...i, quantity: i.quantity + quantity } : i))
      } else {
        return [...prevItems, { ...item, quantity }]
      }
    })
  }

  const removeItem = (itemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item._?.soul !== itemId))
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId)
      return
    }

    setItems((prevItems) => prevItems.map((item) => (item._?.soul === itemId ? { ...item, quantity } : item)))
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
            src={item.imageUrl}
            alt={item.name}
            className="object-cover transition-transform duration-500 group-hover:scale-110 w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {item.isSpecial && (
            <div className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
              Chef's Special
            </div>
          )}

          {/* {item.rating && (
            <div className="absolute bottom-3 left-3 flex items-center bg-black/60 text-white px-2 py-1 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${i < (item.rating!) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`}
                />
              ))}
              <span className="ml-1">{item.rating}</span>
            </div>
          )} */}
        </div>

        <CardContent className="pt-5 flex-grow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-semibold">{item.name}</h3>
            {
              item.price &&
              <span className="font-bold text-lg text-amber-600 dark:text-amber-400">${item.price.toFixed(2)}</span>
            }
          </div>
          <p className="text-muted-foreground text-sm mb-4">{item.description}</p>
          {/* {item.dietaryInfo && (
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
          )} */}
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
  return (
    <section className="mb-16">
      <div className="flex items-center mb-6">
        <h2 className="text-2xl font-semibold pb-2 border-b border-amber-500/30 dark:border-amber-400/30 capitalize">{title}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {items.map((item) => (
          <MenuItem key={item._?.soul} item={item} />
        ))}
      </div>
    </section>
  )
}

export interface MenuItemType extends NestedSchemaType<"menuItem"> {
}

const _checkout = createServerFn({ method: "POST" })
  .validator(z.object({ amount: z.number() }))
  .handler(async ({ data: { amount } }) => {
    const crypto = await import('crypto');
    function generatePaymentUrl(PID: string, PRN: string, AMT: string, R1: string, R2: string, secretKey: string) {
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0'); // Get month
      const day = String(today.getDate()).padStart(2, '0'); // Get day
      const year = today.getFullYear(); // Get year
      const date = `${month}/${day}/${year}`; // Format as MM/DD/YYYY

      const MD = 'P'; // Payment Mode
      const CRN = 'NPR'; // Default currency
      const DT = date;
      const RU = `http://fonepay/payment/verify`; // Callback URL

      // Concatenate fields as per Fonepay documentation
      const concatenatedString = `${PID},${MD},${PRN},${AMT},${CRN},${DT},${R1},${R2},${RU}`;

      // Generate DV (Data Validation Hash)
      const DV = crypto
        .createHmac('sha512', secretKey)
        .update(concatenatedString, 'utf-8')
        .digest('hex');
      // const DV = "43d2f0939e58e038c3122cc1e65f86af01998dce3e9f70a41a664dc0dbd45dfd74b4c4cbb77afef8a5ae9854ab48fcbd7edfc93156f663a8c60f28830eaca7d7"

      // Construct payment URL
      const paymentUrl = `https://dev-clientapi.fonepay.com/api/merchantRequest?PID=${PID}&MD=${MD}&PRN=${PRN}&AMT=${AMT}&CRN=${CRN}&DT=${encodeURIComponent(
        DT
      )}&R1=${encodeURIComponent(R1)}&R2=${encodeURIComponent(
        R2
      )}&DV=${DV}&RU=${encodeURIComponent(RU)}`;
      return paymentUrl;
    }
    // const body = {
    //   amount: amount.toFixed(2),
    //   remarks1: "test1",
    //   remarks2: "test2",
    //   prn: "5d76d323-d1f6-4a38-8231-0063f9581c98",
    //   merchantCode: "NBQM",
    //   dataValidation: "43d2f0939e58e038c3122cc1e65f86af01998dce3e9f70a41a664dc0dbd45dfd74b4c4cbb77afef8a5ae9854ab48fcbd7edfc93156f663a8c60f28830eaca7d7",
    //   username: "9861101076",
    //   password: "admin123456"
    // }
    // const res = await fetch(`https://dev-merchantapi.fonepay.com/convergent-merchant-web/api/merchant/merchantDetailsForThirdParty/thirdPartyDynamicQrDownload`, {
    //   method: 'POST',
    //   body: JSON.stringify(body),
    // })
    const url = generatePaymentUrl("NBQM", "5d76d323-d1f6-4a38-8231-0063f9581c98", amount.toFixed(2), "test1", "test2", "1234567890")
    const res = await fetch(url)

    // return url
    return res.text()
  })

export function CartButton() {
  const { itemCount, items, clearCart, removeItem, updateQuantity, subtotal } = useCart();
  const createOrderFn = useCreate("order", "restaurant");
  const createOrderMutation = useMutation({
    mutationFn: createOrderFn,
    onSuccess() {
      clearCart();
    }
  })
  const handleCheckout = async () => {
    const orderItems = items.reduce((acc, item) => {
      acc[item._?.soul!] = {
        menuItemId: item._?.soul!,
        quantity: item.quantity,
        unitPrice: item.price,
      };
      return acc;
    }, {} as any);
    createOrderMutation.mutate({
      items: orderItems,
      subTotal: subtotal,
      taxes: subtotal * 0.13,
      deliveryFee: 0,
      totalAmount: subtotal * 1.13,
      orderStatus: "pending",
      paymentMethod: "cash",
      paymentStatus: "paid",
    });
  };
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
              <Credenza>
                <CredenzaTrigger asChild>
                  <Button
                    className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500 hover:from-amber-600 hover:to-orange-700"
                  >
                    <ShoppingCart className="h-6 w-6" />
                    <span className="absolute -top-2 -right-2 bg-white dark:bg-black text-amber-600 dark:text-amber-400 rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold">
                      {itemCount}
                    </span>
                  </Button>
                </CredenzaTrigger>
                <CredenzaContent>
                  <CredenzaHeader>
                    <CredenzaTitle asChild>
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
                    </CredenzaTitle>
                    <CredenzaDescription>
                      <Separator className="mb-4" />
                    </CredenzaDescription>
                  </CredenzaHeader>
                  <CredenzaBody asChild className='max-h-[30vh] overflow-y-auto'>
                    <ScrollArea>
                      {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-grow py-8 text-center">
                          <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
                          <h3 className="text-xl font-medium mb-2">Your cart is empty</h3>
                          <p className="text-muted-foreground">Add some delicious items to get started!</p>
                          <Button
                            className="mt-6 bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500"
                          // onClick={() => onOpenChange(false)}
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
                                  key={item._?.soul}
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="flex items-center gap-3 py-3">
                                    <div className="relative h-16 w-16 rounded-md overflow-hidden flex-shrink-0">
                                      <img src={item.imageUrl} alt={item.name} className="object-cover w-full h-full" />
                                    </div>
                                    <div className="flex-grow">
                                      <h4 className="font-medium">{item.name}</h4>
                                      <div className="flex items-center justify-between mt-1">
                                        <div className="flex items-center gap-2">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 rounded-full p-0"
                                            onClick={() => item._?.soul && updateQuantity(item._?.soul, item.quantity - 1)}
                                          >
                                            <MinusCircle className="h-4 w-4" />
                                          </Button>
                                          <span className="w-6 text-center">{item.quantity}</span>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 rounded-full p-0"
                                            onClick={() => item._?.soul && updateQuantity(item._?.soul, item.quantity + 1)}
                                          >
                                            <PlusCircle className="h-4 w-4" />
                                          </Button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">Rs. {(item.price * item.quantity).toFixed(2)}</span>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 rounded-full p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                                            onClick={() => item._?.soul && removeItem(item._?.soul)}
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
                        </>
                      )}
                    </ScrollArea>
                  </CredenzaBody>
                  <CredenzaFooter asChild>
                    <div className="pt-4 space-y-4 w-full">
                      <div className="flex items-center justify-between font-medium">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>VAT</span>
                        <span>${(subtotal * 0.13).toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>${(subtotal * 1.13).toFixed(2)}</span>
                      </div>
                      {/* <CredenzaClose asChild> */}
                      <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500 hover:from-amber-600 hover:to-orange-700" onClick={handleCheckout} loading={createOrderMutation.isPending}>
                        Proceed to Checkout
                      </Button>
                      {/* </CredenzaClose> */}
                    </div>
                  </CredenzaFooter>
                </CredenzaContent>
              </Credenza>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

function RouteComponent() {
  const menuItems = useGet("menuItem", "restaurant")

  const menuData = groupBy(menuItems, "category")

  return (
    <div className="min-h-screen overflow-x-hidden">
      <main className="p-4 pb-20">
        {/* Search Bar */}
        <div className="flex justify-end mb-6">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
            <Input
              type="search"
              placeholder="Search our delicious menu..."
              className="w-full pl-10 pr-4 py-3 rounded-full border-amber-500/30 dark:border-amber-400/30 bg-card/50 dark:bg-card/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-1 focus:ring-amber-500 dark:focus:ring-amber-400 transition-all duration-200 hover:border-amber-500/50 dark:hover:border-amber-400/50"
            />
          </div>
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
        <div className='h-8' />

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
