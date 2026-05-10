import { Scene } from "../model/scene";
import { Renderer } from "../view/Renderer";

export class App {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  scene: Scene;
  lastTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.scene = new Scene();
  }

  async initialize() {
    await this.renderer.Initialize();
  }

  run = (timestamp: number = 0) => {
    const delta = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.scene.update(delta);
    this.renderer.render(
      this.scene.get_player(),
      this.scene.get_triangles()
    );

    requestAnimationFrame(this.run);
  }
}