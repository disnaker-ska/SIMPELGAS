import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// Helper to recursively collect all ts/tsx files in a directory
function getFilesRecursively(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      getFilesRecursively(fullPath, fileList)
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(fullPath)
    }
  }

  return fileList
}

const ROOT_DIR = path.resolve(__dirname, '..')
const SRC_COMPONENTS = path.join(ROOT_DIR, 'src/components')
const SRC_APP = path.join(ROOT_DIR, 'src/app')

const allUiFiles = [
  ...getFilesRecursively(SRC_COMPONENTS),
  ...getFilesRecursively(SRC_APP),
]

describe('Design Tokens & UI Standards Gate (Automated Enforcement)', () => {
  it('Rule 1: Dilarang menggunakan emoticon / emoji karakter Unicode di seluruh UI components', () => {
    // Regex mendeteksi karakter emoji Unicode (Extended_Pictographic)
    const emojiRegex = /\p{Extended_Pictographic}/u
    const violations: { file: string; line: number; content: string }[] = []

    for (const filePath of allUiFiles) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line, idx) => {
        // Skip comments
        const trimmed = line.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return

        if (emojiRegex.test(line)) {
          violations.push({
            file: path.relative(ROOT_DIR, filePath),
            line: idx + 1,
            content: trimmed,
          })
        }
      })
    }

    expect(
      violations,
      `Ditemukan emoji di komponen UI! Gunakan icon dari 'lucide-react', bukan emoticon:\n${JSON.stringify(
        violations,
        null,
        2
      )}`
    ).toEqual([])
  })

  it('Rule 2: Dilarang menggunakan warna hardcoded hex di className / JSX (wajib Semantic Color / CSS Variables)', () => {
    // Regex mendeteksi arbitrary hex colors seperti bg-[#1B3C73], text-[#082F49], #F59E0B
    const hexRegex = /#[0-9a-fA-F]{3,8}\b/
    const violations: { file: string; line: number; content: string }[] = []

    for (const filePath of allUiFiles) {
      // Pengecualian: stylesheet cetak dinas formal A4 di cetak-client.tsx (standar hitam-putih cetak kedinasan)
      if (filePath.endsWith('cetak-client.tsx')) continue
      if (filePath.endsWith('globals.css')) continue

      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line, idx) => {
        const trimmed = line.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return

        // Periksa apakah ada hex color yang di-hardcode
        if (hexRegex.test(line)) {
          // Abaikan jika baris tersebut memanggil konstan DESIGN_TOKENS
          if (line.includes('DESIGN_TOKENS')) return

          violations.push({
            file: path.relative(ROOT_DIR, filePath),
            line: idx + 1,
            content: trimmed,
          })
        }
      })
    }

    expect(
      violations,
      `Ditemukan warna hardcoded hex di UI! Wajib gunakan semantic color tokens atau DESIGN_TOKENS:\n${JSON.stringify(
        violations,
        null,
        2
      )}`
    ).toEqual([])
  })

  it('Rule 3: Dilarang menggunakan legacy deprecated tokens (navy-*, amber-*)', () => {
    const legacyTokenRegex = /\b(navy|amber)-(main|dark|light|hover)\b/
    const violations: { file: string; line: number; content: string }[] = []

    for (const filePath of allUiFiles) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line, idx) => {
        const trimmed = line.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return

        if (legacyTokenRegex.test(line)) {
          violations.push({
            file: path.relative(ROOT_DIR, filePath),
            line: idx + 1,
            content: trimmed,
          })
        }
      })
    }

    expect(
      violations,
      `Ditemukan legacy token lama (navy/amber)! Gunakan palet Civic Spectrum (primary, secondary, accent, slate-*):\n${JSON.stringify(
        violations,
        null,
        2
      )}`
    ).toEqual([])
  })

  it('Rule 4: Standarisasi Iconography (Wajib menggunakan lucide-react)', () => {
    const forbiddenIconLibs = [
      '@heroicons',
      'react-icons',
      '@tabler/icons',
      'font-awesome',
      '@fortawesome',
      'feather-icons',
    ]

    const violations: { file: string; line: number; content: string }[] = []

    for (const filePath of allUiFiles) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line, idx) => {
        for (const lib of forbiddenIconLibs) {
          if (line.includes(`from '${lib}`) || line.includes(`from "${lib}`)) {
            violations.push({
              file: path.relative(ROOT_DIR, filePath),
              line: idx + 1,
              content: line.trim(),
            })
          }
        }
      })
    }

    expect(
      violations,
      `Dilarang menggunakan pustaka ikon non-standar! Gunakan 'lucide-react':\n${JSON.stringify(
        violations,
        null,
        2
      )}`
    ).toEqual([])
  })

  it('Rule 5: Dilarang menggunakan dialog popup bawaan browser (alert(), confirm(), prompt())', () => {
    // Regex mendeteksi window.alert, alert(..., window.confirm, confirm(..., window.prompt, prompt(...
    const nativeDialogRegex = /\b(window\.)?(alert|confirm|prompt)\s*\(/
    const violations: { file: string; line: number; content: string }[] = []

    for (const filePath of allUiFiles) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line, idx) => {
        const trimmed = line.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return

        // Exclude SweetAlert / Swal references (e.g. isConfirmed, showConfirmButton, confirmButtonColor)
        if (
          trimmed.includes('isConfirmed') ||
          trimmed.includes('showConfirmButton') ||
          trimmed.includes('confirmButtonColor') ||
          trimmed.includes('confirmButtonText')
        ) {
          return
        }

        if (nativeDialogRegex.test(trimmed)) {
          violations.push({
            file: path.relative(ROOT_DIR, filePath),
            line: idx + 1,
            content: trimmed,
          })
        }
      })
    }

    expect(
      violations,
      `Dilarang menggunakan popup bawaan browser (alert/confirm/prompt)! Gunakan SweetAlert2 atau toast interaktif:\n${JSON.stringify(
        violations,
        null,
        2
      )}`
    ).toEqual([])
  })
})
