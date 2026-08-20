Kuwait Ooredoo — Premium Movie (PropellerAds)
=============================================

Folder: LP7_Kw_Ordo_prop/
UI: Bluescreen (same as LP7_Prop_Oman_Gamerz) — AR/EN, 965 prefix, heartbeat field
Service: Premium Movie | KW Ooredoo | cid=3084
Price: 800 fils/week (free 24h then paid, VAT included)
Unsub: UNSUB 5 → 50908
PIN: 4 digits
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=855

Flow
----
index (+965 MSISDN) → sendpin → same-page PIN (or pin.html) → verifypin
→ Propeller postback → thankyou.html → CPportal cid=855

sessionKey: sendpin may return sessionKey and/or ti — both are stored and sent on verifypin.

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=0.8

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 0.8

Campaign URL
------------
https://click2funbox.com/LP7_Kw_Ordo_prop/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP7_Kw_Ordo_prop/

Live:
  https://click2funbox.com/LP7_Kw_Ordo_prop/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/LP7_Kw_Ordo_prop/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP7_Kw_Ordo_prop/php-test.php
4. Test LP:  https://click2funbox.com/LP7_Kw_Ordo_prop/?clickid=TEST123

MSISDN: Kuwait +965, local 8 digits starting with 5, 6 or 9.
Default language: Arabic (AR/EN select).

Local test
----------
  python3 serve.py
  http://127.0.0.1:8108/?clickid=TEST123

Files
-----
index.html / pin.html / thankyou.html
script.js / zeen-api.php / propeller-pb.php / php-test.php / serve.py
assets/bluescreen.css / assets/premium_movies.jpg
README-DEPLOY.txt
