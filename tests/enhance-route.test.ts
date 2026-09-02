import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/enhance/route'

describe('API /api/enhance (Multi-Provider Failover)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('1. Returns 400 if text is missing or only whitespace', async () => {
    const req = new Request('http://localhost:3000/api/enhance', {
      method: 'POST',
      body: JSON.stringify({ text: '   ' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/Text required/i)
  })

  it('2. Returns 500 when no API keys (Gemini & OpenRouter) are configured', async () => {
    delete process.env.GEMINI_API_KEY
    delete process.env.OPENROUTER_API_KEY

    const req = new Request('http://localhost:3000/api/enhance', {
      method: 'POST',
      body: JSON.stringify({ text: 'rapat koordinasi kegiatan' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toMatch(/API Key belum dikonfigurasi/i)
  })

  it('3. Successfully calls Google Gemini (Primary) and returns provider: gemini', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key'
    delete process.env.OPENROUTER_API_KEY

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '1. Menghadiri rapat koordinasi kedinasan.' }],
            },
          },
        ],
      }),
    } as unknown as Response)

    const req = new Request('http://localhost:3000/api/enhance', {
      method: 'POST',
      body: JSON.stringify({ text: 'rapat koordinasi' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.enhanced).toBe('1. Menghadiri rapat koordinasi kedinasan.')
    expect(json.provider).toBe('gemini')
  })

  it('4. Automatically falls back to OpenRouter when Google Gemini fails (e.g. 429 rate limit)', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key'
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key'
    process.env.OPENROUTER_MODEL = 'google/gemini-2.0-flash-exp:free'

    global.fetch = vi
      .fn()
      // First call (Gemini) fails with 429 Too Many Requests
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Resource has been exhausted (rate limit)' } }),
      } as unknown as Response)
      // Second call (OpenRouter) succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '```markdown\n1. Rapat koordinasi dinas diselesaikan.\n```',
              },
            },
          ],
        }),
      } as unknown as Response)

    const req = new Request('http://localhost:3000/api/enhance', {
      method: 'POST',
      body: JSON.stringify({ text: 'rapat dinas' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.enhanced).toBe('1. Rapat koordinasi dinas diselesaikan.')
    expect(json.provider).toBe('openrouter')
  })

  it('5. Uses OpenRouter directly when GEMINI_API_KEY is missing but OPENROUTER_API_KEY exists', async () => {
    delete process.env.GEMINI_API_KEY
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key'

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'Teks hasil format OpenRouter.',
            },
          },
        ],
      }),
    } as unknown as Response)

    const req = new Request('http://localhost:3000/api/enhance', {
      method: 'POST',
      body: JSON.stringify({ text: 'catatan mentah' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.enhanced).toBe('Teks hasil format OpenRouter.')
    expect(json.provider).toBe('openrouter')
  })

  it('6. Returns error when both Gemini and OpenRouter fail', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key'
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key'

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Gemini internal error' } }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: { message: 'OpenRouter service unavailable' } }),
      } as unknown as Response)

    const req = new Request('http://localhost:3000/api/enhance', {
      method: 'POST',
      body: JSON.stringify({ text: 'catatan mentah' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })
})
