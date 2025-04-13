import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getCount, updateCount } from '@repo/api'

export const Route = createFileRoute('/')({
  component: Home,
  loader: () => getCount(),
})

function Home() {
  const router = useRouter()
  const state = Route.useLoaderData()

  return (
    <>
      <button
        className='bg-red-300 text-3xl p-4 m-4'
        type="button"
        onClick={() => {
          updateCount({ data: 1 }).then(() => {
            router.invalidate()
          })
        }}
      >
        Add 1 to {state}?
      </button>
      <p>from cloudflare env ${import.meta.env.VITE_FROM_ENV}</p>
    </>
  )
}
