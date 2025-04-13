import { createServerFn } from '@tanstack/start'
import { getCookie, setCookie } from 'vinxi/http'

async function readCount() {
  return parseInt(getCookie('count') || '0')
}

export const getCount = createServerFn({
  method: 'GET',
}).handler(() => {
  return readCount()
})

export const updateCount = createServerFn({ method: 'POST' })
  .validator((d: number) => d)
  .handler(async ({ data }) => {
    const count = await readCount()
    setCookie('count', String(count + data))
  })
