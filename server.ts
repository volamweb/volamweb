import express from 'express';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const GAME_DIR = path.resolve(process.cwd(), 'public/game');
const REMOTE_BASE = 'https://volam.esport9.com';

// Direct ZIP download endpoint with explicit headers and chunked stream
const handleZipDownload = (req: express.Request, res: express.Response) => {
  const isCloudflare = req.path.includes('cloudflare');
  const filename = isCloudflare ? 'volam_cloudflare_pages.zip' : 'VoLam_Offline_ChoiDon.zip';
  const zipPath = path.resolve(process.cwd(), `public/${filename}`);
  const fallbackPath = path.resolve(process.cwd(), 'public/VoLam_Offline_ChoiDon.zip');
  const targetPath = fs.existsSync(zipPath) ? zipPath : fallbackPath;

  if (fs.existsSync(targetPath)) {
    const stat = fs.statSync(targetPath);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(targetPath);
  } else {
    res.status(404).send('File ZIP chưa sẵn sàng. Vui lòng thử lại sau.');
  }
};

app.get(
  [
    '/api/download-zip',
    '/download-offline',
    '/VoLam_Offline_ChoiDon.zip',
    '/volam_cloudflare_pages.zip',
    '/api/download-cloudflare-zip',
  ],
  handleZipDownload
);

// Serve local game files
app.use(
  '/game',
  express.static(GAME_DIR, {
    index: 'index.html',
    etag: true,
    maxAge: '1d',
  })
);

// Fallback proxy to remote server for any missing game asset
app.use('/game', (req, res, next) => {
  if (req.method !== 'GET') return next();
  const relPath = req.path;
  const localFile = path.join(GAME_DIR, relPath);

  if (fs.existsSync(localFile) && fs.statSync(localFile).isFile()) {
    return res.sendFile(localFile);
  }

  const remoteUrl = `${REMOTE_BASE}${relPath}`;
  https
    .get(remoteUrl, (proxyRes) => {
      if (proxyRes.statusCode === 200) {
        try {
          fs.mkdirSync(path.dirname(localFile), { recursive: true });
          const fileStream = fs.createWriteStream(localFile);
          proxyRes.pipe(fileStream);
        } catch {
          // ignore cache write error
        }
        res.writeHead(200, proxyRes.headers);
        proxyRes.pipe(res);
      } else {
        res.status(proxyRes.statusCode || 404).end();
      }
    })
    .on('error', () => {
      res.status(404).end();
    });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
