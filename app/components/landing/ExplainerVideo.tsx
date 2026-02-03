"use client";

import React, { useEffect, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";

// Animated background with flowing gradients
function AnimatedBackground() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  return (
    <AbsoluteFill
      style={{
        background: `
          radial-gradient(circle at ${20 + progress * 10}% ${30 + Math.sin(progress * Math.PI * 2) * 10}%, rgba(56,189,248,0.25) 0%, transparent 50%),
          radial-gradient(circle at ${80 - progress * 10}% ${60 + Math.cos(progress * Math.PI * 2) * 10}%, rgba(139,92,246,0.2) 0%, transparent 50%),
          radial-gradient(circle at 50% 80%, rgba(16,185,129,0.15) 0%, transparent 40%),
          linear-gradient(180deg, #0a0b10 0%, #05060a 100%)
        `,
      }}
    />
  );
}

// Floating particles
function Particles() {
  const frame = useCurrentFrame();
  const particles = Array.from({ length: 20 }, (_, i) => ({
    x: (i * 47) % 100,
    y: (i * 31) % 100,
    size: 2 + (i % 3),
    speed: 0.5 + (i % 5) * 0.2,
  }));

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${((p.y + frame * p.speed * 0.1) % 120) - 10}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background:
              i % 2 === 0 ? "rgba(56,189,248,0.5)" : "rgba(139,92,246,0.5)",
            boxShadow: `0 0 ${p.size * 2}px ${i % 2 === 0 ? "rgba(56,189,248,0.3)" : "rgba(139,92,246,0.3)"}`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
}

// Scene 1: Paste URL
function Scene1() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleEnter = spring({ frame, fps, config: { damping: 15, mass: 0.8 } });
  const urlEnter = spring({
    frame: Math.max(0, frame - 15),
    fps,
    config: { damping: 15 },
  });
  const cursorBlink = Math.floor(frame / 15) % 2 === 0;
  const typingProgress = Math.min(1, (frame - 20) / 40);

  const url = "github.com/facebook/react";
  const typedUrl = url.slice(0, Math.floor(typingProgress * url.length));

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: "white",
            marginBottom: 40,
            opacity: titleEnter,
            transform: `translateY(${interpolate(titleEnter, [0, 1], [20, 0])}px)`,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Paste any repo
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "20px 32px",
            borderRadius: 16,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            opacity: urlEnter,
            transform: `translateY(${interpolate(urlEnter, [0, 1], [20, 0])}px)`,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 12px rgba(16,185,129,0.6)",
            }}
          />
          <span
            style={{
              fontSize: 22,
              fontFamily: "monospace",
              color: "rgba(255,255,255,0.9)",
              letterSpacing: "-0.02em",
            }}
          >
            {typedUrl}
            {cursorBlink && frame > 20 && frame < 65 && (
              <span style={{ color: "#38bdf8" }}>|</span>
            )}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// Scene 2: AI analyzes
function Scene2() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 15 } });

  const scanLines = Array.from({ length: 8 }, (_, i) => ({
    delay: i * 6,
    width: 60 + (i % 3) * 20,
  }));

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: "white",
            marginBottom: 50,
            opacity: enter,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          AI scans the codebase
        </div>
        <div
          style={{
            position: "relative",
            width: 400,
            padding: "24px 32px",
            borderRadius: 20,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            overflow: "hidden",
          }}
        >
          {/* Scanning effect */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background:
                "linear-gradient(90deg, transparent, #38bdf8, transparent)",
              transform: `translateY(${(frame * 2) % 120}px)`,
              opacity: 0.8,
            }}
          />

          {/* File lines */}
          {scanLines.map((line, i) => {
            const lineEnter = spring({
              frame: Math.max(0, frame - line.delay),
              fps,
              config: { damping: 20 },
            });
            return (
              <div
                key={i}
                style={{
                  height: 8,
                  width: `${line.width}%`,
                  borderRadius: 4,
                  marginBottom: 8,
                  background:
                    i === Math.floor((frame / 8) % scanLines.length)
                      ? `linear-gradient(90deg, #38bdf8, #a78bfa)`
                      : "rgba(255,255,255,0.1)",
                  opacity: lineEnter,
                  transform: `translateX(${interpolate(lineEnter, [0, 1], [-20, 0])}px)`,
                  transition: "background 0.2s",
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 16,
            color: "rgba(255,255,255,0.5)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {Math.floor(frame * 3)} files analyzed...
        </div>
      </div>
    </AbsoluteFill>
  );
}

// Scene 3: Roadmap generated
function Scene3() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleEnter = spring({ frame, fps, config: { damping: 15 } });

  const days = [
    { label: "Day 1", color: "#38bdf8" },
    { label: "Day 2", color: "#a78bfa" },
    { label: "Day 3", color: "#10b981" },
    { label: "Day 4", color: "#f59e0b" },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: "white",
            marginBottom: 50,
            opacity: titleEnter,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Your roadmap is ready
        </div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          {days.map((day, i) => {
            const cardEnter = spring({
              frame: Math.max(0, frame - i * 10),
              fps,
              config: { damping: 15, mass: 0.8 },
            });
            return (
              <div
                key={i}
                style={{
                  width: 100,
                  padding: "20px 16px",
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${day.color}40`,
                  opacity: cardEnter,
                  transform: `translateY(${interpolate(cardEnter, [0, 1], [30, 0])}px) scale(${interpolate(cardEnter, [0, 1], [0.8, 1])})`,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    margin: "0 auto 12px",
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${day.color}, ${day.color}80)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "white",
                    boxShadow: `0 8px 24px ${day.color}40`,
                  }}
                >
                  {i + 1}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "white",
                    fontWeight: 600,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {day.label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.5)",
                    marginTop: 4,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  3 concepts
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// Scene 4: Learn by doing
function Scene4() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleEnter = spring({ frame, fps, config: { damping: 15 } });
  const ideEnter = spring({
    frame: Math.max(0, frame - 20),
    fps,
    config: { damping: 15 },
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: "white",
            marginBottom: 50,
            opacity: titleEnter,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Code. Run. Verify.
        </div>

        {/* Mini IDE mockup */}
        <div
          style={{
            width: 500,
            borderRadius: 16,
            overflow: "hidden",
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.1)",
            opacity: ideEnter,
            transform: `scale(${interpolate(ideEnter, [0, 1], [0.9, 1])})`,
          }}
        >
          {/* Title bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 16px",
              background: "rgba(255,255,255,0.03)",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#ef4444",
              }}
            />
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#f59e0b",
              }}
            />
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#10b981",
              }}
            />
            <span
              style={{
                marginLeft: 12,
                fontSize: 12,
                color: "rgba(255,255,255,0.5)",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              workspace
            </span>
          </div>

          {/* Content */}
          <div style={{ display: "flex", height: 160 }}>
            {/* File tree */}
            <div
              style={{
                width: 120,
                padding: 12,
                borderRight: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {["src/", "  App.tsx", "  index.ts", "package.json"].map(
                (file, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 11,
                      color: file.includes("App")
                        ? "#38bdf8"
                        : "rgba(255,255,255,0.5)",
                      padding: "3px 0",
                      fontFamily: "monospace",
                    }}
                  >
                    {file}
                  </div>
                )
              )}
            </div>

            {/* Editor */}
            <div style={{ flex: 1, padding: 12 }}>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  lineHeight: 1.6,
                }}
              >
                <span style={{ color: "#c792ea" }}>function</span>{" "}
                <span style={{ color: "#82aaff" }}>App</span>
                <span style={{ color: "rgba(255,255,255,0.7)" }}>() {"{"}</span>
                <br />
                <span style={{ color: "rgba(255,255,255,0.7)" }}> </span>
                <span style={{ color: "#c792ea" }}>return</span>
                <span style={{ color: "rgba(255,255,255,0.7)" }}> (</span>
                <br />
                <span style={{ color: "#89ddff" }}> {"<div>"}</span>
                <span style={{ color: "#c3e88d" }}>Hello</span>
                <span style={{ color: "#89ddff" }}>{"</div>"}</span>
                <br />
                <span style={{ color: "rgba(255,255,255,0.7)" }}> )</span>
                <br />
                <span style={{ color: "rgba(255,255,255,0.7)" }}>{"}"}</span>
              </div>
            </div>
          </div>

          {/* Terminal */}
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(0,0,0,0.3)",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              fontFamily: "monospace",
              fontSize: 11,
            }}
          >
            <span style={{ color: "#10b981" }}>$</span>
            <span style={{ color: "rgba(255,255,255,0.7)" }}> npm run dev</span>
            <span style={{ color: "#10b981", marginLeft: 8 }}>✓ Ready</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// Main composition
export function GitGuideExplainerComposition() {
  return (
    <AbsoluteFill>
      <AnimatedBackground />
      <Particles />

      <Sequence from={0} durationInFrames={75}>
        <Scene1 />
      </Sequence>

      <Sequence from={75} durationInFrames={75}>
        <Scene2 />
      </Sequence>

      <Sequence from={150} durationInFrames={75}>
        <Scene3 />
      </Sequence>

      <Sequence from={225} durationInFrames={75}>
        <Scene4 />
      </Sequence>
    </AbsoluteFill>
  );
}

export default function ExplainerVideo() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<PlayerRef | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
        setInView(visible);
      },
      { threshold: [0, 0.35, 1] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (inView) {
      player.play();
    } else {
      player.pause();
    }
  }, [inView]);

  return (
    <div
      ref={containerRef}
      className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden"
    >
      <Player
        ref={playerRef}
        component={GitGuideExplainerComposition}
        durationInFrames={300}
        fps={30}
        compositionWidth={1280}
        compositionHeight={720}
        controls={false}
        loop
        autoPlay={false}
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
        }}
      />
    </div>
  );
}
