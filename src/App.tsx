import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent } from "react";

type Ratio = "1:1" | "4:5" | "9:16";
type Tool = "select" | "brush" | "sticker";
type Sticker = {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
};
type BrushPoint = { x: number; y: number };
type BrushStroke = {
  id: string;
  points: BrushPoint[];
  color: string;
  size: number;
  opacity: number;
};
type EditorState = {
  text: string;
  fontSize: number;
  color: string;
  x: number;
  y: number;
  lineHeight: number;
  opacity: number;
  align: "left" | "center" | "right";
  ratio: Ratio;
  imageData: string | null;
  imageName: string;
  imageX: number;
  imageY: number;
  imageScale: number;
  brushStrokes: BrushStroke[];
  stickers: Sticker[];
};
type Template = EditorState & {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
};

const STORAGE_KEY = "pixel-edit-studio-templates-v1";
const RATIOS: Record<Ratio, [number, number]> = {
  "1:1": [1, 1],
  "4:5": [4, 5],
  "9:16": [9, 16],
};
const STICKERS = [
  "😀",
  "😂",
  "❤️",
  "🔥",
  "⭐",
  "👍",
  "💡",
  "💯",
  "✨",
  "🎯",
  "😎",
  "🚀",
];

const ToolMoveIcon = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M24 4v40M4 24h40" stroke="currentColor" strokeWidth="4" />
    <path
      d="M24 4l-5 6h10zM24 44l-5-6h10zM4 24l6-5v10zM44 24l-6-5v10z"
      fill="currentColor"
    />
  </svg>
);
const AlignLeftIcon = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path
      d="M6 9h31M6 19h24M6 29h31M6 39h20"
      stroke="currentColor"
      strokeWidth="3"
    />
  </svg>
);

const AlignCenterIcon = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path
      d="M9 9h30M14 19h20M9 29h30M14 39h20"
      stroke="currentColor"
      strokeWidth="3"
    />
  </svg>
);

const AlignRightIcon = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path
      d="M11 9h31M18 19h24M11 29h31M18 39h24"
      stroke="currentColor"
      strokeWidth="3"
    />
  </svg>
);

const ToolBrushIcon = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path
      d="M10 38l5-15L34 4l10 10-19 19-15 5z"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinejoin="round"
    />
    <path d="M34 4l10 10" stroke="currentColor" strokeWidth="7" />
    <circle cx="25" cy="23" r="3.5" fill="currentColor" />
  </svg>
);

const ToolStickerIcon = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <circle
      cx="24"
      cy="24"
      r="19"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    />
    <circle cx="18" cy="20" r="2.3" fill="currentColor" />
    <circle cx="30" cy="20" r="2.3" fill="currentColor" />
    <path
      d="M16 28c2.5 5 13.5 5 16 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const now = () => new Date().toISOString();

const initialState: EditorState = {
  text: "오늘도 한 장 완성!",
  fontSize: 64,
  color: "#ffffff",
  x: 0.5,
  y: 0.82,
  lineHeight: 1.15,
  opacity: 1,
  align: "center",
  ratio: "1:1",
  imageData: null,
  imageName: "",
  imageX: 0.5,
  imageY: 0.5,
  imageScale: 1,
  brushStrokes: [],
  stickers: [],
};

const makeTemplate = (
  name: string,
  overrides: Partial<EditorState> & { isDefault?: boolean } = {},
): Template => ({
  ...initialState,
  ...overrides,
  id: uid(),
  name,
  createdAt: now(),
  updatedAt: now(), 
});

function validateTemplate(value: unknown): value is Template {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const required = [
    "id",
    "name",
    "text",
    "fontSize",
    "color",
    "x",
    "y",
    "ratio",
    "createdAt",
    "updatedAt",
  ];
  if (!required.every((k) => k in v)) return false;
  if (typeof v.id !== "string" || !v.id.trim()) return false;
  if (typeof v.name !== "string" || !v.name.trim()) return false;
  if (typeof v.text !== "string") return false;
  if (typeof v.fontSize !== "number" || v.fontSize < 8 || v.fontSize > 240)
    return false;
  if (typeof v.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(v.color))
    return false;
  if (typeof v.x !== "number" || v.x < 0 || v.x > 1) return false;
  if (typeof v.ratio !== "string" || !["1:1", "4:5", "9:16"].includes(v.ratio))
    return false;
  if (!Array.isArray(v.brushStrokes) || !Array.isArray(v.stickers))
    return false;
  return true;
}

function loadTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || JSON.parse(raw).length === 0) {
      const defaults = [
        makeTemplate("MORNING CARD", {
          text: "좋은 아침!\n오늘도 시작해보자.",
          ratio: "1:1",
          fontSize: 54,
          imageData: "/pixel-edit-studio/templates/cat.jpg",
          isDefault: true,
        }),
        makeTemplate("SOCIAL STORY", {
          text: "KEEP GOING",
          ratio: "9:16",
          fontSize: 58,
          y: 0.78,
          imageData: "/pixel-edit-studio/templates/chicken.png",
          isDefault: true,
        }),
        makeTemplate("PHOTO CARD", {
          text: "오늘의 한 장",
          ratio: "4:5",
          fontSize: 62,
          y: 0.84,
          imageData: "/pixel-edit-studio/templates/park.jpg",
          isDefault: true,
        }),
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every(validateTemplate)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function coverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  imageX = 0.5,
  imageY = 0.5,
  imageScale = 1,
) {
  const scale =
    Math.max(w / img.naturalWidth, h / img.naturalHeight) * imageScale;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const left = imageX * w - dw / 2;
  const top = imageY * h - dh / 2;
  ctx.drawImage(img, left, top, dw, dh);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph === "") {
      lines.push("");
      continue;
    }
    let line = "";
    for (const char of Array.from(paragraph)) {
      const test = line + char;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = char;
      } else line = test;
    }
    lines.push(line);
  }
  return lines;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    kind: "text" | "sticker" | "image";
    id?: string;
    ox: number;
    oy: number;
  } | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [state, setState] = useState<EditorState>(initialState);
  const [templates, setTemplates] = useState<Template[]>(loadTemplates);
  const [tool, setTool] = useState<Tool>("select");
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [brushColor, setBrushColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(8);
  const [message, setMessage] = useState("");
  const [zoom, setZoom] = useState(1);

  const dims = useMemo(() => {
    const [rw, rh] = RATIOS[state.ratio];
    const maxW = 900,
      maxH = 900;
    const scale = Math.min(maxW / rw, maxH / rh);
    return { w: Math.round(rw * scale), h: Math.round(rh * scale) };
  }, [state.ratio]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = dims.w;
    canvas.height = dims.h;
    renderCanvas();
  }, [state, dims, zoom]);

  function renderCanvas(target = canvasRef.current, background = false) {
    if (!target) return;
    const ctx = target.getContext("2d");
    if (!ctx) return;
    const w = target.width,
      h = target.height;
    ctx.clearRect(0, 0, w, h);
    if (background) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = "#ece8df";
      ctx.fillRect(0, 0, w, h);
    }

    if (state.imageData && imageRef.current)
      coverImage(
        ctx,
        imageRef.current,
        w,
        h,
        state.imageX,
        state.imageY,
        state.imageScale,
      );

    for (const stroke of state.brushStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.save();
      ctx.globalAlpha = stroke.opacity;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size * (w / 900);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      stroke.points.forEach((p, i) =>
        i === 0 ? ctx.moveTo(p.x * w, p.y * h) : ctx.lineTo(p.x * w, p.y * h),
      );
      ctx.stroke();
      ctx.restore();
    }

    for (const sticker of state.stickers) {
      ctx.save();
      ctx.translate(sticker.x * w, sticker.y * h);
      ctx.rotate((sticker.rotation * Math.PI) / 180);
      const px = sticker.size * (w / 900);
      ctx.font = `${px}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sticker.emoji, 0, 0);
      ctx.restore();
    }

    if (state.text) {
      ctx.save();
      const font = `800 ${state.fontSize * (w / 900)}px "Pretendard", "Noto Sans KR", Arial, sans-serif`;
      ctx.font = font;
      ctx.fillStyle = state.color;
      ctx.globalAlpha = state.opacity;
      ctx.textAlign = state.align;
      ctx.textBaseline = "middle";
      ctx.lineWidth = Math.max(2, state.fontSize * 0.06 * (w / 900));
      ctx.strokeStyle = "rgba(0,0,0,.28)";
      const maxWidth = w * 0.84;
      const lines = wrapText(ctx, state.text, maxWidth);
      const linePx = state.fontSize * (w / 900) * state.lineHeight;
      const startY = state.y * h - ((lines.length - 1) * linePx) / 2;
      for (let i = 0; i < lines.length; i++) {
        const y = startY + i * linePx;
        ctx.strokeText(lines[i], state.x * w, y, maxWidth);
        ctx.fillText(lines[i], state.x * w, y, maxWidth);
      }
      ctx.restore();
    }
  }

  useEffect(() => {
    if (!state.imageData) {
      imageRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      renderCanvas();
    };
    img.src = state.imageData;
    imageRef.current = img;
  }, [state.imageData]);

  function update<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function handleImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const validMime = ["image/png", "image/jpeg"].includes(file.type);
    const validExt = /\.(png|jpe?g)$/i.test(file.name);
    if (!validMime || !validExt) {
      setMessage(
        "PNG 또는 JPEG 파일만 사용할 수 있어요. 기존 편집 내용은 유지됩니다.",
      );
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setMessage("이미지가 너무 큽니다. 25MB 이하의 PNG/JPEG를 사용해주세요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setState((s) => ({
        ...s,
        imageData: String(reader.result),
        imageName: file.name,
      }));
      setMessage("이미지를 불러왔어요.");
    };
    reader.onerror = () =>
      setMessage("이미지를 읽지 못했습니다. 기존 작업은 유지됩니다.");
    reader.readAsDataURL(file);
  }

  function canvasPoint(e: PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  }

  function onPointerDown(e: PointerEvent<HTMLCanvasElement>) {
    const p = canvasPoint(e);
    if (tool === "brush") {
      e.currentTarget.setPointerCapture(e.pointerId);
      const stroke: BrushStroke = {
        id: uid(),
        points: [p],
        color: brushColor,
        size: brushSize,
        opacity: 1,
      };
      setState((s) => ({ ...s, brushStrokes: [...s.brushStrokes, stroke] }));
      return;
    }
    if (tool === "sticker") return;
    const hit = [...state.stickers]
      .reverse()
      .find((st) => Math.hypot(st.x - p.x, st.y - p.y) < 0.09);
    const textHit =
      state.text && Math.hypot(state.x - p.x, state.y - p.y) < 0.16;
    if (hit) {
      setSelectedSticker(hit.id);
      dragRef.current = {
        kind: "sticker",
        id: hit.id,
        ox: p.x - hit.x,
        oy: p.y - hit.y,
      };
    } else if (textHit) {
      setSelectedSticker(null);
      dragRef.current = { kind: "text", ox: p.x - state.x, oy: p.y - state.y };
    } else if (state.imageData) {
      setSelectedSticker(null);
      dragRef.current = {
        kind: "image",
        ox: p.x - state.imageX,
        oy: p.y - state.imageY,
      };
    }
  }

  function onPointerMove(e: PointerEvent<HTMLCanvasElement>) {
    const p = canvasPoint(e);
    if (tool === "brush" && e.currentTarget.hasPointerCapture(e.pointerId)) {
      setState((s) => {
        const strokes = [...s.brushStrokes];
        const last = strokes[strokes.length - 1];
        if (!last) return s;
        strokes[strokes.length - 1] = { ...last, points: [...last.points, p] };
        return { ...s, brushStrokes: strokes };
      });
      return;
    }
    const drag = dragRef.current;
    if (!drag || tool !== "select") return;
    if (drag.kind === "text") {
      setState((s) => ({
        ...s,
        x: Math.max(0, Math.min(1, p.x - drag.ox)),
        y: Math.max(0, Math.min(1, p.y - drag.oy)),
      }));
    } else if (drag.kind === "sticker" && drag.id) {
      setState((s) => ({
        ...s,
        stickers: s.stickers.map((st) =>
          st.id === drag.id
            ? {
                ...st,
                x: Math.max(0, Math.min(1, p.x - drag.ox)),
                y: Math.max(0, Math.min(1, p.y - drag.oy)),
              }
            : st,
        ),
      }));
    } else if (drag.kind === "image") {
      setState((s) => ({
        ...s,
        imageX: Math.max(0, Math.min(1, p.x - drag.ox)),
        imageY: Math.max(0, Math.min(1, p.y - drag.oy)),
      }));
    }
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function addSticker(emoji: string) {
    const sticker: Sticker = {
      id: uid(),
      emoji,
      x: 0.5,
      y: 0.5,
      size: 88,
      rotation: 0,
    };
    setState((s) => ({ ...s, stickers: [...s.stickers, sticker] }));
    setTool("select");
    setSelectedSticker(sticker.id);
  }

  function saveTemplate() {
    const name = window.prompt(
      "템플릿 이름을 입력하세요.",
      `MY TEMPLATE ${templates.length + 1}`,
    );
    if (!name?.trim()) return;
    const template: Template = {
      ...state,
      name: name.trim(),
      id: uid(),
      createdAt: now(),
      updatedAt: now(),
    };
    try {
      const next = [template, ...templates];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setTemplates(next);
      setMessage("템플릿을 저장했어요.");
    } catch {
      setMessage(
        "저장 공간이 부족합니다. 이미지가 큰 경우 이미지 없이 템플릿을 저장해보세요.",
      );
    }
  }

  function loadTemplate(t: Template) {
    setState({
      text: t.text,
      fontSize: t.fontSize,
      color: t.color,
      x: t.x,
      y: t.y,
      lineHeight: t.lineHeight ?? 1.15,
      opacity: t.opacity ?? 1,
      align: t.align ?? "center",
      ratio: t.ratio,
      imageData: t.imageData ?? null,
      imageName: t.imageName ?? "",
      imageX: t.imageX ?? 0.5,
      imageY: t.imageY ?? 0.5,
      imageScale: t.imageScale ?? 1,
      brushStrokes: t.brushStrokes ?? [],
      stickers: t.stickers ?? [],
    });

    setMessage(`"${t.name}" 템플릿을 불러왔어요.`);
  }

  function editTemplate(t: Template) {
    const name = window.prompt("템플릿 이름을 수정하세요.", t.name);
    if (!name?.trim()) return;
    const updated = { ...t, ...state, name: name.trim(), updatedAt: now() };
    const next = templates.map((item) => (item.id === t.id ? updated : item));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setTemplates(next);
    setMessage("템플릿을 수정했어요.");
  }

  function deleteTemplate(id: string) {
    const target = templates.find((t) => t.id === id);
    if (target?.isDefault) {return;}
    const next = templates.filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setTemplates(next);    
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(templates, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, "pixel-edit-templates.json");
    setMessage("JSON을 내보냈어요.");
  }

  function importJson(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (
          !Array.isArray(parsed) ||
          parsed.length < 1 ||
          !parsed.every(validateTemplate)
        )
          throw new Error("invalid");
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        setTemplates(parsed);
        setMessage(`${parsed.length}개의 템플릿을 복원했어요.`);
      } catch {
        setMessage(
          "JSON이 손상되었거나 필수 항목/값이 올바르지 않습니다. 기존 템플릿은 유지됩니다.",
        );
      }
    };
    reader.onerror = () =>
      setMessage("JSON 파일을 읽지 못했습니다. 기존 템플릿은 유지됩니다.");
    reader.readAsText(file);
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function download(format: "png" | "jpeg") {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const out = document.createElement("canvas");
    out.width = dims.w;
    out.height = dims.h;
    renderCanvas(out, format === "jpeg");
    const blob = await new Promise<Blob | null>((resolve) =>
      out.toBlob(resolve, format === "jpeg" ? "image/jpeg" : "image/png", 0.92),
    );
    if (blob)
      downloadBlob(
        blob,
        `pixel-edit-${state.ratio.replace(":", "x")}.${format}`,
      );
    setMessage(`${format.toUpperCase()} 파일을 만들었어요.`);
  }

  const selected = state.stickers.find((s) => s.id === selectedSticker);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">PIXEL EDIT STUDIO</div>
        <div className="top-actions">
          <span className="status-dot" /> 브라우저 편집기
          <button className="download-btn" onClick={() => download("png")}>
            PNG 다운로드
          </button>
        </div>
      </header>

      <main className="bento">
        <aside className="left-stack">
          <section className="card">
            <div className="card-head">
              <span>01 / 이미지</span>
              <span className="muted">{state.imageName || "이미지 없음"}</span>
            </div>
            <label className="upload-box">
              <span className="upload-icon">＋</span>
              <strong>이미지 업로드</strong>
              <small>PNG / JPEG · 최대 25MB</small>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleImage}
              />
            </label>
          </section>

          {state.imageData && (
            <section className="card image-controls">
              <div className="card-head">
                <span>이미지 위치</span>
                <span className="muted">캔버스에서 드래그</span>
              </div>
              <div className="control-grid">
                <label>
                  가로 위치{" "}
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={state.imageX}
                    onChange={(e) => update("imageX", Number(e.target.value))}
                  />
                </label>
                <label>
                  세로 위치{" "}
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={state.imageY}
                    onChange={(e) => update("imageY", Number(e.target.value))}
                  />
                </label>
                <label>
                  확대{" "}
                  <input
                    type="range"
                    min="1"
                    max="2"
                    step="0.01"
                    value={state.imageScale}
                    onChange={(e) =>
                      update("imageScale", Number(e.target.value))
                    }
                  />
                </label>
                <button
                  className="ghost"
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      imageX: 0.5,
                      imageY: 0.5,
                      imageScale: 1,
                    }))
                  }
                >
                  사진 중앙 맞추기
                </button>
              </div>
            </section>
          )}

          <section className="card">
            <div className="card-head">
              <span>02 / 문구</span>
              <span className="muted">캔버스에서 드래그</span>
            </div>
            <textarea
              value={state.text}
              onChange={(e) => update("text", e.target.value)}
              placeholder="문구를 입력하세요."
            />
            <div className="control-grid">
              <label>
                크기{" "}
                <input
                  type="range"
                  min="8"
                  max="180"
                  value={state.fontSize}
                  onChange={(e) => update("fontSize", Number(e.target.value))}
                />
                <b>{state.fontSize}</b>
              </label>
              <label>
                색상{" "}
                <input
                  className="color"
                  type="color"
                  value={state.color}
                  onChange={(e) => update("color", e.target.value)}
                />
              </label>
              <label>
                줄 간격{" "}
                <input
                  type="range"
                  min="0.8"
                  max="1.8"
                  step="0.05"
                  value={state.lineHeight}
                  onChange={(e) => update("lineHeight", Number(e.target.value))}
                />
                <b>{state.lineHeight.toFixed(2)}</b>
              </label>
              <label>
                투명도{" "}
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={state.opacity}
                  onChange={(e) => update("opacity", Number(e.target.value))}
                />
                <b>{Math.round(state.opacity * 100)}%</b>
              </label>
            </div>
            <div className="segmented alignment-tools">
              <button
                className={state.align === "left" ? "active" : ""}
                onClick={() => update("align", "left")}
                aria-label="왼쪽 정렬"
                title="왼쪽 정렬"
              >
                <AlignLeftIcon />
              </button>

              <button
                className={state.align === "center" ? "active" : ""}
                onClick={() => update("align", "center")}
                aria-label="가운데 정렬"
                title="가운데 정렬"
              >
                <AlignCenterIcon />
              </button>

              <button
                className={state.align === "right" ? "active" : ""}
                onClick={() => update("align", "right")}
                aria-label="오른쪽 정렬"
                title="오른쪽 정렬"
              >
                <AlignRightIcon />
              </button>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <span>03 / 도구</span>
            </div>

            <div className="tool-row">
              <button
                className={`tool ${tool === "select" ? "active" : ""}`}
                onClick={() => setTool("select")}
                aria-label="선택 도구"
                title="선택"
              >
                <ToolMoveIcon />
              </button>

              <button
                className={`tool ${tool === "brush" ? "active" : ""}`}
                onClick={() => setTool("brush")}
                aria-label="브러시 도구"
                title="브러시"
              >
                <ToolBrushIcon />
              </button>

              <button
                className={`tool ${tool === "sticker" ? "active" : ""}`}
                onClick={() => setTool("sticker")}
                aria-label="스티커 도구"
                title="스티커"
              >
                <ToolStickerIcon />
              </button>
            </div>
            {tool === "brush" && (
              <div className="brush-controls">
                <label>
                  색상{" "}
                  <input
                    className="color"
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                  />
                </label>
                <label>
                  크기{" "}
                  <input
                    type="range"
                    min="2"
                    max="40"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                  />
                  <b>{brushSize}</b>
                </label>
                <button
                  className="ghost"
                  onClick={() => setState((s) => ({ ...s, brushStrokes: [] }))}
                >
                  브러시 지우기
                </button>
              </div>
            )}
            {tool === "sticker" && (
              <div className="sticker-grid">
                {STICKERS.map((s) => (
                  <button key={s} onClick={() => addSticker(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {selected && (
              <div className="selected-sticker">
                <div className="mini-title">선택된 스티커 {selected.emoji}</div>
                <label>
                  크기{" "}
                  <input
                    type="range"
                    min="28"
                    max="180"
                    value={selected.size}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        stickers: s.stickers.map((x) =>
                          x.id === selected.id
                            ? { ...x, size: Number(e.target.value) }
                            : x,
                        ),
                      }))
                    }
                  />
                </label>
                <label>
                  회전{" "}
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={selected.rotation}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        stickers: s.stickers.map((x) =>
                          x.id === selected.id
                            ? { ...x, rotation: Number(e.target.value) }
                            : x,
                        ),
                      }))
                    }
                  />
                </label>
                <button
                  className="danger"
                  onClick={() => {
                    setState((s) => ({
                      ...s,
                      stickers: s.stickers.filter((x) => x.id !== selected.id),
                    }));
                    setSelectedSticker(null);
                  }}
                >
                  스티커 삭제
                </button>
              </div>
            )}
          </section>
        </aside>

        <section className="canvas-card card">
          <div className="canvas-head">
            <div>
              <div className="eyebrow">캔버스 / 미리보기</div>
              <h1>새 카드를 만들어보세요.</h1>
            </div>
            <div className="ratio-tabs">
              {(Object.keys(RATIOS) as Ratio[]).map((r) => (
                <button
                  key={r}
                  className={state.ratio === r ? "active" : ""}
                  onClick={() => update("ratio", r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="canvas-stage">
            <div
              className="canvas-frame"
              style={{ transform: `scale(${zoom})` }}
            >
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
            </div>
          </div>
          <div className="canvas-foot">
            <div className="zoom">
              <button
                onClick={() =>
                  setZoom((z) => Math.max(0.75, +(z - 0.1).toFixed(2)))
                }
              >
                −
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                onClick={() =>
                  setZoom((z) => Math.min(1.25, +(z + 0.1).toFixed(2)))
                }
              >
                +
              </button>
            </div>
            <div className="download-group">
              <button onClick={() => download("png")}>PNG</button>
              <button onClick={() => download("jpeg")}>JPEG</button>
            </div>
          </div>
        </section>

        <aside className="right-stack">
          <section className="card">
            <div className="card-head">
              <span>04 / 템플릿</span>
              <span className="muted">{templates.length}개 저장</span>
            </div>
            <button className="primary" onClick={saveTemplate}>
              ＋ 현재 편집을 템플릿으로 저장
            </button>
            <div className="template-list">
              {templates.map((t) => (
                <div className="template-item" key={t.id}>
                  <div
                    className="template-thumb"
                    style={{ aspectRatio: RATIOS[t.ratio].join("/") }}
                  >
                    {t.imageData ? (
                      <img src={t.imageData} alt={`${t.name} 미리보기`} />
                    ) : (
                      <span>{t.text || "EMPTY"}</span>
                    )}
                  </div>
                  <div className="template-actions">
                    <button onClick={() => loadTemplate(t)}>불러오기</button>
                    <button onClick={() => editTemplate(t)}>수정</button>
                    <button
                      onClick={() => deleteTemplate(t.id)}
                      disabled={t.isDefault}
                    >
                      {t.isDefault ? "기본 템플릿" : "삭제"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <span>05 / JSON</span>
              <span className="muted">백업</span>
            </div>
            <div className="json-actions">
              <button className="secondary" onClick={exportJson}>
                JSON 내보내기
              </button>
              <label className="secondary">
                JSON 가져오기
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={importJson}
                />
              </label>
            </div>
            <p className="help">
              문법 → 구조 → 필수 항목 → 타입/값을 순서대로 검사한 뒤 정상
              데이터만 저장합니다.
            </p>
          </section>

          <section className="tip-card">
            <div className="tip-label">PX 팁</div>
            <strong>캔버스에서 사진·문구·스티커를 바로 드래그해보세요.</strong>
            <p>
              미리보기와 다운로드는 같은 렌더링 로직을 사용합니다. 사진을
              드래그하면 원하는 위치로 맞출 수 있어요.
            </p>
          </section>
        </aside>
      </main>

      <div className={`toast ${message ? "show" : ""}`} role="status">
        {message}
        <button onClick={() => setMessage("")}>×</button>
      </div>
    </div>
  );
}
