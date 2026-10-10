import { expect, test } from "bun:test"
import jsQR from "jsqr"
import { renderAuthQr, renderAuthQrBlocks } from "../src/util/auth-qr"

const authorizationUrl = "https://accounts.x.ai/oauth2/device?user_code=ABCD-EFGH"

test("decodes the rendered QR matrix back to the authorization URL with the code prefilled", () => {
  const ansi = renderAuthQr(authorizationUrl)
  const blocks = renderAuthQrBlocks(authorizationUrl)
  if (!ansi || !blocks) throw new Error("expected a QR")

  const fromAnsi = modulesFromAnsi(ansi)
  const fromBlocks = modulesFromBlocks(blocks)
  expect(fromBlocks).toEqual(fromAnsi)
  expect(decode(fromAnsi)).toBe(authorizationUrl)
  expect(decode(fromBlocks)).toBe(authorizationUrl)
})

test("omits the QR when the terminal cannot fit the quiet zone", () => {
  expect(renderAuthQr(authorizationUrl, { columns: 20 })).toBeUndefined()
  expect(renderAuthQrBlocks(authorizationUrl, { rows: 8 })).toBeUndefined()
  expect(renderAuthQr(authorizationUrl, { columns: 80, rows: 40 })).toContain("▀")
})

function decode(modules: boolean[][]) {
  const scale = 4
  const width = modules[0].length * scale
  const height = modules.length * scale
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < modules.length; y++) {
    for (let x = 0; x < modules[y].length; x++) {
      const value = modules[y][x] ? 0 : 255
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const index = ((y * scale + sy) * width + (x * scale + sx)) * 4
          pixels[index] = value
          pixels[index + 1] = value
          pixels[index + 2] = value
          pixels[index + 3] = 255
        }
      }
    }
  }
  // dontInvert fails closed if the modules are light-on-dark.
  return jsQR(pixels, width, height, { inversionAttempts: "dontInvert" })?.data
}

function modulesFromAnsi(rendered: string) {
  const pattern = /\x1b\[38;2;(\d+);(\d+);(\d+);48;2;(\d+);(\d+);(\d+)m▀\x1b\[0m/g
  return rendered.split("\n").flatMap((line) => {
    const top: boolean[] = []
    const bottom: boolean[] = []
    for (const match of line.matchAll(pattern)) {
      top.push(match[1] === "0")
      bottom.push(match[4] === "0")
    }
    return [top, bottom]
  })
}

function modulesFromBlocks(rendered: string) {
  return rendered.split("\n").flatMap((line) => {
    const top: boolean[] = []
    const bottom: boolean[] = []
    for (const glyph of line) {
      if (glyph === "█") {
        top.push(false)
        bottom.push(false)
      } else if (glyph === "▀") {
        top.push(false)
        bottom.push(true)
      } else if (glyph === "▄") {
        top.push(true)
        bottom.push(false)
      } else if (glyph === " ") {
        top.push(true)
        bottom.push(true)
      } else throw new Error(`unexpected QR glyph ${glyph}`)
    }
    return [top, bottom]
  })
}
