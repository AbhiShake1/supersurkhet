import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AutoForm } from '@/components/ui/autoform';
import { z } from 'zod';
import { useAuth } from '@/components/auth-provider';

// Define the schema for returned products
const ReturnedProductsSchema = z.object({
  returnedProducts: z
    .array(
      z.object({
        productId: z.string().describe('Product'),
        quantity: z
          .number({ coerce: true })
          .int()
          .nonnegative()
          .describe('Quantity Returned'),
      }),
    )
    .describe('Products Returned'),
});

type ReturnedProductsFormData = z.infer<typeof ReturnedProductsSchema>;

export function TripManagement({ slug }: { slug: string }) {
  const { data: trips = [], isLoading } = api.trip.useGet({ keys: [slug] });
  const { data: products = [] } = api.product.useGet({ keys: [slug] });
  const { data: vehicles = [] } = api.vehicle.useGet({ keys: [slug] });
  const { mutate: updateTrip } = api.trip.useUpdate({ keys: [slug] });
  // biome-ignore lint/correctness/noUnusedVariables: lint debt cleanup
  const { user } = useAuth();

  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  const [currentTrip, setCurrentTrip] = useState<any>(null);
  const [returnFormData, setReturnFormData] =
    useState<ReturnedProductsFormData>({ returnedProducts: [] });

  // Find products by ID for display
  const productsMap = new Map(products?.map((p) => [p._?.soul, p]));

  // Find vehicles by ID for display
  const vehiclesMap = new Map(vehicles?.map((v) => [v._?.soul, v]));

  // Handle opening the return dialog
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  const handleMarkReturn = (trip: any) => {
    setCurrentTrip(trip);

    // Pre-populate with products that were sent
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    const initialReturnedProducts = trip.products?.map((p: any) => ({
      productId: p.productId,
      quantity: 0, // Start with 0 returned
    }));

    setReturnFormData({ returnedProducts: initialReturnedProducts });
    setReturnDialogOpen(true);
  };

  // Handle form submission for returned products
  const handleSubmitReturn = (data: ReturnedProductsFormData) => {
    if (!currentTrip) return;

    // Calculate sold products (dispatched - returned)
    const soldProducts = currentTrip.products
      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      ?.map((dispatchedProduct: any) => {
        const returnedProduct = data.returnedProducts.find(
          (rp) => rp.productId === dispatchedProduct.productId,
        );
        const returnedQty = returnedProduct ? returnedProduct.quantity : 0;
        const soldQty = dispatchedProduct.quantity - returnedQty;

        return {
          productId: dispatchedProduct.productId,
          quantity: Math.max(0, soldQty), // Ensure non-negative
        };
      })
      .filter((sp) => sp.quantity > 0); // Only include products that were actually sold

    // Update the trip with return time and returned products
    updateTrip({
      id: currentTrip._.soul,
      returnTime: new Date().toISOString(),
      returnedProducts: data.returnedProducts,
    });

    // Create a sale record for the sold products
    if (soldProducts.length > 0) {
      // In a real implementation, you would create a sale record here
      console.log('Creating sale for sold products:', soldProducts);
    }

    setReturnDialogOpen(false);
    setCurrentTrip(null);
  };

  if (isLoading) {
    return <div>Loading trips...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Trip Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trips?.map((trip) => {
              const vehicle = vehiclesMap.get(trip.vehicleId);
              const status = trip.returnTime ? 'Completed' : 'In Transit';

              return (
                <Card key={trip._?.soul}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {vehicle?.name || 'Unknown Vehicle'} -{' '}
                        {vehicle?.licensePlate || 'No Plate'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Dispatched:{' '}
                        {
                          trip.dispatchTime &&
                          <>
                            {format(
                              new Date(trip.dispatchTime),
                              'MMM dd, yyyy HH:mm',
                            )}
                          </>
                        }
                        {trip.returnTime &&
                          ` | Returned: ${format(new Date(trip.returnTime), 'MMM dd, yyyy HH:mm')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={trip.returnTime ? 'default' : 'secondary'}
                      >
                        {status}
                      </Badge>
                      {!trip.returnTime && (
                        <Dialog
                          open={
                            returnDialogOpen &&
                            currentTrip?._?.soul === trip._?.soul
                          }
                          onOpenChange={setReturnDialogOpen}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              onClick={() => handleMarkReturn(trip)}
                              disabled={!!trip.returnTime}
                            >
                              Mark Return
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                Mark Return for {vehicle?.name || 'Vehicle'}
                              </DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">
                                  Products Dispatched:
                                </h4>
                                <div className="grid grid-cols-3 gap-2 text-sm font-medium">
                                  <div>Product</div>
                                  <div className="text-center">Sent</div>
                                  <div className="text-center">Returned</div>
                                </div>
                                {trip.products?.map(
                                  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
                                  (product: any, idx: number) => {
                                    const prod = productsMap.get(
                                      product.productId,
                                    );
                                    return (
                                      <div
                                        // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
                                        key={idx}
                                        className="grid grid-cols-3 gap-2 text-sm"
                                      >
                                        <div>
                                          {prod?.title || 'Unknown Product'}
                                        </div>
                                        <div className="text-center">
                                          {product.quantity}
                                        </div>
                                        <div className="text-center">
                                          {returnFormData.returnedProducts[idx]
                                            ?.quantity || 0}
                                        </div>
                                      </div>
                                    );
                                  },
                                )}
                              </div>

                              <div>
                                <h4 className="font-medium mb-2">
                                  Enter Returned Products:
                                </h4>
                                <AutoForm
                                  formSchema={ReturnedProductsSchema}
                                  values={returnFormData}
                                  onSubmit={handleSubmitReturn}
                                  fieldConfig={{
                                    returnedProducts: {
                                      fieldType: 'nested',
                                      fields: {
                                        productId: {
                                          fieldType: 'select',
                                          options: products?.map((p) => [
                                            // biome-ignore lint/style/noNonNullAssertion: lint debt cleanup
                                            p._?.soul!,
                                            p.title,
                                          ]),
                                        },
                                        quantity: {
                                          fieldType: 'number',
                                        },
                                      },
                                    },
                                  }}
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="font-medium">Products on Trip:</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {/** biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup */}
                        {trip.products?.map((product: any, idx: number) => {
                          const prod = productsMap.get(product.productId);
                          return (
                            <div
                              // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
                              key={idx}
                              className="flex justify-between text-sm"
                            >
                              <span>{prod?.title || 'Unknown Product'}</span>
                              <span>{product.quantity}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {trips.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No trips recorded yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
