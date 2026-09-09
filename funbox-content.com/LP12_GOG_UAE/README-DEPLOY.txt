UAE Etisalat — Gamify Inapp (Google / funbox-content.com)
=========================================================

Folder: funbox-content.com/LP12_GOG_UAE/
UI: LP12_GOG_3Oper_KW CuriousCubs (index → pin → thankyou)
Service: Gamify Inapp | UAE Etisalat | cid=3146
Price: AED 3.25 / day
Opt-in: BARD → 1111
Opt-out: C BARD → 1111
PIN: 4 digits
API: http://64.225.85.48/adnet/
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=933

MSISDN: UAE +971, local 9 digits starting with 5 (Etisalat).
Languages: EN (default) / AR (CTA: أشترك)
pub_id default: google

Google Ads (AW-18261554290)
---------------------------
index.html (LP):
  gtag config AW-18261554290
  conversion: AW-18261554290/LYDqCOXB8e4cEPLo5INE  (Page_view)

pin.html (OTP / intermediate):
  gtag config AW-18261554290 only

thankyou.html:
  gtag config AW-18261554290
  conversion: AW-18261554290/6ko8CJXU8e4cEPLo5INE  (LP_Thankyou)

API (adnet)
-----------
sendpin    ?cid=3146&msisdn=&click_id=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey=
verifypin  ?cid=3146&msisdn=&click_id=&otp=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey=
checkstatus?cid=3146&msisdn=

Flow
----
index (+971 MSISDN) → sendpin → pin.html → verifypin
→ thankyou.html → CPportal cid=933

Campaign URL
------------
https://funbox-content.com/LP12_GOG_UAE/?clickid={CLICK_ID}

Deploy
------
Server path:
  /var/www/vaszeen/zeen_lp/funbox-content.com/LP12_GOG_UAE/

Live:
  https://funbox-content.com/LP12_GOG_UAE/?clickid={CLICK_ID}

1. Upload ALL files (including images/)
2. Ensure nginx php-fpm uses php8.3-fpm.sock (same as other funbox sites)
3. Test PHP: https://funbox-content.com/LP12_GOG_UAE/php-test.php
4. Test LP:  https://funbox-content.com/LP12_GOG_UAE/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8140/?clickid=TEST123

Files
-----
index.html / pin.html / thankyou.html / styles.css / script.js
zeen-api.php / php-test.php / serve.py / README-DEPLOY.txt
images/LOGO.png / language.svg / ae.svg / arrow-down.svg / pin.svg / cc-logo.svg
