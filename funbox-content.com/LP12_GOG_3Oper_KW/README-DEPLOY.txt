Kuwait 3-Operator — ZD GameMedias (Google / funbox-content.com)
===============================================================

Folder: funbox-content.com/LP12_GOG_3Oper_KW/
UI: LP12_GOG_IQ CuriousCubs (index → operator → pin → thankyou)
Service: ZD GameMedias | Kuwait | PIN 4 | MSISDN 8 (+965)
Languages: EN (default) / AR
pub_id default: google

Operators
---------
Ooredoo  cid=3172  portal=458
  Prepaid 1 KWD/week · Postpaid 3.5 KWD/month
  Opt-out (disclaimer): STOP2 → 1695

Zain     cid=3173  portal=942
  0.8 KWD/week
  Opt-out: unsub W7 → 95456

STC      cid=3174  portal=943
  Prepaid 0.8 KWD/week
  Opt-out: Stop1 → 50650

Disclaimer (EN/AR footer + Terms modal):
  GameMedias subscription for Zain & Ooredoo pricing / unsub / 18+ / data charges
  Support: cs@netmediasleashares.com

API: http://64.225.85.48/adnet/
  sendpin / verifypin / checkstatus

Google Ads (AW-18261554290)
---------------------------
index.html (LP):
  gtag config AW-18261554290
  conversion: AW-18261554290/LYDqCOXB8e4cEPLo5INE  (Page_view)

operator.html + pin.html (intermediate / OTP):
  gtag config AW-18261554290 only

thankyou.html:
  gtag config AW-18261554290
  conversion: AW-18261554290/6ko8CJXU8e4cEPLo5INE  (LP_Thankyou)

Flow
----
index (+965) → operator (sendpin) → pin (verifypin) → thankyou → CPportal

Campaign URL
------------
https://funbox-content.com/LP12_GOG_3Oper_KW/?clickid={CLICK_ID}

Deploy (path + SSL)
-------------------
Server path:
  /var/www/vaszeen/zeen_lp/funbox-content.com/LP12_GOG_3Oper_KW/

Live:
  https://funbox-content.com/LP12_GOG_3Oper_KW/?clickid={CLICK_ID}

ERR_CERT_COMMON_NAME_INVALID means nginx is serving ahentv.com SSL for
this host. Fix: create a dedicated vhost + Let's Encrypt cert for
funbox-content.com (see ../nginx-funbox-content.com.conf).

On the server (SSH):

1) DNS — A record for funbox-content.com (and www) → this server IP

2) Create path + upload LP files:
  sudo mkdir -p /var/www/vaszeen/zeen_lp/funbox-content.com
  # upload LP12_GOG_3Oper_KW/ into that folder
  sudo chown -R www-data:www-data /var/www/vaszeen/zeen_lp/funbox-content.com

3) Enable nginx site (HTTP first):
  sudo cp nginx-funbox-content.com.conf /etc/nginx/sites-available/funbox-content.com
  sudo ln -sf /etc/nginx/sites-available/funbox-content.com /etc/nginx/sites-enabled/
  # fix php-fpm socket in the conf if needed (ls /run/php/)
  sudo nginx -t && sudo systemctl reload nginx

4) Issue SSL certificate:
  sudo apt-get install -y certbot python3-certbot-nginx
  sudo certbot --nginx -d funbox-content.com -d www.funbox-content.com

5) Verify:
  curl -I https://funbox-content.com/LP12_GOG_3Oper_KW/
  # certificate CN/SAN must include funbox-content.com (not ahentv.com)
  openssl s_client -connect funbox-content.com:443 -servername funbox-content.com </dev/null 2>/dev/null | openssl x509 -noout -subject -ext subjectAltName

6) Test PHP + LP:
  https://funbox-content.com/LP12_GOG_3Oper_KW/php-test.php
  https://funbox-content.com/LP12_GOG_3Oper_KW/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8130/?clickid=TEST123

Files
-----
index.html / operator.html / pin.html / thankyou.html
styles.css / script.js / zeen-api.php / php-test.php / serve.py
images/ (cc-logo, language, kw, arrow-down, pin)
README-DEPLOY.txt
