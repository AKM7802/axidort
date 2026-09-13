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
          background: "#f5f2ea",
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
              borderRadius: 10,
              background: "#23201c",
            }}
          >
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <path
                d="M4.5 18.5 11.3 5.8a.8.8 0 0 1 1.4 0l6.8 12.7"
                stroke="#f6f3ec"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M8 13.6h8" stroke="#f6f3ec" strokeWidth="2.3" strokeLinecap="round" />
              <circle cx="12" cy="3.4" r="1.5" fill="#ec6b25" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 700, color: "#23201c", letterSpacing: -3 }}>{BRAND_NAME}</div>
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 34, color: "#6b645c" }}>{BRAND_TAGLINE}</div>
      </div>
    ),
    { ...size },
  );
}
