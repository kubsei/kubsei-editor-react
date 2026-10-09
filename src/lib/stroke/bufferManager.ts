/**
 * Stroke Buffer Manager
 *
 * Gestiona el ciclo de vida de los ArrayBuffers de strokes:
 * - Cache de buffers decodificados para rendering rápido
 * - Pool de buffers reutilizables (opcional, para reducir GC)
 * - Serialización/deserialización para persistencia
 * - Estadísticas de memoria
 *
 * IMPORTANTE: Los ArrayBuffers en Redux no son directamente serializables.
 * Este manager proporciona métodos para convertir a/desde formatos persistibles.
 */

import {
  OptimizedStroke,
  SerializedStroke,
  DecodedStrokeData,
  StrokeMetadata,
} from '@/types/stroke';
import {
  decodeStroke,
  serializeStroke,
  deserializeStroke,
  validateBuffer,
} from './codec';

// ============ TYPES ============

interface CachedDecode {
  flatPoints: number[];
  pressures: number[];
  accessCount: number;
  lastAccess: number;
}

interface BufferManagerStats {
  totalBuffers: number;
  totalBufferBytes: number;
  cachedDecodes: number;
  cacheHits: number;
  cacheMisses: number;
}

interface BufferManagerConfig {
  maxCacheSize: number; // Número máximo de strokes decodificados en cache
  cacheEvictionThreshold: number; // Cuando el cache supera este %, evictar
}

// ============ MANAGER CLASS ============

/**
 * Singleton para gestionar buffers de strokes
 * Proporciona cache de decodificación y gestión de memoria
 */
class StrokeBufferManager {
  private static instance: StrokeBufferManager;

  // Cache de strokes decodificados (para rendering rápido)
  private decodeCache: Map<string, CachedDecode> = new Map();

  // Configuración
  private config: BufferManagerConfig = {
    maxCacheSize: 500, // Cache hasta 500 strokes decodificados
    cacheEvictionThreshold: 0.9, // Evictar cuando cache > 90%
  };

  // Estadísticas
  private stats: BufferManagerStats = {
    totalBuffers: 0,
    totalBufferBytes: 0,
    cachedDecodes: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  private constructor() {}

  static getInstance(): StrokeBufferManager {
    if (!StrokeBufferManager.instance) {
      StrokeBufferManager.instance = new StrokeBufferManager();
    }
    return StrokeBufferManager.instance;
  }

  // ============ CONFIGURATION ============

  configure(config: Partial<BufferManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // ============ DECODE CACHE ============

  /**
   * Obtiene datos decodificados de un stroke (con cache)
   * Usa el ID del stroke como clave de cache
   */
  getDecodedData(strokeId: string, buffer: ArrayBuffer): DecodedStrokeData {
    // Buscar en cache
    const cached = this.decodeCache.get(strokeId);
    if (cached) {
      cached.accessCount++;
      cached.lastAccess = Date.now();
      this.stats.cacheHits++;
      return {
        flatPoints: cached.flatPoints,
        pressures: cached.pressures,
      };
    }

    // Cache miss - decodificar
    this.stats.cacheMisses++;
    const decoded = decodeStroke(buffer);

    // Guardar en cache
    this.cacheDecodedData(strokeId, decoded);

    return decoded;
  }

  /**
   * Guarda datos decodificados en cache
   */
  private cacheDecodedData(strokeId: string, data: DecodedStrokeData): void {
    // Verificar si necesitamos evictar
    if (this.decodeCache.size >= this.config.maxCacheSize * this.config.cacheEvictionThreshold) {
      this.evictOldEntries();
    }

    this.decodeCache.set(strokeId, {
      flatPoints: data.flatPoints,
      pressures: data.pressures,
      accessCount: 1,
      lastAccess: Date.now(),
    });

    this.stats.cachedDecodes = this.decodeCache.size;
  }

  /**
   * Evicta entradas antiguas del cache (LRU)
   */
  private evictOldEntries(): void {
    const entries = Array.from(this.decodeCache.entries());

    // Ordenar por último acceso (más antiguo primero)
    entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    // Evictar 20% de las entradas
    const toEvict = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toEvict; i++) {
      this.decodeCache.delete(entries[i][0]);
    }

    this.stats.cachedDecodes = this.decodeCache.size;
  }

  /**
   * Invalida cache para un stroke específico
   */
  invalidateCache(strokeId: string): void {
    this.decodeCache.delete(strokeId);
    this.stats.cachedDecodes = this.decodeCache.size;
  }

  /**
   * Limpia todo el cache
   */
  clearCache(): void {
    this.decodeCache.clear();
    this.stats.cachedDecodes = 0;
    this.stats.cacheHits = 0;
    this.stats.cacheMisses = 0;
  }

  // ============ SERIALIZATION ============

  /**
   * Serializa un stroke para persistencia (ArrayBuffer → Base64)
   */
  serialize(stroke: OptimizedStroke): SerializedStroke {
    return serializeStroke(stroke);
  }

  /**
   * Deserializa un stroke desde persistencia (Base64 → ArrayBuffer)
   */
  deserialize(serialized: SerializedStroke): OptimizedStroke {
    return deserializeStroke(serialized);
  }

  /**
   * Serializa múltiples strokes
   */
  serializeAll(strokes: OptimizedStroke[]): SerializedStroke[] {
    return strokes.map(s => this.serialize(s));
  }

  /**
   * Deserializa múltiples strokes
   */
  deserializeAll(serialized: SerializedStroke[]): OptimizedStroke[] {
    return serialized.map(s => this.deserialize(s));
  }

  // ============ VALIDATION ============

  /**
   * Valida que un buffer tenga el formato correcto
   */
  validate(buffer: ArrayBuffer): boolean {
    return validateBuffer(buffer);
  }

  /**
   * Valida un stroke completo
   */
  validateStroke(stroke: OptimizedStroke): boolean {
    if (!stroke.buffer || !stroke.metadata) {
      return false;
    }
    return this.validate(stroke.buffer);
  }

  // ============ MEMORY MANAGEMENT ============

  /**
   * Registra un nuevo buffer (para tracking de memoria)
   */
  trackBuffer(buffer: ArrayBuffer): void {
    this.stats.totalBuffers++;
    this.stats.totalBufferBytes += buffer.byteLength;
  }

  /**
   * Desregistra un buffer eliminado
   */
  untrackBuffer(buffer: ArrayBuffer): void {
    this.stats.totalBuffers = Math.max(0, this.stats.totalBuffers - 1);
    this.stats.totalBufferBytes = Math.max(0, this.stats.totalBufferBytes - buffer.byteLength);
  }

  /**
   * Obtiene estadísticas de memoria y cache
   */
  getStats(): BufferManagerStats {
    return { ...this.stats };
  }

  /**
   * Calcula la memoria total usada por buffers (aproximado)
   */
  getMemoryUsage(): { buffers: number; cache: number; total: number } {
    // Estimar tamaño del cache (flatPoints + pressures)
    let cacheBytes = 0;
    this.decodeCache.forEach((cached) => {
      // Cada número es 8 bytes (Float64 en JS)
      cacheBytes += cached.flatPoints.length * 8;
      cacheBytes += cached.pressures.length * 8;
    });

    return {
      buffers: this.stats.totalBufferBytes,
      cache: cacheBytes,
      total: this.stats.totalBufferBytes + cacheBytes,
    };
  }

  /**
   * Resetea todas las estadísticas
   */
  resetStats(): void {
    this.stats = {
      totalBuffers: 0,
      totalBufferBytes: 0,
      cachedDecodes: this.decodeCache.size,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }
}

// ============ EXPORTS ============

// Singleton instance
export const bufferManager = StrokeBufferManager.getInstance();

// También exportar la clase para testing
export { StrokeBufferManager };

// ============ HELPER FUNCTIONS ============

/**
 * Prepara strokes para envío al backend
 * Convierte ArrayBuffers a Base64
 */
export function prepareStrokesForBackend(
  strokes: OptimizedStroke[]
): SerializedStroke[] {
  return bufferManager.serializeAll(strokes);
}

/**
 * Procesa strokes recibidos del backend
 * Convierte Base64 a ArrayBuffers
 */
export function processStrokesFromBackend(
  serialized: SerializedStroke[]
): OptimizedStroke[] {
  const strokes = bufferManager.deserializeAll(serialized);

  // Trackear buffers para estadísticas
  strokes.forEach(s => bufferManager.trackBuffer(s.buffer));

  return strokes;
}

/**
 * Obtiene datos para rendering de un stroke
 * Usa cache automáticamente
 */
export function getStrokeRenderData(
  stroke: OptimizedStroke
): DecodedStrokeData {
  return bufferManager.getDecodedData(stroke.metadata.id, stroke.buffer);
}

/**
 * Limpia recursos de un stroke eliminado
 */
export function cleanupStroke(stroke: OptimizedStroke): void {
  bufferManager.invalidateCache(stroke.metadata.id);
  bufferManager.untrackBuffer(stroke.buffer);
}

/**
 * Obtiene estadísticas de memoria
 */
export function getMemoryStats() {
  return {
    stats: bufferManager.getStats(),
    memory: bufferManager.getMemoryUsage(),
  };
}
