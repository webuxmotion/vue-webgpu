import "./style.css";
import shader from "./shaders.wgsl";

const Initialize = async () => {
  if (!navigator.gpu) throw new Error("WebGPU not supported");
  const canvas = document.getElementById("gfx-main") as HTMLCanvasElement;
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error("No GPUAdapter found");
  const device: GPUDevice = await adapter.requestDevice();
  const context = canvas.getContext("webgpu") as GPUCanvasContext;
  const format: GPUTextureFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({ device, format, alphaMode: "opaque" });

  const pipeline: GPURenderPipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: device.createShaderModule({
        code: shader,
      }),
      entryPoint: "vs_main",
    },
    fragment: {
      module: device.createShaderModule({
        code: shader,
      }),
      entryPoint: "fs_main",
      targets: [{ format: format }],
    },
    primitive: { topology: "triangle-list" },
  });

  const commandEncoder: GPUCommandEncoder = device.createCommandEncoder();
  const textureView: GPUTextureView = context.getCurrentTexture().createView();
  const renderPass: GPURenderPassEncoder = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        clearValue: { r: 0.5, g: 0.0, b: 0.25, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  });
  renderPass.setPipeline(pipeline);
  renderPass.draw(3, 1, 0, 0);
  renderPass.end();

  device.queue.submit([commandEncoder.finish()]);
};

Initialize();
