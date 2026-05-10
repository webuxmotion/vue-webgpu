import { Scene } from "../model/scene";
import { Renderer } from "../view/Renderer";

export class App {
    canvas: HTMLCanvasElement;
    renderer: Renderer;
    scene: Scene;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.scene = new Scene();
    }

    async initialize() {
        await this.renderer.Initialize();
    }

    run = () => {
        let running: boolean = true;

        this.scene.update();
        this.renderer.render(
            this.scene.get_player(),
            this.scene.get_triangles()
        );

        if (running) {
            requestAnimationFrame(this.run);
        }
    }
}