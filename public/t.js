(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

  var script = document.currentScript;
  if (!script) return;

  var token = script.getAttribute('data-token');
  var endpoint = script.getAttribute('data-endpoint') || script.src.replace(/\/t\.js$/, '/api/collect');

  if (!token) return;

  var lastPage = '';

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
      url: window.location.href,
      referrer: document.referrer || '',
    };

    var utm = getUtmParams();
    payload.utm_source = utm.utm_source;
    payload.utm_medium = utm.utm_medium;
    payload.utm_campaign = utm.utm_campaign;

    if (type === 'event') {
      payload.name = name || '';
      payload.properties = properties || {};
    }

    var body = JSON.stringify(payload);

    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(body);
    }
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

  window.pulse = function (type, name, properties) {
    if (type === 'event') {
      send('event', name, properties);
    }
  };
})();
