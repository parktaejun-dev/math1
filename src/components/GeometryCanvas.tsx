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

            // Fixed right-triangle (dimensions: 200x150)
            const svg = `
        <div style="position: relative; width: 280px; height: 220px; margin: 0 auto;">
          <svg viewBox="0 0 280 220" width="100%" height="100%" style="overflow: visible;">
            <!-- Triangle -->
            <polygon points="40,180 240,180 240,30" fill="rgba(80, 160, 255, 0.1)" stroke="currentColor" stroke-width="3" stroke-linejoin="round" />
            <!-- Right-angle marker -->
            <polyline points="220,180 220,160 240,160" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
          <!-- Absolute KaTeX Overlays -->
          <div style="position: absolute; bottom: 10px; left: 140px; transform: translateX(-50%); font-size: 1.2rem;" dangerouslySetInnerHTML={{ __html: '${latexA}' }} />
          <div style="position: absolute; right: 10px; top: 105px; transform: translateY(-50%); font-size: 1.2rem;" dangerouslySetInnerHTML={{ __html: '${latexB}' }} />
          <div style="position: absolute; left: 130px; top: 80px; transform: translate(-50%, -50%); font-size: 1.2rem; font-weight: bold; color: var(--color-primary-500, #3b82f6);" dangerouslySetInnerHTML={{ __html: '${latexC}' }} />
        </div>
      `;
            setHtmlContent(svg);
        }
        else if (geomType === 'INSCRIBED' && args.length === 2) {
            const latexInscribed = katex.renderToString(`\\angle P = ${args[0] === '?' ? '?' : args[0] + '^\\circ'}`, { throwOnError: false });
            const latexCenter = katex.renderToString(`\\angle O = ${args[1] === '?' ? '?' : args[1] + '^\\circ'}`, { throwOnError: false });

            // Fixed Circle (radius 90, center 140, 110)
            // Points: Center O(140,110), Inscribed P(140, 20), Arc points A(70, 160), B(210, 160)
            const svg = `
        <div style="position: relative; width: 280px; height: 240px; margin: 0 auto;">
          <svg viewBox="0 0 280 240" width="100%" height="100%" style="overflow: visible;">
            <!-- Circle -->
            <circle cx="140" cy="120" r="100" fill="none" stroke="currentColor" stroke-width="3" />
            <!-- Center O Dot -->
            <circle cx="140" cy="120" r="4" fill="currentColor" />
            <!-- Lines -->
            <polyline points="140,20 60,180 140,120" fill="none" stroke="#6b7280" stroke-width="2" />
            <polyline points="140,20 220,180 140,120" fill="none" stroke="#6b7280" stroke-width="2" />
            <!-- Base Arc Line (Not completely accurate geometrically, but static abstraction) -->
            <line x1="60" y1="180" x2="220" y2="180" stroke="currentColor" stroke-dasharray="4" stroke-width="2" />
            <!-- Arc markers -->
            <path d="M 130 50 A 30 30 0 0 0 150 50" fill="none" stroke="#f59e0b" stroke-width="2" />
            <path d="M 120 135 A 25 25 0 0 0 160 135" fill="none" stroke="#ef4444" stroke-width="2" />
          </svg>
          <div style="position: absolute; top: 0px; left: 140px; transform: translateX(-50%); font-size: 1.1rem; color: #f59e0b;" dangerouslySetInnerHTML={{ __html: '${latexInscribed}' }} />
          <div style="position: absolute; top: 145px; left: 140px; transform: translateX(-50%); font-size: 1.1rem; color: #ef4444;" dangerouslySetInnerHTML={{ __html: '${latexCenter}' }} />
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
