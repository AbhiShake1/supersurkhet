import { json } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import type { StartAPIMethodCallback } from '@tanstack/react-start/api'
import { getEvent } from '@tanstack/react-start/server'
import Gun from 'gun/gun'
import '@/lib/gun'

export const APIRoute = createAPIFileRoute('/api/ws')(createGunWebSocketHandler())

export function createGunWebSocketHandler<const CbType extends string>() {
  const server = new Server();
  const gun = Gun({ radisk: true, localStorage: false, web: server })
  const handler: StartAPIMethodCallback<CbType> = async () => {
    try {
      const event = getEvent()
      if (event.node.req.headers.upgrade === 'websocket') {
        const { req } = event.node
        const { socket } = req
        if (socket) {
          // server.handleUpgrade(req, socket)
          // nodeAdapter.handleUpgrade(req, socket, Buffer.from([]))
          return new Response(null, { status: 101 })
        }
      }

      return json({ message: 'This is a WebSocket endpoint.' }, { status: 400, statusText: 'Bad Request' })
    } catch (error: any) {
      const message = error.message ?? 'An unknown error occurred.'
      return json({ message }, { status: 500, statusText: 'Internal Server Error' })
    }
  }

  return {
    GET: handler,
    POST: handler
  } as const
}

class Server {
  private clients: Set<WebSocket>;

  constructor() {
    this.clients = new Set();
  }

  addClient(client: WebSocket) {
    this.clients.add(client);
  }

  removeClient(client: WebSocket) {
    this.clients.delete(client);
  }

  on(event: string, callback: Function) {
    if (event === 'connection') {
      callback();
    }
  }

  broadcast(data: any) {
    const message = JSON.stringify(data);
    for (const client of this.clients) {
      try {
        client.send(message);
      } catch (e) {
        console.error('Error sending message to client:', e);
      }
    }
  }
}
