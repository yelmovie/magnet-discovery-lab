# Magnet Quest web fonts

All font files are hosted by the app. No font CDN is contacted.

| Shipped file | Based on | Local source | License |
|---|---|---|---|
| `quest-display-ko.woff2`, `quest-display-latin.woff2` | Google Fonts Jua, Korean/Latin distribution | `1udangtangtang/public/assets/fonts/jua-*-400.woff2` | `Jua-OFL.txt` |
| `quest-body-regular.woff2`, `quest-body-bold.woff2` | Pretendard subsets, regular/bold | `2 animal/assets/fonts/Pretendard-*.subset.woff2` | `Pretendard-OFL.txt` |

The source font licenses reserve their original font names. The shipped modified
files therefore use **Magnet Quest Display** and **Magnet Quest Sans** as their
internal family, full and PostScript names. Copyright and license metadata are
preserved. Glyph outlines, glyph coverage and metrics were not changed here.

The original copyright notices and the complete SIL Open Font License 1.1 are
bundled alongside the font files. These fonts may be bundled in commercial
software under that license; they may not be sold by themselves.

## NanumSquare Neo (2026-11-10)

Titles, body text, and map-villain labels use the unmodified official Naver NanumSquare Neo regular/bold WOFF2 files. Source: https://hangeul.naver.com/font (NaverNanumSquareNeo.zip). The original SIL OFL and copyright notice are included in NanumSquareNeo-OFL.txt. Existing fonts remain preserved for compatibility.

## Complete UI and canvas coverage (2026-11-11)

All live UI, dynamically drawn experiment labels, 3D label textures, and exported invention cards now use NanumSquareNeo. Regular (100–500), bold (600–700), and extra-bold (800–900) are bundled unmodified with the existing license. Startup waits for these font faces before drawing canvas content. Legacy font files remain preserved but are no longer selected by runtime code. Text baked into existing images or video frames is not changed by CSS.
