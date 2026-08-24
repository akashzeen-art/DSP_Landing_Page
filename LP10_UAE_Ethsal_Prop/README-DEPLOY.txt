UAE Etisalat — Gamespro (PropellerAds)
======================================

Folder: LP10_UAE_Ethsal_Prop/
UI: Theme-496 (green Continue, heartbeat phone field, GIF hero) — AR/EN
Service: Gamespro | UAE Etisalat | cid=3102
Sub KW: GWG | Unsub: C GWG → 1111
Opt-in/out / Sender: 1111
PIN: 4 digits
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=901

Flow
----
index (+971 MSISDN) → sendpin → same-page PIN → verifypin
→ Propeller postback → thankyou.html → CPportal cid=901

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=1

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 1  (change in script.js if campaign payout differs)

Campaign URL
------------
https://click2funbox.com/LP10_UAE_Ethsal_Prop/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP10_UAE_Ethsal_Prop/

Live:
  https://click2funbox.com/LP10_UAE_Ethsal_Prop/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/LP10_UAE_Ethsal_Prop/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP10_UAE_Ethsal_Prop/php-test.php
4. Test LP:  https://click2funbox.com/LP10_UAE_Ethsal_Prop/?clickid=TEST123

MSISDN: UAE +971, local 9 digits starting with 5 (Etisalat).
Default language: Arabic (AR/EN select).
No separate antifraud API in Zeen doc — sessionKey passed if present.

Local test
----------
  python3 serve.py
  http://127.0.0.1:8111/?clickid=TEST123

Files
-----
index.html / pin.html / thankyou.html / styles.css
script.js / zeen-api.php / propeller-pb.php / php-test.php / serve.py
assets/downloadx.gif / logo_phone.png / subpage.png / loadingtab.gif
README-DEPLOY.txt
