UAE Etisalat — Gamify Inapp (Google / fun-mediacontent.com)
===========================================================

Folder: fun-mediacontent.com/LP12_GOG_UAE/
UI: CuriousCubs steps (header + lang + 3 steps + phone/PIN panel)
Service: Gamify Inapp | UAE Etisalat | cid=3146
Price: AED 3.25 / day
Opt-in: BARD → 1111
Opt-out: C BARD → 1111
PIN: 4 digits
API: http://64.225.85.48/adnet/
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=933

MSISDN: UAE +971, local 9 digits starting with 5 (Etisalat).
Languages: EN (default) / AR

Google Ads (AW-18261487745)
---------------------------
index.html (LP):
  gtag config AW-18261487745
  conversion: AW-18261487745/SpHfCP-v2swcEIHh4INE  (LP_Pageview)

pin.html (OTP / intermediate):
  gtag config AW-18261487745 only

thankyou.html:
  gtag config AW-18261487745
  conversion: AW-18261487745/-XxYCI_Q8cwcEIHh4INE  (Lp-Pageview-Thankyou)

API (adnet)
-----------
sendpin    ?cid=3146&msisdn=&click_id=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey=
verifypin  ?cid=3146&msisdn=&click_id=&otp=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey=
checkstatus?cid=3146&msisdn=

Flow
----
index (+971 MSISDN, step 2) → sendpin → pin.html (step 3, OTP gtag)
→ verifypin → thankyou.html → CPportal cid=933

Campaign URL
------------
https://fun-mediacontent.com/LP12_GOG_UAE/?clickid={CLICK_ID}

Deploy
------
Server path:
  /var/www/vaszeen/zeen_lp/fun-mediacontent.com/LP12_GOG_UAE/

Live:
  https://fun-mediacontent.com/LP12_GOG_UAE/?clickid={CLICK_ID}

1. Upload ALL files from this folder (including images/)
2. Test PHP: https://fun-mediacontent.com/LP12_GOG_UAE/php-test.php
3. Test LP:  https://fun-mediacontent.com/LP12_GOG_UAE/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8125/?clickid=TEST123

Files
-----
index.html / pin.html / thankyou.html / styles.css / script.js
zeen-api.php / php-test.php / serve.py / README-DEPLOY.txt
images/cc-logo.svg / language.svg / ae.svg / arrow-down.svg / pin.svg
