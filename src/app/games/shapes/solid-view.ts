import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type { SolidKind } from './shapes-engine';

/**
 * A solid on a turntable, drawn with Babylon.
 *
 * Babylon is imported dynamically and only from the modules actually used, so
 * it lands in this game's lazy chunk and the hub still boots in ~68 kB. A child
 * who never opens this game never downloads a 3D engine.
 *
 * Edges are drawn as dark lines on purpose: the counting questions are only
 * answerable if she can see and follow each edge round the shape.
 *
 * If WebGL is missing or Babylon fails to load, the canvas is replaced by the
 * solid's name rather than a blank rectangle — the question stays answerable
 * for the name and rolling kinds, and nothing looks broken.
 */
@Component({
  selector: 'pg-solid-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stage" [class.stage--failed]="failed()">
      <canvas #canvas class="stage__canvas" [attr.aria-label]="label()"></canvas>
      @if (failed()) {
        <p class="stage__fallback">{{ fallbackName() }}</p>
      }
    </div>
    @if (!failed()) {
      <p class="stage__spin">אֶפְשָׁר לְסוֹבֵב אֶת הַצּוּרָה בָּאֶצְבַּע</p>
    }
  `,
  styleUrl: './solid-view.scss',
})
export class SolidView {
  readonly kind = input.required<SolidKind>();
  /** Shown if the 3D view cannot start. */
  readonly fallbackName = input('');
  readonly label = input('צוּרָה תְּלַת־מֵמַדִּית');

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  protected readonly failed = signal(false);

  /** Everything Babylon hands back, kept only so it can be disposed. */
  private scene: { dispose(): void } | null = null;
  private engine: { dispose(): void; resize(): void } | null = null;
  private rebuild: ((kind: SolidKind) => void) | null = null;
  private onResize = () => this.engine?.resize();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.teardown());

    afterNextRender(() => void this.start());

    // A new solid reshapes the existing scene rather than rebuilding it.
    effect(() => {
      const kind = this.kind();
      this.rebuild?.(kind);
    });
  }

  private async start(): Promise<void> {
    try {
      const [
        { Engine },
        { Scene },
        { ArcRotateCamera },
        { HemisphericLight },
        { Vector3 },
        { Color3, Color4 },
        { MeshBuilder },
        { StandardMaterial },
      ] = await Promise.all([
        import('@babylonjs/core/Engines/engine'),
        import('@babylonjs/core/scene'),
        import('@babylonjs/core/Cameras/arcRotateCamera'),
        import('@babylonjs/core/Lights/hemisphericLight'),
        import('@babylonjs/core/Maths/math.vector'),
        import('@babylonjs/core/Maths/math.color'),
        import('@babylonjs/core/Meshes/meshBuilder'),
        import('@babylonjs/core/Materials/standardMaterial'),
      ]);
      // Side-effect only: registers the edge renderer used below.
      await import('@babylonjs/core/Rendering/edgesRenderer');

      const canvas = this.canvas().nativeElement;
      const engine = new Engine(canvas, true, { preserveDrawingBuffer: false }, true);
      const scene = new Scene(engine);
      // Transparent, so the claymorphism card behind shows through.
      scene.clearColor = new Color4(0, 0, 0, 0);

      const camera = new ArcRotateCamera(
        'cam',
        -Math.PI / 3,
        Math.PI / 3,
        6.5,
        Vector3.Zero(),
        scene,
      );
      camera.attachControl(canvas, true);
      camera.lowerRadiusLimit = 4.5;
      camera.upperRadiusLimit = 9;
      // No panning: a child who drags the shape off-screen cannot get it back.
      camera.panningSensibility = 0;

      const light = new HemisphericLight('light', new Vector3(0.4, 1, -0.6), scene);
      light.intensity = 0.95;

      const material = new StandardMaterial('solid', scene);
      material.diffuseColor = new Color3(0.42, 0.79, 0.93);
      material.specularColor = new Color3(0.25, 0.25, 0.3);

      let mesh: {
        dispose(): void;
        material: unknown;
        enableEdgesRendering(epsilon?: number): void;
        edgesWidth: number;
        edgesColor: unknown;
        rotation: { y: number };
      } | null = null;

      const build = (kind: SolidKind) => {
        mesh?.dispose();
        mesh = makeMesh(kind, MeshBuilder, scene) as typeof mesh;
        if (!mesh) return;
        mesh.material = material;
        mesh.enableEdgesRendering();
        mesh.edgesWidth = 14;
        mesh.edgesColor = new Color4(0.12, 0.11, 0.29, 1);
      };

      build(this.kind());

      // Turn slowly so every face comes into view without her having to drag —
      // but hold still for anyone who asked the system for less motion.
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      scene.registerBeforeRender(() => {
        if (!still && mesh) mesh.rotation.y += 0.004;
      });

      engine.runRenderLoop(() => scene.render());
      addEventListener('resize', this.onResize);

      this.engine = engine;
      this.scene = scene;
      this.rebuild = build;
    } catch {
      // No WebGL, or the chunk failed to load. Show the name instead.
      this.failed.set(true);
    }
  }

  private teardown(): void {
    removeEventListener('resize', this.onResize);
    this.scene?.dispose();
    this.engine?.dispose();
    this.scene = null;
    this.engine = null;
    this.rebuild = null;
  }
}

/**
 * Every solid the game teaches comes out of three Babylon builders — a pyramid
 * is a four-sided cylinder with no top, a prism a three-sided one. Fewer
 * builders means less of Babylon in the bundle.
 */
function makeMesh(
  kind: SolidKind,
  builder: {
    CreateBox(name: string, options: object, scene: unknown): unknown;
    CreateSphere(name: string, options: object, scene: unknown): unknown;
    CreateCylinder(name: string, options: object, scene: unknown): unknown;
  },
  scene: unknown,
): unknown {
  switch (kind) {
    case 'box':
      return builder.CreateBox('solid', { size: 2.4 }, scene);
    case 'cuboid':
      return builder.CreateBox('solid', { width: 3.2, height: 1.7, depth: 2 }, scene);
    case 'sphere':
      return builder.CreateSphere('solid', { diameter: 2.8, segments: 24 }, scene);
    case 'cylinder':
      return builder.CreateCylinder('solid', { height: 2.8, diameter: 2.2 }, scene);
    case 'cone':
      return builder.CreateCylinder(
        'solid',
        { height: 2.9, diameterTop: 0, diameterBottom: 2.4 },
        scene,
      );
    case 'pyramid':
      return builder.CreateCylinder(
        'solid',
        { height: 2.6, diameterTop: 0, diameterBottom: 3, tessellation: 4 },
        scene,
      );
    case 'prism':
      return builder.CreateCylinder(
        'solid',
        { height: 2.6, diameter: 2.9, tessellation: 3 },
        scene,
      );
  }
}
