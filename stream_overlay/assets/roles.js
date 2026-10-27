/* Ikon role MLBB (lukisan sendiri, SVG) - dipakai overlay, App dan viewer */
(function () {
  const S = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"';
  const F = 'fill="currentColor"';
  // bentuk ikut ikon lane dalam game (dipermudah)
  const ICON = {
    EXP: `<path ${F} d="M4 3h16v4h-9.5l4.5 5-4.5 5H20v4H4v-3l5.5-6L4 6z"/>`,
    JUNGLE: `<path ${S} d="M2.5 7.5v-5h5M16.5 2.5h5v5M21.5 16.5v5h-5M7.5 21.5h-5v-5"/><path ${F} d="M7 7h8.6L7 15.6zM17 8.4V17H8.4z"/>`,
    MID: `<path ${S} d="M4.5 9.5v-5h5M19.5 14.5v5h-5"/><path ${F} d="M17.5 2H22v4.5L6.5 22H2v-4.5z"/>`,
    GOLD: `<path ${F} d="M5 4h14v4h-7.5l7.5 7.5V20H5v-4h7.5L5 8.5zM10.8 1h2.4v3h-2.4zM10.8 20h2.4v3h-2.4z"/>`,
    ROAM: `<path ${F} d="M4 3h16v4.5l-9.5 9H20V21H4v-4.5l9.5-9H4z"/>`
  };
  const LABEL = { EXP: "EXP lane", JUNGLE: "Jungle", MID: "Mid lane", GOLD: "Gold lane", ROAM: "Roam" };
  const svg = r => ICON[r] ? `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON[r]}</svg>` : "";
  // badge siap: <span class="rl rl-exp" title="EXP lane">svg</span>
  const badge = r => ICON[r] ? `<span class="rl rl-${r.toLowerCase()}" title="${LABEL[r]}" aria-label="${LABEL[r]}">${svg(r)}</span>` : "";
  window.SYNO_ROLES = { list: ["EXP", "JUNGLE", "MID", "GOLD", "ROAM"], LABEL, svg, badge };
})();
