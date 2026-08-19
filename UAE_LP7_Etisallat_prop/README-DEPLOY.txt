UAE Etisalat — Super Funbox (PropellerAds)
==========================================

Folder: UAE_LP7_Etisallat_prop/
UI: Offerxposure bluescreen (AR/EN, 971 prefix, heartbeat field)
Service: Super Funbox | UAE Etisalat | cid=3085
Price: AED 3.25/day (free 24h then paid, VAT included)
Unsub: STOP SUPER → 1156
PIN: 4 digits
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=919

Flow
----
index (+971 MSISDN) → sendpin → same-page PIN (or pin.html) → verifypin
→ Propeller postback → thankyou.html → CPportal cid=919

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=3.25

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 3.25

Campaign URL
------------
https://click2funbox.com/uae_lp7_etsl/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/uae_lp7_etsl/

Live:
  https://click2funbox.com/uae_lp7_etsl/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/uae_lp7_etsl/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/uae_lp7_etsl/php-test.php
4. Test LP:  https://click2funbox.com/uae_lp7_etsl/?clickid=TEST123

MSISDN: UAE +971, local 9 digits starting with 5.
Default language: Arabic (AR/EN select).

Local test
----------
  python3 serve.py
  http://127.0.0.1:8099/?clickid=TEST123

Files
-----
index.html / pin.html / thankyou.html
script.js / zeen-api.php / propeller-pb.php / php-test.php / serve.py
assets/bluescreen.css / assets/superfunbox.png
README-DEPLOY.txt
