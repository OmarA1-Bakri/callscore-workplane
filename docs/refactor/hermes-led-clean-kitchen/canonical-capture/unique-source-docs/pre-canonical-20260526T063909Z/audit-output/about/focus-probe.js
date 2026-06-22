(() => {
  const focusables = Array.from(document.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'));
  const results = [];
  for (const el of focusables) {
    try { el.focus(); } catch (e) {}
    const s = getComputedStyle(el);
    const hasOutline = s.outlineStyle !== 'none' && s.outlineWidth !== '0px';
    const hasShadow = s.boxShadow && s.boxShadow !== 'none';
    const hasBorder = s.borderWidth && s.borderWidth !== '0px';
    const label = el.getAttribute('aria-label') || el.textContent.trim().slice(0,40) || el.getAttribute('alt') || '';
    results.push({
      tag: el.tagName,
      label,
      href: el.getAttribute('href') || '',
      outline: s.outline,
      outlineStyle: s.outlineStyle,
      outlineWidth: s.outlineWidth,
      outlineColor: s.outlineColor,
      boxShadow: s.boxShadow.slice(0, 80),
      hasVisibleFocus: hasOutline || (hasShadow && s.boxShadow !== 'none')
    });
  }
  // check prefers-reduced-motion: find animation/transition rules
  const animated = Array.from(document.querySelectorAll('*')).filter(el => {
    const s = getComputedStyle(el);
    return (s.animationName && s.animationName !== 'none') || (s.transitionProperty && s.transitionProperty !== 'none' && s.transitionProperty !== 'all 0s ease 0s' && parseFloat(s.transitionDuration) > 0);
  }).slice(0, 5).map(el => ({
    tag: el.tagName,
    cls: (el.className && typeof el.className === 'string') ? el.className.slice(0, 60) : '',
    transition: getComputedStyle(el).transition.slice(0, 80),
    animation: getComputedStyle(el).animation.slice(0, 80)
  }));
  // link purpose
  const vagueLinks = Array.from(document.querySelectorAll('a')).filter(a => {
    const t = a.textContent.trim().toLowerCase();
    return t === 'click here' || t === 'read more' || t === 'learn more' || t === 'here' || t === 'more';
  }).map(a => ({text: a.textContent.trim(), href: a.getAttribute('href')}));
  return JSON.stringify({
    focusCount: results.length,
    focusSample: results,
    animatedSample: animated,
    vagueLinks,
    focusVisibleInStylesheets: (() => {
      try {
        let found = 0;
        for (const sheet of document.styleSheets) {
          try {
            for (const rule of sheet.cssRules || []) {
              if (rule.cssText && rule.cssText.includes(':focus-visible')) found++;
            }
          } catch (e) { /* cross-origin */ }
        }
        return found;
      } catch (e) { return -1; }
    })()
  });
})()
