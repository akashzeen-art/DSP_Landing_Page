Iraq Propeller LP — Asiacell / Korek / Zain (Antifraud)
=======================================================

Domain:   click2funbox.com
Folder:   iqprop3op
Campaign: https://click2funbox.com/iqprop3op/?clickid=${SUBID}&zoneid={zone_id}

Description (footer)
--------------------
Gamifya is a subscription service that auto-renews at 360 IQD every 1 Day(s) for Asiacell subscribers. To cancel, send 0.
Gamifya is a subscription service that auto-renews at 240 IQD every 1 Day(s) for Korek subscribers. To cancel, send 01.
Global Recipes is a subscription service that auto-renews at 240 IQD every 1 Day(s) for Zain subscribers. To cancel, send G7.

Operators
---------
1) Asiacell — Gamifya — cid=200 — IQAGcmp — PIN 4 — 360 IQD/day — unsub 0
2) Korek — Gamifya — cid=199 — IQKGcmp — PIN 4 — 240 IQD/day — unsub 01
3) Zain — Global Recipes — cid=490 — IQcmp — PIN 5 — 240 IQD/day — unsub G7

Antifraud placement
--------------------
Asiacell Gamifya     → MSISDN page (Page=1) + OTP page (Page=2)
Korek Gamifya        → OTP page only (ti / ts / te=#confirmBtn)
Zain Global Recipes  → OTP page only (Shield uniqid + source)

Deploy steps → click2funbox.com
--------------------------------
Server path (nginx root is /var/www/vaszeen/zeen_lp/oman):
  /var/www/vaszeen/zeen_lp/oman/iqprop3op/

If you previously used iqprop3Operator, rename:
  sudo mv /var/www/vaszeen/zeen_lp/oman/iqprop3Operator /var/www/vaszeen/zeen_lp/oman/iqprop3op
  sudo chown -R www-data:www-data /var/www/vaszeen/zeen_lp/oman/iqprop3op
  sudo chmod -R 755 /var/www/vaszeen/zeen_lp/oman/iqprop3op

1. Upload ALL files from local iraq-propeller/ into:
     /var/www/vaszeen/zeen_lp/oman/iqprop3op/

2. Test PHP:
     https://click2funbox.com/iqprop3op/php-test.php
   Must print: PHP is working

3. Test LP:
     https://click2funbox.com/iqprop3op/?clickid=TEST123

4. Propeller campaign URL:
     https://click2funbox.com/iqprop3op/?clickid=${SUBID}&zoneid={zone_id}

Flow
----
index → mobile → operator popup → sendPIN (+ AF) → pin.html → verifyPIN → thankyou (Propeller) → redirect

Propeller postback
------------------
aid=3898869  tid=154120
visitor_id = clickid (${SUBID})
Fired on thankyou.html after successful verifyPIN

Local test
----------
  cd iraq-propeller
  python3 serve.py
  open http://127.0.0.1:8770/?clickid=TEST
