import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";

// ES modules replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a custom logger
const viteLogger = {
  info: (msg: string) => console.log(`\x1b[36m[vite]\x1b[0m ${msg}`),
  warn: (msg: string) => console.log(`\x1b[33m[vite]\x1b[0m ${msg}`),
  error: (msg: string, options?: { clear?: boolean; timestamp?: boolean }) => console.error(`\x1b[31m[vite]\x1b[0m ${msg}`),
  clearScreen: () => console.clear()
};

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Instead of using Vite's internal API, we'll use a simple static file server
  // for production and let the client handle development separately
  const distPath = path.resolve(__dirname, '../dist/public');
  log(`Resolved dist path: ${distPath}`, 'vite');
  
  if (fs.existsSync(distPath)) {
    log('Serving static files from ' + distPath);
    app.use(express.static(distPath));
  } else {
    log('No static files found at ' + distPath + ', serving API only');
  }
  
  // Simple API route to check if the server is running
  app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Fallback route for SPA - but don't intercept API requests
  app.use('*', (req, res, next) => {
    const url = req.originalUrl;
    
    // Skip API routes - they should be handled by their own handlers
    if (url.startsWith('/api/')) {
      return next();
    }

    try {
      // If we have a built index.html, serve that
      const indexPath = path.resolve(__dirname, '../dist/public/index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        // Otherwise, send a simple message
        res.status(200).set({ "Content-Type": "text/html" })
          .end(`<html><body><h1>Reelish API Server</h1><p>API is running. Frontend is not built.</p></body></html>`);
      }
    } catch (e) {
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, '../dist/public');
  log(`Static serving from: ${distPath}`, 'vite');

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));
  
  // Add a specific API status endpoint
  app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', mode: 'production', timestamp: new Date().toISOString() });
  });

  // fall through to index.html if the file doesn't exist, but don't intercept API routes
  app.use("*", (req, res, next) => {
    const url = req.originalUrl;
    
    // Skip API routes - they should be handled by their own handlers
    if (url.startsWith('/api/')) {
      return next();
    }
    
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
