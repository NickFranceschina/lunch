import express, { Express } from 'express';
import cors from 'cors';
import restaurantRoutes from './routes/restaurant.routes';

const app: Express = express();
app.use(cors());
app.use(express.json());

// Register restaurant routes
app.use('/api/restaurants', restaurantRoutes);

// Helper function to print routes
function printRoutes(app: Express) {
  const routes: { method: string; path: string }[] = [];
  
  const stack = app._router.stack;
  stack.forEach((middleware: any) => {
    if (middleware.route) {
      // Routes registered directly on the app
      routes.push({
        method: Object.keys(middleware.route.methods)[0].toUpperCase(),
        path: middleware.route.path
      });
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          const method = Object.keys(handler.route.methods)[0].toUpperCase();
          let path = handler.route.path;
          
          // If this is a router middleware, prefix with the router's path
          if (middleware.regexp) {
            const routerPath = middleware.regexp.toString()
              .replace('/^\\', '')
              .replace('\\/?(?=\\/|$)/i', '');
              
            // Clean up the path
            const cleanPath = routerPath
              .replace(/\\\//g, '/')
              .replace(/\?/g, '')
              .replace(/\\/g, '')
              .replace(/\(\.\*\)/g, '');
              
            path = cleanPath + path;
          }
          
          routes.push({ method, path });
        }
      });
    }
  });
  
  // Sort and print routes
  routes.sort((a, b) => a.path.localeCompare(b.path));
  console.log('Registered routes:');
  routes.forEach(route => {
    console.log(`${route.method.padEnd(6)} ${route.path}`);
  });
}

// Print all routes
printRoutes(app);

console.log('\nTesting route matching:');
const testPaths = [
  '/api/restaurants',
  '/api/restaurants/1',
  '/api/restaurants/group/1/random',
  '/api/restaurants/group/1/vote'
];

testPaths.forEach(path => {
  console.log(`Path: ${path}`);
  // Simulate matching
  console.log(`Would match: ${matchRoute(app, 'GET', path)}`);
});

function matchRoute(app: Express, method: string, path: string): string {
  const stack = app._router.stack;
  
  function search(stack: any[], path: string, method: string): string {
    for (const layer of stack) {
      if (layer.route) {
        // It's a route
        const route = layer.route;
        if (route.path === path && route.methods[method.toLowerCase()]) {
          return `Direct match: ${method} ${route.path}`;
        }
      } else if (layer.name === 'router') {
        // Router middleware
        // Extract base path
        const basePathMatch = layer.regexp.toString().match(/\^\\(.+?)\\\/\?\(\?=\\\/\|\$\)/);
        const basePath = basePathMatch ? basePathMatch[1].replace(/\\\//g, '/') : '';
        
        // If path starts with basePath
        if (path.startsWith(basePath)) {
          // Pass remaining path to router
          const subPath = path.slice(basePath.length);
          const result: string = search(layer.handle.stack, subPath, method);
          if (result !== 'No match found') {
            return result;
          }
        }
      }
    }
    return 'No match found';
  }
  
  return search(stack, path, method);
} 