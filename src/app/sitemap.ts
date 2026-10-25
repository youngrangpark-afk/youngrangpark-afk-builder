import type { MetadataRoute } from "next";

// 날짜는 직접 적는다 (new Date() 는 cacheComponents 빌드를 깨뜨린다). 내용을 크게 바꾸면 고친다.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://youngrangpark-afk-builder.vercel.app",
      lastModified: "2026-10-25",
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
