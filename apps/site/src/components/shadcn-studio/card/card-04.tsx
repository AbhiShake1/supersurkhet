import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';
import { z } from 'zod';

export const CardBottomImageSchema = z.object({
  title: z.string().default('Fluid Gradient Flow'),
  description: z
    .string()
    .default('A vibrant and abstract background with smooth gradient curves.'),
  imageUrl: z
    .string()
    .url()
    .default(
      'https://cdn.shadcnstudio.com/ss-assets/components/card/image-1.png?height=280&format=auto',
    ),
  imageAlt: z.string().default('Banner'),
  className: z.string().optional(),
});

type CardBottomImageDemoProps = z.infer<typeof CardBottomImageSchema>;

const CardBottomImage = ({
  title = 'Fluid Gradient Flow',
  description = 'A vibrant and abstract background with smooth gradient curves.',
  imageUrl = 'https://cdn.shadcnstudio.com/ss-assets/components/card/image-1.png?height=280&format=auto',
  imageAlt = 'Banner',
  className = '',
}: CardBottomImageDemoProps) => {
  return (
    <Card className={`max-w-md pb-0 ${className}`}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <img
          src={imageUrl}
          alt={imageAlt}
          className="aspect-video h-70 rounded-b-xl object-cover"
        />
      </CardContent>
    </Card>
  );
};

export default CardBottomImage;
