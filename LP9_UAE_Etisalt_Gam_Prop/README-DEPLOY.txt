UAE Etisalat — Gamespro (PropellerAds)
======================================

Folder: LP9_UAE_Etisalt_Gam_Prop/
UI: Theme 340 dark modal (Watch / Download → MSISDN → PIN) — from LP9_Onck_MTN_Prop
Languages: Arabic (default) + English

Service: Gamespro | UAE Etisalat | cid=3102
Sub KW: GWG | Unsub: C GWG → 1111
Opt-in/out / Sender: 1111
PIN: 4 digits
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=901
Antifraud: None (sessionKey forwarded if present)

API (adnet)
-----------
Host: http://64.225.85.48/adnet/
  sendpin?cid=3102&msisdn=&click_id=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey=
  verifypin?cid=3102&msisdn=&click_id=&otp=&user_ip=&ua=&pub_id=&sub_pub_id=&sessionKey=
  checkstatus?cid=3102&msisdn=
Success: {"status":true,"msg":"Pin Sent Success(2001)"} / Pin Verified Success(2003)

MSISDN: UAE +971, local 9 digits starting with 5 (Etisalat).

Flow
----
index (modal +971 MSISDN) → sendpin → PIN → verifypin
→ Propeller postback → thankyou.html → CPportal cid=901

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=1

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 1

Campaign URL
------------
https://click2funbox.com/LP9_UAE_Etisalt_Gam_Prop/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP9_UAE_Etisalt_Gam_Prop/

Live:
  https://click2funbox.com/LP9_UAE_Etisalt_Gam_Prop/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/LP9_UAE_Etisalt_Gam_Prop/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP9_UAE_Etisalt_Gam_Prop/php-test.php
4. Test LP:  https://click2funbox.com/LP9_UAE_Etisalt_Gam_Prop/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8116/?clickid=TEST123

Files
-----
index.html / thankyou.html / styles.css / script.js
zeen-api.php / propeller-pb.php / php-test.php / serve.py
assets/logo.png / player.svg / fonts.css / …
README-DEPLOY.txt
