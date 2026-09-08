Botswana Orange — Premium games (PropellerAds)
==============================================

Folder: LP10_BW_ORNGE_PROP/
UI: LP10_CIV_ORNG_PROP Theme-496 — EN
Service: Premium games | Orange Botswana | cid=3183
Price: 3.56 BWP / day
Unsub: STOP PG → 15020
PIN: 4 digits
API host: http://64.225.85.48/adnet/
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=947
Antifraud: None

API (Zeen adnet)
----------------
sendpin      ?cid=3183&msisdn=&click_id=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey=
verifypin    ?cid=3183&msisdn=&click_id=&otp=&user_ip=&ua=&pub_id=&sub_pub_id=&sessionKey=
checkstatus  ?cid=3183&msisdn=
Success: {"status":true,"msg":"...","sessionKey":"..."}

MSISDN: Botswana +267, local 8 digits starting with 7.

Flow
----
index (+267 MSISDN) → sendpin → same-page PIN → verifypin
→ Propeller postback → thankyou.html → CPportal cid=947

verifypin: pass tid from sendpin success
  (resp.tid | resp.data.tid | resp.ti | sessionKey)
  as tid, ti, sessionKey, data[tid], data[req_id]

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=${PAYOUT}

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 3.56  (${PAYOUT} = price point)

Campaign URL
------------
https://click2funbox.com/LP10_BW_ORNGE_PROP/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP10_BW_ORNGE_PROP/

Live:
  https://click2funbox.com/LP10_BW_ORNGE_PROP/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/LP10_BW_ORNGE_PROP/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP10_BW_ORNGE_PROP/php-test.php
4. Test LP:  https://click2funbox.com/LP10_BW_ORNGE_PROP/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8138/?clickid=TEST123

Files
-----
index.html / thankyou.html / styles.css / script.js
zeen-api.php / propeller-pb.php / php-test.php / serve.py
assets/downloadx.gif / logo_phone.png / subpage.png / loadingtab.gif
README-DEPLOY.txt
