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
    // Передаємо готовий масив чисел
    await this.renderer.makeComputePipeline(this.scene.simDataRaw);
  }

  run = (timestamp: number = 0) => {
    // 1. Захист від стрибка на першому кадрі
    if (this.lastTime === 0) {
      this.lastTime = timestamp;
      requestAnimationFrame(this.run);
      return;
    }

    // 2. Обмеження максимальної дельти (наприклад, не більше 0.1с),
    // щоб об'єкти не "літали" після фризів або перемикання вкладок
    const delta = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.scene.update();

    // 3. Рендер
    this.renderer.render(
      this.scene.get_player(),
      this.scene.triangleCount,
      delta,
    );

    requestAnimationFrame(this.run);
  };
}
