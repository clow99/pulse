export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const endpoint = '/api/collect';

export function GET() {
  const token = process.env.PULSE_SELF_ANALYTICS_SITE_TOKEN?.trim();

  return new Response(token ? buildSelfAnalyticsScript(token) : NOOP_SCRIPT, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/javascript; charset=utf-8',
    },
  });
}

export function buildSelfAnalyticsScript(token: string) {
  const tokenLiteral = JSON.stringify(token);
  const endpointLiteral = JSON.stringify(endpoint);

  return `(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

  var token = ${tokenLiteral};
  var endpoint = ${endpointLiteral};
  var VISIT_TTL = 30 * 60 * 1000;
  var VISIT_KEY = 'pulse:self:visit';
  var lastPage = '';
  var sentVitals = {};

  function randomId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return String(Date.now()) + '-' + Math.random().toString(16).slice(2);
  }

  function getVisitId() {
    var now = Date.now();
    try {
      var raw = window.sessionStorage.getItem(VISIT_KEY);
      var current = raw ? JSON.parse(raw) : null;
      if (!current || !current.id || !current.lastSeen || now - current.lastSeen > VISIT_TTL) {
        current = { id: randomId(), lastSeen: now };
      } else {
        current.lastSeen = now;
      }
      window.sessionStorage.setItem(VISIT_KEY, JSON.stringify(current));
      return current.id;
    } catch (_) {
      return randomId();
    }
  }

  function getUtmParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
    };
  }

  function send(type, name, properties) {
    var payload = {
      token: token,
      type: type,
      visitId: getVisitId(),
      url: window.location.href,
      referrer: document.referrer || '',
    };
    var utm = getUtmParams();
    payload.utm_source = utm.utm_source;
    payload.utm_medium = utm.utm_medium;
    payload.utm_campaign = utm.utm_campaign;

    if (type === 'event' || type === 'web_vital') {
      payload.name = name || '';
      payload.properties = properties || {};
    }
    if (type === 'web_vital') {
      if (properties && typeof properties.value === 'number') payload.value = properties.value;
      if (properties && typeof properties.rating === 'string') payload.rating = properties.rating;
    }

    var body = JSON.stringify(payload);
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
      return;
    }
    fetch(endpoint, {
      body: body,
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      method: 'POST',
    }).catch(function () {});
  }

  function trackPageview() {
    var currentPage = window.location.pathname + window.location.search;
    if (currentPage === lastPage) return;
    lastPage = currentPage;
    send('pageview');
  }

  trackPageview();

  var origPushState = history.pushState;
  history.pushState = function () {
    origPushState.apply(this, arguments);
    setTimeout(trackPageview, 0);
  };

  var origReplaceState = history.replaceState;
  history.replaceState = function () {
    origReplaceState.apply(this, arguments);
    setTimeout(trackPageview, 0);
  };

  window.addEventListener('popstate', function () {
    setTimeout(trackPageview, 0);
  });

  var previousPulse = window.pulse;
  window.pulse = function (type, name, properties) {
    if (type === 'event') {
      send('event', name, properties);
      return;
    }
    if (typeof previousPulse === 'function') {
      previousPulse.apply(this, arguments);
    }
  };

  function rating(name, value) {
    var thresholds = {
      LCP: [2500, 4000],
      CLS: [0.1, 0.25],
      INP: [200, 500],
      FCP: [1800, 3000],
      TTFB: [800, 1800],
    }[name];
    if (!thresholds) return 'unknown';
    if (value <= thresholds[0]) return 'good';
    if (value <= thresholds[1]) return 'needs-improvement';
    return 'poor';
  }

  function sendVital(name, value) {
    if (!Number.isFinite(value)) return;
    var rounded = name === 'CLS' ? Math.round(value * 1000) / 1000 : Math.round(value);
    if (sentVitals[name] === rounded) return;
    sentVitals[name] = rounded;
    send('web_vital', name, { value: rounded, rating: rating(name, rounded) });
  }

  function observeVitals() {
    if (typeof PerformanceObserver !== 'function') return;

    try {
      var nav = performance.getEntriesByType('navigation')[0];
      if (nav) sendVital('TTFB', nav.responseStart);
    } catch (_) {}

    try {
      var paintEntries = performance.getEntriesByType('paint') || [];
      for (var i = 0; i < paintEntries.length; i++) {
        if (paintEntries[i].name === 'first-contentful-paint') {
          sendVital('FCP', paintEntries[i].startTime);
        }
      }
    } catch (_) {}

    var lcp = 0;
    var cls = 0;
    var inp = 0;

    try {
      new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        for (var i = 0; i < entries.length; i++) lcp = entries[i].startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (_) {}

    try {
      new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        for (var i = 0; i < entries.length; i++) {
          if (!entries[i].hadRecentInput) cls += entries[i].value || 0;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (_) {}

    try {
      new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        for (var i = 0; i < entries.length; i++) {
          var duration = entries[i].duration || 0;
          if (duration > inp) inp = duration;
        }
      }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
    } catch (_) {}

    function flushFinalVitals() {
      if (lcp) sendVital('LCP', lcp);
      if (cls) sendVital('CLS', cls);
      if (inp) sendVital('INP', inp);
    }

    window.addEventListener('pagehide', flushFinalVitals);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flushFinalVitals();
    });
  }

  observeVitals();
})();`;
}

export const NOOP_SCRIPT = "(function () { 'use strict'; })();";
