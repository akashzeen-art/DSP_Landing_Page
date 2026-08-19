Cameroon Dual Operator — OnCook (MTN) + OneGaming (Orange) PropellerAds
=======================================================================

Folder: LP3_OnCook_MTN_prop/
UI: same as LP3_Srilanka_LK_Mobitel_Propellar (Watch Now / video frame)
Languages: French (default) + English

Operators
---------
1) Orange — OneGaming — cid=496 — 100 CFA/day — PIN 4
   Host: http://159.89.163.174/prod/CMcmp/
   Redirect: http://159.89.163.174/prod/CMcmp/redirect?cid=496&msisdn={msisdn}

2) MTN — OnCook — cid=17 — 100 CFA/day — PIN 4
   Host: http://168.144.122.72/prod/CMcmp/
   Redirect: http://168.144.122.72/prod/CMcmp/redirect?cid=17&msisdn={msisdn}

API (CMcmp, not Zeen adnet)
---------------------------
sendPIN   ?cid=&msisdn=&ip=
verifyPIN ?cid=&msisdn=&pin=&ip=
status    ?cid=&msisdn=
Success: {"response":"SUCCESS","errorMessage":"..."}

MSISDN: Cameroon +237, local 9 digits starting with 6.
(Orange sample in the vendor doc used 241; this LP sends 237 as Country = Cameroon.)

Flow
----
index (+237 MSISDN) → operator.html → sendPIN → pin.html → verifyPIN
→ Propeller postback → thankyou.html → CMcmp redirect

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=100

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 100

Campaign URL
------------
https://click2funbox.com/LP3_Onck_MTN_Prop/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP3_Onck_MTN_Prop/

Live:
  https://click2funbox.com/LP3_Onck_MTN_Prop/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/LP3_Onck_MTN_Prop/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP3_Onck_MTN_Prop/php-test.php
4. Test LP:  https://click2funbox.com/LP3_Onck_MTN_Prop/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8100/?clickid=TEST123

Files
-----
index.html / operator.html / pin.html / thankyou.html
styles.css / assets/ (hd.png, mov.jpg, leftbar.png, rightbar.png, fonts.css)
script.js / zeen-api.php / propeller-pb.php / php-test.php / serve.py
README-DEPLOY.txt
