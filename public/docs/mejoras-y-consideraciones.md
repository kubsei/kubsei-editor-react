# Mejoras y Consideraciones - Visual Editor 2D

> Documento de referencia para mejoras técnicas y consideraciones profesionales para la aplicación Visual Editor 2D.

---

## Tabla de Contenidos

1. [Frontend - Mejoras Críticas](#frontend---mejoras-críticas)
2. [Frontend - Mejoras Importantes](#frontend---mejoras-importantes)
3. [Frontend - Mejoras Recomendadas](#frontend---mejoras-recomendadas)
4. [Backend - Seguridad Crítica](#backend---seguridad-crítica)
5. [Backend - Rendimiento](#backend---rendimiento)
6. [Backend - Arquitectura](#backend---arquitectura)
7. [Resumen de Prioridades](#resumen-de-prioridades)

---

## Frontend - Mejoras Críticas

### 1. Sistema de Dirty Flags para Auto-save

**Problema actual:**
```typescript
// INEFICIENTE - Se ejecuta en cada render
const currentState = JSON.stringify({
  elements: editorState.elements,
  layers: editorState.layers,
});
const debouncedState = useDebounce(currentState, 2000);
```

**Por qué es malo:**
- `JSON.stringify` de 1000 elementos = ~50-100ms bloqueando UI
- Se ejecuta en CADA render, no solo cuando hay cambios
- Compara strings de MB innecesariamente

**Solución - Dirty Flags:**
```typescript
interface SyncState {
  isDirty: boolean;
  dirtyFields: {
    elements: boolean;
    layers: boolean;
    canvas: boolean;
  };
  localVersion: number;
}
```

**Flujo:**
1. Usuario dibuja → `markDirty('elements')` → `isDirty = true`
2. Auto-save detecta `isDirty === true` → Guarda solo campos dirty
3. Save exitoso → `markSynced()` → Reset flags

**Beneficios:**
- Sin JSON.stringify: Solo comparas un booleano
- Granularidad: Sabes exactamente qué cambió
- O(1) vs O(n): Checar `isDirty` es instantáneo

**Opciones de implementación:**

| Opción | Pros | Contras | Recomendación |
|--------|------|---------|---------------|
| Redux slice separado | Separación de concerns, testeable | Más código | ✅ Recomendado |
| Campo en editorSlice | Todo junto, menos archivos | Mezcla lógica | Aceptable |
| Zustand separado | Más simple que Redux | Otra dependencia | Alternativa |

---

### 2. Backup Local + Indicador de Sincronización

**Problema:** Si falla el save, el usuario pierde trabajo sin saberlo.

**Estados de sincronización:**
```
✓ Saved           - Todo guardado en servidor
● Saving...       - Guardando ahora
◐ Unsaved changes - Hay cambios pendientes
✕ Error saving    - Falló el guardado (con retry)
○ Offline         - Sin conexión (guardando local)
```

**Flujo de backup:**
```
1. Usuario hace cambio
2. Inmediatamente: Guardar en localStorage (síncrono, <5ms)
3. Después de debounce: Enviar a servidor
4. Si servidor OK: Limpiar backup local
5. Si servidor FALLA: Mantener backup, reintentar
```

**Estructura del backup:**
```typescript
localStorage.setItem('project-backup-{projectId}', JSON.stringify({
  timestamp: Date.now(),
  version: localVersion,
  data: { elements, layers, canvas }
}));
```

**Por qué es crítico:**
- Pérdida de trabajo = usuario perdido
- Falla de red es común en móviles
- Profesionalismo: Figma, Notion, Google Docs lo tienen

**Opciones:**

| Opción | Pros | Contras | Recomendación |
|--------|------|---------|---------------|
| localStorage | Simple, síncrono, 5-10MB | Límite de tamaño | ✅ Para empezar |
| IndexedDB | Sin límite práctico | Más complejo | Proyectos grandes |
| localStorage + compresión | Más espacio | Overhead CPU | Si necesitas más |

---

### 3. Virtualización de Elementos

**Problema actual:**
```typescript
// Renderiza TODOS los elementos
{Object.values(elements).map(element => (
  <KonvaElement key={element.id} {...element} />
))}
```

Con 1000 elementos = 1000 nodos aunque solo 20 sean visibles.

**Impacto:**
- 100 elementos: No notas nada
- 500 elementos: Empieza a lagear
- 1000+ elementos: Inutilizable

**Solución - Spatial Indexing:**
```typescript
const visibleBounds = getViewportBounds(zoom, offset);
const visibleElements = spatialIndex.query(visibleBounds);

// Solo renderizar ~50 elementos visibles
{visibleElements.map(element => (
  <KonvaElement key={element.id} {...element} />
))}
```

**Estructuras de datos:**

| Estructura | Pros | Contras | Uso |
|------------|------|---------|-----|
| R-Tree | Rápido para queries de área | Complejo | ✅ Estándar industria |
| Quadtree | Simple, bueno para 2D | Peor con elementos grandes | Alternativa |
| Grid hash | Muy simple | Pobre con zoom extremo | Prototipo |
| Librería rbush | R-Tree listo para usar | Dependencia | ✅ Pragmático |

---

### 4. Versionado/Historial Persistente

**Problema:** El undo/redo solo existe en memoria de sesión.

**Impacto:** Cerrar pestaña = perder todo el historial.

**Solución:**
- Guardar snapshots periódicos en backend
- Implementar version history (últimas 30 versiones)
- Operation log para reconstruir estados

---

## Frontend - Mejoras Importantes

### 5. Optimización del Canvas (Layer Caching)

**Problema:** Konva redibuja todo el canvas en cada cambio.

**Impacto:** 60fps imposible con muchos elementos.

**Solución - Layer Caching:**
```typescript
// Cuando una layer no está siendo editada
layer.cache();

// Cuando el usuario empieza a editar
layer.clearCache();
```

**Cuándo cachear:**
- Layers que NO son la activa
- Después de terminar de dibujar (endDrawing)
- Elementos que no están seleccionados

**Impacto:**
- Sin cache: Redibujar 1000 paths = ~16ms/frame = 60fps imposible
- Con cache: Dibujar 1 imagen = <1ms = 60fps fácil

---

### 6. Web Workers para Operaciones Pesadas

**Operaciones candidatas:**
1. Serialización para guardar: `JSON.stringify(bigState)`
2. Deserialización al cargar: `JSON.parse(bigJson)`
3. Cálculos geométricos: Bounding boxes, intersecciones
4. Simplificación de paths: Douglas-Peucker algorithm
5. Export a imagen: Canvas to PNG/SVG

**Ejemplo conceptual:**
```typescript
// worker.ts
self.onmessage = (e) => {
  if (e.data.type === 'SERIALIZE') {
    const json = JSON.stringify(e.data.state);
    self.postMessage({ type: 'SERIALIZED', json });
  }
};

// main thread
const worker = new Worker('worker.ts');
worker.postMessage({ type: 'SERIALIZE', state: editorState });
worker.onmessage = (e) => {
  sendToServer(e.data.json);
};
```

---

### 7. Compresión de Datos (Strokes)

**Problema:** Los drawings guardan arrays de puntos sin optimizar.

**Impacto:** Un trazo de 1000 puntos = 8KB innecesarios.

**Solución:**
- Simplificación de paths (algoritmo Douglas-Peucker)
- Compresión delta de puntos consecutivos
- Binary format en vez de JSON para strokes

---

### 8. Optimización del Historial (Undo/Redo)

**Problema actual:**
```typescript
// Guarda TODO el estado en cada acción
state.history.past.push(JSON.parse(JSON.stringify(stateToSave)));
```

Con 50 estados × 1000 elementos = **50MB de RAM solo en historial**.

**Soluciones:**

#### A) Structural Sharing
```typescript
// MAL - Copia profunda innecesaria
state.history.past.push(JSON.parse(JSON.stringify(state)));

// MEJOR - Solo guardar referencia
state.history.past.push({ ...state, history: undefined });
```

#### B) Operation-based history
```typescript
type Operation =
  | { type: 'ADD_ELEMENT', element: Element }
  | { type: 'MOVE_ELEMENT', id: string, from: Point, to: Point }
  | { type: 'DELETE_ELEMENT', element: Element };

// Undo = aplicar operación inversa
// Redo = re-aplicar operación
```

#### C) Snapshots + deltas
- Guardar snapshot completo cada N operaciones
- Entre snapshots, guardar solo deltas

---

## Frontend - Mejoras Recomendadas

### 9. Error Boundaries

**Problema:** Un error en un componente crashea todo el editor.

**Solución:** React Error Boundaries + graceful degradation.

---

### 10. Telemetría de Rendimiento

**Problema:** No sabes qué operaciones son lentas para los usuarios.

**Solución:**
- Performance marks/measures
- RUM (Real User Monitoring)
- Error tracking (Sentry)

---

### 11. Normalización del Store Redux

**Problema:** Cualquier cambio notifica a todos los subscribers.

**Solución:**
- Normalizar estado (entities pattern)
- Selectores memoizados con Reselect
- Considerar Zustand o Jotai para granularidad

---

### 12. Export Optimizado

**Problema:** Export a PNG/SVG bloquea UI.

**Solución:**
- OffscreenCanvas para rendering
- Worker para encoding
- Progress indicator para exports grandes

---

### 13. Sistema de Shortcuts

**Problema:** Shortcuts hardcodeados, no personalizables.

**Solución:**
- Sistema de shortcuts configurable
- Conflict detection
- Cheatsheet modal (como Figma con `?`)

---

### 14. Arquitectura de Plugins

**Problema:** Cada feature nueva requiere modificar core.

**Solución:**
- Architecture de plugins
- Hook system para extensiones
- Custom tools API

---

## Backend - Seguridad Crítica

### 1. JWT Secret Expuesto

**Problema actual:**
```yaml
jwt:
  secret: ${JWT_SECRET:tu-clave-secreta-muy-larga...}
```

El fallback hardcodeado es un riesgo.

**Impacto:** Cualquiera puede forjar tokens válidos.

**Solución:**
- Quitar el fallback, forzar que `JWT_SECRET` exista
- Usar al menos 512 bits de entropía
- Rotar secretos periódicamente
- En producción: AWS Secrets Manager, HashiCorp Vault

---

### 2. OAuth2 Client Secret en Código

**Problema:**
```yaml
client-secret: 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
```

**Impacto:** Si el repo se filtra, cualquiera puede impersonar la app.

**Solución:**
- Variables de entorno: `${GOOGLE_CLIENT_SECRET}`
- Nunca commitear secrets
- Regenerar el secret actual (ya comprometido si está en git)

---

### 3. No hay Rate Limiting

**Problema:** Miles de requests por segundo posibles.

**Impacto:**
- Ataques de fuerza bruta a login
- DoS (Denial of Service)
- Costos excesivos

**Solución:**
```
Opciones:
├── Bucket4j + Spring
├── Redis + sliding window
├── API Gateway (Kong, AWS)
└── Cloudflare/nginx
```

**Límites recomendados:**
- Login: 5 intentos/minuto por IP
- Register: 3/hora por IP
- GraphQL: 100/minuto por usuario
- SaveProjectState: 30/minuto por proyecto

---

### 4. Validación de Inputs Insuficiente

**Problema:**
```java
public class RegisterInput {
    private String email;    // ¿Formato válido?
    private String password; // ¿Longitud mínima?
    private String name;     // ¿XSS?
}
```

**Solución:**
```java
public class RegisterInput {
    @Email(message = "Email inválido")
    @NotBlank
    private String email;

    @Size(min = 8, max = 100)
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$")
    private String password;

    @Size(min = 1, max = 100)
    @SafeHtml
    private String name;
}
```

---

## Backend - Rendimiento

### 5. Índices MongoDB Insuficientes

**Índices que faltan:**
```javascript
// Para búsquedas de proyectos
db.projects.createIndex({ userId: 1, updatedAt: -1 })
db.projects.createIndex({ isPublic: 1, updatedAt: -1 })

// TTL index para tokens (auto-delete)
db.refresh_tokens.createIndex({ expiryDate: 1 }, { expireAfterSeconds: 0 })

// Para usuarios OAuth
db.users.createIndex({ provider: 1, providerId: 1 })
```

**Verificar con:** `db.projects.find({...}).explain("executionStats")`

---

### 6. SaveProjectState Guarda TODO

**Problema:**
```java
project.setElements(elements);  // Reemplaza TODO
project.setLayers(layers);
```

**Impacto:** 1000 elementos = ~500KB por save

**Solución - Guardar Deltas:**
```graphql
input ProjectDeltaInput {
  addedElements: JSON
  modifiedElements: JSON
  deletedElementIds: [String!]
  layers: [LayerInput!]
}

mutation saveProjectDelta(id: ID!, delta: ProjectDeltaInput!): Project!
```

---

### 7. Sin Paginación en Queries

**Problema:**
```java
public List<Project> getAllProjects() {
    return projectRepository.findAllByOrderByUpdatedAtDesc();
}
```

**Solución:**
```graphql
type ProjectConnection {
  edges: [ProjectEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

query projects(first: Int, after: String): ProjectConnection!
```

---

### 8. Sin Caché

**Solución - Múltiples niveles:**
```
Nivel 1: Spring Cache (en memoria)
├── @Cacheable("projects") en getProjectById
├── @CacheEvict en save/delete
└── TTL: 5 minutos

Nivel 2: Redis (compartido entre instancias)
├── Datos de usuario (me query)
├── Proyectos frecuentes
└── TTL: 15 minutos

Nivel 3: HTTP Cache headers
├── ETag para validación
├── Cache-Control para clientes
```

---

## Backend - Arquitectura

### 9. Elementos sin Tipo

**Problema:**
```java
private Map<String, Object> elements;  // Sin validación
```

**Solución A - Validar:**
```java
public void validateElements(Map<String, Object> elements) {
    for (Object element : elements.values()) {
        // Verificar campos requeridos
    }
}
```

**Solución B - Colección separada:**
```java
@Document(collection = "elements")
public class Element {
    private String id;
    private String projectId;  // Indexed
    private String type;
    // ...
}
```

---

### 10. Sin Versionado de API

**Solución:**
```graphql
type Project {
  id: ID!
  version: Int  # Nuevo, opcional
  thumbnail: String @deprecated(reason: "Use thumbnailUrl")
  thumbnailUrl: String
}
```

---

### 11. Health Checks Básicos

**Solución:**
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  health:
    mongo:
      enabled: true
```

---

### 12. Sin Logging Estructurado

**Solución - JSON logs:**
```xml
<encoder class="net.logstash.logback.encoder.LogstashEncoder">
    <includeMdcKeyName>userId</includeMdcKeyName>
    <includeMdcKeyName>projectId</includeMdcKeyName>
</encoder>
```

---

### 13. Cleanup de Tokens Ineficiente

**Problema:** Job a las 2 AM, tokens se acumulan.

**Solución - TTL Index:**
```java
@Indexed(expireAfterSeconds = 0)
private Instant expiryDate;
```

MongoDB borra automáticamente cuando expira.

---

## Resumen de Prioridades

### Frontend

| Prioridad | Item | Esfuerzo | Impacto |
|-----------|------|----------|---------|
| 🔴 | Dirty flags (optimizar auto-save) | Medio | Alto |
| 🔴 | Backup local + sync indicator | Bajo | Alto |
| 🔴 | Virtualización de elementos | Alto | Crítico |
| 🔴 | Version history básico | Medio | Alto |
| 🟠 | Canvas layer caching | Bajo | Alto |
| 🟠 | Web Workers | Medio | Medio |
| 🟠 | Compresión de strokes | Bajo | Medio |
| 🟡 | Error boundaries | Bajo | Medio |
| 🟡 | Performance monitoring | Bajo | Medio |

### Backend

| Prioridad | Item | Esfuerzo | Riesgo |
|-----------|------|----------|--------|
| 🔴 | Secrets fuera del código | Bajo | **Crítico** |
| 🔴 | Rate limiting | Medio | **Alto** |
| 🔴 | Validación de inputs | Bajo | **Alto** |
| 🟠 | Índices MongoDB | Bajo | Medio |
| 🟠 | Delta saves | Alto | Medio |
| 🟠 | Paginación | Medio | Medio |
| 🟠 | Caché | Medio | Bajo |
| 🟡 | Health checks | Bajo | Bajo |
| 🟡 | Logging estructurado | Bajo | Bajo |
| 🟡 | TTL index para tokens | Bajo | Bajo |

---

## Plan de Implementación Sugerido

### Fase 1 - Seguridad (1-2 días)
1. Mover secrets a variables de entorno
2. Regenerar OAuth client secret
3. Añadir validaciones de input básicas

### Fase 2 - Estabilidad (3-5 días)
1. Implementar dirty flags
2. Backup local en localStorage
3. Indicador de sincronización

### Fase 3 - Rendimiento (1-2 semanas)
1. Rate limiting
2. Índices MongoDB
3. Layer caching en Konva

### Fase 4 - Escala (2-4 semanas)
1. Virtualización de elementos
2. Delta saves
3. Paginación
4. Caché con Redis

---

*Documento generado: Enero 2025*
*Última actualización: --*
