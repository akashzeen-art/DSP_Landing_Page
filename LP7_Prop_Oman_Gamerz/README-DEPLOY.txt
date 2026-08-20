Oman Omantel — ZD Gamez (PropellerAds)
======================================

Folder: LP7_Prop_Oman_Gamerz/
UI: Bluescreen (AR/EN, 968 prefix, heartbeat field) — same layout as screenshot
Service: ZD Gamez | Oman Omantel | cid=2203
Price: OMR 0.25/day (free 24h then paid, VAT included)
Unsub: UNSUB IVID → 92149
PIN: 4 digits
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=388

Flow
----
index (+968 MSISDN) → sendpin → same-page PIN (or pin.html) → verifypin
→ Propeller postback → thankyou.html → CPportal cid=388

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=0.25

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 0.25

Campaign URL
------------
https://click2funbox.com/LP7_Prop_Om_Gamerz/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP7_Prop_Om_Gamerz/

Live:
  https://click2funbox.com/LP7_Prop_Om_Gamerz/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/LP7_Prop_Om_Gamerz/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP7_Prop_Om_Gamerz/php-test.php
4. Test LP:  https://click2funbox.com/LP7_Prop_Om_Gamerz/?clickid=TEST123

MSISDN: Oman +968, local 8 digits starting with 7 or 9.
Default language: Arabic (AR/EN select).

Local test
----------
  python3 serve.py
  http://127.0.0.1:8107/?clickid=TEST123

Files
-----
index.html / pin.html / thankyou.html
script.js / zeen-api.php / propeller-pb.php / php-test.php / serve.py
assets/bluescreen.css / assets/zdgamez.png
README-DEPLOY.txt
