import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/testroute')({
  component: RouteComponent,
  loader: async () => {
    const _data = "d"
    const fs = await import("fs/promises")
    await fs.writeFile("data.txt", _data)
    const data = await fs.readFile("data.txt", "utf-8")
    return {
      data,
    }
  }
})

function RouteComponent() {
  const loaderData = Route.useLoaderData()
  return <div>Hello "/testroute" {loaderData?.data}!</div>
}
