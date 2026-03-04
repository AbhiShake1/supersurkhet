import * as React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import type { Product } from '@/lib/schemas/listings';
import { NotFound } from '@/components/ui/not-found';
import { useBusiness } from '@/contexts/business-context';
import { z } from 'zod';

// Product context types
interface ProductContextProps {
  product: Product;
  isLoading?: boolean;
}

const ProductContext = React.createContext<ProductContextProps | undefined>(
  undefined,
);

const useProduct = () => {
  const context = React.useContext(ProductContext);
  if (!context) {
    throw new Error('useProduct must be used within a ProductProvider');
  }
  return context;
};

export const ProductDetailSchema = z.object({
  children: z.any().optional(),
  className: z.string().optional(),
  productId: z.string(),
});

interface ProductDetailProps extends React.HTMLAttributes<HTMLDivElement> {
  productId: string;
}

const ProductDetail = React.forwardRef<HTMLDivElement, ProductDetailProps>(
  ({ className, productId, children, ...props }, ref) => {
    productId = productId.trim();
    const { business } = useBusiness();
    const { data: _product = [], isLoading } = api.product.useGet({
      keys: [business?.id ?? '', productId],
      single: true,
    });
    const product = _product?.[0];

    if (isLoading) {
      return (
        <div
          ref={ref}
          className={cn('rounded-xl border bg-card p-4', className)}
          {...props}
        >
          <Skeleton className="h-40 w-full rounded-md mb-3" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2 mb-3" />
          <Skeleton className="h-8 w-full rounded" />
        </div>
      );
    }

    if (!product) {
      return <NotFound />;
    }

    return (
      <ProductProvider product={product}>
        <div
          ref={ref}
          className={cn(
            'rounded-xl border bg-card p-4 flex flex-col',
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </ProductProvider>
    );
  },
);
ProductDetail.displayName = 'ProductDetail';

export const ProductListSchema = z.object({
  children: z.any().optional(),
  className: z.string().optional(),
});

interface ProductListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

// ProductList component - the main container
const ProductList = React.forwardRef<HTMLDivElement, ProductListProps>(
  ({ className, children, ...props }, ref) => {
    const { business } = useBusiness();
    const { data: products = [], isLoading } = api.product.useGet({
      keys: [business?.id ?? ''],
    });

    if (isLoading) {
      return (
        <div
          ref={ref}
          className={cn(
            'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6',
            className,
          )}
          {...props}
        >
          {[...Array(8)].map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
            <Skeleton key={index} className="h-80 w-full rounded-xl" />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6',
          className,
        )}
        {...props}
      >
        {products.map((product) => (
          <ProductProvider key={product._?.soul} product={product}>
            {children}
          </ProductProvider>
        ))}
      </div>
    );
  },
);
ProductList.displayName = 'ProductList';

// ProductProvider component to pass product context to children
interface ProductProviderProps {
  product: Product;
  children: React.ReactNode;
}

const ProductProvider: React.FC<ProductProviderProps> = ({
  product,
  children,
}) => {
  return (
    <ProductContext.Provider value={{ product }}>
      {children}
    </ProductContext.Provider>
  );
};

export const ProductSchema = z.object({
  children: z.any().optional(),
  className: z.string().optional(),
});

interface ProductProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading?: boolean;
  children?: React.ReactNode;
}

// Product component - the individual product card
const SingleProduct = React.forwardRef<HTMLDivElement, ProductProps>(
  ({ className, isLoading = false, children, ...props }, ref) => {
    const { product } = useProduct();

    if (isLoading || !product) {
      return (
        <div
          ref={ref}
          className={cn('rounded-xl border bg-card p-4', className)}
          {...props}
        >
          <Skeleton className="h-40 w-full rounded-md mb-3" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2 mb-3" />
          <Skeleton className="h-8 w-full rounded" />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn('rounded-xl border bg-card p-4 flex flex-col', className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
SingleProduct.displayName = 'SingleProduct';

export const ProductImageSchema = z.object({
  className: z.string().optional(),
  width: z.number({ coerce: true }).optional(),
  height: z.number({ coerce: true }).optional(),
});

// ProductImage component with loading state
interface ProductImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  isLoading?: boolean;
  src?: string;
  alt?: string;
}

const ProductImage = React.forwardRef<HTMLImageElement, ProductImageProps>(
  ({ children, className, isLoading, src, alt, ...props }, ref) => {
    const { product } = useProduct();

    if (isLoading) {
      return (
        <Skeleton
          className={cn('h-40 w-full rounded-md', className)}
          {...props}
        />
      );
    }

    const finalSrc = src || product?.imageUrl;

    return (
      <img
        ref={ref}
        className={cn(
          'w-full object-cover rounded-md aspect-square',
          className,
        )}
        src={finalSrc}
        alt={alt || product?.title || 'Product image'}
        {...props}
      />
    );
  },
);
ProductImage.displayName = 'ProductImage';

export const ProductTitleSchema = z.object({
  className: z.string().optional(),
});

// ProductTitle component
interface ProductTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  isLoading?: boolean;
}

const ProductTitle = React.forwardRef<HTMLHeadingElement, ProductTitleProps>(
  ({ className, isLoading, children, ...props }, ref) => {
    const { product } = useProduct();

    if (isLoading) {
      return (
        <Skeleton className={cn('h-5 w-3/4 mb-2', className)} {...props} />
      );
    }

    return (
      <h3
        ref={ref}
        className={cn('font-semibold text-lg mb-2', className)}
        {...props}
      >
        {product?.title}
      </h3>
    );
  },
);
ProductTitle.displayName = 'ProductTitle';

export const ProductDescriptionSchema = z.object({
  className: z.string().optional(),
});

// ProductDescription component
interface ProductDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  isLoading?: boolean;
}

const ProductDescription = React.forwardRef<
  HTMLParagraphElement,
  ProductDescriptionProps
>(({ className, isLoading, children, ...props }, ref) => {
  const { product } = useProduct();

  if (isLoading) {
    return (
      <div className={cn('space-y-2 mb-3', className)} {...props}>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    );
  }

  return (
    <p
      ref={ref}
      className={cn('text-sm text-muted-foreground mb-3 flex-grow', className)}
      {...props}
    >
      {product?.description}
    </p>
  );
});
ProductDescription.displayName = 'ProductDescription';

export const ProductPriceSchema = z.object({
  className: z.string().optional(),
});

// ProductPrice component
interface ProductPriceProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading?: boolean;
}

const ProductPrice = React.forwardRef<HTMLDivElement, ProductPriceProps>(
  ({ className, isLoading, ...props }, ref) => {
    const { product } = useProduct();

    if (isLoading) {
      return (
        <Skeleton className={cn('h-5 w-1/3 mb-3', className)} {...props} />
      );
    }

    const originalPrice = product?.price;

    return (
      <div ref={ref} className={cn('mb-3', className)} {...props}>
        <span className="text-lg font-bold text-primary">
          ${originalPrice?.toFixed(2)}
        </span>
      </div>
    );
  },
);
ProductPrice.displayName = 'ProductPrice';

export const ProductActionsSchema = z.object({
  className: z.string().optional(),
  children: z.any().optional(),
});

// ProductActions component for buttons like "Add to Cart"
interface ProductActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading?: boolean;
}

const ProductActions = React.forwardRef<HTMLDivElement, ProductActionsProps>(
  ({ className, isLoading, children, ...props }, ref) => {
    if (isLoading) {
      return (
        <Skeleton className={cn('h-10 w-full rounded', className)} {...props} />
      );
    }

    return (
      <div ref={ref} className={cn('mt-auto pt-3', className)} {...props}>
        {children}
      </div>
    );
  },
);
ProductActions.displayName = 'ProductActions';

export const ProductBadgeSchema = z.object({
  className: z.string().optional(),
  variant: z.enum(['default', 'sale', 'new', 'featured']).optional(),
});

// ProductBadge component for special tags like "Sale", "New", etc.
interface ProductBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'sale' | 'new' | 'featured';
}

const ProductBadge = React.forwardRef<HTMLDivElement, ProductBadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantClasses = {
      default: 'bg-primary text-primary-foreground',
      sale: 'bg-destructive text-destructive-foreground',
      new: 'bg-green-500 text-white',
      featured: 'bg-purple-500 text-white',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium',
          variantClasses[variant],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
ProductBadge.displayName = 'ProductBadge';

export {
  ProductList,
  SingleProduct,
  ProductImage,
  ProductTitle,
  ProductDescription,
  ProductPrice,
  ProductActions,
  ProductBadge,
  ProductDetail,
};
