// Vercel Serverless Function — /api/enhance
// Memanggil DeepSeek API dari server-side agar API key tidak terekspos ke browser.

export default async function handler(req, res) {
  // Hanya terima POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text required' });
  }

  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({
      error: 'DEEPSEEK_API_KEY belum dikonfigurasi di environment variables server.'
    });
  }

  try {
    const systemPrompt = `Anda adalah asisten AI profesional untuk penyusunan laporan kegiatan instansi pemerintah Kota Surakarta. Perbaiki dan kembangkan poin-poin catatan laporan kegiatan berikut. Buat menjadi paragraf deskriptif yang rapi, profesional, terstruktur, serta perbaiki typo ejaan (jika ada). Jangan mengubah esensi, angka, nama, atau konteks utamanya sedikitpun. Hanya buat bahasanya lebih formal dan pantas dibaca oleh pimpinan. Jangan menggunakan tanda kutip markdown untuk output ini, langsung teks biasa.`;

    const apiRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!apiRes.ok) {
      const errData = await apiRes.json().catch(() => ({}));
      console.error('DeepSeek API Error:', apiRes.status, errData);
      return res.status(apiRes.status).json({
        error: errData?.error?.message || `DeepSeek API Error (${apiRes.status})`
      });
    }

    const data = await apiRes.json();
    const enhanced = data?.choices?.[0]?.message?.content;

    if (!enhanced) {
      return res.status(502).json({ error: 'Respons dari AI kosong. Silakan coba lagi.' });
    }

    // Bersihkan markdown wrapper jika ada
    const cleanText = enhanced.replace(/^```[\w]*\n?/g, '').replace(/```$/g, '').trim();

    return res.status(200).json({ enhanced: cleanText });
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan internal server.' });
  }
}
