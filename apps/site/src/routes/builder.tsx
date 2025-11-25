import { createFileRoute } from '@tanstack/react-router'
import UIBuilder from "@/components/ui/ui-builder";
import { primitiveComponentDefinitions } from "@/lib/ui-builder/registry/primitive-component-definitions";
import { complexComponentDefinitions } from "@/lib/ui-builder/registry/complex-component-definitions";

export const Route = createFileRoute('/builder')({
  component: RouteComponent,
})

const componentRegistry = {
  ...primitiveComponentDefinitions, // div, span, img, etc.
  ...complexComponentDefinitions,   // Button, Badge, Card, etc.
};

function RouteComponent() {
  return (
    <UIBuilder componentRegistry={componentRegistry} />
  );
}
