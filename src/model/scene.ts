import { Triangle } from "./triangle";
import { Camera } from "./camera";

export class Scene {
  triangles: Triangle[];
  player: Camera;

  constructor() {
    this.triangles = [];

    for (let i = 0; i < 1000; i++) {
      const amplitude = 0.1 + Math.random() * 0.4;
      const frequency = 0.5 + Math.random() * 1;
      const y = (i % 10 - 5) * 0.3; // розкидати по Y

      this.triangles.push(new Triangle([2, y, 0], 0, amplitude, frequency));
    }

    this.player = new Camera([0, 0, 0.1], 0, 0);
  }

  update(delta: number) {
    this.triangles.forEach((triangle) => {
      triangle.update(delta);
    });
    this.player.update();
  }

  get_player(): Camera {
    return this.player;
  }

  get_triangles(): Triangle[] {
    return this.triangles;
  }
}
