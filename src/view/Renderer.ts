import { Camera } from "../model/camera";
import { Material } from "./Material";
import shader from "./shaders/shaders.wgsl";
import computeShader from "./shaders/compute.wgsl";
import { TriangleMesh } from "./TriangleMesh";
import { mat4 } from "gl-matrix";

const MAX_TRIANGLES = 1000000;

export class Renderer {
  canvas: HTMLCanvasElement;
  adapter!: GPUAdapter;
  device!: GPUDevice;
  context!: GPUCanvasContext;
  format!: GPUTextureFormat;

  objectBuffer!: GPUBuffer; 
  cameraBuffer!: GPUBuffer; 

  bindGroup!: GPUBindGroup;
  pipeline!: GPURenderPipeline;

  triangleMesh!: TriangleMesh;
  material!: Material;
  module!: GPUShaderModule;

  // Текстура глибини для відсікання невидимих об'єктів
  depthTexture!: GPUTexture;

  simBuffer!: GPUBuffer; 
  deltaBuffer!: GPUBuffer; 
  computePipeline!: GPUComputePipeline;
  computeBindGroup!: GPUBindGroup;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async Initialize() {
    await this.setupDevice();
    await this.createAssets();
    await this.makePipeline();
  }

  async setupDevice() {
    if (!navigator.gpu) throw new Error("WebGPU not supported");
    this.adapter = (await navigator.gpu.requestAdapter()) as GPUAdapter;
    this.device = (await this.adapter.requestDevice()) as GPUDevice;
    this.context = this.canvas.getContext("webgpu") as GPUCanvasContext;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.module = this.device.createShaderModule({ code: shader });
    
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "opaque",
    });

    // Створюємо текстуру глибини під розмір канвасу
    this.reconfigureDepthTexture();
  }

  reconfigureDepthTexture() {
    if (this.depthTexture) this.depthTexture.destroy();
    
    this.depthTexture = this.device.createTexture({
      size: [this.canvas.width, this.canvas.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  async makePipeline() {
    this.objectBuffer = this.device.createBuffer({
      size: MAX_TRIANGLES * 64,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.cameraBuffer = this.device.createBuffer({
      size: 128,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {} },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      ],
    });

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.objectBuffer } },
        { binding: 1, resource: { buffer: this.cameraBuffer } },
        { binding: 2, resource: this.material.view },
        { binding: 3, resource: this.material.sampler },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: this.module,
        entryPoint: "vs_main",
        buffers: [this.triangleMesh.bufferLayout],
      },
      fragment: {
        module: this.module,
        entryPoint: "fs_main",
        targets: [{ format: this.format }],
      },
      primitive: { topology: "triangle-list" },
      // АКТИВАЦІЯ DEPTH TEST
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
    });
  }

  async makeComputePipeline(simData: Float32Array) {
    this.simBuffer = this.device.createBuffer({
      size: simData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    this.device.queue.writeBuffer(this.simBuffer, 0, simData);

    this.deltaBuffer = this.device.createBuffer({
      size: 16, 
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const computeModule = this.device.createShaderModule({ code: computeShader });
    
    const computeBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      ],
    });

    this.computeBindGroup = this.device.createBindGroup({
      layout: computeBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.objectBuffer } },
        { binding: 1, resource: { buffer: this.simBuffer } },
        { binding: 2, resource: { buffer: this.deltaBuffer } },
      ],
    });

    this.computePipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [computeBindGroupLayout] }),
      compute: { module: computeModule, entryPoint: "cs_main" },
    });
  }

  async createAssets() {
    this.triangleMesh = new TriangleMesh(this.device);
    this.material = new Material();
    await this.material.initialize(this.device, "/avatar.png");
  }

  async render(camera: Camera, triangleCount: number, delta: number) {
    if (!this.deltaBuffer || !this.computePipeline) return;

    this.device.queue.writeBuffer(this.deltaBuffer, 0, new Float32Array([delta]));

    const view = camera.get_view();
    const projection = mat4.create();
    mat4.perspective(projection, Math.PI / 4, this.canvas.width / this.canvas.height, 0.1, 100);

    this.device.queue.writeBuffer(this.cameraBuffer, 0, view as Float32Array);
    this.device.queue.writeBuffer(this.cameraBuffer, 64, projection as Float32Array);

    const commandEncoder = this.device.createCommandEncoder();

    // COMPUTE PASS
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(this.computePipeline);
    computePass.setBindGroup(0, this.computeBindGroup);
    computePass.dispatchWorkgroups(Math.ceil(triangleCount / 256));
    computePass.end();

    // RENDER PASS
    const textureView = this.context.getCurrentTexture().createView();
    const renderpass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
      }],
      // ПІДКЛЮЧЕННЯ DEPTH BUFFER ДО РЕНДЕРУ
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    renderpass.setPipeline(this.pipeline);
    renderpass.setBindGroup(0, this.bindGroup);
    renderpass.setVertexBuffer(0, this.triangleMesh.buffer);
    renderpass.draw(3, triangleCount, 0, 0);
    renderpass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}
