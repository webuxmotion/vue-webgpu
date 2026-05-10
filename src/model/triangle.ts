import { vec3, mat4 } from "gl-matrix";
import { Deg2Rad } from "./math_stuff";

export class Triangle {
  position: vec3;
  eulers: vec3;
  model!: mat4;
  time: number = 0;
  amplitude: number;
  frequency: number;


  constructor(position: vec3, theta: number, amplitude = 0.5, frequency = 1.0) {
    this.position = position;
    this.eulers = vec3.create();
    this.eulers[2] = theta;
    this.amplitude = amplitude;
    this.frequency = frequency;
  }

  update(delta: number) {
    this.time += delta;
    this.eulers[2] += 1;
    this.eulers[2] %= 360;

    const offsetY = Math.sin(this.time * this.frequency * Math.PI * 2) * this.amplitude;

    const animatedPosition: vec3 = [
      this.position[0],
      this.position[1],
      this.position[2] + offsetY,
    ];

    this.model = mat4.create();
    mat4.translate(this.model, this.model, animatedPosition);
    mat4.rotateZ(this.model, this.model, Deg2Rad(this.eulers[2]));
  }

  get_model(): mat4 {
    return this.model;
  }
}
