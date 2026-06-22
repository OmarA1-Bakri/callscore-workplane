(() => {
  function lum(rgb) {
    const [r, g, b] = rgb.map(v => {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function parseRgb(s) {
    const m = s.match(/\d+/g);
    return m ? [parseInt(m[0]), parseInt(m[1]), parseInt(m[2])] : null;
  }
  function contrastRatio(fg, bg) {
    const L1 = lum(fg), L2 = lum(bg);
    const a = Math.max(L1, L2), b = Math.min(L1, L2);
    return (a + 0.05) / (b + 0.05);
  }
  function bgOf(el) {
    let cur = el;
    while (cur && cur !== document.documentElement) {
      const s = getComputedStyle(cur);
      if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent') {
        return s.backgroundColor;
      }
      cur = cur.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  }
  const texts = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button, strong, li, label')).filter(el => {
    const direct = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
    return direct;
  });
  const results = [];
  const seen = new Set();
  for (const el of texts) {
    const s = getComputedStyle(el);
    const key = el.tagName + '|' + s.color + '|' + s.fontSize + '|' + s.fontWeight;
    if (seen.has(key)) continue;
    seen.add(key);
    const fg = parseRgb(s.color);
    const bgStr = bgOf(el);
    const bg = parseRgb(bgStr);
    if (!fg || !bg) continue;
    const ratio = contrastRatio(fg, bg);
    const sz = parseFloat(s.fontSize);
    const bold = parseInt(s.fontWeight) >= 700;
    const isLarge = sz >= 24 || (sz >= 18.66 && bold);
    const required = isLarge ? 3 : 4.5;
    results.push({
      tag: el.tagName,
      color: s.color,
      bg: bgStr,
      size: s.fontSize,
      weight: s.fontWeight,
      ratio: Number(ratio.toFixed(2)),
      required,
      pass: ratio >= required,
      text: el.textContent.trim().slice(0, 50),
      cls: el.className && typeof el.className === 'string' ? el.className.slice(0, 60) : ''
    });
  }
  return JSON.stringify({ total: results.length, fails: results.filter(r => !r.pass), passes: results.filter(r => r.pass) });
})()
