Adsterra Oman — Entertainment Corner (Omantel ZD Game)
======================================================

Folder: ads-oman/
Service: ZD Game | Omantel Oman | cid=2943
Price: 0.25 OMR/day | Unsub: UNSUB IVID → 92149 | PIN: 4 digits
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=388

UI
--
Entertainment Corner style (LTR default English, Arabic toggle).
Prefix +968, local 8 digits starting with 7 or 9.

Flow
----
1. MSISDN → sendpin (cid=2943)
2. PIN → verifypin
3. On success → backcall postback then thankyou → portal

APIs
----
Send PIN:
  http://64.225.85.48/adnet/sendpin?cid=2943&msisdn={msisdn}&click_id={click_id}&pub_id={pub_id}&sub_pub_id={sub_pub_id}&user_ip={user_ip}&ua={ua}&sessionKey={sessionKey}

Verify PIN:
  http://64.225.85.48/adnet/verifypin?cid=2943&msisdn={msisdn}&click_id={click_id}&otp={otp}&user_ip={user_ip}&ua={ua}&pub_id={pub_id}&sub_pub_id={sub_pub_id}&sessionKey={sessionKey}

Check status:
  http://64.225.85.48/adnet/checkstatus?cid=2943&msisdn={msisdn}

Conversion postback (fired after successful PIN verify):
  https://www.pbterra.com/name/Zeendigital123/at?subid_short={clickid}&atpay=1

Proxies (HTTPS hosting)
-----------------------
zeen-api.php   → Zeen sendpin / verifypin / checkstatus
backcall.php   → Adsterra pbterra conversion postback

Campaign URL (paste this EXACTLY in Adsterra — macros were swapped before)
------------
https://click2funbox.com/ads-oman/?clickid=##SUB_ID_SHORT(action)##&pub_id=ADSTERRA&sub_pub_id=##CAMPAIGN_ID##&zoneid=##PLACEMENT_ID##&lang=en

WRONG (this is what was live — Adsterra cannot count conversions):
https://click2funbox.com/ads-oman/?clickid=##PLACEMENT_ID##&pub_id=##SUB_ID_SHORT(action)##&sub_pub_id=##CAMPAIGN_ID##&zoneid=##PLACEMENT_ID##&lang=en

Mapping:
  clickid     = ##SUB_ID_SHORT(action)##   ← this is what pbterra needs as subid_short
  pub_id      = ADSTERRA                   ← not a click token
  sub_pub_id  = ##CAMPAIGN_ID##
  zoneid      = ##PLACEMENT_ID##           ← only once

Do NOT use {clickid} or {payout} — Adsterra does not replace those.
If the postback fires with subid_short={clickid} or a placement number (e.g. 30315238),
the conversion is dropped.

Postback fired after PIN verify:
  https://www.pbterra.com/name/Zeendigital123/at?subid_short={REAL_CLICK_ID}&atpay=1

IMPORTANT: Zeendigital123 must be your Adsterra advertiser login (Conversion tracking page).

Deploy → click2funbox.com (FileZilla)
------------------------------------
IMPORTANT: nginx root for click2funbox.com is:
  /var/www/vaszeen/zeen_lp/oman

Upload HERE:
  /var/www/vaszeen/zeen_lp/oman/ads-oman/

Live URL:
  https://click2funbox.com/ads-oman/?clickid=...

1. FileZilla → create folder: oman/ads-oman/
2. Upload ALL files from local ads-oman/
3. If old folder exists, rename on server:
     sudo mv /var/www/vaszeen/zeen_lp/oman/adsterra-oman /var/www/vaszeen/zeen_lp/oman/ads-oman
4. Test PHP: https://click2funbox.com/ads-oman/php-test.php
5. Test LP:  https://click2funbox.com/ads-oman/?clickid=TEST123

Require PHP (php-fpm) for zeen-api.php and backcall.php.

Files
-----
index.html      MSISDN + PIN (same page, EN default)
thankyou.html   Thank you + redirect to portal
styles.css      Entertainment Corner look
script.js       Flow + i18n + APIs + postback
zeen-api.php    API proxy
backcall.php    Conversion postback proxy
README-DEPLOY.txt
