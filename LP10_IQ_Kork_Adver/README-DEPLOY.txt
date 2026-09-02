Iraq Korek — ZD Know Your Country (Advertizer)
===============================================

Folder: LP10_IQ_Kork_Adver/
UI: LP10 Theme-496 — AR/EN (default AR)
Service: ZD Know Your Country | Korek Iraq | cid=3023
Price: 300 IQD / day
Short code: 2115 | Unsub keyword: 0
PIN: 4 digits
API: http://64.225.85.48/adnet/
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=326

Antifraud (Korek Evina)
-----------------------
Runs on PIN step (digitalapicalls.com).
servicename=KnowYourCountry | merchantname=windowtechnologies | type=pin
ti = 1001-{random}-{random} | ts = epoch seconds
te = #verifybtn → injects Evina script → DCBProtectRun event
verifypin: pass same ti + ts values; ti also sent as sessionKey

API (adnet)
-----------
sendpin    ?cid=3023&msisdn=&click_id=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey=
verifypin  ?cid=3023&msisdn=&click_id=&otp=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey={ti}&ti={ti}&ts={ts}
checkstatus?cid=3023&msisdn=

MSISDN: Iraq +964, local 10 digits starting with 75 (Korek).

Flow
----
index (+964 MSISDN) → sendpin → PIN step (Evina AF) → verifypin
→ Advertizer postback → thankyou.html → CPportal cid=326

Advertizer postback (after successful PIN verify):
  http://postback.advertizer.com/pb.php?clickid={clickid}&txn_id={clickid}&amount=1&advertiser_id=Zeen1041&key=a5b193ada1cbd22a987bfe876496ac40

  clickid = real [[subid]] from campaign URL (?clickid=)
  amount  = 1

Campaign URL
------------
https://click2funbox.com/LP10_IQ_Kork_Adver/?clickid=[[subid]]&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP10_IQ_Kork_Adver/

Live:
  https://click2funbox.com/LP10_IQ_Kork_Adver/?clickid=[[subid]]&zoneid={zone_id}

1. Create folder oman/LP10_IQ_Kork_Adver/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP10_IQ_Kork_Adver/php-test.php
4. Test LP:  https://click2funbox.com/LP10_IQ_Kork_Adver/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8122/?clickid=TEST123

Files
-----
index.html / thankyou.html / styles.css / script.js
zeen-api.php / advertizer-pb.php / php-test.php / serve.py
assets/downloadx.gif / logo_phone.png / subpage.png / loadingtab.gif
README-DEPLOY.txt
