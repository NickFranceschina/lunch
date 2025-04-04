# Lunch Application Modernization

This repository contains the modernization plan for converting a legacy Visual Basic 6.0 lunch application to a modern TypeScript-based architecture.

## Project Overview

The original application is a client/server system that helps groups of people decide where to go for lunch. It features:
- Group-based restaurant selection
- Real-time voting system
- Chat functionality
- Notification system for lunch decisions
- User and group management

## Modernization Goals

The modernization effort aims to:
1. Convert the VB6 application to a modern web-based solution
2. Maintain the original functionality and user experience
3. Improve security and maintainability
4. Add modern features while keeping the core functionality intact

## Current Status

The modernization is well underway with the following features implemented:
- Complete Windows 98-style UI with titlebar and status bar
- Real-time WebSocket communication for:
  - Restaurant selection broadcasting to group members
  - Live vote tracking and confirmation
  - User presence and status indicators
  - Notifications in the status bar
  - Chat messaging (both direct and group)
- Full group management with user addition/removal functionality
- Administrator functionality for user and restaurant management
- Secure session-based authentication with WebSocket connections
- User session persistence across page refreshes
- Automatic window management (closing panels/chats on logout)
- Scheduled lunch time notifications that:
  - Automatically select a random restaurant at a group's configured lunch time
  - "Pop up" the application window for all users in the group
  - Display browser notifications when it's time for lunch
  - Allow groups to set specific times for their lunch break
- Comprehensive testing suite with:
  - Unit tests for frontend components
  - Tests for API services with mock responses
  - Backend controller and service tests
  - Test coverage reporting

## Repository Structure

- `modernization-plan.md` - Detailed plan for the modernization effort
- `VisualBasic6/` - Original VB6 application code (for reference)
- `lunch-app/` - Modern TypeScript implementation
  - `client/` - React frontend application
  - `server/` - Node.js backend server
  - `database/` - Database scripts and migrations
  - `shared/` - Shared types and utilities

## Development Setup

### VS Code Workspace

The project includes a VS Code workspace configuration (`lunch-app.code-workspace`) that organizes the project into logical components:
- ✨ LUNCH-APP (root) - Project root with shared configuration
- 📱 Client - React frontend application
- 🖥️ Server - Node.js backend server

To use the workspace:
1. Open VS Code
2. File -> Open Workspace from File...
3. Select `lunch-app.code-workspace`

### Getting Started

1. Install all dependencies from the project root:
```bash
npm install
```

2. Database Setup:
   - The application uses SQLite for its database
   - The database file (`lunch.db`) is not included in version control
   - Initialize the database with seed data:
```bash
cd lunch-app/server
npm run seed
```
   - This creates a database with:
     - Default admin user (username: LunchMaster, password: password)
     - Default lunch group
     - Sample restaurants

3. Running the Application:

From the project root, start all services with a single command:
```bash
npm start
```

This will concurrently run:
- Client (port 3000)
- Server (port 3001)
- Browser Tools

Access the application at http://localhost:3000

Individual services can be started separately using:
- `npm run start:client` - Start only the client
- `npm run start:server` - Start only the server
- `npm run start:browser-tools` - Start only the browser tools

### Testing

The application includes a comprehensive testing infrastructure:

1. Running Tests:
```bash
# Run all tests (client and server)
npm test

# Run only client tests
npm run test:client

# Run only server tests
npm run test:server

# Generate test coverage reports
npm run test:coverage
```

2. Test Coverage:
   - Client-side tests include:
     - Component rendering tests
     - Service API call tests
     - Context and hook tests
   - Server-side tests include:
     - Controller unit tests
     - Service unit tests
     - Authentication flow tests

### Feature Highlights:
- Windows 98-style UI with authentic look and feel
- Real-time group collaboration for restaurant selection
- User presence tracking for administrators
- Status bar replacing alert() dialogs for notifications
- Role-based access control for admin functionality
- Session persistence across page refreshes (tab-specific)
- Direct and group chat functionality
- Automatic window management
- Group lunch time scheduling with automatic notifications:
  - Configure specific lunch times for each group
  - Automatic selection of random restaurants at lunch time
  - Browser notifications and window focus at lunch time
  - Cron-like scheduling system running on the server

### Next Steps:
- End-to-end testing
- Deployment configuration

## Authentication

The application uses sessionStorage-based authentication which:
- Preserves login state across page refreshes
- Automatically logs out users when they close the browser tab
- Provides better security than localStorage by limiting session scope
- Supports multiple users on different tabs of the same browser

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 