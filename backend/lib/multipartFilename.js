/**
 * Имена в multipart: UTF-8 байты часто попадают в строку как latin1 (кракозябры).
 * Если в строке уже есть символы вне U+00FF, считаем имя уже в Unicode.
 */
function decodeMultipartUtf8Filename(name) {
  if (name == null) return '';
  const s = typeof name === 'string' ? name : String(name);
  if (!s) return '';
  if (/[^\u0000-\u00ff]/.test(s)) return s;
  try {
    const decoded = Buffer.from(s, 'latin1').toString('utf8');
    return decoded.includes('\uFFFD') ? s : decoded;
  } catch {
    return s;
  }
}

module.exports = { decodeMultipartUtf8Filename };
