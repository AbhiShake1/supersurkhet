import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import type { AutoAdminTabInput } from '@/components/auto-admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useBusinessConfig } from '@/config/business-config';
import { useBusiness } from '@/contexts/business-context';
import { api } from '@/lib/api';
import type { AdminComponent } from '.';

type TripLine = {
  _?: { soul?: string };
  product?: string | null;
  productId?: string | null;
  purchasePartyId?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  unitPrice?: number | string | null;
};

type ProductLookup = {
  _?: { soul?: string };
  partyId?: string | null;
  purchasePartyId?: string | null;
  title?: string | null;
};

type TripRow = {
  _?: { soul?: string };
  vehicleId?: string | null;
  dispatchTime?: string | null;
  returnTime?: string | null;
  products?: TripLine[] | null;
  returnedProducts?: TripLine[] | null;
};

type ReturnDraftLine = {
  key: string;
  productId: string;
  purchasePartyId?: string;
  sentQuantity: number;
  returnedQuantity: number;
  unit: string;
  unitPrice: number;
};

function toSafeQuantity(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}

function getLineProductId(line: TripLine): string {
  const id = line.product ?? line.productId;
  return typeof id === 'string' ? id : '';
}

function makeBucketKey(
  productId: string,
  purchasePartyId?: string | null,
): string {
  return `${productId}::${purchasePartyId ?? ''}`;
}

function getLinePartyId(
  line: TripLine,
  productsMap: Map<string | undefined, ProductLookup>,
) {
  const explicitPartyId =
    typeof line.purchasePartyId === 'string' ? line.purchasePartyId : '';
  if (explicitPartyId) return explicitPartyId;
  const productId = getLineProductId(line);
  if (!productId) return '';
  const product = productsMap.get(productId);
  return String(product?.partyId ?? product?.purchasePartyId ?? '');
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return format(date, 'MMM dd, yyyy HH:mm');
}

function isTripTableTab(
  tab: AutoAdminTabInput | undefined,
): tab is Extract<AutoAdminTabInput, { schema: 'trip' }> {
  if (!tab || typeof tab !== 'object' || !('schema' in tab)) return false;
  return tab.schema === 'trip';
}

const TripManagement: AdminComponent = ({ slug, permissions }) => {
  const canUpdate = permissions?.canUpdate ?? true;
  const { business } = useBusiness();
  const businessConfig = useBusinessConfig({ slug });
  const tripTableTab =
    businessConfig[business.businessType]?.find(isTripTableTab);
  const { data: trips = [], isLoading } = api.trip.useGet({ keys: [slug] });
  const { data: products = [] } = api.product.useGet({ keys: [slug] });
  const { data: parties = [] } = api.party.useGet({ keys: [slug] });
  const { data: vehicles = [] } = api.vehicle.useGet({ keys: [slug] });
  const { mutateAsync: updateTrip } = api.trip.useUpdate({ keys: [slug] });

  const tripRows = trips as TripRow[];
  const productsMap = useMemo(
    () => new Map(products.map((product) => [product._?.soul, product])),
    [products],
  );
  const partiesMap = useMemo(
    () => new Map(parties.map((party) => [party._?.soul, party])),
    [parties],
  );
  const vehiclesMap = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle._?.soul, vehicle])),
    [vehicles],
  );

  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [returnLines, setReturnLines] = useState<ReturnDraftLine[]>([]);

  const currentTrip = useMemo(
    () => tripRows.find((trip) => trip._?.soul === currentTripId),
    [tripRows, currentTripId],
  );

  const closeReturnDialog = () => {
    setReturnDialogOpen(false);
    setCurrentTripId(null);
    setReturnLines([]);
  };

  function handleMarkReturn(trip: TripRow) {
    setCurrentTripId(trip._?.soul ?? null);
    const countersByBucket = new Map<string, number>();
    const draftedLines: ReturnDraftLine[] = [];

    for (const line of trip.products ?? []) {
      const productId = getLineProductId(line);
      if (!productId) continue;
      const bucketKey = makeBucketKey(
        productId,
        getLinePartyId(line, productsMap),
      );
      const bucketCount = (countersByBucket.get(bucketKey) ?? 0) + 1;
      countersByBucket.set(bucketKey, bucketCount);

      draftedLines.push({
        key: line._?.soul || `${bucketKey}::${bucketCount}`,
        productId,
        purchasePartyId: getLinePartyId(line, productsMap) || undefined,
        sentQuantity: toSafeQuantity(line.quantity),
        returnedQuantity: 0,
        unit: String(line.unit ?? ''),
        unitPrice: Number(line.unitPrice ?? 0),
      });
    }

    setReturnLines(draftedLines);
    setReturnDialogOpen(true);
  }

  function handleReturnQuantityChange(index: number, value: string) {
    setReturnLines((prev) =>
      prev.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const safeQuantity = toSafeQuantity(value);
        return {
          ...line,
          returnedQuantity: Math.min(line.sentQuantity, safeQuantity),
        };
      }),
    );
  }

  async function handleSubmitReturn() {
    if (!currentTrip?._?.soul) return;
    const payload = {
      id: currentTrip._.soul,
      returnTime: new Date().toISOString(),
      returnedProducts: returnLines.map((line) => ({
        product: line.productId,
        purchasePartyId: line.purchasePartyId,
        quantity: line.returnedQuantity,
        unit: line.unit,
        unitPrice: line.unitPrice,
        totalAmount: line.returnedQuantity * line.unitPrice,
      })),
    };

    const updatedTrip = await updateTrip(payload);
    await tripTableTab?.onUpdate?.(
      updatedTrip as never,
      payload as never,
      {
        previousData: currentTrip as never,
        newData: {
          ...currentTrip,
          ...payload,
        } as never,
      } as never,
      {} as never,
    );
    closeReturnDialog();
  }

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
            {tripRows.map((trip) => {
              const vehicle = vehiclesMap.get(trip.vehicleId);
              const status = trip.returnTime ? 'Completed' : 'In Transit';
              const returnedByBucket = (trip.returnedProducts ?? []).reduce(
                (acc, line) => {
                  const productId = getLineProductId(line);
                  if (!productId) return acc;
                  const key = makeBucketKey(
                    productId,
                    getLinePartyId(line, productsMap),
                  );
                  const qty = toSafeQuantity(line.quantity);
                  acc.set(key, (acc.get(key) ?? 0) + qty);
                  return acc;
                },
                new Map<string, number>(),
              );
              const dispatchedLinesWithKeys = (() => {
                const countersByBucket = new Map<string, number>();
                return (trip.products ?? []).map((line) => {
                  const productId = getLineProductId(line);
                  const bucketKey = makeBucketKey(
                    productId,
                    getLinePartyId(line, productsMap),
                  );
                  const bucketCount =
                    (countersByBucket.get(bucketKey) ?? 0) + 1;
                  countersByBucket.set(bucketKey, bucketCount);
                  return {
                    line,
                    key: line._?.soul || `${bucketKey}::${bucketCount}`,
                  };
                });
              })();

              return (
                <Card key={trip._?.soul}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {vehicle?.name || 'Unknown Vehicle'} -{' '}
                        {vehicle?.licensePlate || 'No Plate'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Dispatched: {formatDateTime(trip.dispatchTime)}
                        {trip.returnTime
                          ? ` | Returned: ${formatDateTime(trip.returnTime)}`
                          : ''}
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
                            returnDialogOpen && currentTripId === trip._?.soul
                          }
                          onOpenChange={(open) => {
                            if (open) return;
                            closeReturnDialog();
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={!canUpdate}
                              onClick={() => handleMarkReturn(trip)}
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
                              <div className="grid grid-cols-4 gap-2 text-sm font-medium">
                                <div>Product</div>
                                <div>Supplier Bucket</div>
                                <div className="text-center">Sent</div>
                                <div className="text-center">Returned</div>
                              </div>

                              {returnLines.map((line, index) => (
                                <div
                                  key={line.key}
                                  className="grid grid-cols-4 gap-2 items-center text-sm"
                                >
                                  <div>
                                    {productsMap.get(line.productId)?.title ||
                                      'Unknown Product'}
                                  </div>
                                  <div>
                                    {getLinePartyId(line, productsMap)
                                      ? (partiesMap.get(
                                          getLinePartyId(line, productsMap),
                                        )?.name ??
                                        getLinePartyId(line, productsMap))
                                      : 'Unassigned'}
                                  </div>
                                  <div className="text-center">
                                    {line.sentQuantity}
                                  </div>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={line.sentQuantity}
                                    value={line.returnedQuantity}
                                    onChange={(event) =>
                                      handleReturnQuantityChange(
                                        index,
                                        event.target.value,
                                      )
                                    }
                                    className="h-8 text-center"
                                  />
                                </div>
                              ))}

                              <Button
                                type="button"
                                className="w-full"
                                disabled={!canUpdate}
                                onClick={handleSubmitReturn}
                              >
                                Save Return
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="font-medium">Products on Trip:</h4>
                      <div className="space-y-1">
                        {dispatchedLinesWithKeys.map(({ line, key }) => {
                          const productId = getLineProductId(line);
                          const partyId = getLinePartyId(line, productsMap);
                          const bucketKey = makeBucketKey(productId, partyId);
                          const returnedQuantity =
                            returnedByBucket.get(bucketKey) ?? 0;
                          const partyName = partyId
                            ? (partiesMap.get(partyId)?.name ?? partyId)
                            : 'Unassigned';
                          return (
                            <div
                              key={key}
                              className="flex justify-between gap-4 text-sm"
                            >
                              <span>
                                {productsMap.get(productId)?.title ||
                                  'Unknown Product'}{' '}
                                ({partyName})
                              </span>
                              <span>
                                Sent: {toSafeQuantity(line.quantity)}
                                {trip.returnTime
                                  ? ` | Returned: ${returnedQuantity}`
                                  : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {tripRows.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No trips recorded yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TripManagement;
