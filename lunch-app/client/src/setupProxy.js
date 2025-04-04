const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy API requests (/api/*) to backend server on port 3001
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
    })
  );
  
  // WebSocket connections will be handled directly by the client code
  // Ensure your backend WebSocket server has appropriate CORS settings if needed
  // for connections from localhost:3000 to localhost:3001.
}; 