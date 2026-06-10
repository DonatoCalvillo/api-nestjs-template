# Storage and file uploads

The template supports multipart file uploads with a pluggable storage backend: local filesystem or S3-compatible storage (AWS S3, MinIO).

## What it is

`FilesModule` exposes `POST /api/v1/files/upload` protected by `files:write` permission. Storage is abstracted behind `IStorageService` / `STORAGE_SERVICE` token.

## API

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /api/v1/files/upload` | Bearer JWT + `files:write` | Upload a single file (multipart field `file`) |

Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. Max size: 5 MB.

Response includes the stored file key/URL via `FileUploadResponseDto`.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `STORAGE_DRIVER` | `local` | `local` or `s3` |
| `STORAGE_LOCAL_PATH` | `./uploads` | Local directory for uploads |
| `S3_BUCKET` | — | S3 bucket name |
| `S3_REGION` | — | AWS region |
| `S3_ENDPOINT` | — | Custom endpoint (MinIO: `http://localhost:9000`) |

Local:

```env
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=./uploads
```

S3 / MinIO:

```env
STORAGE_DRIVER=s3
S3_BUCKET=uploads
S3_REGION=us-east-1
S3_ENDPOINT=http://localhost:9000
```

## Docker MinIO profile

```bash
docker compose --profile storage up -d minio
```

Set `STORAGE_DRIVER=s3` and `S3_ENDPOINT=http://minio:9000` in container env.

## Architecture

```
FilesController → IStorageService (port)
                    ├── LocalStorageService
                    └── S3StorageService
```

Implementation:

- `src/modules/files/files.controller.ts`
- `src/modules/shared/infrastructure/storage/local-storage.service.ts`
- `src/modules/shared/infrastructure/storage/s3-storage.service.ts`
- `src/modules/shared/application/ports/storage.service.port.ts`

## RBAC

Upload requires `files:write` permission (seeded for `admin` role). See [auth.md](../auth.md) and [guides/rbac-on-endpoints.md](../../guides/rbac-on-endpoints.md).

## Related guides

- [Controllers](../../guides/controllers.md) — File upload with `FileInterceptor`
