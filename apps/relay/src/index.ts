import Gun from 'gun';
import { v4 as uuidv4 } from 'uuid';

export interface Env {
  RELAY: DurableObjectNamespace;
  GUN_PEERS: string;
}

export class GunRelay implements DurableObject {
  private state: DurableObjectState;
  private gun: any;
  private server: any;
  private id: string;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.id = uuidv4();
    this.server = new Server();

    // Initialize GUN with a custom storage adapter
    this.gun = Gun({
      store: this.getStorageAdapter(),
      peers: env.GUN_PEERS ? env.GUN_PEERS.split(',') : [],
      web: this.server
    });

    // Load data from storage on initialization
    this.loadData();
  }

  // Define the custom storage adapter
  private getStorageAdapter() {
    return {
      put: async (key: string, value: any, callback: Function) => {
        try {
          // Use the Durable Object's storage API to persist the data
          await this.state.storage.put(key, value);
          callback(null, 1); // Signal success to GUN
        } catch (e) {
          console.error('Error saving to DO storage:', e);
          callback(e, 0);
        }
      },
      get: async (key: string, callback: Function) => {
        try {
          // Retrieve data from the Durable Object's storage
          const value = await this.state.storage.get(key);
          callback(null, value); // Pass retrieved value to GUN
        } catch (e) {
          console.error('Error loading from DO storage:', e);
          callback(e, null);
        }
      }
    };
  }

  // Method to load existing data from storage when the DO is awakened
  private async loadData() {
    try {
      // The `Gun.load()` method is used to load data from a custom store.
      // This is a crucial step to make sure existing data is available.
      await this.gun.load();
    } catch (e) {
      console.error('Error loading GUN data from storage:', e);
    }
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