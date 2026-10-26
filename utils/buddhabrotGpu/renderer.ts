import { canvasToPng } from "../pngExport";
import type { BuddhabrotParams } from "../render/buddhabrot";
import {
  buddhabrotOrbitKey,
  getBuddhabrotViewport,
  normalizeBuddhabrotParams,
} from "../render/buddhabrotMath";
import {
  BUFFER,
  type Gpu,
  type GpuBuffer,
  type GpuCanvasContext,
  type GpuDevice,
  type GpuEncoder,
  type GpuPipeline,
  TEXTURE,
} from "./api";
import { BUDDHABROT_COMPUTE, BUDDHABROT_DISPLAY } from "./shaders";

const CACHE_CAPACITY = 4_194_304;
const STATISTICS_SIZE = 16 + 256 * 8;
const UNIFORM_SIZE = 96;
const PROPOSAL_SIZE = 257 * 4;

type SampleRange = { start: number; end: number; cdf: Float32Array };

type Target = {
  width: number;
  height: number;
  uniform: GpuBuffer;
  historyUniform: GpuBuffer;
  historyCdf: GpuBuffer;
  low: GpuBuffer;
  high: GpuBuffer;
  statistics: GpuBuffer;
  sampleGroup: unknown;
  replayGroup: unknown;
  historyGroup: unknown;
  displayGroup: unknown;
  proposalGroup: unknown;
};

export type BuddhabrotGpuStats = {
  backend: "webgpu";
  samples: number;
  cachedSamples: number;
  cacheCapacity: number;
  projectedSamples: number;
  replayRemaining: number;
  historyRanges: number;
  frames: number;
  reprojects: number;
  resets: number;
  width: number;
  height: number;
};

function color(hex: string): number[] {
  return [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
}

/** GPU orbit generation, importance sampling, density accumulation and presentation. */
export class BuddhabrotGpuRenderer {
  /** Device failure must wake the owner even when a paused image has no RAF loop. */
  onFailure: ((error: Error) => void) | undefined;
  private params: BuddhabrotParams | null = null;
  private cssWidth = 0;
  private cssHeight = 0;
  private target: Target | null = null;
  private seeds: GpuBuffer;
  private proposal: GpuBuffer;
  private proposalReadback: GpuBuffer;
  private currentCdf = Float32Array.from({ length: 257 }, (_, i) => i / 256);
  private history: SampleRange[] = [];
  private projectedSamples = 0;
  private replayCursor = 0;
  private replayEnd = 0;
  private replayRange = 0;
  private samples = 0;
  private cachedSamples = 0;
  private frames = 0;
  private reprojects = 0;
  private resets = 0;
  private orbitKey = "";
  private cameraKey = "";
  private needsReplay = true;
  private needsReset = true;
  private disposed = false;
  private failure: Error | null = null;
  private pending = false;
  private completion: Promise<void> = Promise.resolve();
  private exportPending = false;
  private exportPipeline: Promise<GpuPipeline> | null = null;

  private constructor(
    private canvas: HTMLCanvasElement,
    private context: GpuCanvasContext,
    private device: GpuDevice,
    private pipelines: Record<
      "sample" | "replay" | "proposal" | "history" | "display",
      GpuPipeline
    >,
    private displayModule: ReturnType<GpuDevice["createShaderModule"]>,
  ) {
    this.seeds = device.createBuffer({
      label: "Buddhabrot weighted orbit cache",
      size: CACHE_CAPACITY * 16,
      usage: BUFFER.STORAGE | BUFFER.COPY_DST | BUFFER.COPY_SRC,
    });
    this.proposal = device.createBuffer({
      label: "Buddhabrot source proposal CDF",
      size: PROPOSAL_SIZE,
      usage: BUFFER.STORAGE | BUFFER.COPY_DST | BUFFER.COPY_SRC,
    });
    this.proposalReadback = device.createBuffer({
      label: "Buddhabrot proposal history readback",
      size: PROPOSAL_SIZE,
      usage: BUFFER.COPY_DST | BUFFER.MAP_READ,
    });
    device.lost.then((info) => {
      this.fail(new Error(info.message || "GPU device lost"));
    });
    device.addEventListener("uncapturederror", (event) => {
      if (!this.disposed) {
        const error = event as Event & { error?: { message?: string } };
        this.fail(new Error(error.error?.message || "GPU rendering failed"));
      }
    });
  }

  static async create(canvas: HTMLCanvasElement): Promise<BuddhabrotGpuRenderer | null> {
    const gpu = (navigator as Navigator & { gpu?: Gpu }).gpu;
    if (!gpu) return null;
    let device: GpuDevice | undefined;
    let context: GpuCanvasContext | null = null;
    try {
      const adapter = await gpu.requestAdapter();
      if (!adapter) return null;
      device = await adapter.requestDevice();
      device.pushErrorScope("validation");
      const compute = device.createShaderModule({
        label: "Buddhabrot sampling",
        code: BUDDHABROT_COMPUTE,
      });
      const display = device.createShaderModule({
        label: "Buddhabrot display",
        code: BUDDHABROT_DISPLAY,
      });
      const reports = await Promise.all([
        compute.getCompilationInfo(),
        display.getCompilationInfo(),
      ]);
      const errors = reports.flatMap((report) =>
        report.messages.filter((message) => message.type === "error"),
      );
      if (errors.length) throw new Error(errors.map((error) => error.message).join("\n"));
      const format = gpu.getPreferredCanvasFormat();
      const [sample, replay, proposal, history, presentation] = await Promise.all([
        ...(["sample", "replay", "proposal", "history"] as const).map((entryPoint) =>
          device?.createComputePipelineAsync({
            label: `Buddhabrot ${entryPoint}`,
            layout: "auto",
            compute: { module: compute, entryPoint },
          }),
        ),
        device.createRenderPipelineAsync({
          label: "Buddhabrot presentation",
          layout: "auto",
          vertex: { module: display, entryPoint: "vertex" },
          fragment: { module: display, entryPoint: "fragment", targets: [{ format }] },
        }),
      ]);
      if (!sample || !replay || !proposal || !history || !presentation)
        throw new Error("GPU pipeline initialization failed");
      const validation = await device.popErrorScope();
      if (validation) throw new Error(validation.message);
      context = (
        canvas as unknown as { getContext(kind: "webgpu"): GpuCanvasContext | null }
      ).getContext("webgpu");
      if (!context) throw new Error("WebGPU canvas is unavailable");
      context.configure({ device, format, alphaMode: "opaque" });
      return new BuddhabrotGpuRenderer(
        canvas,
        context,
        device,
        { sample, replay, proposal, history, display: presentation },
        display,
      );
    } catch (error) {
      context?.unconfigure();
      device?.destroy();
      console.warn("Buddhabrot GPU unavailable; using the CPU renderer.", error);
      return null;
    }
  }

  get stats(): BuddhabrotGpuStats {
    return {
      backend: "webgpu",
      samples: this.samples,
      cachedSamples: this.cachedSamples,
      cacheCapacity: CACHE_CAPACITY,
      projectedSamples: this.projectedSamples,
      replayRemaining: Math.max(0, this.replayEnd - this.replayCursor),
      historyRanges: this.history.length,
      frames: this.frames,
      reprojects: this.reprojects,
      resets: this.resets,
      width: this.target?.width ?? 0,
      height: this.target?.height ?? 0,
    };
  }

  /** Includes the small CDF readback needed to reproduce each sampling epoch. */
  async whenIdle() {
    await this.completion;
    this.check();
  }

  update(params: BuddhabrotParams) {
    this.check();
    const next = normalizeBuddhabrotParams(params);
    const orbitKey = buddhabrotOrbitKey(next);
    if (orbitKey !== this.orbitKey) {
      this.orbitKey = orbitKey;
      this.needsReset = true;
    }
    this.params = next;
  }

  resize(width: number, height: number, ratio: number) {
    this.check();
    if (!(width > 0 && height > 0 && ratio > 0) || !Number.isFinite(width + height + ratio)) return;
    this.cssWidth = width;
    this.cssHeight = height;
    const w = Math.max(1, Math.round(width * ratio));
    const h = Math.max(1, Math.round(height * ratio));
    if (w !== this.canvas.width || h !== this.canvas.height || !this.target) {
      this.validateSize(w, h);
      this.canvas.width = w;
      this.canvas.height = h;
      this.releaseTarget(this.target);
      this.target = this.createTarget(w, h, this.pipelines.display);
      this.needsReplay = true;
    }
  }

  /** Queue at most one frame at a time; camera changes stay pending until it completes. */
  draw(): boolean {
    this.check();
    const params = this.params;
    const target = this.target;
    if (!params || !target) return false;
    if (this.pending || this.exportPending) return true;
    const viewport = getBuddhabrotViewport(
      this.cssWidth,
      this.cssHeight,
      params.viewport,
      params.framing,
    );
    const cameraKey = `${viewport.minX}:${viewport.maxX}:${viewport.minY}:${viewport.maxY}`;
    if (cameraKey !== this.cameraKey) {
      this.cameraKey = cameraKey;
      this.needsReplay = true;
    }
    const encoder = this.device.createCommandEncoder();
    if (this.needsReset) {
      this.samples = 0;
      this.cachedSamples = 0;
      this.projectedSamples = 0;
      this.history = [];
      this.replayCursor = 0;
      this.replayEnd = 0;
      this.replayRange = 0;
      encoder.clearBuffer(this.seeds);
      this.needsReplay = true;
      this.needsReset = false;
      this.resets++;
    }
    if (this.needsReplay) {
      encoder.clearBuffer(target.low);
      encoder.clearBuffer(target.high);
      encoder.clearBuffer(target.statistics);
      // A new camera starts learning a new importance map. Retained seed weights
      // remain valid, because they record the distribution used at sampling time.
      this.writeUniformProposal();
      this.projectedSamples = this.cachedSamples;
      this.replayCursor = 0;
      this.replayEnd = Math.max(0, this.samples - this.cachedSamples);
      this.replayRange = 0;
    }
    const count = Math.min(
      CACHE_CAPACITY,
      Math.max(256, Math.floor(16_777_216 / params.maxIterations)),
      this.cachedSamples === 0
        ? Math.max(65536, params.samplesPerFrame)
        : params.paused
          ? 0
          : params.samplesPerFrame,
    );
    const replay = this.nextHistoryRange(params.maxIterations);
    const replayCount = replay ? replay.end - replay.start : 0;
    this.projectedSamples += count + replayCount;
    this.writeUniform(target, count);
    if (this.needsReplay) {
      if (this.cachedSamples)
        this.dispatch(encoder, this.pipelines.replay, target.replayGroup, this.cachedSamples, 64);
      this.needsReplay = false;
      this.reprojects++;
    }
    if (count > 0) {
      this.dispatch(encoder, this.pipelines.sample, target.sampleGroup, count, 64);
      this.recordSamples(this.samples, this.samples + count);
      this.samples += count;
      this.cachedSamples = Math.min(CACHE_CAPACITY, this.cachedSamples + count);
    }
    if (replay) {
      this.writeHistory(target, replay, params, this.cssWidth, this.cssHeight);
      this.dispatch(encoder, this.pipelines.history, target.historyGroup, replayCount, 64);
      this.replayCursor = replay.end;
    }
    const captureProposal = count > 0 && this.frames % 8 === 0;
    if (captureProposal) {
      this.dispatch(encoder, this.pipelines.proposal, target.proposalGroup, 1, 1);
      encoder.copyBufferToBuffer(this.proposal, 0, this.proposalReadback, 0, PROPOSAL_SIZE);
    }
    this.render(
      encoder,
      target,
      this.context.getCurrentTexture().createView(),
      this.pipelines.display,
    );
    this.device.queue.submit([encoder.finish()]);
    this.frames++;
    this.canvas.dataset.buddhabrotStats = JSON.stringify(this.stats);
    this.pending = true;
    const finished = captureProposal
      ? this.captureProposal()
      : this.device.queue.onSubmittedWorkDone();
    this.completion = finished.then(
      () => {
        this.pending = false;
      },
      (error: unknown) => {
        this.pending = false;
        this.fail(error instanceof Error ? error : new Error(String(error)));
      },
    );
    return !params.paused || this.replayCursor < this.replayEnd;
  }

  /** Reconstructs every sampled orbit, including those older than the fast cache. */
  async exportPng(ratio: number): Promise<Blob> {
    this.check();
    if (!this.params || !this.target || !this.cachedSamples) throw new Error("Drawing not ready");
    if (this.needsReset)
      throw new Error("The new orbit settings are still being drawn. Try exporting again.");
    if (this.exportPending) throw new Error("An image is already being exported");
    if (!(ratio > 0) || !Number.isFinite(ratio)) throw new Error("Invalid export scale");
    const width = Math.max(1, Math.round(this.cssWidth * ratio));
    const height = Math.max(1, Math.round(this.cssHeight * ratio));
    const params = this.params;
    const cssWidth = this.cssWidth;
    const cssHeight = this.cssHeight;
    const sampleCount = this.samples;
    const history = this.history.map((range) => ({ ...range }));
    this.validateSize(width, height);
    this.exportPending = true;
    let target: Target | null = null;
    let texture: ReturnType<GpuDevice["createTexture"]> | null = null;
    let readback: GpuBuffer | null = null;
    try {
      await this.whenIdle();
      this.check();
      if (!this.exportPipeline) {
        this.exportPipeline = this.device.createRenderPipelineAsync({
          label: "Buddhabrot PNG export",
          layout: "auto",
          vertex: { module: this.displayModule, entryPoint: "vertex" },
          fragment: {
            module: this.displayModule,
            entryPoint: "fragment",
            targets: [{ format: "rgba8unorm" }],
          },
        });
      }
      const pipeline = await this.exportPipeline;
      target = this.createTarget(width, height, pipeline);
      texture = this.device.createTexture({
        label: "Buddhabrot export pixels",
        size: [width, height],
        format: "rgba8unorm",
        usage: TEXTURE.RENDER_ATTACHMENT | TEXTURE.COPY_SRC,
      });
      const bytesPerRow = Math.ceil((width * 4) / 256) * 256;
      readback = this.device.createBuffer({
        size: bytesPerRow * height,
        usage: BUFFER.COPY_DST | BUFFER.MAP_READ,
      });
      // Replay in bounded dispatches so the browser and the GPU remain responsive.
      const batchLimit = this.historyBatchLimit(params.maxIterations);
      for (const range of history) {
        for (let start = range.start; start < range.end; start += batchLimit) {
          this.check();
          const part = { start, end: Math.min(range.end, start + batchLimit), cdf: range.cdf };
          this.writeHistory(target, part, params, cssWidth, cssHeight);
          const replay = this.device.createCommandEncoder();
          this.dispatch(
            replay,
            this.pipelines.history,
            target.historyGroup,
            part.end - part.start,
            64,
          );
          this.device.queue.submit([replay.finish()]);
          await this.device.queue.onSubmittedWorkDone();
        }
      }
      const encoder = this.device.createCommandEncoder();
      this.writeUniform(target, 0, params, cssWidth, cssHeight, 0, this.samples, sampleCount);
      this.render(encoder, target, texture.createView(), pipeline);
      encoder.copyTextureToBuffer({ texture }, { buffer: readback, bytesPerRow }, [width, height]);
      this.device.queue.submit([encoder.finish()]);
      await readback.mapAsync(1);
      const source = new Uint8Array(readback.getMappedRange());
      const pixels = new Uint8ClampedArray(width * height * 4);
      for (let row = 0; row < height; row++) {
        pixels.set(
          source.subarray(row * bytesPerRow, row * bytesPerRow + width * 4),
          row * width * 4,
        );
      }
      readback.unmap();
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("PNG encoding is unavailable");
      context.putImageData(new ImageData(pixels, width, height), 0, 0);
      return await canvasToPng(canvas);
    } finally {
      readback?.destroy();
      texture?.destroy();
      this.releaseTarget(target);
      this.exportPending = false;
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.onFailure = undefined;
    this.releaseTarget(this.target);
    this.target = null;
    this.seeds.destroy();
    this.proposal.destroy();
    this.proposalReadback.destroy();
    this.history = [];
    this.context.unconfigure();
    this.device.destroy();
  }

  private check() {
    if (this.failure) throw this.failure;
    if (this.disposed) throw new Error("Renderer closed");
  }

  private fail(error: Error) {
    if (this.disposed || this.failure) return;
    this.failure = error;
    this.onFailure?.(error);
  }

  private validateSize(width: number, height: number) {
    const limits = this.device.limits;
    if (
      Math.max(width, height) > limits.maxTextureDimension2D ||
      width * height * 4 > limits.maxStorageBufferBindingSize
    ) {
      throw new Error("This image exceeds the GPU's full-resolution buffer limit");
    }
  }

  private createTarget(width: number, height: number, display: GpuPipeline): Target {
    const buffer = (size: number, usage = BUFFER.STORAGE | BUFFER.COPY_DST | BUFFER.COPY_SRC) =>
      this.device.createBuffer({ size, usage });
    const uniform = buffer(UNIFORM_SIZE, BUFFER.UNIFORM | BUFFER.COPY_DST);
    const historyUniform = buffer(UNIFORM_SIZE, BUFFER.UNIFORM | BUFFER.COPY_DST);
    const historyCdf = buffer(PROPOSAL_SIZE);
    const low = buffer(width * height * 4);
    const high = buffer(width * height * 4);
    const statistics = buffer(STATISTICS_SIZE);
    const group = (pipeline: GpuPipeline, entries: [number, GpuBuffer][]) =>
      this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: entries.map(([binding, resource]) => ({
          binding,
          resource: { buffer: resource },
        })),
      });
    return {
      width,
      height,
      uniform,
      historyUniform,
      historyCdf,
      low,
      high,
      statistics,
      sampleGroup: group(this.pipelines.sample, [
        [0, uniform],
        [1, this.seeds],
        [2, low],
        [3, high],
        [4, statistics],
        [5, this.proposal],
      ]),
      replayGroup: group(this.pipelines.replay, [
        [0, uniform],
        [1, this.seeds],
        [2, low],
        [3, high],
      ]),
      historyGroup: group(this.pipelines.history, [
        [0, historyUniform],
        [2, low],
        [3, high],
        [5, historyCdf],
      ]),
      displayGroup: group(display, [
        [0, uniform],
        [1, low],
        [2, high],
      ]),
      proposalGroup: group(this.pipelines.proposal, [
        [4, statistics],
        [5, this.proposal],
      ]),
    };
  }

  private releaseTarget(target: Target | null) {
    if (!target) return;
    for (const buffer of [
      target.uniform,
      target.historyUniform,
      target.historyCdf,
      target.low,
      target.high,
      target.statistics,
    ])
      buffer.destroy();
  }

  private writeUniformProposal() {
    this.currentCdf = Float32Array.from({ length: 257 }, (_, i) => i / 256);
    this.device.queue.writeBuffer(this.proposal, 0, this.currentCdf);
  }

  private recordSamples(start: number, end: number) {
    const previous = this.history[this.history.length - 1];
    if (previous && previous.end === start && previous.cdf === this.currentCdf) previous.end = end;
    else this.history.push({ start, end, cdf: this.currentCdf });
  }

  private async captureProposal() {
    await this.proposalReadback.mapAsync(1);
    try {
      if (!this.disposed)
        this.currentCdf = new Float32Array(this.proposalReadback.getMappedRange().slice(0));
    } finally {
      this.proposalReadback.unmap();
    }
  }

  private historyBatchLimit(maxIterations: number) {
    return Math.max(256, Math.min(262144, Math.floor(16_777_216 / maxIterations)));
  }

  private nextHistoryRange(maxIterations: number): SampleRange | null {
    if (this.replayCursor >= this.replayEnd) return null;
    while (
      this.replayRange < this.history.length &&
      this.history[this.replayRange].end <= this.replayCursor
    )
      this.replayRange++;
    const range = this.history[this.replayRange];
    if (!range || range.start > this.replayCursor)
      throw new Error("Buddhabrot sampling history is incomplete");
    return {
      start: this.replayCursor,
      end: Math.min(
        range.end,
        this.replayEnd,
        this.replayCursor + this.historyBatchLimit(maxIterations),
      ),
      cdf: range.cdf,
    };
  }

  private writeHistory(
    target: Target,
    range: SampleRange,
    params: BuddhabrotParams,
    cssWidth: number,
    cssHeight: number,
  ) {
    this.device.queue.writeBuffer(target.historyCdf, 0, range.cdf);
    this.writeUniform(
      target,
      range.end - range.start,
      params,
      cssWidth,
      cssHeight,
      0,
      range.start,
      this.projectedSamples,
      target.historyUniform,
    );
  }

  private writeUniform(
    target: Target,
    count: number,
    params = this.params,
    cssWidth = this.cssWidth,
    cssHeight = this.cssHeight,
    cachedSamples = this.cachedSamples,
    firstSample = this.samples,
    projectedSamples = this.projectedSamples,
    uniform = target.uniform,
  ) {
    if (!params) return;
    const viewport = getBuddhabrotViewport(cssWidth, cssHeight, params.viewport, params.framing);
    const bytes = new ArrayBuffer(UNIFORM_SIZE);
    const floats = new Float32Array(bytes);
    const ints = new Uint32Array(bytes);
    floats.set([viewport.minX, viewport.maxX, viewport.minY, viewport.maxY]);
    ints.set([target.width, target.height, params.maxIterations, params.minOrbitLength], 4);
    ints.set([firstSample >>> 0, count, CACHE_CAPACITY, cachedSamples], 8);
    floats.set([...color(params.color), params.exposure], 12);
    const pixelArea =
      ((viewport.maxX - viewport.minX) * (viewport.maxY - viewport.minY)) /
      (target.width * target.height);
    const densityScale = projectedSamples > 0 ? 8 / (projectedSamples * pixelArea) : 0;
    floats.set([...color(params.background), densityScale], 16);
    ints.set([Math.floor(firstSample / 4294967296) >>> 0, 0, 0, 0], 20);
    this.device.queue.writeBuffer(uniform, 0, bytes);
  }

  private dispatch(
    encoder: GpuEncoder,
    pipeline: GpuPipeline,
    group: unknown,
    count: number,
    size: number,
  ) {
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    // Both large orbit caches and exports use a two-dimensional dispatch.
    const groups = Math.ceil(count / size);
    const rows = Math.ceil(groups / 65535);
    pass.dispatchWorkgroups(Math.ceil(groups / rows), rows);
    pass.end();
  }

  private render(encoder: GpuEncoder, target: Target, view: unknown, pipeline: GpuPipeline) {
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        { view, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, target.displayGroup);
    pass.draw(3);
    pass.end();
  }
}
