import type { MetadataRoute } from "next";

// 검색엔진과 AI 크롤러(GPTBot 등) 모두에게 전체 페이지를 열어 둔다.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://youngrangpark-afk-builder.vercel.app/sitemap.xml",
  };
}
