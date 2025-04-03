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
- [ ] Create additional UI components:
  - [ ] User Info panel
  - [ ] Group Info panel
  - [ ] Restaurants panel
  - [x] Login dialog
  - [ ] Chat windows (User and Group)
- [ ] Implement real-time updates using WebSocket
- [ ] Add responsive design for modern screen resolutions

### 2. Backend (Node.js + TypeScript)
- [x] Set up Express.js server with TypeScript
- [x] Create RESTful API endpoints:
  - [x] User management
  - [x] Group management
  - [ ] Restaurant management
  - [ ] Voting system
  - [ ] Chat functionality
- [ ] Implement WebSocket server for real-time notifications
- [x] Create database schema (SQLite implemented instead of PostgreSQL)
- [x] Implement data migration from Access database

### 3. Database Migration
- [x] Create new database schema:
  - [x] Users table
  - [x] Groups table
  - [x] Restaurants table
- [x] Develop migration script from Access to new database
- [x] Implement data validation and sanitization

### 4. Authentication & Security
- [x] Implement modern authentication system
- [x] Add user session management
- [x] Implement role-based access control
- [x] Add input validation and sanitization
- [ ] Implement secure WebSocket connections

### 5. Configuration Management
- [x] Create configuration system for:
  - [x] Server settings
  - [x] Database connection
  - [x] Notification times
  - [x] Voting parameters
- [x] Implement environment-based configuration

### 6. Testing
- [ ] Set up testing framework
- [ ] Write unit tests for:
  - [ ] Frontend components
  - [ ] Backend services
  - [ ] Database operations
- [ ] Implement integration tests
- [ ] Add end-to-end testing

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
- Real-time: WebSocket
- Authentication: JWT
- Testing: Jest + React Testing Library
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
   - [ ] Complete remaining UI components and functionality
5. [x] Migrate existing data
6. [ ] Test thoroughly
7. [ ] Deploy to production
8. [ ] Phase out old system

## Current Status
- Server is running on port 3001 with database seeded
- Basic UI components have been implemented:
  - Main window with black background and white text
  - LED indicator for confirmation status
  - Restaurant display with Comic Sans MS font
  - Voting controls
  - Login dialog
- API service structure has been set up

## Next Steps
1. Complete Restaurant API endpoints:
   - Implement random restaurant selection
   - Add voting functionality
2. Develop administrative panels:
   - User management interface
   - Group management interface
   - Restaurant management interface
3. Implement WebSocket for real-time updates
4. Add chat functionality
5. Complete testing and error handling

## Notes
- Maintain the original black background with white text theme
- Keep the Comic Sans MS font for restaurant choices
- Preserve the LED indicator functionality
- Maintain the same voting and random selection logic
- Keep the group-based restaurant selection system
- Preserve the chat functionality
- Maintain the same notification system timing

## Future Considerations
- Mobile app version
- Browser notifications
- Email notifications
- Restaurant ratings and reviews
- Integration with restaurant APIs
- Advanced group management features 