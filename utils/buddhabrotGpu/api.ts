/** The small WebGPU surface used here, kept local until lib.dom includes it. */
export interface GpuBuffer {
  destroy(): void;
  mapAsync(mode: number): Promise<void>;
  getMappedRange(): ArrayBuffer;
  unmap(): void;
}
export interface GpuTexture {
  createView(): unknown;
  destroy(): void;
}
export interface GpuPipeline {
  getBindGroupLayout(index: number): unknown;
}
export interface GpuPass {
  setPipeline(pipeline: GpuPipeline): void;
  setBindGroup(index: number, group: unknown): void;
  dispatchWorkgroups(x: number, y?: number): void;
  draw(vertices: number): void;
  end(): void;
}
export interface GpuEncoder {
  clearBuffer(buffer: GpuBuffer, offset?: number, size?: number): void;
  beginComputePass(): GpuPass;
  beginRenderPass(descriptor: unknown): GpuPass;
  copyTextureToBuffer(source: unknown, target: unknown, size: unknown): void;
  copyBufferToBuffer(
    source: GpuBuffer,
    sourceOffset: number,
    target: GpuBuffer,
    targetOffset: number,
    size: number,
  ): void;
  finish(): unknown;
}
export interface GpuDevice extends EventTarget {
  limits: { maxTextureDimension2D: number; maxStorageBufferBindingSize: number };
  lost: Promise<{ message: string; reason: string }>;
  queue: {
    writeBuffer(buffer: GpuBuffer, offset: number, data: ArrayBuffer | ArrayBufferView): void;
    submit(commands: unknown[]): void;
    onSubmittedWorkDone(): Promise<void>;
  };
  createBuffer(descriptor: unknown): GpuBuffer;
  createTexture(descriptor: unknown): GpuTexture;
  createShaderModule(descriptor: unknown): {
    getCompilationInfo(): Promise<{ messages: { type: string; message: string }[] }>;
  };
  createComputePipelineAsync(descriptor: unknown): Promise<GpuPipeline>;
  createRenderPipelineAsync(descriptor: unknown): Promise<GpuPipeline>;
  createBindGroup(descriptor: unknown): unknown;
  createCommandEncoder(): GpuEncoder;
  pushErrorScope(filter: string): void;
  popErrorScope(): Promise<{ message: string } | null>;
  destroy(): void;
}
export interface GpuCanvasContext {
  configure(descriptor: unknown): void;
  unconfigure(): void;
  getCurrentTexture(): GpuTexture;
}
export interface Gpu {
  requestAdapter(options?: unknown): Promise<{
    requestDevice(options?: unknown): Promise<GpuDevice>;
  } | null>;
  getPreferredCanvasFormat(): string;
}

export const BUFFER = { MAP_READ: 1, COPY_SRC: 4, COPY_DST: 8, UNIFORM: 64, STORAGE: 128 };
export const TEXTURE = { COPY_SRC: 1, RENDER_ATTACHMENT: 16 };
