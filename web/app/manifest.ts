import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MLB 162-0 — All-Time Roster Builder",
    short_name: "MLB 162-0",
    description: "Build an all-time MLB roster and chase a perfect 162-0 season.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0f1d",
    theme_color: "#0a0f1d",
    orientation: "portrait",
    categories: ["games", "sports"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
