// Turns an uploaded headshot into the circle-cropped image used on resumes.
// Square crop biased toward the top (portraits put the face high in frame),
// scaled down, masked to a circle on white, exported as a small JPEG so it
// fits comfortably in localStorage and the cloud-sync JSON.

const OUTPUT_SIZE = 360
const TOP_BIAS = 0.15 // fraction of the trimmed height taken from the top

/** Pure crop geometry — exported for tests. */
export function portraitSquare(width: number, height: number): { x: number; y: number; side: number } {
  const side = Math.min(width, height)
  return {
    x: (width - side) / 2,
    y: (height - side) * TOP_BIAS,
    side,
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read that image'))
    img.src = src
  })
}

export async function prepareProfilePhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const { x, y, side } = portraitSquare(img.naturalWidth, img.naturalHeight)

    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
    ctx.save()
    ctx.beginPath()
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, x, y, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
    ctx.restore()

    return canvas.toDataURL('image/jpeg', 0.9)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Decode a base64 data URL into bytes for the docx ImageRun. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
