import { Response } from 'express';

type Client = {
  id: number;
  res: Response;
};

let clients: Client[] = [];
let nextClientId = 1;

export const realtimeService = {
  addClient(res: Response) {
    const id = nextClientId++;
    const client = { id, res };
    clients.push(client);

    // Keep-alive header for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', clientId: id })}\n\n`);

    res.on('close', () => {
      clients = clients.filter(c => c.id !== id);
    });
  },

  broadcast(eventType: string, payload: any) {
    const data = JSON.stringify({ type: eventType, payload, timestamp: new Date().toISOString() });
    clients.forEach(c => {
      try {
        c.res.write(`data: ${data}\n\n`);
      } catch (_) {
        // client closed
      }
    });
  },
};
