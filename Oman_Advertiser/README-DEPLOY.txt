Oman Advertizer — loaderlite UI
===============================

Folder: Oman_Advertiser/
UI: loaderlite / FileShare (citimob sa loaderlite)
Integration: Zeen Digital cid=3051 + Advertizer postback

Service
-------
ZD Game — Omantel Oman
cid=3051 | PIN 4 | 0.25 OMR/day
Unsub: UNSUB IVID → 92149
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=388

Flow
----
index (+968 MSISDN) → sendpin → pin.html → verifypin
→ Advertizer postback → checkstatus → portal

Zeen APIs
---------
sendpin:     http://64.225.85.48/adnet/sendpin?cid=3051&msisdn=...
verifypin:   http://64.225.85.48/adnet/verifypin?cid=3051&msisdn=...&otp=...
checkstatus: http://64.225.85.48/adnet/checkstatus?cid=3051&msisdn=...

Advertizer postback
-------------------
http://postback.advertizer.com/pb.php?clickid={clickid}&txn_id={clickid}&amount=1&advertiser_id=Zeen1041&key=a5b193ada1cbd22a987bfe876496ac40

clickid = real {clickid} from campaign URL
Fired only after PIN verify success, via advertizer-pb.php (S2S).
Not fired if clickid is missing, {clickid}, or a local_ test id.

Campaign URL
------------
https://click2funbox.com/om_adv/?clickid={clickid}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/om_adv/

Live:
  https://click2funbox.com/om_adv/?clickid={clickid}

1. Create folder oman/om_adv/
2. Upload ALL files from this folder
3. Test PHP: https://click2funbox.com/om_adv/php-test.php
4. Test LP:  https://click2funbox.com/om_adv/?clickid=TEST123

MSISDN: Oman +968, local 8 digits starting with 7 or 9.
Default language: Arabic (English toggle).

Local test
----------
  python3 serve.py
  http://127.0.0.1:8088/?clickid=TEST123

Files
-----
index.html / pin.html / styles.css
pict.svg / icon.svg / icn-check.svg / secure.svg
script.js / zeen-api.php / advertizer-pb.php / php-test.php / serve.py
README-DEPLOY.txt
