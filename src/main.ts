import { Renderer } from "./Renderer";

const canvas: HTMLCanvasElement = document.getElementById(
  "gfx-main",
) as HTMLCanvasElement;

const renderer = new Renderer(canvas);

renderer.Initialize();
