/* Injected by mock/server.mjs into every served page (the mirror on disk is untouched).
 * - Tilda form submits (https://forms.tildaapi.<zone>/procces/) -> local mock
 * - analytics / pixels -> swallowed, so the prototype never pollutes the client's stats
 * - CDN URLs that Tilda scripts build at runtime ("https://static.tildacdn." + zone + ...) -> local mirror
 */
(function () {
  var FORMS = /^(?:https?:)?\/\/forms\.tilda(?:api|cdn)\.[a-z]+\/procces\//i;
  var BLOCK = /(mc\.yandex\.ru|top-fwz1\.mail\.ru|facebook\.(?:com|net)|vk\.com\/rtrg|stat\.tildaapi\.|sysstat\.tildacdn\.|tilda-stat-|google-analytics|googletagmanager)/i;
  var CDN = /^(?:https?:)?\/\/(static\d?|neo)\.tildacdn\.[a-z]+\//i;
  var CDN_G = /(?:https?:)?\/\/(static\d?|neo)\.tildacdn\.[a-z]+\//gi;
  var toLocal = function (_m, host) { return host.toLowerCase() === 'neo' ? '/neo.tildacdn.com/' : '/static.tildacdn.com/'; };

  function rewrite(url) {
    url = String(url);
    if (FORMS.test(url)) return url.replace(FORMS, '/__mock/tilda/procces/');
    if (CDN.test(url)) return url.replace(CDN, toLocal);
    return url;
  }

  var open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    var args = Array.prototype.slice.call(arguments);
    args[1] = BLOCK.test(String(url)) ? 'data:,' : rewrite(url);
    if (args[1] !== String(url)) console.info('[mock] XHR', url, '->', args[1]);
    return open.apply(this, args);
  };

  if (window.fetch) {
    var f = window.fetch;
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : input && input.url;
      if (url && BLOCK.test(url)) return Promise.resolve(new Response('', { status: 204 }));
      if (url && FORMS.test(url)) return f.call(this, rewrite(url), init);
      return f.apply(this, arguments);
    };
  }

  if (navigator.sendBeacon) {
    var beacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url, data) {
      return BLOCK.test(String(url)) ? true : beacon(url, data);
    };
  }

  // <script src>, <link href>, <img src> created at runtime: trackers -> blank, CDN -> mirror
  function hook(proto, prop, blank) {
    var desc = Object.getOwnPropertyDescriptor(proto, prop);
    Object.defineProperty(proto, prop, {
      get: desc.get,
      set: function (v) { desc.set.call(this, BLOCK.test(String(v)) ? blank : rewrite(v)); },
      configurable: true,
    });
  }
  hook(HTMLScriptElement.prototype, 'src', 'data:text/javascript,');
  hook(HTMLLinkElement.prototype, 'href', 'data:text/css,');
  hook(HTMLImageElement.prototype, 'src', 'data:,');
  var setAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if (/^(src|href)$/i.test(name) && /^(SCRIPT|LINK|IMG)$/.test(this.tagName)) {
      value = BLOCK.test(String(value)) ? 'data:,' : rewrite(value);
    }
    return setAttr.call(this, name, value);
  };

  // <style> blocks injected by scripts (e.g. phone-mask flags sprite)
  new MutationObserver(function (records) {
    records.forEach(function (r) {
      r.addedNodes.forEach(function (n) {
        if (n.tagName === 'STYLE' && CDN_G.test(n.textContent)) n.textContent = n.textContent.replace(CDN_G, toLocal);
        CDN_G.lastIndex = 0;
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.__CANYON_MOCK__ = true;
})();
