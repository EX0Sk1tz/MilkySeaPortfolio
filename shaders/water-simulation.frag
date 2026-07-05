#version 300 es
precision highp float;
precision highp int;

uniform sampler2D uState;
uniform vec2 uResolution;
uniform vec4 uMouse;
uniform int uFrame;

out vec4 outColor;

const float delta = 1.0;
const float maxPressure = 2.0;

void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  ivec2 maxCoord = ivec2(uResolution) - ivec2(1);

  if (uFrame == 0) {
    outColor = vec4(0.0);
    return;
  }

  float pressure = texelFetch(uState, coord, 0).x;
  float pVel = texelFetch(uState, coord, 0).y;

  if (isnan(pressure) || isinf(pressure)) pressure = 0.0;
  if (isnan(pVel) || isinf(pVel)) pVel = 0.0;

  ivec2 rightCoord = ivec2(min(coord.x + 1, maxCoord.x), coord.y);
  ivec2 leftCoord = ivec2(max(coord.x - 1, 0), coord.y);
  ivec2 upCoord = ivec2(coord.x, min(coord.y + 1, maxCoord.y));
  ivec2 downCoord = ivec2(coord.x, max(coord.y - 1, 0));

  float p_right = texelFetch(uState, rightCoord, 0).x;
  float p_left = texelFetch(uState, leftCoord, 0).x;
  float p_up = texelFetch(uState, upCoord, 0).x;
  float p_down = texelFetch(uState, downCoord, 0).x;

  if (coord.x == 0) p_left = p_right;
  if (coord.x == maxCoord.x) p_right = p_left;
  if (coord.y == 0) p_down = p_up;
  if (coord.y == maxCoord.y) p_up = p_down;

  pVel += delta * (-2.0 * pressure + p_right + p_left) / 4.0;
  pVel += delta * (-2.0 * pressure + p_up + p_down) / 4.0;

  pressure += delta * pVel;
  pVel -= 0.005 * delta * pressure;
  pVel *= 1.0 - 0.002 * delta;
  pressure *= 0.999;

  if (uMouse.z > 0.0) {
    float radius = max(uMouse.w, 1.0);
    float dist = distance(gl_FragCoord.xy, uMouse.xy);
    if (dist <= radius) {
      pressure += uMouse.z * (1.0 - dist / radius);
    }
  }

  // Bound the field so continuous forcing (e.g. long hover/drag sessions)
  // can't accumulate energy past what the reflective boundaries can
  // dissipate — without this, pressure grows unbounded and eventually
  // overflows, producing NaNs that spread to every neighboring cell.
  pressure = clamp(pressure, -maxPressure, maxPressure);
  pVel = clamp(pVel, -maxPressure, maxPressure);

  vec4 nextState = vec4(
    pressure,
    pVel,
    (p_right - p_left) / 2.0,
    (p_up - p_down) / 2.0
  );

  outColor = nextState;
}
