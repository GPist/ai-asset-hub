"use client";
import { useEffect, useRef } from "react";

interface DiffViewerProps {
  diff: string;
}

export function DiffViewer({ diff }: DiffViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !diff) return;

    // Dynamically import diff2html to avoid SSR issues
    import("diff2html").then(({ html: diff2htmlHtml }) => {
      if (!containerRef.current) return;
      containerRef.current.innerHTML = diff2htmlHtml(diff, {
        drawFileList: false,
        matching: "lines",
        outputFormat: "side-by-side",
      });
    });
  }, [diff]);

  if (!diff) return null;

  return (
    <div className="d2h-wrapper overflow-x-auto">
      <div ref={containerRef} />
    </div>
  );
}
