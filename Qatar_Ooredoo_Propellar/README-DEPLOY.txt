Qatar Ooredoo Propeller — movstreamlite UI
=========================================

Folder: Qatar_Ooredoo_Propellar/
UI: movstreamlite (Watch Now / video player frame)
Integration: Zeen Digital cid=3044 + PropellerAds

Service
-------
ZD Games for All — Ooredoo Qatar
cid=3044 | PIN 4
Opt-in / opt-out shortcode: 92506
Unsub keyword: GA
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=341

Flow
----
index (+974 MSISDN) → sendpin → pin.html → verifypin
→ Propeller postback → checkstatus → portal

Zeen APIs
---------
sendpin:     http://64.225.85.48/adnet/sendpin?cid=3044&msisdn=...
verifypin:   http://64.225.85.48/adnet/verifypin?cid=3044&msisdn=...&otp=...
checkstatus: http://64.225.85.48/adnet/checkstatus?cid=3044&msisdn=...

Propeller postback
------------------
https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=${PAYOUT}

visitor_id = same clickid (${SUBID}) from campaign URL
payout     = 1 by default, or ?payout= from campaign URL

Campaign URL
------------
https://click2funbox.com/qatar/qatr_ordoo/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/qatar/qatr_ordoo/

Live:
  https://click2funbox.com/qatar/qatr_ordoo/?clickid=${SUBID}&zoneid={zone_id}

1. In FileZilla open /var/www/vaszeen/zeen_lp/oman/
2. Create folder qatar, then qatr_ordoo inside it
3. Upload ALL files from Qatar_Ooredoo_Propellar/ into qatr_ordoo/
4. Test PHP: https://click2funbox.com/qatar/qatr_ordoo/php-test.php
5. Test LP:  https://click2funbox.com/qatar/qatr_ordoo/?clickid=TEST123

If already uploaded elsewhere, move it:
  sudo mkdir -p /var/www/vaszeen/zeen_lp/oman/qatar
  sudo mv /var/www/vaszeen/zeen_lp/oman/qaoredoo /var/www/vaszeen/zeen_lp/oman/qatar/qatr_ordoo
  sudo chown -R www-data:www-data /var/www/vaszeen/zeen_lp/oman/qatar/qatr_ordoo


MSISDN: Qatar +974, local 8 digits starting with 3, 5, 6 or 7.
Default language: Arabic (English toggle).

Local test
----------
  python3 serve.py
  http://127.0.0.1:8086/?clickid=TEST123

Files
-----
index.html / pin.html / styles.css / assets/
script.js / zeen-api.php / propeller-pb.php / php-test.php / serve.py
README-DEPLOY.txt
