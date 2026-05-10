import { App } from "./control/app";

const canvas: HTMLCanvasElement = document.getElementById(
  "gfx-main",
) as HTMLCanvasElement;

const app = new App(canvas);
await app.initialize();
app.run();
