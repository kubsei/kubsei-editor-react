/**
 * Brush System - Exportaciones principales
 *
 * Sistema de pinceles profesional estilo manga/ilustración:
 * - Presión y velocidad
 * - Suavizado de curvas (Catmull-Rom, Bézier)
 * - Estabilizador (lazy brush)
 * - Texturas procedurales
 * - Ancho variable
 */

// Types
export * from './types';

// Algorithms
export {
  calculateVelocity,
  calculateAngle,
  calculateDistance,
  applyPressureCurve,
  calculateStrokeWidth,
  catmullRomSpline,
  generateBezierControlPoints,
  smoothByAverage,
  applyTaper,
  applyStabilizer,
  processStrokePoints,
} from './algorithms';

// Textures
export {
  getTexture,
  createTexturePattern,
  preloadTextures,
  clearTextureCache,
  getTextureCanvas,
} from './textures';

export type { TextureConfig, CachedTexture } from './textures';
