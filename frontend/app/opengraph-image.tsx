import { ImageResponse } from "next/og";

import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0a1f",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 96,
              height: 96,
              borderRadius: 24,
              background: "#4338ca",
            }}
          >
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <path
                d="M4.5 18.5 11.3 5.8a.8.8 0 0 1 1.4 0l6.8 12.7"
                stroke="#ffffff"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M8 13.6h8" stroke="#ffffff" strokeWidth="2.3" strokeLinecap="round" />
              <circle cx="12" cy="3.4" r="1.3" fill="#ffffff" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 700, color: "#ffffff" }}>{BRAND_NAME}</div>
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 34, color: "#c7c5f5" }}>{BRAND_TAGLINE}</div>
      </div>
    ),
    { ...size },
  );
}
