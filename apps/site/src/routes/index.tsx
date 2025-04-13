import { createFileRoute, useRouter } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
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
        }}
      >
        Add 1 to 0?
      </button>
      <p>from cloudflare env ${import.meta.env.VITE_FROM_ENV}</p>
    </>
  )
}
