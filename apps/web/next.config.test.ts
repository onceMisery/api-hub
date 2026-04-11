import nextConfig from "./next.config";

describe("next.config", () => {
  it("proxies api and mock routes to the backend origin during local development", async () => {
    expect(nextConfig.rewrites).toBeTypeOf("function");

    const rewrites = await nextConfig.rewrites?.();
    expect(rewrites).toEqual([
      {
        source: "/api/:path*",
        destination: "http://localhost:8080/api/:path*"
      },
      {
        source: "/mock/:path*",
        destination: "http://localhost:8080/mock/:path*"
      }
    ]);
  });
});
