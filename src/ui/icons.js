export function icon(name, size = 20) {
  const paths = {
    paw: '<ellipse cx="8" cy="7" rx="2" ry="3"/><ellipse cx="16" cy="7" rx="2" ry="3"/><ellipse cx="4" cy="12" rx="2" ry="2.5"/><ellipse cx="20" cy="12" rx="2" ry="2.5"/><path d="M7 17c0-6 10-6 10 0 0 4-3 2-5 2s-5 2-5-2Z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    sliders:
      '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
    spark:
      '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
    ball: '<circle cx="12" cy="12" r="9"/><path d="M5 5c9 0 14 5 14 14M3 13c5 1 9-3 10-10"/>',
    settings:
      '<path d="m9 3-1 3-3 1-2 4 2 3v4l4 2 3-1 3 2 4-2v-4l2-3-2-4-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3M12 17h.01"/>',
    arrow: '<path d="m9 5 7 7-7 7"/>',
    play: '<path d="m8 5 11 7-11 7Z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    restart: '<path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/>',
    monitor:
      '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    heart: '<path d="M20 5c-4-4-8 1-8 1S8 1 4 5c-6 6 8 15 8 15S26 11 20 5Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    sound: '<path d="M11 4 6 8H3v8h3l5 4ZM16 8l5 8M21 8l-5 8"/>',
    external: '<path d="M14 3h7v7M21 3 11 13M10 3H4v17h16v-6"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.paw}</svg>`;
}
