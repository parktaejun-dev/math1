'use client'

import React, { useEffect, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface GeometryCanvasProps {
  latexParams: string; // From the generator e.g., "[SVG_PYTHAGORAS:3,4,?]"
}

/**
 * Parses parameters and generates fixed SVG geometries.
 * The SVG shapes NEVER resize or animate to prevent cognitive stalls.
 * Only the text overlaid using KaTeX changes.
 */
export default function GeometryCanvas({ latexParams }: GeometryCanvasProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');

  // Ex: "[SVG_PYTHAGORAS:3,4,?]" -> type: "PYTHAGORAS", args: ["3", "4", "?"]
  const match = latexParams.match(/\[SVG_([A-Z_]+):(.*?)\]/);

  useEffect(() => {
    if (!match) return;

    const geomType = match[1];
    const args = match[2].split(',');

    if (geomType === 'PYTHAGORAS' && args.length === 3) {
      const latexA = katex.renderToString(args[0], { throwOnError: false });
      const latexB = katex.renderToString(args[1], { throwOnError: false });
      const latexC = katex.renderToString(args[2], { throwOnError: false });

      let a = args[0] === '?' ? 0 : parseFloat(args[0]);
      let b = args[1] === '?' ? 0 : parseFloat(args[1]);
      let c = args[2] === '?' ? 0 : parseFloat(args[2]);

      if (!a && b && c) a = Math.sqrt(c * c - b * b);
      if (!b && a && c) b = Math.sqrt(c * c - a * a);

      // Fallback proportions if parsing fails
      if (!a || !b) {
        a = 4;
        b = 3;
      }

      // Max dimensions: width 200, height 150
      const scale = Math.min(200 / a, 150 / b);
      const renderedWidth = a * scale;
      const renderedHeight = b * scale;

      const rightX = 240;
      const rightY = 180;
      const topY = rightY - renderedHeight;
      const leftX = rightX - renderedWidth;

      // Position labels dynamically
      const labelA_X = leftX + renderedWidth / 2;
      const labelA_Y = rightY + 10;

      const labelB_X = rightX + 10;
      const labelB_Y = rightY - renderedHeight / 2;

      const labelC_X = leftX + renderedWidth / 2 - 15;
      const labelC_Y = topY + renderedHeight / 2 - 15;

      const svg = `
        <div style="position: relative; width: 280px; height: 220px; margin: 0 auto;">
          <svg viewBox="0 0 280 220" width="100%" height="100%" style="overflow: visible;">
            <!-- Triangle -->
            <polygon points="${leftX},${rightY} ${rightX},${rightY} ${rightX},${topY}" fill="rgba(80, 160, 255, 0.1)" stroke="currentColor" stroke-width="3" stroke-linejoin="round" />
            <!-- Right-angle marker -->
            <polyline points="${rightX - 20},${rightY} ${rightX - 20},${rightY - 20} ${rightX},${rightY - 20}" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
          <!-- Absolute KaTeX Overlays -->
          <div style="position: absolute; top: ${labelA_Y}px; left: ${labelA_X}px; transform: translateX(-50%); font-size: 1.2rem;">${latexA}</div>
          <div style="position: absolute; top: ${labelB_Y}px; left: ${labelB_X}px; transform: translateY(-50%); font-size: 1.2rem;">${latexB}</div>
          <div style="position: absolute; top: ${labelC_Y}px; left: ${labelC_X}px; transform: translate(-50%, -50%); font-size: 1.2rem; font-weight: bold; color: var(--color-primary-500, #3b82f6);">${latexC}</div>
        </div>
      `;
      setHtmlContent(svg);
    }
    else if (geomType === 'INSCRIBED' && args.length === 2) {
      const latexInscribed = katex.renderToString(`\\angle P = ${args[0] === '?' ? '?' : args[0] + '^\\circ'}`, { throwOnError: false });
      const latexCenter = katex.renderToString(`\\angle O = ${args[1] === '?' ? '?' : args[1] + '^\\circ'}`, { throwOnError: false });

      // Fixed Circle (radius 100, center 140, 130 to allow more top space)
      // Points: Center O(140,130), Inscribed P(140, 30), Arc points A(70, 190), B(210, 190)
      const svg = `
        <div style="position: relative; width: 280px; height: 260px; margin: 0 auto;">
          <svg viewBox="0 0 280 260" width="100%" height="100%" style="overflow: visible;">
            <!-- Circle -->
            <circle cx="140" cy="130" r="100" fill="none" stroke="currentColor" stroke-width="3" />
            <!-- Center O Dot -->
            <circle cx="140" cy="130" r="4" fill="currentColor" />
            <!-- Lines -->
            <polyline points="140,30 60,190 140,130" fill="none" stroke="#6b7280" stroke-width="2" />
            <polyline points="140,30 220,190 140,130" fill="none" stroke="#6b7280" stroke-width="2" />
            <!-- Base Arc Line (static abstraction) -->
            <line x1="60" y1="190" x2="220" y2="190" stroke="currentColor" stroke-dasharray="4" stroke-width="2" />
            <!-- Arc markers -->
            <path d="M 130 60 A 30 30 0 0 0 150 60" fill="none" stroke="#f59e0b" stroke-width="2" />
            <path d="M 120 145 A 25 25 0 0 0 160 145" fill="none" stroke="#ef4444" stroke-width="2" />
          </svg>
          <div style="position: absolute; top: -5px; left: 140px; transform: translateX(-50%); font-size: 1.1rem; color: #1f2937; padding: 2px 6px; background: rgba(255,255,255,0.8); border-radius: 4px;">${latexInscribed}</div>
          <div style="position: absolute; top: 160px; left: 140px; transform: translateX(-50%); font-size: 1.1rem; color: #1f2937;">${latexCenter}</div>
        </div>
      `;
      setHtmlContent(svg);
    }
    else {
      // Fallback if parsing fails
      setHtmlContent(`<div>Invalid Geometry Definition</div>`);
    }
  }, [latexParams]);

  if (!match) return null;

  return (
    <div
      className="flex justify-center items-center p-4 bg-white/5 dark:bg-black/20 rounded-xl my-4 select-none pointer-events-none"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
