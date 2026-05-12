# YUMYUMPO icons

The PWA manifest references **two PNG icons** in this folder:

| File              | Size         | Purpose                              |
|-------------------|--------------|--------------------------------------|
| `icon-192.png`    | 192 × 192 px | Android home screen, install dialogs |
| `icon-512.png`    | 512 × 512 px | Splash screen, Play Store-style      |
| `icon-180.png`    | 180 × 180 px | iOS home screen (Apple touch icon)   |

The manifest also lists the existing `assets/images/YUMYUMPO.svg` as a primary
SVG icon — modern browsers (Android Chrome 110+, Edge, Safari 17+) will use it
directly and the PNGs become fallback. Until you generate the PNGs below, the
SVG covers ~80 % of devices.

## Generate them (one-time)

The simplest workflow:

1. Open <https://realfavicongenerator.net> or <https://www.pwabuilder.com/imageGenerator>
2. Upload `../assets/images/YUMYUMPO.svg`
3. Set a yellow background (`#FFD000`) so the icon has presence inside Android's
   round mask
4. Download the bundle
5. Drop the three PNG files into this `icons/` folder

Or with ImageMagick locally:

```bash
# from project root
cd icons
magick -background "#FFD000" -density 1024 ../assets/images/YUMYUMPO.svg -resize 192x192 -extent 192x192 -gravity center icon-192.png
magick -background "#FFD000" -density 1024 ../assets/images/YUMYUMPO.svg -resize 512x512 -extent 512x512 -gravity center icon-512.png
magick -background "#FFD000" -density 1024 ../assets/images/YUMYUMPO.svg -resize 180x180 -extent 180x180 -gravity center icon-180.png
```

## Apple-specific notes

iOS doesn't read the manifest — it looks for `<link rel="apple-touch-icon">`
in each page's `<head>`. That tag already points at `icons/icon-180.png`. iOS
expects a **solid background** (no transparency) on this icon.
