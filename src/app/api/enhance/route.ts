import { NextResponse } from 'next/server'

const PROMPT_TEMPLATE = (text: string) => `Anda adalah asisten AI profesional untuk perbaikan tata bahasa laporan kegiatan kedinasan Pemerintah Kota Surakarta. Tugas Anda HANYA membetulkan ejaan, tata bahasa baku (PUEBI/EYD), dan merapikan struktur kalimat agar formal dan bernada kedinasan.

ATURAN KETAT (WAJIB DIPATUHI):
1. DILARANG KERAS MENAMBAH FAKTA BARU: Jangan menambah informasi, hasil keputusan rekaan, agenda baru, instansi baru, atau asumsi apapun yang tidak tertulis pada teks asli pengguna.
2. DILARANG MENGUBAH DATA: Jangan mengubah esensi isi, angka, nominal, tanggal, waktu, nama orang/pejabat, nama tempat, dan nama instansi.
3. PERTAHANKAN FORMAT: Jika teks asli berbentuk poin-poin (bullet points/penomoran), tetap sajikan dalam format poin-poin yang rapi. Jangan digabung menjadi satu paragraf padat.
4. KOREKSI TATA BAHASA & TYPO: Perbaiki salah ketik (typo), singkatan informal menjadi formal (contoh: 'sdh' -> 'sudah', 'yg' -> 'yang', 'rakor' -> 'rapat koordinasi'), dan tata kalimat agar bernada resmi kedinasan.
5. OUTPUT BERSIH: Berikan HANYA teks hasil perbaikan langsung tanpa tanda kutip markdown (\`\`\`), tanpa kata pengantar, dan tanpa kalimat penutup.

Teks asli dari pengguna:
${text}`

function cleanMarkdown(text: string): string {
  return text
    .replace(/^```[\w]*\n?/g, '')
    .replace(/```$/g, '')
    .trim()
}

async function callGemini(text: string, apiKey: string, model?: string): Promise<string> {
  const targetModel = model || process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT_TEMPLATE(text) }] }],
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Gemini API error (status ${res.status})`
    throw new Error(errorMsg)
  }

  const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!responseText) {
    throw new Error('Respons dari Gemini kosong.')
  }

  return cleanMarkdown(responseText)
}

async function callOpenRouter(text: string, apiKey: string, model?: string): Promise<string> {
  const targetModel = model || process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3.5-lightning:free'
  const url = 'https://openrouter.ai/api/v1/chat/completions'

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://simpelgas.surakarta.go.id',
      'X-Title': 'SIMPELGAS Disnaker Surakarta',
    },
    body: JSON.stringify({
      model: targetModel,
      messages: [{ role: 'user', content: PROMPT_TEMPLATE(text) }],
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    const errorMsg = data?.error?.message || `OpenRouter API error (status ${res.status})`
    throw new Error(errorMsg)
  }

  const responseText = data?.choices?.[0]?.message?.content
  if (!responseText) {
    throw new Error('Respons dari OpenRouter kosong.')
  }

  return cleanMarkdown(responseText)
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text required' }, { status: 400 })
    }

    const geminiKey = process.env.GEMINI_API_KEY
    const openRouterKey = process.env.OPENROUTER_API_KEY
    const openRouterModel = process.env.OPENROUTER_MODEL

    if (!geminiKey && !openRouterKey) {
      return NextResponse.json(
        { error: 'API Key belum dikonfigurasi di server (GEMINI_API_KEY / OPENROUTER_API_KEY).' },
        { status: 500 }
      )
    }

    const errors: string[] = []

    // 1. Coba Primary: Google Gemini
    if (geminiKey) {
      try {
        const enhanced = await callGemini(text, geminiKey)
        return NextResponse.json({ enhanced, provider: 'gemini' })
      } catch (geminiError: any) {
        console.warn('Gemini Enhance failed, attempting fallback to OpenRouter:', geminiError.message)
        errors.push(`Gemini: ${geminiError.message}`)
      }
    }

    // 2. Coba Fallback: OpenRouter
    if (openRouterKey) {
      try {
        const enhanced = await callOpenRouter(text, openRouterKey, openRouterModel)
        return NextResponse.json({ enhanced, provider: 'openrouter' })
      } catch (openRouterError: any) {
        console.warn('OpenRouter Enhance failed:', openRouterError.message)
        errors.push(`OpenRouter: ${openRouterError.message}`)
      }
    }

    // Jika seluruh provider gagal
    return NextResponse.json(
      {
        error: `Gagal memproses dengan AI: ${errors.join(' | ')}`,
      },
      { status: 502 }
    )
  } catch (error: any) {
    console.error('Server Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Terjadi kesalahan internal server.' },
      { status: 500 }
    )
  }
}
