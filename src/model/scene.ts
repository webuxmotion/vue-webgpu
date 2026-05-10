import { Camera } from "./camera";

export class Scene {
  player: Camera;
  triangleCount = 99999;
  simDataRaw: Float32Array;

  constructor() {
    // 1. Ініціалізація камери
    this.player = new Camera([0, 0, 0.5], 0, 0);

    // 2. Створюємо один великий масив замість мільйона об'єктів
    // 8 чисел на об'єкт: x, y, z, amplitude, frequency, time, angle, pad
    this.simDataRaw = new Float32Array(this.triangleCount * 8);

    for (let i = 0; i < this.triangleCount; i++) {
      const idx = i * 8;
      const amplitude = 0.1 + Math.random() * 0.4;
      const frequency = 0.5 + Math.random() * 1.0;
      
      // Розподіляємо трикутники у просторі (наприклад, сіткою або випадково)
      const x = 4.0;
      const y = (Math.random() - 0.5) * 5.6;
      const z = (Math.random() - 0.5) * 3.0;

      this.simDataRaw[idx + 0] = x;
      this.simDataRaw[idx + 1] = y;
      this.simDataRaw[idx + 2] = z;
      this.simDataRaw[idx + 3] = amplitude;
      this.simDataRaw[idx + 4] = frequency;
      this.simDataRaw[idx + 5] = 0.0; // початковий time
      this.simDataRaw[idx + 6] = 0.0; // початковий angle
      this.simDataRaw[idx + 7] = 0.0; // pad (порожнє місце для вирівнювання)
    }
  }

  // Цей метод потрібен для App.ts
  update() {
    this.player.update();
  }

  // Цей метод потрібен для App.ts
  get_player(): Camera {
    return this.player;
  }
}