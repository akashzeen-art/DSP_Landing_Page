# Fix funbox-content.com PHP 502 (PIN API / zeen-api.php)
# Run on server as root. Root cause: wrong php-fpm socket → nginx 502 HTML
# → browser shows "Connection error" on operator sendpin.

set -e

echo "== Detect PHP-FPM socket =="
ls -la /run/php/ 2>/dev/null || ls -la /var/run/php/ 2>/dev/null || true

SOCK=""
# Prefer socket used by a working site (fun-mediacontent / click2funbox)
for conf in /etc/nginx/sites-enabled/* /etc/nginx/sites-available/*; do
  [ -f "$conf" ] || continue
  case "$conf" in
    *funbox*) continue ;;
  esac
  found=$(grep -oE 'unix:[^;]+' "$conf" 2>/dev/null | head -1 || true)
  if [ -n "$found" ]; then
    SOCK="${found#unix:}"
    echo "Using socket from $conf -> $SOCK"
    break
  fi
done

if [ -z "$SOCK" ]; then
  for cand in \
    /run/php/php8.3-fpm.sock \
    /run/php/php8.2-fpm.sock \
    /run/php/php8.1-fpm.sock \
    /run/php/php8.0-fpm.sock \
    /run/php/php-fpm.sock \
    /var/run/php/php8.3-fpm.sock \
    /var/run/php/php8.2-fpm.sock \
    /var/run/php/php8.1-fpm.sock; do
    if [ -S "$cand" ]; then SOCK="$cand"; break; fi
  done
fi

if [ -z "$SOCK" ]; then
  echo "ERROR: No php-fpm socket found. Install php-fpm first."
  exit 1
fi

echo "PHP socket: $SOCK"

CONF=/etc/nginx/sites-available/funbox-content.com
if [ ! -f "$CONF" ]; then
  echo "ERROR: $CONF missing. Create the vhost first."
  exit 1
fi

# Replace fastcgi_pass line(s)
sed -i -E "s|fastcgi_pass unix:[^;]+;|fastcgi_pass unix:${SOCK};|g" "$CONF"

# Ensure site enabled
ln -sf "$CONF" /etc/nginx/sites-enabled/funbox-content.com

nginx -t
systemctl reload nginx

echo "== Test PHP =="
curl -sS "https://funbox-content.com/LP12_GOG_3Oper_KW/php-test.php" || true
echo
curl -sS "https://funbox-content.com/LP12_GOG_3Oper_KW/zeen-api.php?path=sendpin&cid=3172&msisdn=96550000000&click_id=TEST&pub_id=google&sub_pub_id=0&user_ip=1.1.1.1&ua=t" | head -c 300
echo
echo "Done. Expect JSON from zeen-api (not 502 HTML)."
