import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Serve static client files in production
const clientDistPath = process.env.CLIENT_DIST_PATH
  || path.resolve(__dirname, '../../client/dist');

app.use(express.static(clientDistPath));

// SPA fallback — serve index.html for all non-API routes
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

export default app;
