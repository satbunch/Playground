import { describe, expect, it, vi } from "vitest";
import { fetchWithFallback } from "./overpass";

const res = (status: number) => new Response("{}", { status });
const urls = ["https://a", "https://b"];
const opts = { rounds: 2, delayMs: 0 };

describe("fetchWithFallback", () => {
  it("504 なら次のサーバーで成功を返す", async () => {
    const f = vi.fn().mockResolvedValueOnce(res(504)).mockResolvedValueOnce(res(200));
    const r = await fetchWithFallback(urls, {}, opts, f);
    expect(r.status).toBe(200);
    expect(f.mock.calls.map((c) => c[0])).toEqual(["https://a", "https://b"]);
  });

  it("全サーバー失敗なら待って次のラウンドを試す", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(res(504))
      .mockResolvedValueOnce(res(429))
      .mockResolvedValueOnce(res(200));
    expect((await fetchWithFallback(urls, {}, opts, f)).status).toBe(200);
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("リトライ対象外(400)は即エラー", async () => {
    const f = vi.fn().mockResolvedValue(res(400));
    await expect(fetchWithFallback(urls, {}, opts, f)).rejects.toThrow("400");
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("全ラウンド失敗なら最後のエラーを投げる", async () => {
    const f = vi.fn().mockResolvedValue(res(504));
    await expect(fetchWithFallback(urls, {}, opts, f)).rejects.toThrow("504");
    expect(f).toHaveBeenCalledTimes(4);
  });

  it("ネットワークエラーでも次のサーバーを試す", async () => {
    const f = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(res(200));
    expect((await fetchWithFallback(urls, {}, opts, f)).status).toBe(200);
  });

  it("中断されたら再試行せず投げる", async () => {
    const ac = new AbortController();
    ac.abort();
    const f = vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError"));
    await expect(fetchWithFallback(urls, { signal: ac.signal }, opts, f)).rejects.toThrow();
    expect(f).toHaveBeenCalledTimes(1);
  });
});
