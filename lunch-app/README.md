## Timezone Configuration

If your lunch notifications are not triggering at the correct time, it may be due to a timezone mismatch between your host system and the Docker container.

Docker containers use UTC by default, which can cause time-related issues if your host is in a different timezone.

To fix this issue:

1. Make the fix-timezone.sh script executable:
   ```bash
   chmod +x fix-timezone.sh
   ```

2. Run the script to set the correct timezone:
   ```bash
   ./fix-timezone.sh
   ```

3. Follow the prompts to select your timezone

Alternatively, you can manually add the TZ environment variable to your docker-compose.yml file:
```yaml
environment:
  - NODE_ENV=${NODE_ENV:-production}
  - PORT=${PORT:-3001}
  - JWT_SECRET=${JWT_SECRET:-your_secret_key_change_this_in_production}
  - TZ=Your/Timezone  # e.g. America/New_York, Europe/London
```

Then restart your container:
```bash
docker-compose down
docker-compose up -d
``` 