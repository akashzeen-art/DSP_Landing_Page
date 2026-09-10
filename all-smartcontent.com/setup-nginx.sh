#!/usr/bin/env bash
# Run ON the server (as root), or:
#   ssh -p 5550 root@160.187.80.197 'bash -s' < setup-nginx.sh
set -euo pipefail

SITE=all-smartcontent.com
ROOT=/var/www/vaszeen/zeen_lp/all-smartcontent.com
AVAIL=/etc/nginx/sites-available/${SITE}
ENAB=/etc/nginx/sites-enabled/${SITE}

mkdir -p "$ROOT"

# Detect php-fpm socket
SOCK=""
for s in /run/php/php8.3-fpm.sock /run/php/php8.2-fpm.sock /run/php/php8.1-fpm.sock /run/php/php-fpm.sock; do
  if [[ -S "$s" ]]; then SOCK="$s"; break; fi
done
if [[ -z "$SOCK" ]]; then
  SOCK=$(ls /run/php/*.sock 2>/dev/null | head -1 || true)
fi
if [[ -z "$SOCK" ]]; then
  echo "No php-fpm socket under /run/php/ — check: ls /run/php/"
  exit 1
fi
echo "Using PHP socket: $SOCK"

cat > "$AVAIL" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name all-smartcontent.com www.all-smartcontent.com;

    root ${ROOT};
    index index.html index.php;

    access_log /var/log/nginx/all-smartcontent.com.access.log;
    error_log  /var/log/nginx/all-smartcontent.com.error.log;

    location / {
        try_files \$uri \$uri/ =404;
    }

    location ~ \\.php\$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:${SOCK};
    }

    location ~* \\.(css|js|jpg|jpeg|png|gif|svg|ico|webp|woff2?)\$ {
        expires 7d;
        access_log off;
        try_files \$uri =404;
    }

    location ~ /\\. {
        deny all;
    }
}
EOF

ln -sf "$AVAIL" "$ENAB"
nginx -t
systemctl reload nginx

echo "HTTP vhost OK."
echo "Test: curl -sS -o /dev/null -w '%{http_code}\\n' http://127.0.0.1/LP13_GOG_UAE/ -H 'Host: all-smartcontent.com'"

# SSL if certbot available
if command -v certbot >/dev/null 2>&1; then
  certbot --nginx -d all-smartcontent.com -d www.all-smartcontent.com --non-interactive --agree-tos --register-unsafely-without-email --redirect || \
  certbot --nginx -d all-smartcontent.com -d www.all-smartcontent.com --redirect || \
  echo "Certbot needs interactive run: certbot --nginx -d all-smartcontent.com -d www.all-smartcontent.com"
else
  echo "Install certbot then: certbot --nginx -d all-smartcontent.com -d www.all-smartcontent.com"
fi

ls -la "${ROOT}/LP13_GOG_UAE" | head -20
echo "Done."
