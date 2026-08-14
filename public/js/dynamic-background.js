// Fundo animado — copiado do projeto "Pratic Pilates" (pasta PraticPilates na
// raiz do repo), componente components/dynamic-background.tsx. Lá ele usava
// @paper-design/shaders-react (MeshGradient); aqui usamos direto o pacote
// framework-agnostic @paper-design/shaders (vendorizado em /vendor/paper-shaders,
// MIT license) via WebGL2, sem precisar de React nem de bundler.
import { ShaderMount } from '/vendor/paper-shaders/shader-mount.js';
import { meshGradientFragmentShader } from '/vendor/paper-shaders/shaders/mesh-gradient.js';
import { getShaderColorFromString } from '/vendor/paper-shaders/get-shader-color-from-string.js';
import { defaultObjectSizing, ShaderFitOptions } from '/vendor/paper-shaders/shader-sizing.js';

// Mesmos parâmetros do dynamic-background.tsx original.
const colors = ['#b3ccc0', '#c3d7d9', '#d8e4c8', '#e8dcc8', '#c9dbcf', '#e4ead0'];
const distortion = 0.75;
const swirl = 0.55;
const grainMixer = 0;
const grainOverlay = 0;
const speed = 0.42;
const offsetX = 0.08;

function mount() {
  const container = document.getElementById('dynamic-bg');
  if (!container || !window.WebGL2RenderingContext) return;

  const uniforms = {
    u_colors: colors.map(getShaderColorFromString),
    u_colorsCount: colors.length,
    u_distortion: distortion,
    u_swirl: swirl,
    u_grainMixer: grainMixer,
    u_grainOverlay: grainOverlay,
    u_fit: ShaderFitOptions[defaultObjectSizing.fit],
    u_rotation: defaultObjectSizing.rotation,
    u_scale: defaultObjectSizing.scale,
    u_offsetX: offsetX,
    u_offsetY: defaultObjectSizing.offsetY,
    u_originX: defaultObjectSizing.originX,
    u_originY: defaultObjectSizing.originY,
    u_worldWidth: defaultObjectSizing.worldWidth,
    u_worldHeight: defaultObjectSizing.worldHeight
  };

  try {
    new ShaderMount(container, meshGradientFragmentShader, uniforms, undefined, speed);
  } catch (e) {
    // Sem suporte a WebGL2 (raro) — deixa o fundo liso do body, sem quebrar o app.
    console.warn('Fundo animado desativado:', e.message);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
