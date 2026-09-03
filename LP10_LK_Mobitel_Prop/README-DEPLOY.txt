LK Mobitel — ZD X Gamez (PropellerAds)
======================================

Folder: LP10_LK_Mobitel_Prop/
UI: Theme-496 (same as LP10_KSA_mobly_prop) — EN/SI
Service: ZD X Gamez | Mobitel Sri Lanka | cid=3154
Price: 10 LKR / day
Short code: 85868 | Unsub: C XG
PIN: 4 digits
API: http://64.225.85.48/adnet/
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=291

MSISDN: Sri Lanka +94, local 9 digits starting with 7 (Mobitel).
No separate antifraud in Zeen doc — sessionKey forwarded if present.

API (adnet)
-----------
sendpin    ?cid=3154&msisdn=&click_id=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey=
verifypin  ?cid=3154&msisdn=&click_id=&otp=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey=
checkstatus?cid=3154&msisdn=

Flow
----
index (+94 MSISDN) → sendpin → same-page PIN → verifypin
→ Propeller postback → thankyou.html → CPportal cid=291

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=10

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 10

Campaign URL
------------
https://click2funbox.com/LP10_LK_Mobitel_Prop/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP10_LK_Mobitel_Prop/

Live:
  https://click2funbox.com/LP10_LK_Mobitel_Prop/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/LP10_LK_Mobitel_Prop/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP10_LK_Mobitel_Prop/php-test.php
4. Test LP:  https://click2funbox.com/LP10_LK_Mobitel_Prop/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8126/?clickid=TEST123

Files
-----
index.html / pin.html / thankyou.html / styles.css / script.js
zeen-api.php / propeller-pb.php / php-test.php / serve.py
assets/downloadx.gif / logo_phone.png / subpage.png / loadingtab.gif
README-DEPLOY.txt
