import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$businessName/admin")({
  component: () => {
    const { businessName } = Route.useParams();
    return (
      <div className="p-2">
        <h3>{businessName} Admin Dashboard</h3>
        <p>This is the admin panel for {businessName}.</p>
      </div>
    );
  },
});
