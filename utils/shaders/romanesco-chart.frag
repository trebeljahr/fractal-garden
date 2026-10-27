// Included after the ordinary Romanesco field. All points are eye-relative,
// in canonical root axes and working-frame units. Modes: 0 ordinary, 1 plane,
// 2 root apex, 3 recursive peak deficit chart, 4 underside apex.
uniform int u_chartMode, u_chartLevels, u_chartFirstRank;
uniform vec4 u_chartPlane, u_chartCarrier, u_chartWeight;
uniform vec3 u_chartOrigin, u_chartQX, u_chartQY;
uniform vec2 u_chartPhase, u_chartQOffset;
uniform float u_chartBaseGrowth, u_chartError, u_chartShear;

vec2 romanescoChartCell(float radius, float angle) {
  float u = -log(max(radius, 1e-30)) / DECAY;
  float v = angle / TAU;
  vec2 address = vec2(LATTICE_A*u + 13.0*v, LATTICE_B*u - 8.0*v) + u_chartPhase;
  vec3 cube = vec3(address.x, -address.y, -address.x + address.y);
  vec3 rounded = floor(cube + .5), error = abs(rounded-cube);
  if (error.x > error.y && error.x > error.z) rounded.x = -rounded.y-rounded.z;
  else if (error.y > error.z) rounded.y = -rounded.x-rounded.z;
  else rounded.z = -rounded.x-rounded.y;
  vec2 local = address - vec2(rounded.x, -rounded.y);
  return vec2(local.x-.5*local.y, .8660254037844386*local.y)/HEX_COVER;
}

float romanescoChartPatch(vec2 p, float amplitude, float pixel) {
  float value = 0.0, weight = 1.0;
  for (int level = 0; level < RELIEF_LEVELS; level++) {
    if (level >= u_chartLevels) break;
    float rank = float(u_chartFirstRank + level);
    if (rank > u_maxRank) break;
    float radius = min(1.0, length(p));
    float growth = rank > 0.0 && rank == u_maxRank ? u_growth : 1.0;
    value += weight*(1.0-radius)*growth;
    weight *= PATCH_EPS*radius*hexRim(p);
    if (radius <= 1e-30 || weight*amplitude <= pixel*.03125 || (value>0.0 && weight<value*1e-8)) break;
    p = spiralCell(radius, atan(p.y,p.x));
  }
  return value;
}

// Use this unshrunk field for normals. The lower-distance wrapper below has a
// narrow zero interval because the CPU chart carries an explicit error bound.
float romanescoChartRawField(vec3 workingPoint, float workingPixel) {
  fieldEvaluations++;
  if (u_chartMode == 5) return romanescoResidualRawField(workingPoint,workingPixel);
  if (u_chartMode == 1) return u_chartPlane.x + dot(u_chartPlane.yzw, workingPoint);
  if (u_chartMode == 2) {
    vec3 p = u_chartOrigin + workingPoint;
    float radial = length(p.xz), h = max(0.0, -.5*p.y);
    float amplitude = RELIEF_HEIGHT*min(h, radial/BASE_RADIUS);
    float delta = clamp(radial-BASE_RADIUS*h, 0.0, RELIEF_HEIGHT*h);
    float chartHeight = h + u_chartShear*delta;
    float height = 0.0;
    if (u_maxRank >= 1.0 && amplitude > workingPixel*.03125 && chartHeight > 0.0)
      height = romanescoChartPatch(romanescoChartCell(chartHeight, atan(p.z,p.x)), amplitude, workingPixel);
    return max(p.y, (radial-BASE_RADIUS*h-amplitude*height)/SIDE_LIPSCHITZ);
  }
  if (u_chartMode == 3) {
    vec2 q = u_chartQOffset + vec2(dot(u_chartQX,workingPoint), dot(u_chartQY,workingPoint));
    float radius = length(q);
    float carrier = u_chartCarrier.x + dot(u_chartCarrier.yzw,workingPoint);
    float weight = u_chartWeight.x + dot(u_chartWeight.yzw,workingPoint);
    float next = 0.0;
    if (radius > 1e-30 && u_chartLevels > 0 && float(u_chartFirstRank) <= u_maxRank)
      next = romanescoChartPatch(romanescoChartCell(radius,atan(q.y,q.x)), abs(weight)*radius*PATCH_EPS, workingPixel);
    return carrier + weight*radius*(u_chartBaseGrowth-PATCH_EPS*next);
  }
  if (u_chartMode == 4) {
    vec3 p = u_chartOrigin + workingPoint;
    float radius = length(p.xz), angle = radius > 1e-30 ? atan(p.z,p.x) : 0.0;
    float ring = ringRadius(angle,0.0), diskRadius = radius/ring;
    float next = 0.0;
    if (diskRadius > 1e-30 && u_maxRank >= 1.0)
      next = romanescoChartPatch(romanescoChartCell(diskRadius,angle), BASE_DEPTH*diskRadius*PATCH_EPS/BOTTOM_LIPSCHITZ,workingPixel);
    return (-p.y+BASE_DEPTH*diskRadius*(1.0-PATCH_EPS*next))/BOTTOM_LIPSCHITZ;
  }
  return 0.0;
}

float romanescoChartFieldError(float workingPixel) {
  if (u_chartMode == 5) return residualError + workingPixel*.032;
  // Each optional tail is omitted only after its final field contribution is
  // at most pixel/32. Plane charts have no pixel-dependent tail.
  return u_chartError + (u_chartMode == 1 ? 0.0 : workingPixel*.032);
}

float romanescoChartField(vec3 workingPoint, float workingPixel) {
  float value = romanescoChartRawField(workingPoint, workingPixel);
  return sign(value)*max(0.0,abs(value)-romanescoChartFieldError(workingPixel));
}
