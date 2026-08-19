Palestine Dual Operator — Z Game (Jawwal + Ooredoo) + PropellerAds
=================================================================

Folder: Palastine Dual Operator 12 Aug/
UI: same as Palastine — AR default

Operators
---------
1) Jawwal  — cid=3008 — portal cid=570 — 1.16 NIS/day — unsub: 0257 → 37799 — PIN 4
2) Ooredoo — cid=3007 — portal cid=569 — 1.5 NIS/day  — unsub: 08 → 6976   — PIN 4

Flow
----
index (MSISDN +970) → operator.html → sendpin → pin.html → verifypin
→ Propeller postback → thankyou.html → CPportal (operator portal cid)

APIs
----
Jawwal:  cid=3008
Ooredoo: cid=3007

Propeller postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=${PAYOUT}

  visitor_id = same clickid (${SUBID}) from campaign URL
  payout     = 1.16 (Jawwal) or 1.5 (Ooredoo)

Proxies
-------
zeen-api.php     → Zeen sendpin / verifypin
propeller-pb.php → Propeller conversion postback

Campaign URL
------------
https://click2funbox.com/ps-dual/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/ps-dual/

Live:
  https://click2funbox.com/ps-dual/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/ps-dual/
2. Upload ALL files from this folder
3. Test PHP: https://click2funbox.com/ps-dual/php-test.php
4. Test LP:  https://click2funbox.com/ps-dual/?clickid=TEST123

MSISDN: Palestine +970, local 9 digits starting with 5.

Files
-----
index.html / operator.html / pin.html / thankyou.html
styles.css / assets/
script.js / zeen-api.php / propeller-pb.php / php-test.php
README-DEPLOY.txt
