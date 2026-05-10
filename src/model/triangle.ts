import { vec3, mat4 } from "gl-matrix";
import { Deg2Rad } from "./math_stuff";

export class Triangle {
  position: vec3;
  eulers: vec3;
  model: mat4;
  time: number = 0;
  amplitude: number;
  frequency: number;
  private _pos: vec3;

  constructor(position: vec3, theta: number, amplitude = 0.3, frequency = 1.0) {
    this.position = position;
    this.eulers = vec3.create();
    this.eulers[2] = theta;
    this.amplitude = amplitude;
    this.frequency = frequency;
    this.model = mat4.create();  // один раз
    this._pos = vec3.clone(position); // один раз
  }

  update(delta: number) {
    this.time += delta;
    this.eulers[2] = (this.eulers[2] + 1) % 360;

    const offsetZ = Math.sin(this.time * this.frequency * Math.PI * 2) * this.amplitude;

    // оновити без нової алокації
    this._pos[0] = this.position[0];
    this._pos[1] = this.position[1];
    this._pos[2] = this.position[2] + offsetZ;

    mat4.identity(this.model);
    mat4.translate(this.model, this.model, this._pos);
    mat4.rotateZ(this.model, this.model, Deg2Rad(this.eulers[2]));
  }

  get_model(): mat4 {
    return this.model;
  }
}