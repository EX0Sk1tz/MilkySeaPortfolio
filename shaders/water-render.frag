#version 300 es
precision highp float;

uniform sampler2D uState;
uniform sampler2D uImage;
uniform vec2 uResolution;
uniform float uTime;

out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec4 data = texture(uState, uv);

  vec2 gradient = (isnan(data.z) || isinf(data.z) || isnan(data.w) || isinf(data.w))
    ? vec2(0.0)
    : data.zw;

  vec2 distortion = clamp(0.20 * gradient, vec2(-0.35), vec2(0.35));
  vec2 sampleUv = clamp(uv + distortion, vec2(0.001), vec2(0.999));

  vec4 color = texture(uImage, sampleUv);

  vec3 normal = normalize(vec3(-gradient.x, 0.20, -gradient.y));
  float glint = pow(max(0.0, dot(normal, normalize(vec3(-3.0, 10.0, 3.0)))), 60.0);

  float titleMask = smoothstep(0.18, 0.95, max(color.r, max(color.g, color.b)));
  vec3 finalColor = color.rgb + vec3(glint) * (0.08 + titleMask * 0.30);

  outColor = vec4(finalColor, 1.0);
}
