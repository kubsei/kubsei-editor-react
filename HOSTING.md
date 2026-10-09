# Hosting Options - Free & Low-Cost

Guía completa de opciones de hosting para tu stack:
- **Frontend**: Next.js (React)
- **Backend**: Spring Boot (Java) con GraphQL
- **Database**: MongoDB

---

## 🏆 Recomendación Principal

Para empezar **gratis** y escalar cuando necesites:

| Componente | Servicio Recomendado | Tier Gratis |
|------------|---------------------|-------------|
| Frontend | **Vercel** | ✅ Ilimitado para proyectos hobby |
| Backend | **Railway** | ✅ $5 crédito/mes gratis |
| Database | **MongoDB Atlas** | ✅ 512MB gratis |

---

## 📱 Frontend (Next.js)

### 1. Vercel (⭐ Recomendado)
**El mejor para Next.js - creadores del framework**

| Feature | Free Tier | Pro ($20/mes) |
|---------|-----------|---------------|
| Deployments | Ilimitados | Ilimitados |
| Bandwidth | 100GB/mes | 1TB/mes |
| Serverless Functions | 100GB-hrs | 1000GB-hrs |
| Build time | 6000 min/mes | 24000 min/mes |

```bash
# Deploy desde CLI
npm i -g vercel
vercel --prod
```

**Pros**: Integración perfecta con Next.js, preview deployments, analytics gratis
**Cons**: Puede ser caro si escalas mucho

### 2. Netlify
**Alternativa sólida**

| Feature | Free Tier | Pro ($19/mes) |
|---------|-----------|---------------|
| Bandwidth | 100GB/mes | 400GB/mes |
| Build minutes | 300/mes | 25000/mes |
| Functions | 125K req/mes | 2M req/mes |

```bash
npm i -g netlify-cli
netlify deploy --prod
```

### 3. Cloudflare Pages
**Gratis y muy rápido**

| Feature | Free Tier |
|---------|-----------|
| Bandwidth | Ilimitado |
| Builds | 500/mes |
| Custom domains | Ilimitados |

```bash
npm i -g wrangler
wrangler pages deploy .next
```

**Pros**: CDN global gratis, ilimitado
**Cons**: Algunas features de Next.js no soportadas

---

## ⚙️ Backend (Spring Boot / Java)

### 1. Railway (⭐ Recomendado)
**Simple y potente**

| Feature | Free Tier | Hobby ($5/mes) |
|---------|-----------|----------------|
| Memory | 512MB | 8GB |
| CPU | Shared | Shared |
| Credits | $5/mes | $5/mes + pago |

```bash
npm i -g @railway/cli
railway login
railway up
```

**Pros**: Deploy desde GitHub automático, MongoDB incluido, fácil configuración
**Cons**: Se agota rápido si dejas el servicio 24/7

### 2. Render
**Generoso tier gratis**

| Feature | Free Tier | Starter ($7/mes) |
|---------|-----------|------------------|
| Memory | 512MB | 512MB |
| Hours | 750hrs/mes | Ilimitado |
| Sleep | Después de 15min | No |

```yaml
# render.yaml
services:
  - type: web
    name: visual-editor-api
    env: docker
    plan: free
    healthCheckPath: /actuator/health
```

**Pros**: Gratis por 750 hrs, auto-deploy desde GitHub
**Cons**: Se duerme después de 15 min inactividad (gratis)

### 3. Fly.io
**Buena opción para microservicios**

| Feature | Free Tier |
|---------|-----------|
| VMs | 3 shared-cpu-1x |
| Memory | 256MB cada uno |
| Bandwidth | 160GB/mes |

```bash
# fly.toml
flyctl launch
flyctl deploy
```

### 4. Google Cloud Run
**Pay-per-use, escala a 0**

| Feature | Free Tier |
|---------|-----------|
| Requests | 2M/mes |
| Compute | 360,000 GB-seconds |
| CPU | 180,000 vCPU-seconds |

```bash
gcloud run deploy visual-editor-api \
  --source . \
  --region us-central1
```

**Pros**: Solo pagas por uso, escala automática
**Cons**: Cold starts, más complejo de configurar

---

## 🗄️ Base de Datos (MongoDB)

### 1. MongoDB Atlas (⭐ Recomendado)
**El oficial de MongoDB**

| Feature | Free (M0) | Dedicated ($57/mes) |
|---------|-----------|---------------------|
| Storage | 512MB | 10GB+ |
| RAM | Shared | 2GB+ |
| Connections | 500 | Ilimitadas |

```bash
# Connection string
mongodb+srv://<user>:<pass>@cluster.mongodb.net/visual-editor
```

**Pros**: 512MB gratis, fácil setup, backups automáticos
**Cons**: Storage limitado en tier gratis

### 2. Railway MongoDB
**Incluido con Railway**

Si usas Railway para el backend, puedes añadir MongoDB como servicio adicional.

### 3. Supabase
**PostgreSQL pero con driver MongoDB**

| Feature | Free Tier |
|---------|-----------|
| Database | 500MB |
| Storage | 1GB |
| Bandwidth | 2GB |

---

## 💰 Comparación de Costos Mensuales

### Escenario 1: Proyecto Personal/Hobby (Gratis)
```
Frontend (Vercel Free)      : $0
Backend (Railway Free)      : $0 (con límite de $5)
Database (Atlas Free)       : $0
───────────────────────────────
Total                       : $0/mes
```

### Escenario 2: MVP/Startup Pequeña (~$20/mes)
```
Frontend (Vercel Free)      : $0
Backend (Railway Hobby)     : $5
Backend (Render Starter)    : $7
Database (Atlas M0)         : $0
───────────────────────────────
Total                       : $5-12/mes
```

### Escenario 3: Producción Pequeña (~$50/mes)
```
Frontend (Vercel Pro)       : $20
Backend (Railway Pro)       : $20
Database (Atlas M2)         : $9
───────────────────────────────
Total                       : $49/mes
```

---

## 🚀 Setup Rápido Recomendado

### Paso 1: Base de Datos (MongoDB Atlas)
```bash
# 1. Ir a mongodb.com/cloud/atlas
# 2. Crear cuenta gratuita
# 3. Crear cluster M0 (gratis)
# 4. Copiar connection string
```

### Paso 2: Backend (Railway)
```bash
# 1. Conectar repo de GitHub
railway login
railway init

# 2. Añadir variables de entorno
railway variables set MONGODB_URI="mongodb+srv://..."
railway variables set JWT_SECRET="your-secret"

# 3. Deploy
railway up
```

### Paso 3: Frontend (Vercel)
```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Login y deploy
vercel login
vercel --prod

# 3. Configurar variables
vercel env add NEXT_PUBLIC_API_URL
```

---

## 🔧 Configuración de Secrets en GitHub

Para que el CI/CD funcione, configura estos secrets en GitHub:

### Para Frontend (visual-editor2d-app)
```
VERCEL_TOKEN        # De vercel.com/account/tokens
VERCEL_ORG_ID       # De .vercel/project.json
VERCEL_PROJECT_ID   # De .vercel/project.json
```

### Para Backend (ms-visual-editor2d-java)
```
RAILWAY_TOKEN       # De railway.app/account/tokens
# o
RENDER_DEPLOY_HOOK_URL  # De render.com dashboard
# o
FLY_API_TOKEN       # De fly.io/user/personal_access_tokens
```

---

## 📊 Monitoreo Gratuito

| Servicio | Uso |
|----------|-----|
| **Sentry** | Error tracking (10K eventos gratis/mes) |
| **Grafana Cloud** | Métricas y logs (10K series gratis) |
| **UptimeRobot** | Uptime monitoring (50 monitors gratis) |
| **Checkly** | API monitoring (5 checks gratis) |

---

## 🔐 Dominio y SSL

### Dominio Gratis
- **Freenom**: .tk, .ml, .ga (gratis pero poco confiable)
- **GitHub Pages**: username.github.io (solo estático)

### Dominio Barato (~$10-15/año)
- **Namecheap**: .com desde $8.88/año
- **Cloudflare Registrar**: Precio de costo, sin markup
- **Porkbun**: Buenos precios

### SSL
- **Let's Encrypt**: Gratis (incluido en Vercel, Railway, Render)
- **Cloudflare**: Gratis con proxy activado

---

## 📝 Ejemplo de Arquitectura Completa

```
┌─────────────────────────────────────────────────────────────┐
│                         INTERNET                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare (CDN + SSL)                   │
│                         GRATIS                              │
└─────────────────────────────────────────────────────────────┘
                    │                    │
                    ▼                    ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│     Vercel (Frontend)    │  │    Railway (Backend API)     │
│      visual-editor.app   │  │    api.visual-editor.app     │
│          GRATIS          │  │         $5/mes               │
└──────────────────────────┘  └──────────────────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────────────┐
                              │    MongoDB Atlas (Database)  │
                              │           GRATIS              │
                              └──────────────────────────────┘
```

**Costo total: $0-5/mes** para empezar
