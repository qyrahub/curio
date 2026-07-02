/* Brand identity — chosen by hostname so one build serves both:
   curio.sproutwise.co.za → Curio (original), everything else → Sproutwise. */
const host = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
export const isCurio = /^curio\./.test(host);

const sparkFav = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><path d='M16 2c1.2 6.6 4.2 9.6 10.8 10.8C20.2 14 17.2 17 16 23.6 14.8 17 11.8 14 5.2 12.8 11.8 11.6 14.8 8.6 16 2Z' fill='%23FFC94D' stroke='%23F2563D' stroke-width='1.6' stroke-linejoin='round'/></svg>`;
const sproutFav = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><path d='M16 29V15' stroke='%233FA66E' stroke-width='3' stroke-linecap='round'/><path d='M16 18C16 12 11 9 5 10c0 6 5 9 11 8Z' fill='%235BBF8A'/><path d='M16 15C16 9 21 6 27 7c0 6-5 9-11 8Z' fill='%232EC4B6'/></svg>`;

export const brand = isCurio
  ? { key: "curio", name: "Curio", tagline: "a spark of curiosity", favicon: `data:image/svg+xml,${encodeURIComponent(sparkFav)}` }
  : { key: "sproutwise", name: "Sproutwise", tagline: "where curiosity grows", favicon: `data:image/svg+xml,${encodeURIComponent(sproutFav)}` };
