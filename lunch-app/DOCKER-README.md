# Lunch Application Docker Deployment

This README explains how to deploy the Lunch Application using Docker on a Synology NAS or any Docker-capable machine.

## Prerequisites

- Docker and Docker Compose installed
- Network port 3001 available (or change the port in the .env file)
- Git to clone the repository

## Setup Instructions

1. Clone the repository to your deployment server:
   ```bash
   git clone <repository-url>
   cd lunch-app
   ```

2. Configure the environment variables:
   - Edit the `.env` file in the lunch-app directory
   - Ensure HOST_PORT is set to the desired access port (default is 3001)
   - Update the JWT_SECRET with a secure key

3. Build and start the Docker container:
   ```bash
   docker-compose up -d
   ```

4. Initialize the database (first time only):
   ```bash
   docker exec lunch-app npm run seed
   ```

5. Check the logs to make sure everything started correctly:
   ```bash
   docker-compose logs
   ```

## Accessing the Application

- Web application: http://your-server-ip:3001 (or http://your-server-ip:custom-port if changed in .env)

## Managing the Container

- Stop the container:
  ```bash
  docker-compose stop
  ```

- Restart the container:
  ```bash
  docker-compose restart
  ```

- View logs:
  ```bash
  docker-compose logs -f
  ```

- Rebuild and update container:
  ```bash
  docker-compose up -d --build
  ```

## Synology NAS-Specific Instructions

1. Install Docker package from Synology Package Center
2. SSH into your NAS and navigate to the directory where you want to store the application
3. Follow the setup instructions above
4. For easier management, you can use the Synology Docker GUI:
   - Open Docker in the Synology web interface
   - Go to Container and you'll see your lunch-app container
   - You can start/stop/restart it from the interface

## Backing Up Data

The SQLite database is stored in a volume mount at `./database` on the host machine.
To back up the data, simply copy the database directory to a safe location:

```bash
cp -r /path/to/lunch-app/database /path/to/backup/location
```

## Troubleshooting

- Make sure the required port (default 3001) is open in your firewall
- Check the Docker logs for any error messages:
  ```bash
  docker logs lunch-app
  ``` 