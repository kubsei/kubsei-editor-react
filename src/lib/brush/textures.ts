/**
 * Brush Textures - Sistema de texturas procedurales para pinceles
 *
 * Genera texturas de forma procedural (sin necesidad de imágenes externas):
 * - Pencil: grano tipo lápiz/carboncillo
 * - Paper: textura de papel
 * - Noise: ruido general
 *
 * Las texturas se cachean para reutilización
 */

import { TextureType } from './types';

// ============ TYPES ============

interface TextureConfig {
  type: TextureType;
  scale: number;       // Escala de la textura (1 = normal)
  intensity: number;   // Intensidad (0-1)
  seed?: number;       // Semilla para reproducibilidad
}

interface CachedTexture {
  canvas: HTMLCanvasElement;
  pattern: CanvasPattern;
  config: TextureConfig;
}

// ============ CONSTANTS ============

const DEFAULT_TEXTURE_SIZE = 256;
const CACHE_MAX_SIZE = 10;

// ============ TEXTURE CACHE ============

const textureCache: Map<string, CachedTexture> = new Map();

/**
 * Genera una clave única para el cache basada en la configuración
 */
function getCacheKey(config: TextureConfig): string {
  return `${config.type}-${config.scale.toFixed(2)}-${config.intensity.toFixed(2)}-${config.seed || 0}`;
}

/**
 * Limpia entradas antiguas del cache si excede el tamaño máximo
 */
function cleanCache(): void {
  if (textureCache.size > CACHE_MAX_SIZE) {
    const keysToDelete = Array.from(textureCache.keys()).slice(0, textureCache.size - CACHE_MAX_SIZE);
    keysToDelete.forEach(key => textureCache.delete(key));
  }
}

// ============ RANDOM GENERATORS ============

/**
 * Generador de números pseudo-aleatorios con semilla
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Genera ruido Perlin simplificado (1D interpolado a 2D)
 */
function generatePerlinNoise(
  size: number,
  scale: number,
  random: () => number
): number[][] {
  const noise: number[][] = [];

  // Generar grid base de ruido
  const gridSize = Math.ceil(size / scale) + 2;
  const baseNoise: number[][] = [];

  for (let y = 0; y < gridSize; y++) {
    baseNoise[y] = [];
    for (let x = 0; x < gridSize; x++) {
      baseNoise[y][x] = random();
    }
  }

  // Interpolar para crear ruido suave
  for (let y = 0; y < size; y++) {
    noise[y] = [];
    for (let x = 0; x < size; x++) {
      const gx = x / scale;
      const gy = y / scale;

      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const x1 = x0 + 1;
      const y1 = y0 + 1;

      const sx = gx - x0;
      const sy = gy - y0;

      // Interpolación bilineal suave
      const n00 = baseNoise[y0 % gridSize][x0 % gridSize];
      const n10 = baseNoise[y0 % gridSize][x1 % gridSize];
      const n01 = baseNoise[y1 % gridSize][x0 % gridSize];
      const n11 = baseNoise[y1 % gridSize][x1 % gridSize];

      const nx0 = smoothstep(n00, n10, sx);
      const nx1 = smoothstep(n01, n11, sx);
      noise[y][x] = smoothstep(nx0, nx1, sy);
    }
  }

  return noise;
}

function smoothstep(a: number, b: number, t: number): number {
  const st = t * t * (3 - 2 * t);
  return a + (b - a) * st;
}

// ============ TEXTURE GENERATORS ============

/**
 * Genera textura de lápiz/carboncillo
 * Simula el grano de grafito sobre papel
 */
function generatePencilTexture(
  size: number,
  scale: number,
  intensity: number,
  random: () => number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Fondo transparente
  ctx.clearRect(0, 0, size, size);

  // Generar capas de ruido para simular grano
  const noise1 = generatePerlinNoise(size, scale * 8, random);
  const noise2 = generatePerlinNoise(size, scale * 16, random);
  const noise3 = generatePerlinNoise(size, scale * 4, random);

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Combinar capas de ruido con diferentes pesos
      const n1 = noise1[y][x];                    // Grano grande
      const n2 = noise2[y][x] * 0.5;              // Grano medio
      const n3 = noise3[y][x] * 0.25;             // Grano fino
      const combined = (n1 + n2 + n3) / 1.75;

      // Aplicar curva de contraste para simular grano de lápiz
      // Los valores bajos se vuelven más oscuros, los altos más claros
      const contrasted = Math.pow(combined, 1.5);

      // Convertir a alpha (negro con transparencia variable)
      const alpha = Math.floor((1 - contrasted) * intensity * 255);

      data[i] = 0;           // R
      data[i + 1] = 0;       // G
      data[i + 2] = 0;       // B
      data[i + 3] = alpha;   // A
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Agregar líneas diagonales sutiles (textura de trazo de lápiz)
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = `rgba(0, 0, 0, ${intensity * 0.1})`;
  ctx.lineWidth = 0.5;

  for (let i = 0; i < size * 2; i += 3 + Math.floor(random() * 4)) {
    const offset = random() * 10 - 5;
    ctx.beginPath();
    ctx.moveTo(i + offset, 0);
    ctx.lineTo(i - size + offset, size);
    ctx.stroke();
  }

  return canvas;
}

/**
 * Genera textura de papel
 * Simula la rugosidad del papel
 */
function generatePaperTexture(
  size: number,
  scale: number,
  intensity: number,
  random: () => number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  // Ruido de baja frecuencia para textura de fibras
  const noise1 = generatePerlinNoise(size, scale * 32, random);
  const noise2 = generatePerlinNoise(size, scale * 64, random);

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      const n1 = noise1[y][x];
      const n2 = noise2[y][x] * 0.5;
      const combined = (n1 + n2) / 1.5;

      // Textura de papel: variación sutil en luminosidad
      const brightness = 0.5 + (combined - 0.5) * intensity;
      const alpha = Math.floor(Math.abs(brightness - 0.5) * 2 * intensity * 128);

      // Gris con transparencia variable
      const gray = brightness < 0.5 ? 0 : 255;
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
      data[i + 3] = alpha;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

/**
 * Genera textura de ruido puro
 */
function generateNoiseTexture(
  size: number,
  scale: number,
  intensity: number,
  random: () => number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      const n = random();
      const alpha = Math.floor(n * intensity * 128);

      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = alpha;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

// ============ PUBLIC API ============

/**
 * Obtiene o genera una textura con la configuración dada
 * Usa cache para evitar regenerar texturas idénticas
 */
export function getTexture(config: TextureConfig): CachedTexture | null {
  // Verificar si está deshabilitada
  if (config.type === 'none' || config.intensity <= 0) {
    return null;
  }

  const cacheKey = getCacheKey(config);

  // Buscar en cache
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  // Generar nueva textura
  const seed = config.seed || Math.floor(Math.random() * 1000000);
  const random = seededRandom(seed);
  const size = DEFAULT_TEXTURE_SIZE;

  let canvas: HTMLCanvasElement;

  switch (config.type) {
    case 'pencil':
      canvas = generatePencilTexture(size, config.scale, config.intensity, random);
      break;
    case 'paper':
      canvas = generatePaperTexture(size, config.scale, config.intensity, random);
      break;
    case 'noise':
      canvas = generateNoiseTexture(size, config.scale, config.intensity, random);
      break;
    default:
      return null;
  }

  // Crear pattern
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return null;

  const pattern = tempCtx.createPattern(canvas, 'repeat');
  if (!pattern) return null;

  const cached: CachedTexture = {
    canvas,
    pattern,
    config: { ...config, seed },
  };

  // Guardar en cache
  textureCache.set(cacheKey, cached);
  cleanCache();

  return cached;
}

/**
 * Crea un pattern de textura listo para usar en canvas
 */
export function createTexturePattern(
  type: TextureType,
  scale: number = 1,
  intensity: number = 0.5,
  seed?: number
): CanvasPattern | null {
  const cached = getTexture({ type, scale, intensity, seed });
  return cached?.pattern || null;
}

/**
 * Pre-genera texturas comunes para evitar lag en primer uso
 */
export function preloadTextures(): void {
  const commonConfigs: TextureConfig[] = [
    { type: 'pencil', scale: 1, intensity: 0.3 },
    { type: 'pencil', scale: 1, intensity: 0.5 },
    { type: 'pencil', scale: 1, intensity: 0.7 },
    { type: 'paper', scale: 1, intensity: 0.3 },
    { type: 'noise', scale: 1, intensity: 0.2 },
  ];

  commonConfigs.forEach(config => getTexture(config));
}

/**
 * Limpia el cache de texturas
 */
export function clearTextureCache(): void {
  textureCache.clear();
}

/**
 * Obtiene el canvas de textura directamente (para rendering avanzado)
 */
export function getTextureCanvas(config: TextureConfig): HTMLCanvasElement | null {
  const cached = getTexture(config);
  return cached?.canvas || null;
}

// ============ EXPORTS ============

export type { TextureConfig, CachedTexture };
