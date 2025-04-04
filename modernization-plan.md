# Lunch Application Modernization Plan

## Overview
This document outlines the plan to convert the legacy client/server VB6 lunch application in the `VisualBasic6/` folder to a modern TypeScript-based architecture. The plan focuses on maintaining the core functionality and visual appearance while modernizing the technology stack.

## Architecture Components

### 1. Frontend (React + TypeScript)
- [x] Create a new React application using TypeScript
- [x] Implement the main UI components:
  - [x] Main window with black background and white text
  - [x] LED indicator (red/green) for confirmation status
  - [x] Restaurant choice display with Comic Sans MS font
  - [x] Voting buttons (Yes/No)
  - [x] New Random button
  - [x] Menu bar with Administer options
  - [x] Windows 98-style UI with titlebar and status bar
- [x] Create additional UI components:
  - [x] User Info panel
  - [x] Group Info panel
  - [x] Restaurants panel
  - [x] Login dialog
  - [x] Chat windows (User and Group)
- [x] Implement proper authentication flow:
  - [x] Login/logout functionality
  - [x] Role-based menu access (admin restricted)
  - [x] Token handling
  - [x] Session persistence using sessionStorage
  - [x] Tab-specific session management
  - [x] Input validation (trimming credentials)
- [x] Implement real-time updates using WebSocket:
  - [x] Restaurant selection broadcasting
  - [x] Vote counting and confirmation
  - [x] User presence tracking
  - [x] Status notifications
  - [x] Chat messages
- [x] Improve user experience:
  - [x] Auto-closing admin panels on logout
  - [x] Auto-closing chat windows on logout
  - [x] Session restoration on page refresh
  - [x] Input validation for better error prevention
- [ ] Add responsive design for modern screen resolutions

### 2. Backend (Node.js + TypeScript)
- [x] Set up Express.js server with TypeScript
- [x] Create RESTful API endpoints:
  - [x] User management
  - [x] Group management
  - [x] Restaurant management
  - [x] Voting system
  - [x] Chat functionality
- [x] Implement WebSocket server for real-time notifications:
  - [x] Group-based restaurant selection
  - [x] Voting updates
  - [x] User presence tracking
  - [x] Status notifications
  - [x] Chat messages
- [x] Create database schema (SQLite implemented instead of PostgreSQL)
- [x] Implement data migration from Access database
- [x] Implement scheduled lunch time notifications:
  - [x] Group-specific lunch time configuration
  - [x] Automatic random restaurant selection at lunch time
  - [x] Browser notifications and window pop-up
  - [x] Cron-like timing system

### 3. Database Migration
- [x] Create new database schema:
  - [x] Users table
  - [x] Groups table
  - [x] Restaurants table
  - [x] Chat messages table
- [x] Develop migration script from Access to new database
- [x] Implement data validation and sanitization

### 4. Authentication & Security
- [x] Implement modern authentication system
- [x] Add user session management
  - [x] Session persistence across page refresh
  - [x] Tab-specific sessions with sessionStorage
  - [x] Automatic cleanup on tab close
- [x] Implement role-based access control
- [x] Add input validation and sanitization
  - [x] Trim credentials during login
  - [x] Validate user inputs
- [x] Implement secure WebSocket connections with JWT authentication

### 5. Configuration Management
- [x] Create configuration system for:
  - [x] Server settings
  - [x] Database connection
  - [x] Notification times
  - [x] Voting parameters
- [x] Implement environment-based configuration

### 6. Testing
- [x] Set up testing framework
  - [x] Configured Jest for both client and server
  - [x] Set up React Testing Library for component testing
  - [x] Created mock utilities for API services
  - [x] Set up test coverage reporting
- [x] Write unit tests for:
  - [x] Frontend components
    - [x] App component render tests
    - [x] MainWindow component tests
    - [x] Mock child components for isolated testing
  - [x] Backend services
    - [x] Authentication controller tests
    - [x] Mock database operations
  - [x] Database operations
    - [x] Created mocks for database interactions
- [x] Implement integration tests
  - [x] API service tests with mock fetch
  - [x] Component integration tests
- [ ] Add end-to-end testing
  - [ ] Setup Cypress or Playwright
  - [ ] Create test scenarios for key user workflows

### 7. Deployment
- [ ] Set up CI/CD pipeline
- [ ] Create Docker containers for:
  - [ ] Frontend application
  - [ ] Backend server
  - [ ] Database
- [ ] Implement monitoring and logging
- [ ] Create deployment documentation

## Technical Stack
- Frontend: React + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: SQLite (changed from PostgreSQL for easier local development)
- Real-time: WebSocket with JWT authentication
- Authentication: JWT with sessionStorage persistence
- Testing: 
  - Jest for both client and server testing
  - React Testing Library for component testing
  - Mock API responses for service testing
  - TypeScript-compatible test configurations
- Containerization: Docker
- CI/CD: GitHub Actions

## Migration Strategy
1. [x] Set up new development environment
2. [x] Create new database schema
3. [x] Implement backend services
4. [x] Begin frontend components implementation
   - [x] Created basic UI layout
   - [x] Implemented login system
   - [x] Added main window with restaurant display
   - [x] Created restaurant management interface
   - [x] Created user management interface
   - [x] Created group management interface
   - [x] Implemented consistent UI patterns across admin interfaces
   - [x] Fixed authentication flow (login/logout)
   - [x] Added proper access controls for admin functionality
   - [x] Implemented Windows 98-style UI
   - [x] Added status bar for messages
   - [x] Implemented WebSocket for real-time updates
   - [x] Implemented chat functionality (user-to-user and group chat)
   - [x] Enhanced authentication with session persistence
   - [x] Improved UX with automatic window management
5. [x] Migrate existing data
6. [ ] Test thoroughly
7. [ ] Deploy to production
8. [ ] Phase out old system

## Current Status
- Server is running on port 3001 with database seeded
- WebSocket server is fully implemented for real-time updates
- Basic UI components have been implemented:
  - Windows 98-style container with titlebar
  - Main window with black background and white text
  - Status bar at bottom for messages (replacing alert dialogs)
  - LED indicator for confirmation status
  - Restaurant display with Comic Sans MS font
  - Voting controls
  - Login dialog
- Restaurant management interface is complete
- User management interface is complete with real-time user presence indicators
- Group management interface is complete with user management functionality
- Admin interface access is properly restricted to admin users
- Authentication flow works correctly with session persistence between page refreshes
- API endpoints for users, groups, and restaurants are implemented
- Voting system is functional with real-time updates
- Random restaurant selection broadcasts to all group members in real-time
- Chat functionality is implemented (both user-to-user and group chat)
- Input validation prevents common user errors
- Automatic window management improves the user experience during logout
- Group lunch time notifications are fully implemented:
  - Groups can set specific times for lunch
  - Server automatically selects a random restaurant at the configured time
  - Users receive browser notifications when it's lunch time
  - Application windows automatically pop up for all users in the group at lunch time
  - Legacy VB6 "system tray pop-up" behavior has been recreated

## Next Steps
1. ✅ Implement WebSocket for real-time updates (COMPLETED)
2. ✅ Add chat functionality (COMPLETED):
   - ✅ Create chat backend endpoints
   - ✅ Develop user chat and group chat components
3. ✅ Improve authentication with session persistence (COMPLETED):
   - ✅ Implement sessionStorage-based token storage
   - ✅ Add automatic session restoration
   - ✅ Improve input validation
4. ✅ Implement lunch time notification system (COMPLETED):
   - ✅ Create scheduler on the server
   - ✅ Add group notification time settings
   - ✅ Implement window pop-up functionality
   - ✅ Add browser notifications
5. ✅ Set up testing framework and write tests (COMPLETED)
   - ✅ Create test configuration for client and server
   - ✅ Implement unit tests for frontend components 
   - ✅ Implement unit tests for API services
   - ✅ Implement unit tests for backend controllers
   - ✅ Set up coverage reporting and test scripts
6. Implement error handling and logging
7. Create deployment configuration

## Testing Strategy

The application uses a comprehensive testing approach:

### Frontend Testing
- **Component Testing**: Using React Testing Library to test rendering and user interactions
  - Mocking child components to isolate the component under test
  - Testing prop passing and event handling
  - Verifying UI state changes based on user actions
- **Service Testing**: Testing API service functions with mocked fetch responses
  - Verifying correct request parameters
  - Testing error handling
  - Ensuring proper response processing
- **Context Testing**: Testing authentication and WebSocket contexts
  - Verifying proper context state management
  - Testing context provider functionality

### Backend Testing
- **Controller Testing**: Testing API controllers with mocked requests and responses
  - Verifying proper response codes and data
  - Testing error handling and validation
  - Ensuring proper database interactions
- **Database Mocking**: Creating comprehensive mocks for database operations
  - Mocking entity repositories
  - Simulating database responses
  - Testing error scenarios
- **WebSocket Testing**: Testing WebSocket server with mocked client connections
  - Verifying message processing
  - Testing client management
  - Ensuring proper event broadcasting

### Test Coverage
- Configured code coverage reporting for both client and server
- Set minimum thresholds for statement, branch, function, and line coverage
- Organized test files in a way that mirrors the source structure
- Created helper functions and utilities to reduce test boilerplate

### Running Tests
- Created NPM scripts to run tests for the entire application or individual components
- Set up continuous test running during development
- Configured test coverage reports for the full codebase

### Next Steps for Testing
- Implement end-to-end testing with either Cypress or Playwright
- Create automated test scenarios for key user workflows
- Set up continuous integration to run tests on every commit

## Notes
- Maintain the original black background with white text theme
- Keep the Comic Sans MS font for restaurant choices
- Preserve the LED indicator functionality
- Maintain the same voting and random selection logic
- Keep the group-based restaurant selection system
- Preserve the chat functionality
- ✅ Maintain the same notification system timing (COMPLETED)
- Use Windows 98-style UI with status bar instead of alerts

## Future Considerations
- Mobile app version
- Browser notifications
- Email notifications
- Restaurant ratings and reviews
- Integration with restaurant APIs
- Advanced group management features
- Remember user group selection between sessions 