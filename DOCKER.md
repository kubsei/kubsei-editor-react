# Docker Deployment Guide

## Quick Start

### Production Build

```bash
# Build the production image
docker build -t visual-editor-app .

# Run the container
docker run -p 3000:3000 visual-editor-app
```

### Using Docker Compose

```bash
# Production
docker-compose up -d app

# Development (with hot reload)
docker-compose --profile dev up app-dev
```

## Security Features

### Docker Security

The production Dockerfile implements several security best practices:

1. **Multi-stage build**: Reduces final image size and attack surface
2. **Non-root user**: Application runs as `nextjs` user (UID 1001)
3. **Alpine base**: Minimal base image with security updates
4. **dumb-init**: Proper signal handling to prevent zombie processes
5. **Health checks**: Automated container health monitoring

### Docker Compose Security

The `docker-compose.yml` includes:

1. **Read-only filesystem**: Container filesystem is read-only
2. **Capability dropping**: All Linux capabilities are dropped
3. **No new privileges**: Prevents privilege escalation
4. **Resource limits**: CPU and memory limits prevent DoS
5. **Network isolation**: Uses dedicated bridge network

### Application Security Headers

The Next.js configuration includes:

| Header | Purpose |
|--------|---------|
| `X-XSS-Protection` | Prevents XSS attacks |
| `X-Frame-Options` | Prevents clickjacking |
| `X-Content-Type-Options` | Prevents MIME sniffing |
| `Referrer-Policy` | Controls referrer information |
| `Permissions-Policy` | Restricts browser features |
| `Strict-Transport-Security` | Enforces HTTPS |
| `Content-Security-Policy` | Controls resource loading |

### Middleware Security

The middleware provides:

1. **Rate limiting**: 100 requests per minute per IP
2. **Route protection**: Authentication check for protected routes
3. **Additional security headers**: DNS prefetch control, download options

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_API_URL`: kubsei-gateway base URL (REST auth + `/graphql`)
- `NEXT_PUBLIC_WS_URL`: WebSocket endpoint for real-time features

## Building for Different Environments

### Development
```bash
docker-compose --profile dev up
```

### Staging
```bash
docker build -t visual-editor-app:staging .
docker run -e NODE_ENV=production -p 3000:3000 visual-editor-app:staging
```

### Production
```bash
docker build -t visual-editor-app:latest .
docker run -d \
  --name visual-editor \
  --restart unless-stopped \
  -p 3000:3000 \
  --read-only \
  --tmpfs /tmp \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  visual-editor-app:latest
```

## Kubernetes Deployment

Example Kubernetes deployment with security context:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: visual-editor
spec:
  replicas: 3
  selector:
    matchLabels:
      app: visual-editor
  template:
    metadata:
      labels:
        app: visual-editor
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
        fsGroup: 1001
      containers:
        - name: visual-editor
          image: visual-editor-app:latest
          ports:
            - containerPort: 3000
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          resources:
            limits:
              cpu: "1"
              memory: "512Mi"
            requests:
              cpu: "250m"
              memory: "256Mi"
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
```

## Troubleshooting

### Build fails with "standalone" error
Ensure `output: "standalone"` is set in `next.config.ts`.

### Container won't start
Check logs: `docker logs visual-editor-app`

### Health check failing
Verify the application is listening on port 3000 and responding to requests.

### Rate limiting too aggressive
Adjust `MAX_REQUESTS` in `src/proxy.ts`.
