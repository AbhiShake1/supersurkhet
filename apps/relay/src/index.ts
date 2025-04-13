import Gun from 'gun';

export interface Env {
  RELAY: DurableObjectNamespace;
  GUN_PEERS: string;
}

export class GunRelay implements DurableObject {
  private state: DurableObjectState;
  private gun: any;
  private server: any;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.server = new Server();
    this.gun = Gun({
      peers: env.GUN_PEERS ? env.GUN_PEERS.split(',') : [],
      web: this.server
    });
  }

  async fetch(request: Request) {
    if (request.headers.get('Upgrade') === 'websocket') {
      const { 0: client, 1: server } = new WebSocketPair();
      await this.handleWebSocket(server);
      return new Response(null, {
        status: 101,
        webSocket: client
      });
    }

    return new Response('Gun relay server is running', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  private async handleWebSocket(webSocket: WebSocket) {
    webSocket.accept();
    this.server.addClient(webSocket);

    webSocket.addEventListener('message', async (msg: MessageEvent) => {
      try {
        const data = JSON.parse(msg.data as string);
        this.gun.on('in', data);
      } catch (e) {
        console.error('Error processing message:', e);
      }
    });

    webSocket.addEventListener('close', () => {
      this.server.removeClient(webSocket);
    });

    webSocket.addEventListener('error', () => {
      this.server.removeClient(webSocket);
    });
  }
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

export default {
  async fetch(request: Request, env: Env) {
    const id = env.RELAY.idFromName('gun-relay');
    const relay = env.RELAY.get(id);
    return relay.fetch(request);
  }
};