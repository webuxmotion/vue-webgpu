import shader from "./shaders.wgsl";
import { TriangleMesh } from "./TriangleMesh";
import { mat4 } from "gl-matrix";

export class Renderer {
  canvas: HTMLCanvasElement;
  adapter!: GPUAdapter;
  device!: GPUDevice;
  context!: GPUCanvasContext;
  format!: GPUTextureFormat;
  uniformBuffer!: GPUBuffer;
  bindGroup!: GPUBindGroup;
  pipeline!: GPURenderPipeline;

  triangleMesh!: TriangleMesh;
  module!: GPUShaderModule;
  t!: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.t = 0.0;
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
    this.uniformBuffer = this.device.createBuffer({
      size: 64 * 3,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {}
      }],
    });

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{
        binding: 0,
        resource: {
          buffer: this.uniformBuffer
        }
      }],
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
        targets: [
          {
            format: this.format,
          },
        ],
      },

      primitive: {
        topology: "triangle-list",
      },

      layout: pipelineLayout,
    });
  }

  createAssets() {
    this.triangleMesh = new TriangleMesh(this.device);
  }

  render = () => {
    this.t += 0.05;

    if (this.t > 2.0 * Math.PI) {
      this.t -= 2.0 * Math.PI;
    }

    const projection = mat4.create();
    mat4.perspective(projection, Math.PI / 4, 800/600, 0.1, 10);

    const view = mat4.create();
    mat4.lookAt(view, [-2, 0, 2], [0, 0, 0], [0, 0, 1]);

    const model = mat4.create();
    mat4.rotate(model, model, this.t, [0, 0, 1]);

    this.device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array(model));
    this.device.queue.writeBuffer(this.uniformBuffer, 64, new Float32Array(view));
    this.device.queue.writeBuffer(this.uniformBuffer, 128, new Float32Array(projection));

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

    requestAnimationFrame(this.render);
  }
}
