// Pass directly to next/image's `placeholder` prop. Using a `data:` URI
// (not `blur` + `blurDataURL`) keeps Next.js from applying its built-in
// blur filter, so the gradient stays sharp. `preserveAspectRatio="none"`
// lets the same constant cover every aspect ratio in the app.
const SHIMMER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#e5e7eb"/><stop offset="50%" stop-color="#f3f4f6"/><stop offset="100%" stop-color="#e5e7eb"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/></svg>`;

export const SHIMMER_DATA_URL: `data:image/${string}` = `data:image/svg+xml;utf8,${encodeURIComponent(SHIMMER_SVG)}`;
