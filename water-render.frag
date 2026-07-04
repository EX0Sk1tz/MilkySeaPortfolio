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

  vec2 distortion = 0.38 * data.zw;
  vec2 sampleUv = clamp(uv + distortion, vec2(0.001), vec2(0.999));

  vec4 color = texture(uImage, sampleUv);

  vec3 normal = normalize(vec3(-data.z * 1.4, 0.14, -data.w * 1.4));
  float glint = pow(max(0.0, dot(normal, normalize(vec3(-3.0, 10.0, 3.0)))), 42.0);

  vec3 finalColor = color.rgb + vec3(glint) * 0.25;

  outColor = vec4(finalColor, 1.0);
}
