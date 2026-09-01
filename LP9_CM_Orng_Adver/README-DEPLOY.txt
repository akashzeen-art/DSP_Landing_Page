Cameroon Orange — OneGaming (Advertizer)
========================================

Folder: LP9_CM_Orng_Adver/
UI: LP3 movstreamlite (Watch Now / video frame) — same as LP3_OnCook_MTN_prop
Languages: English (default) + French
Flow: index.html (MSISDN) → pin.html (PIN) → thankyou.html → redirect

Service: OneGaming | Orange Cameroon | cid=500
Price: 100 CFA / 1 day
PIN: 4 digits
API host: http://159.89.163.174/prod/CMcmp/
Redirect: http://159.89.163.174/prod/CMcmp/redirect?cid=500&msisdn={msisdn}

API (CMcmp) — vendor doc cid=500
---------------------------------
1. sendPIN
   http://159.89.163.174/prod/CMcmp/sendPIN?cid=500&msisdn={msisdn}&ip={userip}
   Success: {"response":"SUCCESS","errorMessage":"OTP Sent","sessionKey":"unique session id"}
   Fail:    {"response":"FAIL","errorMessage":"error message"}

2. verifyPIN
   http://159.89.163.174/prod/CMcmp/verifyPIN?cid=500&msisdn={msisdn}&pin={pin}&ip={userip}
   Success: {"response":"SUCCESS","errorMessage":"OTP Verified"}
   Fail:    {"response":"FAIL","errorMessage":"error message"}

3. status
   http://159.89.163.174/prod/CMcmp/status?cid=500&msisdn={msisdn}
   Active:   {"response":"ACTIVE","errorMessage":"Service is active"}
   Inactive: {"response":"INACTIVE","errorMessage":"Service is not active"}

4. redirect (after successful verifyPIN)
   http://159.89.163.174/prod/CMcmp/redirect?cid=500&msisdn={msisdn}

MSISDN format (IMPORTANT)
-------------------------
Vendor doc sample shows 241xxxxxxxx — that is a typo (241 = Gabon).
Live API requires Cameroon format: 237 + 9-digit local (starts with 6).
Example: user enters 699123456 → API msisdn=237699123456
UI shows +237; LP sends 237XXXXXXXXX to all CMcmp endpoints.
sessionKey from sendPIN success is stored and sent on verifyPIN if returned.

MSISDN: Cameroon +237, local 9 digits starting with 6.

Flow
----
index.html (+237 MSISDN, video frame) → sendPIN → pin.html (4-digit PIN)
→ verifyPIN → Advertizer postback → thankyou.html → CMcmp redirect

Advertizer postback (after successful PIN verify):
  http://postback.advertizer.com/pb.php?clickid=[[subid]]&txn_id=[[subid]]&amount=1&advertiser_id=Zeen1041&key=a5b193ada1cbd22a987bfe876496ac40

  clickid = real [[subid]] from campaign URL
  txn_id  = same as clickid
  amount  = 1

  Fired once via advertizer-pb.php (S2S). Skipped if clickid is missing or local_*.

Campaign URL
------------
https://click2funbox.com/LP9_CM_Orng_Adver/?clickid=[[subid]]&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP9_CM_Orng_Adver/

Live:
  https://click2funbox.com/LP9_CM_Orng_Adver/?clickid=[[subid]]&zoneid={zone_id}

1. Create folder oman/LP9_CM_Orng_Adver/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP9_CM_Orng_Adver/php-test.php
4. Test LP:  https://click2funbox.com/LP9_CM_Orng_Adver/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8122/?clickid=TEST123

Files
-----
index.html / pin.html / thankyou.html / styles.css / script.js
zeen-api.php / advertizer-pb.php / php-test.php / serve.py
assets/ (mov.jpg, hd.png, leftbar.png, rightbar.png, fonts.css)
README-DEPLOY.txt
