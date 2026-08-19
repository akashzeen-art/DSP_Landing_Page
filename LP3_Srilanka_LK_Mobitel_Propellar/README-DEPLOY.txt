Sri Lanka Dual Operator Propeller — movstreamlite UI
====================================================

Folder: LP3_Srilanka_LK_Mobitel_Propellar/
UI: same as LP3_dual_operator_palastine_advertiser (Watch Now / video frame)
Integration: same as LP1_Srilanka_LK_Mobitel_Propellar
  Zeen Digital LK Mobitel + LK Hutch + PropellerAds

Operators
---------
1) Mobitel — cid=3057 — portal cid=342 — 10 LKR/day — unsub: C XG → 85868 — PIN 4
   Service: ZD Jam Magic Escapes
2) Hutch   — cid=3058 — portal cid=288 — 10 LKR/day — unsub: C XG → 87689 — PIN 4
   Service: ZD X Gamez

Flow
----
index (+94 MSISDN) → operator.html → sendpin → pin.html → verifypin
→ Propeller postback → thankyou.html → CPportal (operator portal cid)

Propeller postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=${PAYOUT}

  visitor_id = same clickid (${SUBID}) from campaign URL
  payout     = 10 (Mobitel and Hutch)

Campaign URL
------------
https://click2funbox.com/LP3_lk_dual_prop/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP3_lk_dual_prop/

Live:
  https://click2funbox.com/LP3_lk_dual_prop/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/LP3_lk_dual_prop/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP3_lk_dual_prop/php-test.php
4. Test LP:  https://click2funbox.com/LP3_lk_dual_prop/?clickid=TEST123

MSISDN: Sri Lanka +94, local 9 digits starting with 7.
Default language: English (Sinhala toggle).

Local test
----------
  python3 serve.py
  http://127.0.0.1:8094/?clickid=TEST123

Files
-----
index.html / operator.html / pin.html / thankyou.html
styles.css / assets/ (hd.png, mov.jpg, leftbar.png, rightbar.png, fonts.css)
script.js / zeen-api.php / propeller-pb.php / php-test.php / serve.py
README-DEPLOY.txt
