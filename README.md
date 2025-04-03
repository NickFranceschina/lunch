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

## Repository Structure

- `modernization-plan.md` - Detailed plan for the modernization effort
- `VisualBasic6/` - Original VB6 application code (for reference)
- `lunch-app/` - Modern TypeScript implementation
  - `client/` - React frontend application
  - `server/` - Node.js backend server
  - `database/` - Database scripts and migrations
  - `shared/` - Shared types and utilities

## Getting Started

1. Review the modernization plan in `modernization-plan.md`
2. Install dependencies for both client and server:
```bash
# Install server dependencies
cd lunch-app/server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Database Setup:
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

4. Running the Application:
```bash
# Start the server (in lunch-app/server directory)
npm run dev

# In another terminal, start the client (in lunch-app/client directory)
npm start
```
   - The server runs on port 3001
   - The client runs on port 3000
   - Access the application at http://localhost:3000

5. Contribute to the modernization effort by implementing the planned components

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 