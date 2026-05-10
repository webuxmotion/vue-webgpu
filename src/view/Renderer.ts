import { Camera } from "../model/camera";
import { Triangle } from "../model/triangle";
import { Material } from "./Material";
import shader from "./shaders/shaders.wgsl";
import { TriangleMesh } from "./TriangleMesh";
import { mat4 } from "gl-matrix";

const ALIGNMENT = 256; // WebGPU dynamic offset alignment requirement
const MAX_TRIANGLES = 100_000;

export class Renderer {
  canvas: HTMLCanvasElement;
  adapter!: GPUAdapter;
  device!: GPUDevice;
  context!: GPUCanvasContext;
  format!: GPUTextureFormat;

  modelBuffer!: GPUBuffer; // dynamic — one mat4 per triangle
  cameraBuffer!: GPUBuffer; // static  — view + projection

  bindGroup!: GPUBindGroup;
  pipeline!: GPURenderPipeline;

  triangleMesh!: TriangleMesh;
  material!: Material;
  module!: GPUShaderModule;

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
  }

  async makePipeline() {
    // model buffer — one mat4 per triangle, dynamic offset
    this.modelBuffer = this.device.createBuffer({
      size: MAX_TRIANGLES * ALIGNMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // camera buffer — view + projection (2 × mat4 = 128 bytes)
    this.cameraBuffer = this.device.createBuffer({
      size: 128,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: "uniform",
            hasDynamicOffset: true,
            minBindingSize: 64, // one mat4
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: "uniform",
            minBindingSize: 128, // view + projection
          },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
      ],
    });

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.modelBuffer,
            size: 64,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: this.cameraBuffer,
            size: 128,
          },
        },
        {
          binding: 2,
          resource: this.material.view,
        },
        {
          binding: 3,
          resource: this.material.sampler,
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    this.pipeline = this.device.createRenderPipeline({
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
      layout: pipelineLayout,
    });
  }

  async createAssets() {
    this.triangleMesh = new TriangleMesh(this.device);
    this.material = new Material();
    await this.material.initialize(this.device, "/avatar.png");
  }

  async render(camera: Camera, triangles: Triangle[]) {
    const projection = mat4.create();
    mat4.perspective(projection, Math.PI / 4, 800 / 600, 0.1, 10);

    const view = camera.get_view();

    // write view at offset 0, projection at offset 64
    this.device.queue.writeBuffer(this.cameraBuffer, 0, new Float32Array(view));
    this.device.queue.writeBuffer(
      this.cameraBuffer,
      64,
      new Float32Array(projection),
    );

    // write each model matrix at its own offset
    triangles.forEach((triangle, index) => {
      this.device.queue.writeBuffer(
        this.modelBuffer,
        index * ALIGNMENT, // ← 0, 256, 512, 768...
        new Float32Array(triangle.get_model()),
      );
    });

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderpass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.1, g: 0.0, b: 0.25, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderpass.setPipeline(this.pipeline);
    renderpass.setVertexBuffer(0, this.triangleMesh.buffer);

    triangles.forEach((_, index) => {
      renderpass.setBindGroup(0, this.bindGroup, [index * ALIGNMENT]);
      renderpass.draw(3, 1, 0, 0);
    });

    renderpass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }
}
