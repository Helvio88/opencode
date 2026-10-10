import { encode } from "uqr"

// Scanners need dark modules on a light field, plus the four-module quiet zone
// from ISO/IEC 18004. Colors are literal black and white so a light or dark
// terminal theme cannot invert or wash out the code. Half-blocks draw two
// module rows per line.
const quietZone = 4

type Fit = {
  columns?: number
  rows?: number
}

export function renderAuthQr(url: string, fit?: Fit) {
  const data = modules(url, fit)
  if (!data) return
  return paint(data, ansiModule)
}

export function renderAuthQrBlocks(url: string, fit?: Fit) {
  const data = modules(url, fit)
  if (!data) return
  return paint(data, blockModule)
}

// The QR section repeats a link only when that URL is not already on screen.
// A prefilled device URL counts as shown when the instructions already contain
// the same address without the user-code query.
export function authorizationUrlShown(url: string, text?: string) {
  if (!text) return false
  if (text.includes(url)) return true
  const bare = url.split(/[?#]/, 1)[0]
  return bare !== url && text.includes(bare)
}

function modules(url: string, fit?: Fit) {
  const qr = encode(url, { ecc: "M", border: quietZone })
  if (fit?.columns !== undefined && qr.size > fit.columns) return
  if (fit?.rows !== undefined && Math.ceil(qr.size / 2) > fit.rows) return
  return qr.data
}

function paint(data: boolean[][], module: (top: boolean, bottom: boolean) => string) {
  const lines: string[] = []
  for (let y = 0; y < data.length; y += 2) {
    const row = data[y]
    const next = data[y + 1]
    let line = ""
    for (let x = 0; x < data.length; x++) {
      line += module(row[x], next ? next[x] : false)
    }
    lines.push(line)
  }
  return lines.join("\n")
}

// ▀ paints the upper half with the foreground color and the lower half with
// the background color, independent of the terminal theme.
function ansiModule(top: boolean, bottom: boolean) {
  return `\x1b[38;2;${channel(top)};48;2;${channel(bottom)}m▀\x1b[0m`
}

function channel(dark: boolean) {
  return dark ? "0;0;0" : "255;255;255"
}

// Block glyphs assume a white foreground on a black background. Light modules
// are the glyph; dark modules are the cell background.
function blockModule(top: boolean, bottom: boolean) {
  if (!top && !bottom) return "█"
  if (!top && bottom) return "▀"
  if (top && !bottom) return "▄"
  return " "
}
