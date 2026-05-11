// Pass directly to next/image's `placeholder` prop. Using a `data:` URI
// (not `blur` + `blurDataURL`) keeps Next.js from applying its built-in
// blur filter, so the gradient stays sharp. `preserveAspectRatio="none"`
// lets the same constant cover every aspect ratio in the app.
//
// Colors are translucent gray so the parent's `bg-muted` (theme-aware)
// bleeds through — a solid light-gray gradient would be invisible on a
// light wrapper and glaringly bright on a dark one.
const SHIMMER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgb(128,128,128)" stop-opacity="0.15"/><stop offset="50%" stop-color="rgb(128,128,128)" stop-opacity="0.30"/><stop offset="100%" stop-color="rgb(128,128,128)" stop-opacity="0.15"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/></svg>`;

export const SHIMMER_DATA_URL: `data:image/${string}` = `data:image/svg+xml;utf8,${encodeURIComponent(SHIMMER_SVG)}`;
