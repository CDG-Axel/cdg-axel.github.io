const params = new URL(import.meta.url).searchParams;

const GA_ID = params.get('key');
const ALLOWED = params.get('allowed') || '';
const STORAGE_KEY = 'analytics_consent';
const GRANTED = 'granted';
const GOOGLE_COOKIE = /^(_ga(_.*)?|_gid|_gat.*)$/;

let analyticsStarted = false;

// Вызовы до согласия игнорируются, поэтому проект может вызывать gtag(...) всегда
function gtag() {
  if (analyticsStarted) dataLayer.push(arguments);
}

function adConsent(letter) {
  return ALLOWED.includes(letter) ? 'granted' : 'denied';
}

function enableAnalytics() {
  if (analyticsStarted) return;
  analyticsStarted = true;

  window.dataLayer = window.dataLayer || [];

  gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: adConsent('s'),
    ad_user_data: adConsent('u'),
    ad_personalization: adConsent('p'),
  });
  gtag('js', new Date());
  gtag('config', GA_ID);

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

// cookie могла быть выставлена на родительский домен, поэтому пробуем все варианты
function deleteCookie(name) {
  const expired = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  document.cookie = expired;

  const parts = location.hostname.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const domain = parts.slice(i).join('.');
    document.cookie = `${expired}; domain=${domain}`;
    document.cookie = `${expired}; domain=.${domain}`;
  }
}

function deleteGoogleCookies() {
  document.cookie
    .split(';')
    .map(item => item.split('=')[0].trim())
    .filter(name => GOOGLE_COOKIE.test(name))
    .forEach(deleteCookie);
}

function resetConsent() {
  deleteGoogleCookies();
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

function showBanner() {
  const banner = document.getElementById('cookie-banner');
  banner.style.display = 'flex';

  function applyChoice(choice) {
    localStorage.setItem(STORAGE_KEY, choice);
    banner.style.display = 'none';
    if (choice === GRANTED) enableAnalytics();
  }

  banner.querySelector('[data-consent="accept"]').addEventListener('click', () => applyChoice(GRANTED));
  banner.querySelector('[data-consent="decline"]').addEventListener('click', () => applyChoice('denied'));
}

function start() {
  window.gtag = gtag;

  if (!GA_ID) {
    console.warn('consent.js: не указан параметр key, аналитика не запускается');
    return;
  }

  document.addEventListener('click', e => {
    if (e.target.closest('[data-consent="reset"]')) {
      e.preventDefault();
      resetConsent();
    }
  });

  const choice = localStorage.getItem(STORAGE_KEY);

  if (choice === GRANTED) enableAnalytics();
  else if (choice === null) showBanner();
}

start();
