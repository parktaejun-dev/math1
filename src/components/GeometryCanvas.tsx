'use client'

import React, { useEffect, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface GeometryCanvasProps {
  latexParams: string; // From the generator e.g., "[SVG_PYTHAGORAS:3,4,?]"
}

/**
 * Parses parameters and generates fixed SVG geometries.
 * Uses container queries to scale both width and height proportionally.
 */
export default function GeometryCanvas({ latexParams }: GeometryCanvasProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [dimensions, setDimensions] = useState({ w: 280, h: 220 });

  const match = latexParams.match(/\[SVG_([A-Z_]+):(.*?)\]/);

  useEffect(() => {
    if (!match) return;

    const geomType = match[1];
    const args = match[2].split(',');

    if (geomType === 'PYTHAGORAS' && args.length === 3) {
      setDimensions({ w: 280, h: 220 });
      const latexA = katex.renderToString(args[0], { throwOnError: false });
      const latexB = katex.renderToString(args[1], { throwOnError: false });
      const latexC = katex.renderToString(args[2], { throwOnError: false });

      let a = args[0] === '?' ? 0 : parseFloat(args[0]);
      let b = args[1] === '?' ? 0 : parseFloat(args[1]);
      let c = args[2] === '?' ? 0 : parseFloat(args[2]);

      if (!a && b && c) a = Math.sqrt(c * c - b * b);
      if (!b && a && c) b = Math.sqrt(c * c - a * a);

      if (!a || !b) { a = 4; b = 3; }

      const scale = Math.min(200 / a, 150 / b);
      const renderedWidth = a * scale;
      const renderedHeight = b * scale;

      const rightX = 240;
      const rightY = 180;
      const topY = rightY - renderedHeight;
      const leftX = rightX - renderedWidth;

      const labelA_X = leftX + renderedWidth / 2;
      const labelA_Y = rightY + 10;
      const labelB_X = rightX + 10;
      const labelB_Y = rightY - renderedHeight / 2;
      const labelC_X = leftX + renderedWidth / 2 - 15;
      const labelC_Y = topY + renderedHeight / 2 - 15;

      const svg = `
          <svg viewBox="0 0 280 220" width="280" height="220" style="overflow: visible; display: block;">
            <polygon points="${leftX},${rightY} ${rightX},${rightY} ${rightX},${topY}" fill="rgba(80, 160, 255, 0.1)" stroke="currentColor" stroke-width="3" stroke-linejoin="round" />
            <polyline points="${rightX - 20},${rightY} ${rightX - 20},${rightY - 20} ${rightX},${rightY - 20}" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
          <div style="position: absolute; top: ${labelA_Y}px; left: ${labelA_X}px; transform: translateX(-50%); font-size: 1.2rem;">${latexA}</div>
          <div style="position: absolute; top: ${labelB_Y}px; left: ${labelB_X}px; transform: translateY(-50%); font-size: 1.2rem;">${latexB}</div>
          <div style="position: absolute; top: ${labelC_Y}px; left: ${labelC_X}px; transform: translate(-50%, -50%); font-size: 1.2rem; font-weight: bold; color: var(--color-primary-500, #3b82f6);">${latexC}</div>
      `;
      setHtmlContent(svg);
    }
    else if (geomType === 'INSCRIBED' && args.length === 2) {
      setDimensions({ w: 280, h: 260 });
      const latexInscribed = katex.renderToString(`\\angle P = ${args[0] === '?' ? '?' : args[0] + '^\\circ'}`, { throwOnError: false });
      const latexCenter = katex.renderToString(`\\angle O = ${args[1] === '?' ? '?' : args[1] + '^\\circ'}`, { throwOnError: false });

      const svg = `
          <svg viewBox="0 0 280 260" width="280" height="260" style="overflow: visible; display: block;">
            <circle cx="140" cy="130" r="100" fill="none" stroke="currentColor" stroke-width="3" />
            <circle cx="140" cy="130" r="4" fill="currentColor" />
            <polyline points="140,30 60,190 140,130" fill="none" stroke="#6b7280" stroke-width="2" />
            <polyline points="140,30 220,190 140,130" fill="none" stroke="#6b7280" stroke-width="2" />
            <line x1="60" y1="190" x2="220" y2="190" stroke="currentColor" stroke-dasharray="4" stroke-width="2" />
            <path d="M 130 60 A 30 30 0 0 0 150 60" fill="none" stroke="#f59e0b" stroke-width="2" />
            <path d="M 120 145 A 25 25 0 0 0 160 145" fill="none" stroke="#ef4444" stroke-width="2" />
          </svg>
          <div style="position: absolute; top: -5px; left: 140px; transform: translateX(-50%); font-size: 1.1rem; color: #1f2937; padding: 2px 6px; background: rgba(255,255,255,0.8); border-radius: 4px;">${latexInscribed}</div>
          <div style="position: absolute; top: 160px; left: 140px; transform: translateX(-50%); font-size: 1.1rem; color: #1f2937;">${latexCenter}</div>
      `;
      setHtmlContent(svg);
    }
    else {
      setHtmlContent(`<div>Invalid Geometry Definition</div>`);
    }
  }, [latexParams, match?.[1]]);

  if (!match) return null;

  // Calculate the ratio to maintain aspect ratio while scaling
  const aspectRatio = dimensions.h / dimensions.w;

  return (
    <div
      className="w-full flex justify-center items-center py-1 sm:py-2 bg-white/5 dark:bg-black/20 rounded-xl my-1 sm:my-2 select-none pointer-events-none"
      style={{ containerType: 'inline-size' } as any}
    >
      <div 
        className="relative" 
        style={{ 
          width: `min(100cqw, ${dimensions.w}px)`, 
          height: `calc(min(100cqw, ${dimensions.w}px) * ${aspectRatio})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        } as any}
      >
        <div 
          style={{ 
            width: `${dimensions.w}px`, 
            height: `${dimensions.h}px`,
            transform: `scale(calc(min(100cqw, ${dimensions.w}px) / ${dimensions.w}))`,
            transformOrigin: 'center center',
            position: 'absolute'
          } as any}
          dangerouslySetInnerHTML={{ __html: htmlContent }} 
        />
      </div>
    </div>
  );
}
