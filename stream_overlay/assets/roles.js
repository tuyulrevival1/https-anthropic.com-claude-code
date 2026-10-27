/* Ikon role MLBB (lukisan sendiri, SVG) - dipakai overlay, App dan viewer */
(function () {
  const S = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"';
  const F = 'fill="currentColor"';
  // bentuk ikut ikon lane dalam game (dipermudah)
  const ICON = {
    // EXP: huruf E dengan bilah melengkung
    EXP: `<path ${F} d="M21.3 1H9.8C5.6 1.3 3 5.2 2.85 12.4 3.6 9 7 6.2 12.5 6.2h8.8zM21.3 8.4H9.3C6.3 8.4 4.2 11.5 4.2 15.6s2.4 7.4 6.1 7.4h11v-5.2h-11c-2.1 0-3.9-.9-3.9-2.25s1.8-2.25 3.9-2.25h11z"/>`,
    // Jungle: cakar (dikesan dari gambar contoh)
    JUNGLE: `<path ${F} d="M22.3 1.0L12.0 1.0L11.9 1.1L11.9 2.1L11.7 3.0L11.2 3.8L10.5 4.6L9.5 5.3L8.1 6.1L5.4 7.0L4.7 7.7L4.2 8.4L3.6 9.7L2.7 11.8L1.7 15.1L1.3 17.9L1.4 17.9L1.9 16.4L2.7 14.8L2.7 14.6L3.7 13.5L4.9 12.6L5.6 12.0L6.1 11.4L6.9 10.1L6.9 10.2L6.4 11.6L5.6 13.3L4.8 14.6L3.2 16.1L2.6 17.4L2.3 18.8L2.4 20.3L2.9 21.4L3.4 22.1L4.1 22.5L4.8 22.8L6.6 22.9L7.9 22.6L8.6 22.2L9.2 21.6L9.2 21.4L8.0 21.1L7.0 20.5L6.2 19.7L5.7 18.7L5.6 17.8L5.7 16.7L5.8 16.7L6.6 17.0L7.5 17.2L8.7 17.2L10.4 16.8L11.3 16.4L11.3 16.1L10.5 15.9L10.2 15.4L10.0 14.9L9.9 14.3L10.1 13.6L10.6 12.7L11.1 12.2L11.8 11.8L12.8 11.8L13.3 11.9L14.8 12.6L16.8 14.0L17.9 15.0L18.2 15.3L18.2 16.0L17.7 16.9L17.0 17.8L16.1 18.7L15.0 19.6L14.8 19.9L15.9 20.0L18.0 20.0L18.7 19.9L19.1 19.6L19.2 19.0L19.5 18.6L21.0 17.1L21.8 16.2L22.2 15.4L22.6 14.0L22.6 12.4L22.3 11.4L21.9 10.6L21.2 10.2L20.7 9.5L20.3 8.8L20.2 8.1L20.2 6.8L20.4 6.0L22.3 1.4Z"/>`,
    // Mid: bingkai kelabu + garis serong
    MID: `<g ${F} fill-opacity=".5"><path d="M1 1h17.4l-3 3H4v11.4l-3 3zM23 5.6V23H5.6l3-3H20V8.6z"/><path d="M6 6h5.5L6 11.5zM18 18h-5.5l5.5-5.5z"/></g><path ${F} d="M20.2 1H23v2.8L3.8 23H1v-2.8z"/>`,
    // Gold: $ (dikesan dari gambar contoh)
    GOLD: `<path ${F} d="M4.6 18.3L4.6 18.9L4.9 19.2L10.3 21.6L10.6 21.9L10.7 22.6L10.8 22.8L11.3 23.0L14.0 23.0L14.2 22.9L14.6 22.5L14.6 21.9L15.0 21.3L17.5 19.9L17.8 19.6L17.9 19.4L17.9 18.9L16.9 17.3L16.6 17.0L16.4 16.9L16.1 16.9L15.7 17.0L15.0 17.8L13.9 18.5L12.8 18.8L11.6 18.8L10.6 18.6L9.5 18.1L8.8 17.6L7.9 16.6L7.7 16.5L7.7 16.4L7.1 16.4L4.8 17.9ZM4.6 5.5L4.0 6.9L3.8 8.0L3.8 8.6L4.0 9.4L4.3 10.2L4.8 10.9L5.4 11.5L6.7 12.3L8.5 13.0L10.4 13.4L14.3 14.1L16.4 14.7L17.4 15.3L18.3 16.1L18.9 17.1L19.2 18.3L19.4 18.3L19.5 18.2L19.8 17.2L19.8 16.1L19.6 15.1L19.3 14.6L18.6 13.5L17.3 12.1L15.9 11.2L14.6 10.8L12.9 10.6L10.3 10.6L9.8 10.5L8.7 10.1L7.7 9.4L6.7 8.3L5.9 7.1L5.0 5.4L4.8 5.3ZM6.7 4.7L6.8 5.1L7.9 6.9L8.2 7.1L8.6 7.1L8.9 7.0L9.8 6.0L10.6 5.5L11.6 5.2L12.8 5.2L13.6 5.3L14.7 5.6L15.8 6.3L16.7 7.4L17.0 7.5L17.5 7.5L19.8 6.1L20.0 5.9L20.1 5.5L20.0 5.0L19.8 4.8L14.5 2.5L14.3 2.3L14.1 2.0L14.1 1.6L13.9 1.2L13.3 1.0L10.9 1.0L10.4 1.1L10.1 1.5L10.0 2.2L9.6 2.7L7.0 4.1L6.8 4.3Z"/>`,
    ROAM: `<path ${F} fill-rule="evenodd" d="M1 1h22v22H1zM4.2 4.2h12L1 19.4v-3.6l7.6-8H4.2zM19.8 19.8h-12L23 4.6v3.6l-7.6 8h4.4z"/>`
  };
  const LABEL = { EXP: "EXP lane", JUNGLE: "Jungle", MID: "Mid lane", GOLD: "Gold lane", ROAM: "Roam" };
  const svg = r => ICON[r] ? `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON[r]}</svg>` : "";
  // badge siap: <span class="rl rl-exp" title="EXP lane">svg</span>
  const badge = r => ICON[r] ? `<span class="rl rl-${r.toLowerCase()}" title="${LABEL[r]}" aria-label="${LABEL[r]}">${svg(r)}</span>` : "";
  window.SYNO_ROLES = { list: ["EXP", "JUNGLE", "MID", "GOLD", "ROAM"], LABEL, svg, badge };
})();
