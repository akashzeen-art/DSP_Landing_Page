Botswana Orange — Premium games (Advertizer)
============================================

Folder: LP10_BW_ORNGE_ADVER/
UI: LP10_BW_ORNGE_PROP Theme-496 — EN
Service: Premium games | Orange Botswana | cid=3198
Price: 3.56 BWP / day
Unsub: STOP PG → 15020
PIN: 4 digits
API host: http://64.225.85.48/adnet/
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=947
Antifraud: None

API (Zeen adnet)
----------------
sendpin      ?cid=3198&msisdn=&click_id=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey=
verifypin    ?cid=3198&msisdn=&click_id=&otp=&user_ip=&ua=&pub_id=&sub_pub_id=&sessionKey=
checkstatus  ?cid=3198&msisdn=
Success: {"status":true,"msg":"...","sessionKey":"..."}

MSISDN: Botswana +267, local 8 digits starting with 7.

Flow
----
index (+267 MSISDN) → sendpin → same-page PIN → verifypin
→ Advertizer postback → thankyou.html → CPportal cid=947

verifypin: pass tid from sendpin success
  (resp.tid | resp.data.tid | resp.ti | sessionKey)
  as tid, ti, sessionKey, data[tid], data[req_id]

Advertizer postback (after successful PIN verify):
  http://postback.advertizer.com/pb.php?clickid={clickid}&txn_id={clickid}&amount=1&advertiser_id=Zeen1041&key=a5b193ada1cbd22a987bfe876496ac40

  Fired once via advertizer-pb.php (S2S).
  Skipped if clickid is missing, {clickid}, [[subid]], or local_*.
  amount = 1

Campaign URL
------------
http://click2funbox.com/LP10_BW_ORNGE_ADVER/?clickid={clickid}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP10_BW_ORNGE_ADVER/

Live:
  http://click2funbox.com/LP10_BW_ORNGE_ADVER/?clickid={clickid}

1. Create folder oman/LP10_BW_ORNGE_ADVER/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: http://click2funbox.com/LP10_BW_ORNGE_ADVER/php-test.php
4. Test LP:  http://click2funbox.com/LP10_BW_ORNGE_ADVER/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8139/?clickid=TEST123

Files
-----
index.html / thankyou.html / styles.css / script.js
zeen-api.php / advertizer-pb.php / php-test.php / serve.py
assets/downloadx.gif / logo_phone.png / subpage.png / loadingtab.gif
README-DEPLOY.txt
