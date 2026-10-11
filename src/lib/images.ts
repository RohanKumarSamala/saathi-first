/** Responsive WebP variants generated into /public/images. */
const catalogue = {
  'saathi-portrait': { widths: [800, 1400], ratio: 4 / 3 },
  hospital: { widths: [960, 1900], ratio: 3 / 2 },
  companionship: { widths: [960, 1900], ratio: 3 / 2 },
  banking: { widths: [800, 1400], ratio: 3 / 2 },
  transport: { widths: [800, 1400], ratio: 3 / 2 },
  creche: { widths: [800, 1400], ratio: 3 / 2 },
  'caring-call': { widths: [960, 1900], ratio: 3 / 2 },
  'svc-hospital': { widths: [800, 1400], ratio: 3 / 2 },
  'svc-elder': { widths: [800, 1400], ratio: 16 / 9 },
  'svc-banking': { widths: [800, 1400], ratio: 3 / 2 },
  'svc-travel': { widths: [800, 1400], ratio: 3 / 2 },
  'svc-children': { widths: [800, 1400], ratio: 3 / 2 },
  'svc-emergency': { widths: [800, 1400], ratio: 3 / 2 },
  'svc-property': { widths: [800, 1400], ratio: 4 / 3 },
  couple: { widths: [844], ratio: 844 / 1008 },
  'travel-bus': { widths: [700, 1200], ratio: 1200 / 1639 },
  'travel-car': { widths: [700, 1200], ratio: 1200 / 1623 },
  'elder-sofa': { widths: [800, 1400], ratio: 1400 / 488 },
} as const

export type ImageName = keyof typeof catalogue

export function imageSources(name: ImageName) {
  const { widths, ratio } = catalogue[name]
  const largest = widths[widths.length - 1]
  return {
    src: `/images/${name}-${largest}.webp`,
    srcSet: widths.map((w) => `/images/${name}-${w}.webp ${w}w`).join(', '),
    width: largest,
    height: Math.round(largest / ratio),
  }
}
