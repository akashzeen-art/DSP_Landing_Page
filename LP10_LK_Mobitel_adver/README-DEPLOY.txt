LK Mobitel — ZD X Gamez (Advertizer)
====================================

Folder: LP10_LK_Mobitel_adver/
UI: Theme-496 (same as LP10_KSA_mobly_prop) — EN/SI
Service: ZD X Gamez | Mobitel Sri Lanka | cid=3153
Price: 10 LKR / day
Short code: 85868 | Unsub: C XG
PIN: 4 digits
API: http://64.225.85.48/adnet/
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=291

MSISDN: Sri Lanka +94, local 9 digits starting with 7 (Mobitel).
No separate antifraud in Zeen doc — sessionKey forwarded if present.

API (adnet)
-----------
sendpin    ?cid=3153&msisdn=&click_id=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey=
verifypin  ?cid=3153&msisdn=&click_id=&otp=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey=
checkstatus?cid=3153&msisdn=

Flow
----
index (+94 MSISDN) → sendpin → same-page PIN → verifypin
→ Advertizer postback → thankyou.html → CPportal cid=291

Advertizer postback (after successful PIN verify):
  http://postback.advertizer.com/pb.php?clickid={clickid}&txn_id={clickid}&amount=1&advertiser_id=Zeen1041&key=a5b193ada1cbd22a987bfe876496ac40

  clickid = real [[subid]] from campaign URL (?clickid=)
  amount  = 1

Campaign URL
------------
https://click2funbox.com/LP10_LK_Mobitel_adver/?clickid=[[subid]]&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP10_LK_Mobitel_adver/

Live:
  https://click2funbox.com/LP10_LK_Mobitel_adver/?clickid=[[subid]]&zoneid={zone_id}

1. Create folder oman/LP10_LK_Mobitel_adver/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP10_LK_Mobitel_adver/php-test.php
4. Test LP:  https://click2funbox.com/LP10_LK_Mobitel_adver/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8127/?clickid=TEST123

Files
-----
index.html / pin.html / thankyou.html / styles.css / script.js
zeen-api.php / advertizer-pb.php / php-test.php / serve.py
assets/downloadx.gif / logo_phone.png / subpage.png / loadingtab.gif
README-DEPLOY.txt
