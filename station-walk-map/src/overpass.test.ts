import { describe, expect, it, vi } from "vitest";
import { fetchWithFallback } from "./overpass";

const res = (status: number, body = `{"status":${status}}`) => new Response(body, { status });
const urls = ["https://a", "https://b"];
const opts = { rounds: 2, delayMs: 0 };

/** signal で中断されるまで応答しない fetch（サーバーが固まった状態） */
const hang = (_url: string, init: RequestInit) =>
  new Promise<Response>((_, reject) => {
    init.signal?.addEventListener("abort", () => reject(init.signal!.reason), { once: true });
  });

describe("fetchWithFallback", () => {
  it("504 なら次のサーバーで成功し、本文を返す", async () => {
    const f = vi.fn().mockResolvedValueOnce(res(504)).mockResolvedValueOnce(res(200, "ok"));
    expect(await fetchWithFallback(urls, {}, opts, f)).toBe("ok");
    expect(f.mock.calls.map((c) => c[0])).toEqual(["https://a", "https://b"]);
  });

  it("全サーバー失敗なら待って次のラウンドを試す", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(res(504))
      .mockResolvedValueOnce(res(429))
      .mockResolvedValueOnce(res(200, "ok"));
    expect(await fetchWithFallback(urls, {}, opts, f)).toBe("ok");
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
    const f = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(res(200, "ok"));
    expect(await fetchWithFallback(urls, {}, opts, f)).toBe("ok");
  });

  it("中断されたら再試行せず投げる", async () => {
    const ac = new AbortController();
    ac.abort();
    const f = vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError"));
    await expect(fetchWithFallback(urls, { signal: ac.signal }, opts, f)).rejects.toThrow();
    expect(f).toHaveBeenCalledTimes(1);
  });

  describe("タイムアウト", () => {
    it("応答が無いサーバーは打ち切って次へ進む", async () => {
      const f = vi.fn().mockImplementationOnce(hang).mockResolvedValueOnce(res(200, "ok"));
      const started = Date.now();
      expect(await fetchWithFallback(urls, {}, { ...opts, timeoutMs: 30 }, f)).toBe("ok");
      expect(f).toHaveBeenCalledTimes(2);
      expect(Date.now() - started).toBeLessThan(1000);
    });

    it("全部タイムアウトならタイムアウトのエラーを投げる", async () => {
      const f = vi.fn().mockImplementation(hang);
      await expect(fetchWithFallback(urls, {}, { ...opts, timeoutMs: 20 }, f)).rejects.toThrow(
        "timeout",
      );
      expect(f).toHaveBeenCalledTimes(4);
    });

    it("本文のダウンロードが遅い場合もタイムアウト扱い", async () => {
      // ヘッダーはすぐ返るが、本文が届かないレスポンス
      const slowBody = (_url: string, init: RequestInit) =>
        Promise.resolve(
          new Response(
            new ReadableStream({
              start(c) {
                init.signal?.addEventListener("abort", () => c.error(init.signal!.reason));
              },
            }),
          ),
        );
      const f = vi.fn().mockImplementationOnce(slowBody).mockResolvedValueOnce(res(200, "ok"));
      expect(await fetchWithFallback(urls, {}, { ...opts, timeoutMs: 30 }, f)).toBe("ok");
    });

    it("利用者の中断はタイムアウトと区別し、再試行しない", async () => {
      const ac = new AbortController();
      const f = vi.fn().mockImplementation(hang);
      const p = fetchWithFallback(urls, { signal: ac.signal }, { ...opts, timeoutMs: 10_000 }, f);
      ac.abort();
      await expect(p).rejects.toMatchObject({ name: "AbortError" });
      expect(f).toHaveBeenCalledTimes(1);
    });
  });
});
