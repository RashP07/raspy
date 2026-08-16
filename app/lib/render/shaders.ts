export const FULLSCREEN_VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_position;
out vec2 v_uv;
out vec2 v_outputUv;
uniform mat3 u_sourceUvFromOutput;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_outputUv = vec2(a_position.x * 0.5 + 0.5, 1.0 - (a_position.y * 0.5 + 0.5));
  v_uv = (u_sourceUvFromOutput * vec3(v_outputUv, 1.0)).xy;
}
`;

export const ADJUST_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
in vec2 v_outputUv;
out vec4 outColor;

uniform sampler2D u_image;
uniform vec2 u_texel;
uniform float u_compare;
uniform float u_neutral;

uniform float u_exposure;
uniform float u_brilliance;
uniform float u_highlights;
uniform float u_shadows;
uniform float u_contrast;
uniform float u_brightness;
uniform float u_blackPoint;
uniform float u_saturation;
uniform float u_vibrancy;
uniform float u_warmth;
uniform float u_tint;
uniform float u_sharpness;
uniform float u_definition;
uniform float u_noiseReduction;
uniform float u_vignette;

vec3 srgbToLinear(vec3 c) {
  bvec3 cutoff = lessThanEqual(c, vec3(0.04045));
  vec3 higher = pow((c + 0.055) / 1.055, vec3(2.4));
  vec3 lower = c / 12.92;
  return mix(higher, lower, vec3(cutoff));
}

vec3 linearToSrgb(vec3 c) {
  bvec3 cutoff = lessThanEqual(c, vec3(0.0031308));
  vec3 higher = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  vec3 lower = c * 12.92;
  return mix(higher, lower, vec3(cutoff));
}

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 softClip(vec3 c) {
  vec3 threshold = vec3(0.8);
  vec3 rolled = threshold + (1.0 - threshold) * (1.0 - exp(-(max(c, threshold) - threshold) / (1.0 - threshold)));
  return mix(c, rolled, step(threshold, c));
}

vec3 applyExposure(vec3 c, float ev) {
  return c * pow(2.0, ev);
}

// Perceptual position of a linear luma; the masks below are authored in
// sRGB-ish units and must not be compared against raw linear values.
float tonePos(float y) {
  return pow(max(y, 0.0), 1.0 / 2.2);
}

vec3 applyBrilliance(vec3 c, float amount) {
  float a = amount / 100.0;
  float p = tonePos(luma(c));
  // Open shadows and low-mids, taper out before the highlight shoulder.
  float w = smoothstep(0.0, 0.50, p) * (1.0 - smoothstep(0.55, 0.95, p));
  return c * exp2(a * 1.05 * w);
}

vec3 applyHighlightsShadows(vec3 c, float highlights, float shadows) {
  float p = tonePos(luma(c));
  float h = highlights / 100.0;
  float s = shadows / 100.0;
  // Both sliders open their end of the range on the positive side and recover
  // it on the negative one, which is the direction every editor people arrive
  // from uses -- the earlier inverted highlight made the two halves of one
  // control disagree with each other.
  float hMask = smoothstep(0.42, 1.0, p);
  float sMask = 1.0 - smoothstep(0.05, 0.58, p);
  return c * exp2(h * 1.8 * hMask + s * 2.0 * sMask);
}

vec3 applyContrast(vec3 c, float contrast) {
  float a = contrast / 100.0;
  return mix(vec3(0.18), c, pow(2.0, a * 1.4));
}

vec3 applyBrightness(vec3 c, float brightness) {
  float a = brightness / 100.0;
  float y = luma(c);
  if (y < 1e-5) return c;
  float target = pow(clamp(y, 0.0, 1.0), pow(2.0, -a * 1.25));
  return c * (target / y);
}

vec3 applyBlackPoint(vec3 c, float blackPoint) {
  float bp = (blackPoint / 100.0) * 0.075;
  return (c - vec3(bp)) / (1.0 - bp);
}

vec3 applyWhiteBalance(vec3 c, float warmth, float tint) {
  if (abs(warmth) < 1e-4 && abs(tint) < 1e-4) return c;
  float w = warmth / 100.0;
  float t = tint / 100.0;
  vec3 gain = vec3(
    1.0 + w * 0.48 + t * 0.16,
    1.0 - t * 0.32,
    1.0 - w * 0.48 + t * 0.16
  );
  // Renormalise on neutral so white balance changes colour, not exposure.
  return c * gain / max(luma(gain), 1e-4);
}

// Hue ratios rather than absolute channel differences: these hold steady from
// deep to light skin, where absolute differences collapse in the shadows.
float skinMask(vec3 g) {
  float mx = max(max(g.r, g.g), g.b);
  if (mx < 1e-4) return 0.0;
  float rg = (g.r - g.g) / mx;
  float gb = (g.g - g.b) / mx;
  return smoothstep(0.06, 0.16, rg) * (1.0 - smoothstep(0.42, 0.62, rg))
       * smoothstep(0.03, 0.09, gb) * (1.0 - smoothstep(0.30, 0.48, gb))
       * smoothstep(0.04, 0.14, luma(g));
}

vec3 applyColor(vec3 c, float sat, float vib) {
  if (abs(sat) < 1e-4 && abs(vib) < 1e-4) return c;
  float sa = sat / 100.0;
  float va = vib / 100.0;
  vec3 g = linearToSrgb(max(c, 0.0));
  float y = luma(g);

  // Positive gain is compressed: a straight 2x drives the darkest channel of
  // ordinary skin and wood tones to black, where the clamp eats the hue.
  float s = sa >= 0.0 ? 1.0 + sa * 1.25 : 1.0 + sa;
  g = max(mix(vec3(y), g, s), 0.0);

  y = luma(g);
  float mx = max(max(g.r, g.g), g.b);
  float mn = min(min(g.r, g.g), g.b);
  float rel = mx > 1e-4 ? (mx - mn) / mx : 0.0;
  float high = smoothstep(0.15, 0.85, rel);
  float protect = 1.0 - skinMask(g) * 0.7;
  // Positive favours muted colour; negative must act broadly, or the pastels
  // grey out while the neons survive untouched.
  float weight = (va >= 0.0 ? 1.0 - high : mix(0.6, 1.0, high)) * protect;
  float v = va >= 0.0 ? 1.0 + va * 1.5 * weight : 1.0 + va * weight;
  g = max(mix(vec3(y), g, v), 0.0);

  return srgbToLinear(g);
}

vec3 sampleLinear(vec2 uv) {
  vec4 s = texture(u_image, clamp(uv, 0.0, 1.0));
  return srgbToLinear(s.rgb);
}

vec3 denoise(vec2 uv, float amount) {
  float a = amount / 100.0;
  if (a < 0.001) return sampleLinear(uv);
  vec3 center = sampleLinear(uv);
  vec3 acc = center;
  float wsum = 1.0;
  float cy = luma(center);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      if (x == 0 && y == 0) continue;
      vec2 o = vec2(float(x), float(y)) * u_texel * (1.0 + a * 2.6);
      vec3 s = sampleLinear(uv + o);
      float dy = abs(luma(s) - cy);
      float w = exp(-dy * (12.0 - a * 8.0));
      acc += s * w;
      wsum += w;
    }
  }
  return mix(center, acc / wsum, a);
}

const vec2 DEFINITION_DIRS[8] = vec2[8](
  vec2(1.0, 0.0), vec2(-1.0, 0.0), vec2(0.0, 1.0), vec2(0.0, -1.0),
  vec2(0.7071, 0.7071), vec2(-0.7071, 0.7071),
  vec2(0.7071, -0.7071), vec2(-0.7071, -0.7071)
);

/**
 * Definition is local contrast, not sharpening, and the difference is entirely
 * in the radius: this samples a ring roughly 0.6% of the frame across, where
 * the sharpen pass works one texel out. The old two-texel version produced a
 * hairline halo invisible at any normal viewing size -- the slider moved and
 * nothing on screen did.
 */
vec3 definitionPass(vec2 uv, vec3 base, vec3 rawCenter, float amount) {
  float a = amount / 100.0;
  if (a < 0.001) return base;
  float yBase = luma(base);
  if (yBase < 1e-4) return base;

  // Two rings rather than one: a single ring at this radius beats against
  // smooth gradients and lays a faint ripple over skies.
  vec2 outer = u_texel * 12.0;
  vec2 inner = u_texel * 6.0;
  float blurRaw = 0.0;
  for (int i = 0; i < 8; i++) {
    blurRaw += luma(sampleLinear(uv + DEFINITION_DIRS[i] * outer));
    blurRaw += luma(sampleLinear(uv + DEFINITION_DIRS[i] * inner)) * 2.0;
  }
  blurRaw /= 24.0;

  // Map the unadjusted neighbourhood into the adjusted image's scale so the
  // difference is local detail, not the tonal delta. Luma-only: a scalar gain
  // and a uniform scale leave the R:G:B ratio untouched, where the per-channel
  // form tinted edges (a near-zero raw channel blew its gain up).
  float gain = yBase / max(luma(rawCenter), 1e-4);
  float p = tonePos(yBase);
  // Perceptual units, because a fixed linear step is a landslide in the
  // shadows and imperceptible in the highlights.
  float local = clamp(p - tonePos(max(blurRaw * gain, 0.0)), -0.25, 0.25);
  // Midtones carry the texture people mean by "definition"; pushing the ends
  // of the range only crushes blacks and blows highlights.
  float weight = 1.0 - pow(abs(p * 2.0 - 1.0), 2.0);
  float lifted = pow(clamp(p + local * a * 1.6 * weight, 0.0, 1.0), 2.2);
  // Floor the result at a fraction of the original luma: a strong negative
  // lobe on a near-black pixel would otherwise punch a hole.
  return base * (max(lifted, yBase * 0.2) / yBase);
}

vec3 sharpen(vec2 uv, vec3 base, vec3 rawCenter, float amount) {
  float a = amount / 100.0;
  if (a < 0.001) return base;
  float yBase = luma(base);
  float gain = yBase / max(luma(rawCenter), 1e-4);
  float n = luma(sampleLinear(uv + vec2(0.0, -1.0) * u_texel)) * gain;
  float s = luma(sampleLinear(uv + vec2(0.0, 1.0) * u_texel)) * gain;
  float e = luma(sampleLinear(uv + vec2(1.0, 0.0) * u_texel)) * gain;
  float w = luma(sampleLinear(uv + vec2(-1.0, 0.0) * u_texel)) * gain;
  float edge = abs(yBase - n) + abs(yBase - s) + abs(yBase - e) + abs(yBase - w);
  float mask = smoothstep(0.015, 0.14, edge);
  float detail = clamp(yBase - (n + s + e + w) * 0.25, -0.14, 0.14);
  float lifted = max(yBase + detail * a * 3.6 * mask, yBase * 0.2);
  return base * (lifted / max(yBase, 1e-4));
}

vec3 applyVignette(vec3 c, vec2 uv, float amount) {
  float a = amount / 100.0;
  if (a < 0.001) return c;
  vec2 p = uv - 0.5;
  float d = length(p) * 1.41421356;
  float vig = smoothstep(0.22, 1.05, d);
  return c * (1.0 - vig * a * 0.97);
}

void main() {
  if (v_uv.x < 0.0 || v_uv.x > 1.0 || v_uv.y < 0.0 || v_uv.y > 1.0) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  vec4 src = texture(u_image, clamp(v_uv, 0.0, 1.0));
  if (u_compare > 0.5 || u_neutral > 0.5) {
    outColor = src;
    return;
  }

  vec3 rawBase = denoise(v_uv, u_noiseReduction);
  vec3 color = applyExposure(rawBase, u_exposure);
  // White balance is a sensor-space channel gain; it must precede tone
  // shaping or black point crushes a luma the gains are about to move.
  color = applyWhiteBalance(color, u_warmth, u_tint);
  color = applyBrilliance(color, u_brilliance);
  color = applyHighlightsShadows(color, u_highlights, u_shadows);
  color = applyContrast(color, u_contrast);
  color = applyBrightness(color, u_brightness);
  color = applyBlackPoint(color, u_blackPoint);
  color = applyColor(color, u_saturation, u_vibrancy);
  color = definitionPass(v_uv, color, rawBase, u_definition);
  color = sharpen(v_uv, color, rawBase, u_sharpness);
  color = applyVignette(color, v_outputUv, u_vignette);
  color = softClip(max(color, 0.0));
  color = linearToSrgb(clamp(color, 0.0, 1.0));
  outColor = vec4(color, src.a);
}
`;

export const BLIT_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_image;
void main() {
  outColor = texture(u_image, v_uv);
}
`;
