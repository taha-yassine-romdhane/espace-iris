# File Storage Configuration

## Environment Variables

Add this to your `.env` file:

```env
# File Storage Path
# For VPS/Production: use /var/espace-iris-files
# For Local Development: use your local path (e.g., /home/username/Desktop/projects/espace-iris-files)
FILE_STORAGE_PATH="/var/espace-iris-files"
```

## VPS Setup

### 1. Create Storage Directory

```bash
sudo mkdir -p /var/espace-iris-files/{patients,companies,temp,uploads}
sudo chmod -R 777 /var/espace-iris-files
```

### 2. Docker Volume

The `docker-compose.yml` already includes the volume mount:

```yaml
volumes:
  - /var/espace-iris-files:/var/espace-iris-files
```

## Local Development Setup

### 1. Create Storage Directory

```bash
mkdir -p /home/your-username/Desktop/projects/espace-iris-files/{patients,companies,temp,uploads}
```

### 2. Update .env

```env
FILE_STORAGE_PATH="/home/your-username/Desktop/projects/espace-iris-files"
```

## Directory Structure

```
/var/espace-iris-files/
├── patients/          # Patient-specific files
│   └── {patientId}/
│       └── {uuid}.{ext}
├── companies/         # Company documents
│   └── {companyId}/
│       └── {uuid}.{ext}
├── temp/              # Temporary uploads
│   └── {uuid}.{ext}
└── uploads/           # Legacy uploads
    └── {timestamp}.{ext}
```

## File Upload Endpoints

All file upload endpoints now use the `FILE_STORAGE_PATH` environment variable:

- `/api/files/upload` - Main file upload
- `/api/files/upload-temp` - Temporary uploads
- `/api/files/serve/[...path]` - File serving
- `/api/files/serve-temp/[fileName]` - Temp file serving
- `/api/files/move-temp` - Move temp files to permanent storage
- `/api/files/index` - File management (GET/POST/DELETE)
- `/api/upload/index` - Legacy upload endpoint

## Troubleshooting

### Permission Issues

If you get "Permission denied" errors:

```bash
# On VPS
sudo chmod -R 777 /var/espace-iris-files

# Check Docker container user
docker exec espace-iris-app id
```

### Verify Files

```bash
# List uploaded files
find /var/espace-iris-files -type f

# Check directory structure
tree /var/espace-iris-files -L 3
```
