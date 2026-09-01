Palestine Dual Operator Advertizer — loaderlite UI
==================================================

Folder: LP1_dual_operator_palastine_advertiser/
UI: same as LP1_Dua_Palastine_Propellar (loaderlite / FileShare)
Integration: Zeen Digital dual operator + Advertizer postback

Operators
---------
1) Jawwal  — cid=3056 — portal cid=570 — 1.16 NIS/day — unsub: 0257 → 37799 — PIN 4
2) Ooredoo — cid=3055 — portal cid=569 — 1.5 NIS/day  — unsub: 08 → 6976   — PIN 4

Flow
----
index (+970 MSISDN) → operator.html → sendpin → pin.html → verifypin
→ Advertizer postback → thankyou.html → CPportal (operator portal cid)

Advertizer postback (after successful PIN verify):
  http://postback.advertizer.com/pb.php?clickid=[[subid]]&txn_id=[[subid]]&amount=[[amount]]&advertiser_id=Zeen1041&key=a5b193ada1cbd22a987bfe876496ac40

  clickid = real {clickid} from campaign URL
  amount  = 1.16 (Jawwal) or 1.5 (Ooredoo)
  Fired via advertizer-pb.php (S2S). Skipped if clickid is missing, {clickid}, [[subid]], or local_*.

Campaign URL
------------
https://click2funbox.com/ps_lp1_adv/?clickid={clickid}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/ps_lp1_adv/

Live:
  https://click2funbox.com/ps_lp1_adv/?clickid={clickid}

1. Create folder oman/ps_lp1_adv/
2. Upload ALL files from this folder
3. Test PHP: https://click2funbox.com/ps_lp1_adv/php-test.php
4. Test LP:  https://click2funbox.com/ps_lp1_adv/?clickid=TEST123

MSISDN: Palestine +970, local 9 digits starting with 5.
Default language: Arabic (English toggle).

Local test
----------
  python3 serve.py
  http://127.0.0.1:8091/?clickid=TEST123

Files
-----
index.html / operator.html / pin.html / thankyou.html
styles.css / pict.svg / icon.svg / icn-check.svg / secure.svg
script.js / zeen-api.php / advertizer-pb.php / php-test.php / serve.py
README-DEPLOY.txt
