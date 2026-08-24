KSA Mobily — Playlive (PropellerAds)
====================================

Folder: LP10_KSA_mobly_prop/
UI: Theme-496 (green Continue, heartbeat phone field, GIF hero) — AR/EN
Service: Playlive | KSA Mobily | cid=3099
Price: SR 3 / day
Sub KW: PLD | Unsub: UNSUB PLD → 607110
PIN: 6 digits
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=777

Flow
----
index (+966 MSISDN) → sendpin → same-page PIN → verifypin
→ Propeller postback → thankyou.html → CPportal cid=777

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=3

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 3

Campaign URL
------------
https://click2funbox.com/LP10_KSA_mobly_prop/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP10_KSA_mobly_prop/

Live:
  https://click2funbox.com/LP10_KSA_mobly_prop/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/LP10_KSA_mobly_prop/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP10_KSA_mobly_prop/php-test.php
4. Test LP:  https://click2funbox.com/LP10_KSA_mobly_prop/?clickid=TEST123

MSISDN: KSA +966, local 9 digits starting with 5 (Mobily).
Default language: Arabic (AR/EN select).
No separate antifraud API in Zeen doc — sessionKey passed if present.

Local test
----------
  python3 serve.py
  http://127.0.0.1:8110/?clickid=TEST123

Files
-----
index.html / pin.html / thankyou.html / styles.css
script.js / zeen-api.php / propeller-pb.php / php-test.php / serve.py
assets/downloadx.gif / logo_phone.png / subpage.png / loadingtab.gif
README-DEPLOY.txt
