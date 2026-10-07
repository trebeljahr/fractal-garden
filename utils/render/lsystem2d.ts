import type { Context2D, Renderer } from "./types";

export type LSystem2DParams = {
  axiom: string;
  replace: Record<string, string>;
  /** Turn per "+" or "-", in degrees. */
  angle: number;
  /** Starting heading in degrees, clockwise from straight up. */
  startAngle: number;
  lineWidth: number;
  color: string;
  background: string;
  initialLength: number;
  translation: [number, number];
  divideFactor: number;
  /** Iteration n shows generation n - 1 (the axiom is iteration 1). */
  iterations: number;
};

// Expanding past this would only stall the worker on a picture nobody can see.
const MAX_SENTENCE_LENGTH = 40_000_000;
// Very long paths stroke slowly in some browsers; flush every so often.
const SEGMENTS_PER_PATH = 20_000;

function expandSentence(sentence: string, replace: Record<string, string>) {
  const parts: string[] = [];
  for (let i = 0; i < sentence.length; i++) {
    const char = sentence[i];
    parts.push(replace[char] ?? char);
  }
  return parts.join("");
}

export class LSystem2DRenderer implements Renderer<LSystem2DParams> {
  private params: LSystem2DParams | null = null;
  private rulesKey = "";
  private generations: string[] = [];
  private segments = 0;

  update(params: LSystem2DParams) {
    const rulesKey = JSON.stringify([params.axiom, params.replace]);
    if (rulesKey !== this.rulesKey) {
      this.rulesKey = rulesKey;
      this.generations = [params.axiom];
    }
    this.params = params;
    this.segments = this.countSegments(this.sentence());
  }

  draw(ctx: Context2D, width: number, height: number) {
    const params = this.params;
    if (!params) return false;

    ctx.fillStyle = params.background;
    ctx.fillRect(0, 0, width, height);
    if (params.iterations < 1) return false;

    const sentence = this.sentence();
    const generation = Math.min(params.iterations - 1, this.generations.length - 1);
    const len = params.initialLength / params.divideFactor ** generation;
    const turn = (params.angle * Math.PI) / 180;

    ctx.strokeStyle = params.color;
    ctx.lineWidth = params.lineWidth;
    ctx.lineCap = "butt";
    ctx.lineJoin = "bevel";
    ctx.beginPath();

    let [x, y] = params.translation;
    let heading = (params.startAngle * Math.PI) / 180;
    let direction = 1;
    let penAt = false;
    let pathSegments = 0;
    const stack: [number, number, number, number][] = [];

    for (let i = 0; i < sentence.length; i++) {
      switch (sentence[i]) {
        case "F":
        case "G": {
          if (!penAt) {
            ctx.moveTo(x, y);
            penAt = true;
          }
          x += Math.sin(heading) * len;
          y -= Math.cos(heading) * len;
          ctx.lineTo(x, y);
          if (++pathSegments >= SEGMENTS_PER_PATH) {
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
            pathSegments = 0;
          }
          break;
        }
        case "f":
          x += Math.sin(heading) * len;
          y -= Math.cos(heading) * len;
          penAt = false;
          break;
        case "+":
          heading += turn * direction;
          break;
        case "-":
          heading -= turn * direction;
          break;
        case "|":
          heading += Math.PI;
          break;
        case "&":
          direction = -direction;
          break;
        case "[":
          stack.push([x, y, heading, direction]);
          break;
        case "]": {
          const state = stack.pop();
          if (state) {
            [x, y, heading, direction] = state;
            penAt = false;
          }
          break;
        }
      }
    }

    ctx.stroke();
    return false;
  }

  describe() {
    if (!this.params) return null;
    return { level: this.params.iterations, work: this.segments };
  }

  private sentence() {
    const params = this.params;
    if (!params) return "";
    const target = Math.max(0, params.iterations - 1);
    while (this.generations.length <= target) {
      const last = this.generations[this.generations.length - 1];
      if (last.length > MAX_SENTENCE_LENGTH) break;
      this.generations.push(expandSentence(last, params.replace));
    }
    return this.generations[Math.min(target, this.generations.length - 1)];
  }

  private countSegments(sentence: string) {
    let count = 0;
    for (let i = 0; i < sentence.length; i++) {
      const char = sentence[i];
      if (char === "F" || char === "G") count++;
    }
    return count;
  }
}
