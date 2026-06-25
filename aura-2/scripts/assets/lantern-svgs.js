export const LANTERN_SVGS = {
	basic: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="basic_back" x1="0" y1="30" x2="0" y2="95" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffb5ca"/>
      <stop offset="1" stop-color="#ef4f85"/>
    </linearGradient>
    <linearGradient id="basic_mid" x1="0" y1="28" x2="0" y2="95" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffd8e3"/>
      <stop offset="1" stop-color="#ff79a4"/>
    </linearGradient>
    <linearGradient id="basic_front" x1="0" y1="50" x2="0" y2="96" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ff8bb0"/>
      <stop offset="1" stop-color="#e83f7a"/>
    </linearGradient>
    <linearGradient id="basic_bowl" x1="0" y1="78" x2="0" y2="104" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffd66f"/>
      <stop offset="1" stop-color="#d88a24"/>
    </linearGradient>
    <linearGradient id="basic_flame" x1="0" y1="43" x2="0" y2="76" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff8bd"/>
      <stop offset="1" stop-color="#ffac32"/>
    </linearGradient>
    <filter id="basic_shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#8f2b4d" flood-opacity="0.22"/>
    </filter>
  </defs>

  <ellipse cx="60" cy="105" rx="28" ry="6" fill="#000" opacity="0.08"/>

  <g filter="url(#basic_shadow)">
    <path d="M13 79 C18 62 30 52 43 52 C38 66 30 78 20 86 C17 84 15 82 13 79Z" fill="url(#basic_back)"/>
    <path d="M107 79 C102 62 90 52 77 52 C82 66 90 78 100 86 C103 84 105 82 107 79Z" fill="url(#basic_back)"/>

    <path d="M25 69 C27 50 39 36 55 36 C51 55 43 70 32 81 C28 78 26 74 25 69Z" fill="url(#basic_mid)"/>
    <path d="M95 69 C93 50 81 36 65 36 C69 55 77 70 88 81 C92 78 94 74 95 69Z" fill="url(#basic_mid)"/>
    <path d="M43 62 C44 43 53 31 60 27 C67 31 76 43 77 62 C70 58 65 56 60 56 C55 56 50 58 43 62Z" fill="url(#basic_mid)"/>

    <path d="M34 80 Q60 70 86 80 L80 98 Q60 104 40 98Z" fill="url(#basic_bowl)"/>
    <ellipse cx="60" cy="80" rx="27" ry="6" fill="#ffe59c"/>

    <path d="M29 88 C34 67 45 56 58 53 C54 69 48 83 39 93 C34 95 30 93 29 88Z" fill="url(#basic_front)"/>
    <path d="M91 88 C86 67 75 56 62 53 C66 69 72 83 81 93 C86 95 90 93 91 88Z" fill="url(#basic_front)"/>
    <path d="M47 94 C48 71 54 58 60 51 C66 58 72 71 73 94 C68 89 64 86 60 85 C56 86 52 89 47 94Z" fill="url(#basic_front)"/>

    <path d="M60 42 C52 53 54 67 60 76 C66 67 68 53 60 42Z" fill="url(#basic_flame)"/>
    <path d="M60 56 C56 62 57 70 60 74 C63 70 64 62 60 56Z" fill="#fffdf0"/>
  </g>
</svg>`,

	crystal: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="crystal_blue" x1="0" y1="28" x2="0" y2="96" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#dffbff"/>
      <stop offset="1" stop-color="#64c8ff"/>
    </linearGradient>
    <linearGradient id="crystal_purple" x1="0" y1="28" x2="0" y2="96" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#eee1ff"/>
      <stop offset="1" stop-color="#9b7cff"/>
    </linearGradient>
    <linearGradient id="crystal_bowl" x1="0" y1="78" x2="0" y2="103" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffd870"/>
      <stop offset="1" stop-color="#d89528"/>
    </linearGradient>
    <linearGradient id="crystal_flame" x1="0" y1="43" x2="0" y2="76" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff8bd"/>
      <stop offset="1" stop-color="#ffb43d"/>
    </linearGradient>
    <filter id="crystal_shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#31458a" flood-opacity="0.2"/>
    </filter>
  </defs>

  <ellipse cx="60" cy="105" rx="28" ry="6" fill="#000" opacity="0.08"/>

  <g filter="url(#crystal_shadow)">
    <polygon points="14,80 31,58 45,55 34,84 22,89" fill="url(#crystal_purple)"/>
    <polygon points="106,80 89,58 75,55 86,84 98,89" fill="url(#crystal_purple)"/>

    <polygon points="25,70 39,41 55,35 47,74 34,85" fill="url(#crystal_purple)"/>
    <polygon points="95,70 81,41 65,35 73,74 86,85" fill="url(#crystal_blue)"/>
    <polygon points="43,63 55,30 60,24 65,30 77,63 60,56" fill="url(#crystal_purple)"/>

    <path d="M34 80 Q60 71 86 80 L80 98 Q60 103 40 98Z" fill="url(#crystal_bowl)"/>
    <ellipse cx="60" cy="80" rx="27" ry="6" fill="#ffe59c"/>

    <polygon points="28,89 44,57 57,53 50,88 39,96" fill="url(#crystal_purple)"/>
    <polygon points="92,89 76,57 63,53 70,88 81,96" fill="url(#crystal_blue)"/>
    <polygon points="47,94 57,50 60,45 63,50 73,94 60,85" fill="url(#crystal_purple)"/>

    <path d="M39 41 L47 74 L55 35" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="1.3"/>
    <path d="M81 41 L73 74 L65 35" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="1.3"/>
    <path d="M44 57 L50 88 L57 53" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="1.2"/>
    <path d="M76 57 L70 88 L63 53" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="1.2"/>
    <path d="M57 50 L60 85 L63 50" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="1.2"/>

    <path d="M60 42 C52 53 54 67 60 76 C66 67 68 53 60 42Z" fill="url(#crystal_flame)"/>
    <path d="M60 56 C56 62 57 70 60 74 C63 70 64 62 60 56Z" fill="#fffdf0"/>
  </g>
</svg>`,

	dragon: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="dragon_gold_dark" x1="0" y1="28" x2="0" y2="98" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffe080"/>
      <stop offset="1" stop-color="#e39a16"/>
    </linearGradient>
    <linearGradient id="dragon_gold_light" x1="0" y1="26" x2="0" y2="98" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff0b0"/>
      <stop offset="1" stop-color="#ffc83d"/>
    </linearGradient>
    <linearGradient id="dragon_bowl" x1="0" y1="76" x2="0" y2="104" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#d79a22"/>
      <stop offset="1" stop-color="#b67213"/>
    </linearGradient>
    <linearGradient id="dragon_flame" x1="0" y1="42" x2="0" y2="77" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fffad0"/>
      <stop offset="1" stop-color="#ff9c26"/>
    </linearGradient>
    <filter id="dragon_shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#7a4a0b" flood-opacity="0.25"/>
    </filter>
  </defs>

  <ellipse cx="60" cy="106" rx="30" ry="6" fill="#000" opacity="0.09"/>

  <g filter="url(#dragon_shadow)">
    <path d="M13 79 C18 61 30 51 43 51 C38 67 29 80 19 88 C16 85 14 82 13 79Z" fill="url(#dragon_gold_dark)"/>
    <path d="M107 79 C102 61 90 51 77 51 C82 67 91 80 101 88 C104 85 106 82 107 79Z" fill="url(#dragon_gold_dark)"/>

    <path d="M24 70 C27 49 39 36 56 35 C52 55 43 72 32 84 C28 80 25 75 24 70Z" fill="url(#dragon_gold_dark)"/>
    <path d="M96 70 C93 49 81 36 64 35 C68 55 77 72 88 84 C92 80 95 75 96 70Z" fill="url(#dragon_gold_dark)"/>
    <path d="M42 63 C43 43 52 30 60 25 C68 30 77 43 78 63 C71 59 65 57 60 57 C55 57 49 59 42 63Z" fill="url(#dragon_gold_light)"/>

    <path d="M31 80 Q60 70 89 80 L82 99 Q60 106 38 99Z" fill="url(#dragon_bowl)"/>
    <ellipse cx="60" cy="80" rx="29" ry="6.5" fill="#ffe089"/>

    <path d="M39 91 C45 85 52 86 56 91 C51 90 49 94 44 95" fill="none" stroke="#ffe089" stroke-width="2.2" stroke-linecap="round" opacity="0.75"/>
    <path d="M81 91 C75 85 68 86 64 91 C69 90 71 94 76 95" fill="none" stroke="#ffe089" stroke-width="2.2" stroke-linecap="round" opacity="0.75"/>
    <circle cx="49" cy="90" r="1.6" fill="#ffe089"/>
    <circle cx="71" cy="90" r="1.6" fill="#ffe089"/>

    <path d="M28 89 C34 67 45 56 58 52 C54 69 48 83 39 94 C34 96 29 94 28 89Z" fill="url(#dragon_gold_dark)"/>
    <path d="M92 89 C86 67 75 56 62 52 C66 69 72 83 81 94 C86 96 91 94 92 89Z" fill="url(#dragon_gold_dark)"/>
    <path d="M47 95 C48 70 54 56 60 48 C66 56 72 70 73 95 C68 89 64 86 60 85 C56 86 52 89 47 95Z" fill="url(#dragon_gold_light)"/>

    <path d="M60 41 C52 53 53 68 60 78 C67 68 68 53 60 41Z" fill="url(#dragon_flame)"/>
    <path d="M60 56 C56 63 57 71 60 75 C63 71 64 63 60 56Z" fill="#fffdf0"/>
  </g>
</svg>`
};