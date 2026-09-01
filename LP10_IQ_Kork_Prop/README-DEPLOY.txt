Iraq Korek — ZD Know Your Country (PropellerAds)
================================================

Folder: LP10_IQ_Kork_Prop/
UI: Theme-496 (same as LP10_IQ_Aciacll_Prop) — AR/EN
Service: ZD Know Your Country | Korek Iraq | cid=3022
Price: 300 IQD / day
Short code: 2115 | Unsub: 0
PIN: 4 digits
API: http://64.225.85.48/adnet/
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=326

Antifraud (Korek Evina)
-----------------------
Runs on PIN step only (digitalapicalls.com).
servicename=KnowYourCountry | merchantname=windowtechnologies | type=pin
Generates ti + ts → injects Evina script → DCBProtectRun event
verifypin: pass ti as sessionKey/transactionId + ts parameter

API (adnet)
-----------
sendpin    ?cid=3022&msisdn=&click_id=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey=
verifypin  ?cid=3022&msisdn=&click_id=&otp=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey={ti}&ti={ti}&ts={ts}
checkstatus?cid=3022&msisdn=

MSISDN: Iraq +964, local 10 digits starting with 75 (Korek).

Flow
----
index (+964 MSISDN) → sendpin → PIN step (Evina AF) → verifypin
→ Propeller postback → thankyou.html → CPportal cid=326

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=300

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 300

Campaign URL
------------
https://click2funbox.com/LP10_IQ_Kork_Prop/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP10_IQ_Kork_Prop/

Live:
  https://click2funbox.com/LP10_IQ_Kork_Prop/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/LP10_IQ_Kork_Prop/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP10_IQ_Kork_Prop/php-test.php
4. Test LP:  https://click2funbox.com/LP10_IQ_Kork_Prop/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8121/?clickid=TEST123

Files
-----
index.html / pin.html / thankyou.html / styles.css / script.js
zeen-api.php / propeller-pb.php / php-test.php / serve.py
assets/downloadx.gif / logo_phone.png / subpage.png / loadingtab.gif
README-DEPLOY.txt
