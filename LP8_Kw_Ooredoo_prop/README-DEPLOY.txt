Kuwait Ooredoo — Premium Movie (PropellerAds)
=============================================

Folder: LP8_Kw_Ooredoo_prop/
UI: Premium Movies (RTL, banner + OTP form)
Service: Premium Movie | KW Ooredoo | cid=3084
Price: 800 fils/week (free 24h then paid)
Unsub: UNSUB 5 → 50908
PIN: 4 digits
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=855

sessionKey: sendpin may return sessionKey and/or ti — both are stored and sent on verifypin.
This service has no separate Antifraud API in the Zeen doc. Do not call clkstrm check-pin from the LP.

Flow
----
index (+965 MSISDN) → sendpin → pin.html → verifypin
→ Propeller postback → thankyou.html → CPportal cid=855

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=0.8

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 0.8

Campaign URL
------------
https://click2funbox.com/kw_lp8_ordo/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/kw_lp8_ordo/

Live:
  https://click2funbox.com/kw_lp8_ordo/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/kw_lp8_ordo/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/kw_lp8_ordo/php-test.php
4. Test LP:  https://click2funbox.com/kw_lp8_ordo/?clickid=TEST123

MSISDN: Kuwait +965, local 8 digits starting with 5, 6 or 9.
Default language: Arabic (English toggle).

Local test
----------
  python3 serve.py
  http://127.0.0.1:8098/?clickid=TEST123

Files
-----
index.html / pin.html / thankyou.html
script.js / clkstrm-af.js / zeen-api.php / propeller-pb.php / php-test.php / serve.py
assets/style.css / assets/premium_movies.jpg
README-DEPLOY.txt
