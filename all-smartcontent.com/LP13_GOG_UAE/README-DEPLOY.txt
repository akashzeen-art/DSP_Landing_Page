UAE Etisalat — foodie (Google / all-smartcontent.com)
=====================================================

Folder: all-smartcontent.com/LP13_GOG_UAE/
UI: Holaa-style (main-wrap, accordion, reasons, sticky CTA) — EN / AR
Service: foodie | Etisalat UAE | cid=3186
Price: AED 3.25 / day
Unsub: C FODD → 1111
PIN: 4 digits
API host: http://64.225.85.48/adnet/
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=948
Antifraud: None

API (Zeen adnet)
----------------
sendpin      ?cid=3186&msisdn=&click_id=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey=
verifypin    ?cid=3186&msisdn=&click_id=&otp=&user_ip=&ua=&pub_id=&sub_pub_id=&sessionKey=
checkstatus  ?cid=3186&msisdn=
Success: {"status":true,"msg":"...","sessionKey":"..."}

MSISDN: UAE +971, local 9 digits starting with 5.
Default pub_id: google

Flow
----
index (+971 MSISDN + agree checkbox) → sendpin → same-page PIN → verifypin
→ thankyou.html (Google Thank_You conversion) → CPportal cid=948

Google Ads (AW-18322603599)
---------------------------
index.html:
  gtag config AW-18322603599

thankyou.html:
  gtag config + conversion O9ZpCK-B-PEcEM_88qBE

Campaign URL
------------
https://all-smartcontent.com/LP13_GOG_UAE/?clickid={clickid}

Deploy → all-smartcontent.com
-----------------------------
Upload to:
  /var/www/vaszeen/zeen_lp/all-smartcontent.com/LP13_GOG_UAE/

Live:
  https://all-smartcontent.com/LP13_GOG_UAE/?clickid={clickid}

1. Create folder all-smartcontent.com/LP13_GOG_UAE/
2. Upload ALL files (including images/)
3. Test PHP: https://all-smartcontent.com/LP13_GOG_UAE/php-test.php
4. Test LP:  https://all-smartcontent.com/LP13_GOG_UAE/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8140/?clickid=TEST123

Files
-----
index.html / thankyou.html / styles.css / script.js
zeen-api.php / php-test.php / serve.py
images/logo.svg / c-1.svg / c-2.svg / c-3.svg / c-4.svg
README-DEPLOY.txt
