/**
 * useCanvas.js
 * Relay canvas — strokes accumulate across all player turns within a round.
 * Canvas only clears when server emits "canvas_clear" (new round).
 */

import { useEffect, useRef, useCallback } from "react";
import { getSocket } from "./useSocket";

const EMIT_INTERVAL_MS = 16;
const POINT_MIN_DISTANCE = 2;

export function useCanvas(canvasRef, options = {}) {
  const { isActive = false, color = "#f0f0ff", lineWidth = 4 } = options;

  const isDrawing = useRef(false);
  const lastPoint = useRef(null);
  const pointBuffer = useRef([]);
  const emitTimer = useRef(null);
  const currentPathId = useRef(null);
  const allPaths = useRef([]); // full relay canvas — never cleared between turns

  const drawSegment = useCallback((ctx, from, to, strokeColor, width) => {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }, []);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const path of allPaths.current) {
      for (let i = 1; i < path.points.length; i++) {
        drawSegment(ctx, path.points[i - 1], path.points[i], path.color, path.lineWidth);
      }
    }
  }, [canvasRef, drawSegment]);

  // Full clear — called on new round
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    allPaths.current = [];
    currentPathId.current = null;
  }, [canvasRef]);

  // Handle incoming stroke from server (relay — add to existing canvas)
  const handleRemoteStroke = useCallback((strokeData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { points, color: strokeColor, lineWidth: width, pathId } = strokeData;

    let pathRecord = allPaths.current.find((p) => p.pathId === pathId);
    if (!pathRecord) {
      pathRecord = { pathId, color: strokeColor, lineWidth: width, points: [] };
      allPaths.current.push(pathRecord);
    }

    const prevLength = pathRecord.points.length;
    pathRecord.points.push(...points);
    for (let i = Math.max(1, prevLength); i < pathRecord.points.length; i++) {
      drawSegment(ctx, pathRecord.points[i - 1], pathRecord.points[i], strokeColor, width);
    }
  }, [canvasRef, drawSegment]);

  // Listen for remote strokes and canvas_clear
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on("stroke_update", handleRemoteStroke);
    socket.on("canvas_clear", clearCanvas);
    return () => {
      socket.off("stroke_update", handleRemoteStroke);
      socket.off("canvas_clear", clearCanvas);
    };
  }, [handleRemoteStroke, clearCanvas]);

  const flushBuffer = useCallback(() => {
    const socket = getSocket();
    if (!socket || pointBuffer.current.length === 0) return;
    socket.emit("drawing_stroke", {
      pathId: currentPathId.current,
      points: [...pointBuffer.current],
      color,
      lineWidth,
    });
    pointBuffer.current = [];
  }, [color, lineWidth]);

  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const onPointerDown = useCallback((e) => {
    if (!isActive) return;
    e.preventDefault();
    isDrawing.current = true;
    const point = getCanvasPoint(e);
    lastPoint.current = point;
    currentPathId.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    emitTimer.current = setInterval(flushBuffer, EMIT_INTERVAL_MS);
  }, [isActive, flushBuffer]);

  const onPointerMove = useCallback((e) => {
    if (!isActive || !isDrawing.current) return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    const last = lastPoint.current;
    const dx = point.x - last.x, dy = point.y - last.y;
    if (dx * dx + dy * dy < POINT_MIN_DISTANCE * POINT_MIN_DISTANCE) return;

    // Draw locally
    const ctx = canvasRef.current.getContext("2d");
    drawSegment(ctx, last, point, color, lineWidth);

    lastPoint.current = point;
    pointBuffer.current.push(point);
  }, [isActive, canvasRef, drawSegment, color, lineWidth]);

  const onPointerUp = useCallback((e) => {
    if (!isActive || !isDrawing.current) return;
    isDrawing.current = false;
    clearInterval(emitTimer.current);
    flushBuffer();
    const socket = getSocket();
    if (socket) socket.emit("drawing_end");
  }, [isActive, flushBuffer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerUp);
    };
  }, [onPointerDown, onPointerMove, onPointerUp]);

  // Resize handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      redrawAll();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [canvasRef, redrawAll]);

  return { clearCanvas, redrawAll };
}

export function useReplayCanvas(canvasRef, roundStrokes) {
  const animationRef = useRef(null);

  const playReplay = useCallback((onComplete) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!roundStrokes?.length) { onComplete?.(); return; }

    // Reconstruct path segments from roundStrokes
    const pathMap = {};
    const timeline = [];
    for (const stroke of roundStrokes) {
      const { pathId, points, color, lineWidth } = stroke;
      if (!pathMap[pathId]) {
        pathMap[pathId] = { color, lineWidth, points: [] };
      }
      const prev = pathMap[pathId].points;
      for (const point of points) {
        timeline.push({ point, prevPoint: prev.length > 0 ? prev[prev.length - 1] : null,
                        color, lineWidth: lineWidth || 4 });
        prev.push(point);
      }
    }

    let i = 0;
    const POINTS_PER_FRAME = 4;
    const step = () => {
      for (let j = 0; j < POINTS_PER_FRAME && i < timeline.length; j++, i++) {
        const { point, prevPoint, color, lineWidth } = timeline[i];
        if (prevPoint) {
          ctx.beginPath();
          ctx.moveTo(prevPoint.x, prevPoint.y);
          ctx.lineTo(point.x, point.y);
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();
        }
      }
      if (i < timeline.length) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        onComplete?.();
      }
    };
    animationRef.current = requestAnimationFrame(step);
  }, [canvasRef, roundStrokes]);

  useEffect(() => () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); }, []);

  return { playReplay };
}
