const DAY_MS = 24 * 60 * 60 * 1000;

const splitPair = (pair) => {
  const separatorIndex = pair.indexOf('=');
  return separatorIndex === -1 ? { name: pair, value: '' } : { name: pair.slice(0, separatorIndex), value: pair.slice(separatorIndex + 1) };
};

const CookieManager = {
  set(name, value, days = 7, options = {}) {
    const { path = '/', sameSite = 'Lax', secure = window.location.protocol === 'https:' } = options;
    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=${path}; SameSite=${sameSite}`;

    if (days) {
      cookie += `; expires=${new Date(Date.now() + days * DAY_MS).toUTCString()}`;
    }
    if (secure) cookie += '; Secure';

    document.cookie = cookie;
  },

  get(name, renewDays = null) {
    const encodedName = encodeURIComponent(name);
    const pair = document.cookie.split('; ').find((item) => splitPair(item).name === encodedName);

    if (!pair) return null;

    const value = decodeURIComponent(splitPair(pair).value);

    if (renewDays !== null) {
      this.set(name, value, renewDays);
    }
    return value;
  },

  delete(name, path = '/') {
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=${path}; SameSite=Lax`;
  },
};

export default CookieManager;
