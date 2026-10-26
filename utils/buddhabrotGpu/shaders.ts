// A fixed one-pixel tent reconstructs sampled density at every resolution and
// camera state. Peak normalization and display must use exactly the same kernel.
const RECONSTRUCT_DENSITY = /* wgsl */ `
fn reconstructedDensity(pixel: vec2u) -> f32 {
  var sum = 0.0;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      let neighbor = vec2u(clamp(vec2i(pixel)+vec2i(dx,dy), vec2i(0), vec2i(p.image.xy)-vec2i(1)));
      let weight = f32((2-abs(dx))*(2-abs(dy)));
      sum += weight * pixelCount(neighbor.y*p.image.x+neighbor.x);
    }
  }
  return sum * (1.0/16.0);
}
`;

// Seeds retain their original proposal weight, including across camera changes.
// This makes both adaptive sampling and cache replay unbiased density estimates.
export const BUDDHABROT_COMPUTE = /* wgsl */ `
struct Params {
  bounds: vec4f,
  image: vec4u, // width, height, max iterations, minimum orbit length
  batch: vec4u, // first sample id, count, cache capacity, replay count
  colors: vec4f, // foreground RGB, exposure
  background: vec4f,
}
struct Seed { c: vec2f, length: u32, weight: u32 }
struct Statistics {
  peak: atomic<u32>,
  padding0: u32,
  padding1: u32,
  padding2: u32,
  hits: array<atomic<u32>, 256>,
  tries: array<atomic<u32>, 256>,
}
@group(0) @binding(0) var<uniform> p: Params;
@group(0) @binding(1) var<storage, read_write> seeds: array<Seed>;
@group(0) @binding(2) var<storage, read_write> low: array<atomic<u32>>;
@group(0) @binding(3) var<storage, read_write> high: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> statistics: Statistics;
@group(0) @binding(5) var<storage, read_write> cdf: array<f32>;

fn pixelCount(index: u32) -> f32 {
  return f32(atomicLoad(&high[index]))*4294967296.0 + f32(atomicLoad(&low[index]));
}
${RECONSTRUCT_DENSITY}

fn hash(value: u32) -> u32 {
  var v = value;
  v = (v ^ (v >> 16u)) * 0x7feb352du;
  v = (v ^ (v >> 15u)) * 0x846ca68bu;
  return v ^ (v >> 16u);
}
fn random(state: ptr<function, u32>) -> f32 {
  *state = hash(*state + 0x9e3779b9u);
  return f32(*state >> 8u) * (1.0 / 16777216.0);
}
fn inside(c: vec2f) -> bool {
  let x = c.x - 0.25;
  let q = x*x + c.y*c.y;
  return q * (q+x) <= 0.25*c.y*c.y || dot(c+vec2f(1.0, 0.0), c+vec2f(1.0, 0.0)) <= 0.0625;
}
fn advance(z: vec2f, c: vec2f) -> vec2f {
  return vec2f(z.x*z.x-z.y*z.y, 2.0*z.x*z.y) + c;
}
fn escape(c: vec2f) -> u32 {
  if inside(c) { return 0u; }
  var z = vec2f(0.0);
  for (var i = 0u; i < p.image.z; i++) {
    z = advance(z, c);
    if dot(z,z) > 4.0 {
      return select(0u, i+1u, i+1u >= p.image.w);
    }
  }
  return 0u;
}
fn visit(z: vec2f, weight: u32, subtract: bool) -> u32 {
  // The portrait rotates the usual complex plane clockwise: (imaginary, -real).
  let position = vec2f(z.y, -z.x);
  let uv = vec2f((position.x-p.bounds.x)/(p.bounds.y-p.bounds.x),
                 (p.bounds.w-position.y)/(p.bounds.w-p.bounds.z));
  if any(uv < vec2f(0.0)) || any(uv >= vec2f(1.0)) { return 0u; }
  let pixel = vec2u(uv * vec2f(p.image.xy));
  let index = pixel.y * p.image.x + pixel.x;
  // Two words preserve exact fixed-point sums, even for long, concentrated paths.
  // Addition/subtraction commute modulo 2^64, including concurrent carries.
  if subtract {
    let before = atomicSub(&low[index], weight);
    if before < weight { atomicSub(&high[index], 1u); }
  } else {
    let before = atomicAdd(&low[index], weight);
    if before > 0xffffffffu-weight { atomicAdd(&high[index], 1u); }
  }
  return 1u;
}
fn trace(seed: Seed, subtract: bool) -> u32 {
  var z = vec2f(0.0);
  var hits = 0u;
  // Only positions before crossing radius two belong to the recorded orbit.
  // Including the final escaped value draws the square source-domain boundary.
  for (var i = 1u; i < seed.length; i++) {
    z = advance(z, seed.c);
    hits += visit(z, seed.weight, subtract);
    hits += visit(vec2f(z.x, -z.y), seed.weight, subtract);
  }
  return hits;
}
@compute @workgroup_size(64)
fn sample(@builtin(global_invocation_id) gid: vec3u, @builtin(num_workgroups) groups: vec3u) {
  let index = gid.x + gid.y*groups.x*64u;
  if index >= p.batch.y { return; }
  let id = p.batch.x + index;
  let slot = id % p.batch.z;
  if p.batch.w >= p.batch.z || id >= p.batch.z { trace(seeds[slot], true); }
  var rng = hash(id + 42u);
  var cell = min(255u, u32(random(&rng)*256.0));
  // Half the proposals remain uniform: every part of the source plane stays reachable.
  if random(&rng) >= 0.5 {
    let choice = random(&rng);
    var lo = 0u;
    var hi = 255u;
    for (var i = 0u; i < 8u; i++) {
      let mid = (lo + hi) / 2u;
      if choice < cdf[mid+1u] { hi = mid; } else { lo = mid+1u; }
    }
    cell = min(lo, 255u);
  }
  let c = (vec2f(f32(cell % 16u), f32(cell / 16u)) + vec2f(random(&rng), random(&rng))) * 0.25 - vec2f(2.0);
  let probability = max(0.0, cdf[cell+1u]-cdf[cell]);
  let scaledWeight = 256.0 / (0.5 + 128.0*probability);
  // Stochastic rounding keeps the finite fixed-point estimator unbiased.
  let weight = u32(floor(scaledWeight + random(&rng)));
  let seed = Seed(c, escape(c), weight);
  seeds[slot] = seed;
  let hits = trace(seed, false);
  // This score only guides proposals; clipping it never changes the estimator.
  // Its bound also keeps statistics within u32 even for very long paths.
  atomicAdd(&statistics.hits[cell], min(hits, 256u));
  atomicAdd(&statistics.tries[cell], 1u);
}
@compute @workgroup_size(64)
fn replay(@builtin(global_invocation_id) gid: vec3u, @builtin(num_workgroups) groups: vec3u) {
  let index = gid.x + gid.y*groups.x*64u;
  if index < p.batch.w { trace(seeds[index], false); }
}
// One thread builds this tiny CDF only after a complete sampling batch.
// The half-uniform mixture prevents zero-probability cells and caps weights at two.
@compute @workgroup_size(1)
fn proposal() {
  cdf[0] = 0.0;
  var total = 0.0;
  for (var i=0u; i<256u; i++) {
    let count = atomicLoad(&statistics.tries[i]);
    let score = f32(atomicLoad(&statistics.hits[i])) / f32(max(1u, count));
    total += score;
    cdf[i+1u] = total;
  }
  for (var i=0u; i<256u; i++) {
    if total > 0.0 { cdf[i+1u] /= total; }
    else { cdf[i+1u] = f32(i+1u)/256.0; }
    // Bounded statistics prevent overflow during long sessions and keep adapting.
    atomicStore(&statistics.hits[i], atomicLoad(&statistics.hits[i])/2u);
    atomicStore(&statistics.tries[i], atomicLoad(&statistics.tries[i])/2u);
  }
}
var<workgroup> maxima: array<f32, 256>;
@compute @workgroup_size(256)
fn peak(@builtin(global_invocation_id) gid: vec3u, @builtin(local_invocation_index) lane: u32, @builtin(num_workgroups) groups: vec3u) {
  let index = gid.x + gid.y*groups.x*256u;
  var value = 0.0;
  if index < p.image.x*p.image.y {
    value = reconstructedDensity(vec2u(index % p.image.x, index / p.image.x));
  }
  maxima[lane] = value;
  workgroupBarrier();
  for (var stride=128u; stride>0u; stride/=2u) {
    if lane < stride { maxima[lane] = max(maxima[lane], maxima[lane+stride]); }
    workgroupBarrier();
  }
  if lane == 0u { atomicMax(&statistics.peak, bitcast<u32>(maxima[0])); }
}
`;

export const BUDDHABROT_DISPLAY = /* wgsl */ `
struct Params {
  bounds: vec4f,
  image: vec4u,
  batch: vec4u,
  colors: vec4f,
  background: vec4f,
}
@group(0) @binding(0) var<uniform> p: Params;
@group(0) @binding(1) var<storage, read> low: array<u32>;
@group(0) @binding(2) var<storage, read> high: array<u32>;
@group(0) @binding(3) var<storage, read> statistics: array<u32>;
fn pixelCount(index: u32) -> f32 {
  return f32(high[index])*4294967296.0 + f32(low[index]);
}
${RECONSTRUCT_DENSITY}
@vertex fn vertex(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(vec2f(-1.0,-1.0), vec2f(3.0,-1.0), vec2f(-1.0,3.0));
  return vec4f(positions[index], 0.0, 1.0);
}
@fragment fn fragment(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let pixel = vec2u(position.xy);
  let count = reconstructedDensity(pixel) / 256.0;
  let maximum = bitcast<f32>(statistics[0]) / 256.0;
  var light = 0.0;
  if count > 0.0 && maximum > 0.0 {
    light = pow(count/maximum, 1.0/p.colors.w);
  }
  return vec4f(mix(p.background.rgb, p.colors.rgb, clamp(light,0.0,1.0)), 1.0);
}
`;
