import shader from "./shaders.wgsl";
import { TriangleMesh } from "./TriangleMesh";

export class Renderer {
  canvas: HTMLCanvasElement;
  adapter!: GPUAdapter;
  device!: GPUDevice;
  context!: GPUCanvasContext;
  format!: GPUTextureFormat;
  bindGroup!: GPUBindGroup;
  pipeline!: GPURenderPipeline;
  triangleMesh!: TriangleMesh;
  module!: GPUShaderModule;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async Initialize() {
    await this.setupDevice();
    this.createAssets();
    await this.makePipeline();
    this.render();
  }

  async setupDevice() {
    if (!navigator.gpu) throw new Error("WebGPU not supported");
    this.adapter = (await navigator.gpu?.requestAdapter()) as GPUAdapter;
    this.device = (await this.adapter?.requestDevice()) as GPUDevice;
    this.context = this.canvas.getContext("webgpu") as GPUCanvasContext;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.module = this.device.createShaderModule({
      code: shader,
    });
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "opaque",
    });
  }

  async makePipeline() {
    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [],
    });

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [],
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
        targets: [
          {
            format: this.format,
          },
        ],
      },

      primitive: {
        topology: "triangle-list",
      },

      layout: "auto"
    });
  }

  createAssets() {
    this.triangleMesh = new TriangleMesh(this.device);
  }

  render() {
    const commandEncoder: GPUCommandEncoder =
      this.device.createCommandEncoder();
    const textureView: GPUTextureView = this.context
      .getCurrentTexture()
      .createView();
    const renderpass: GPURenderPassEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.5, g: 0.0, b: 0.25, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    renderpass.setPipeline(this.pipeline);
    renderpass.setVertexBuffer(0, this.triangleMesh.buffer);
    renderpass.setBindGroup(0, this.bindGroup);
    renderpass.draw(3, 1, 0, 0);
    renderpass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}
