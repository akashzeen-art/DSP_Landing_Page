(function () {
  "use strict";

  /**
   * UAE Etisalat — foodie (cid=3186) Zeen adnet
   * AED 3.25/day — C FODD → 1111 — PIN 4
   * Portal: CPportal?cid=948
   * UI: Gubbare-style (top-bar / main-container / terms)
   * Domain: all-smartcontent.com
   * Google Ads: AW-18322603599
   * No antifraud
   */

  var msisdnFormat = /^5[0-9]{8}$/;
  var COUNTRY = "971";
  var PIN_LENGTH = 4;
  var CID = "3186";
  var PORTAL_CID = "948";
  var ZEEN = "http://64.225.85.48/adnet";
  var PORTAL = ZEEN + "/Promo/Api/CPportal?cid=" + PORTAL_CID;

  var useProxy =
    typeof location !== "undefined" &&
    location.protocol !== "file:" &&
    (location.protocol === "http:" || location.protocol === "https:");

  function persist(k, v) {
    if (v == null || v === "") return;
    try { sessionStorage.setItem(k, v); } catch (e) {}
    try { localStorage.setItem(k, v); } catch (e2) {}
  }

  function track(k) {
    try {
      var v = sessionStorage.getItem(k);
      if (v) return v;
    } catch (e) {}
    try { return localStorage.getItem(k) || ""; } catch (e2) { return ""; }
  }

  function isRealClickId(v) {
    if (!v) return false;
    var s = String(v).trim();
    if (!s) return false;
    var low = s.toLowerCase();
    if (s.indexOf("local_") === 0) return false;
    if (low === "clickid" || low === "subid" || low === "visitor_id") return false;
    if (s.indexOf("{") !== -1 || s.indexOf("${") !== -1 || s.indexOf("[[") !== -1) return false;
    return true;
  }

  function normalizeLocal(raw) {
    var digits = String(raw || "").replace(/\D/g, "");
    if (digits.indexOf(COUNTRY) === 0) digits = digits.slice(COUNTRY.length);
    if (digits.charAt(0) === "0") digits = digits.slice(1);
    return digits.slice(0, 9);
  }

  function fullMsisdn(local) {
    return COUNTRY + normalizeLocal(local);
  }

  function initTracking() {
    var params = new URLSearchParams(window.location.search);
    var clickId =
      params.get("clickid") ||
      params.get("click_id") ||
      params.get("subid") ||
      params.get("gclid") ||
      params.get("token") ||
      "";
    if (isRealClickId(clickId)) persist("click_id", clickId);

    ["pub_id", "sub_pub_id", "sessionKey", "user_ip", "zoneid"].forEach(function (k) {
      var v = params.get(k);
      if (v && String(v).indexOf("{") === -1 && String(v).indexOf("$") === -1) persist(k, v);
    });

    if (!track("pub_id")) persist("pub_id", "google");
    if (!track("sub_pub_id")) {
      var zone = params.get("zoneid") || params.get("zone_id") || params.get("campaignid") || "0";
      if (zone && String(zone).indexOf("{") === -1) persist("sub_pub_id", "ZONE" + zone);
    }
  }

  function getClickId() {
    var existing = track("click_id");
    if (isRealClickId(existing)) return existing;
    var fallback = track("zeen_click_id");
    if (fallback) return fallback;
    fallback = "local_" + Date.now();
    persist("zeen_click_id", fallback);
    return fallback;
  }

  function getUserIp(cb) {
    if (track("user_ip")) { cb(track("user_ip")); return; }
    var done = false;
    function finish(ip) {
      if (done) return;
      done = true;
      if (ip) persist("user_ip", ip);
      cb(ip || "");
    }
    var t = setTimeout(function () { finish(""); }, 2500);
    fetch("https://api.ipify.org?format=json")
      .then(function (r) { return r.json(); })
      .then(function (d) { clearTimeout(t); finish((d && d.ip) || ""); })
      .catch(function () { clearTimeout(t); finish(""); });
  }

  function getUa() {
    return (typeof navigator !== "undefined" && navigator.userAgent) ? navigator.userAgent : "unknown";
  }

  function apiUrl(path, params) {
    var q = new URLSearchParams(params || {});
    if (useProxy) {
      q.set("path", path);
      return "zeen-api.php?" + q.toString();
    }
    return ZEEN + "/" + path + "?" + q.toString();
  }

  function callApi(path, params) {
    return fetch(apiUrl(path, params), {
      method: "GET",
      credentials: "omit",
      cache: "no-store"
    }).then(function (res) {
      return res.text().then(function (text) {
        if (/^\s*<\?php/i.test(text)) throw { msg: "php" };
        try { return JSON.parse(text); }
        catch (e) { throw { msg: "x", raw: text }; }
      });
    });
  }

  function isOk(resp) {
    if (!resp) return false;
    if (resp.status === true || resp.status === "true" || resp.status === 1) return true;
    var r = String(resp.response || "").toUpperCase();
    if (r === "SUCCESS" || r === "ACTIVE") return true;
    var m = String(resp.msg || resp.errorMessage || "").toLowerCase();
    return /success|pin sent|pin verified|active|2001|2003|2005/.test(m);
  }

  function errCode(resp) {
    var m = String((resp && (resp.msg || resp.errorMessage || resp.message)) || "");
    var match = m.match(/\((\d{4})\)/);
    if (match) return match[1];
    if (/invalid|expire|1004/i.test(m)) return "1004";
    if (/1002|pin_generation|try again/i.test(m)) return "1002";
    if (/fail|1001|could not/i.test(m)) return "1001";
    return "";
  }

  function errMsg(resp) {
    var code = errCode(resp);
    var dict = t[lang] || t.en;
    if (code && dict["err" + code]) return dict["err" + code];
    return String((resp && (resp.msg || resp.errorMessage || resp.message)) || "");
  }

  function baseParams(extra) {
    var p = {
      cid: CID,
      msisdn: track("msisdn") || "",
      click_id: getClickId(),
      pub_id: track("pub_id") || "google",
      sub_pub_id: track("sub_pub_id") || "ZONE0",
      user_ip: track("user_ip") || "0.0.0.0",
      ua: getUa()
    };
    var sk = track("sessionKey");
    if (sk) p.sessionKey = sk;
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        if (extra[k] != null && extra[k] !== "") p[k] = extra[k];
      });
    }
    return p;
  }

  var lang = "en";
  var t = {
    en: {
      langSwitch: "Arabic",
      topOffer: "Free for 24 hours, then 3.25 AED / Daily (VAT Inclusive).",
      formTitle: "Enter your Etisalat Mobile Number to receive OTP",
      planDaily: "3.25 AED / Daily",
      btnSubscribe: "SUBSCRIBE",
      btnExit: "EXIT",
      btnConfirm: "CONFIRM",
      wrongNumber: "Wrong number?",
      noteHtml:
        "Free for 24 hours, then 3.25 AED / Daily (VAT Inclusive).<br><br>" +
        "After clicking 'Subscribe' you will receive PIN message to Confirm your subscription.",
      pinTitle: "Enter the PIN sent to your phone",
      pinNote: "Enter the 4-digit PIN to confirm your subscription.",
      termsHeading: "TERMS AND CONDITIONS:",
      termsIntro: "By Clicking on Subscribe, you agree to the below terms and conditions:",
      t1: "You will start the paid subscription after the free period automatically.",
      t2: "No commitment, you can cancel your subscription at any time by sending <b>C FODD</b> to <b>1111</b>.",
      t3: 'To get support, please contact <a href="mailto:cs@netmediasleashares.com">cs@netmediasleashares.com</a>',
      t4: "The free trial is valid only for new subscribers.",
      t5: "Enjoy Your Free trial for 24 hours.",
      t6: "Please make sure that your browser is not using any 3rd-party blocking technologies and you have a healthy internet connection for swift access to the content.",
      t7: "By proceeding, you are accepting all Terms and Conditions of the service and agree to receive updates about your subscription on your registered mobile number.",
      t8: 'Further Terms and Conditions <a href="#" class="legal-link" data-open="terms">Click here</a>',
      t9: 'Further Privacy Policy <a href="#" class="legal-link" data-open="privacy">Click here</a>',
      modalTermsTitle: "Terms and Conditions",
      modalPrivacyTitle: "Privacy Policy",
      modalClose: "Close",
      termsModalHtml:
        '<p class="meta">Last updated: September 10, 2026</p>' +
        "<p>Please read these Terms and Conditions (\"Terms\", \"Terms and Conditions\") carefully before using the <b>foodie</b> portal (the \"Service\") operated by <b>Net Media</b> (\"us\", \"we\", or \"our\").</p>" +
        "<p>Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users and others who access or use the Service.</p>" +
        "<p>By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.</p>" +
        "<h3>Availability, Errors and Inaccuracies</h3>" +
        "<p>We are constantly updating our offerings of products and services on our Service and therefore you may experience delays or temporary unavailability of content while we update information on the Service and in our advertising on other websites.</p>" +
        "<p>Whilst we always use our best endeavors to keep the Service up to date and available, we do not guarantee the accuracy or completeness of any information including product images, specifications, availability, and services. We reserve the right to change or update information and to correct errors, inaccuracies, or omissions at any time without prior notice.</p>" +
        "<h3>Subscriptions</h3>" +
        "<p>Some parts of the Service are billed on a subscription basis (\"Subscription(s)\"). You will be billed in advance on a recurring and periodic basis (\"Billing Cycle\"). Billing cycles are set on a daily, weekly or monthly basis.</p>" +
        "<p>At the end of each Billing Cycle, your Subscription will automatically renew under the exact same conditions unless you cancel it or we cancel it. You may cancel your Subscription renewal either through your online account management page or by contacting our customer support team.</p>" +
        "<h3>Free Trial</h3>" +
        "<p>We may, at our sole discretion, offer a Subscription with a free trial for a limited period of time (\"Free Trial\").</p>" +
        "<p>You may be required to enter your billing information in order to sign up for the Free Trial.</p>" +
        "<p>If you do enter your billing information when signing up for the Free Trial, you will not be charged by us until the Free Trial has expired. On the last day of the Free Trial period, unless you cancelled your Subscription, you will be automatically charged the applicable Subscription fees for the type of Subscription you have selected.</p>" +
        "<p>At any time and without notice, we reserve the right to (i) modify the terms and conditions of the Free Trial offer, or (ii) cancel such Free Trial offer.</p>" +
        "<h3>No Commitment</h3>" +
        "<p>You're not bound by any long-term commitment with us. You have the freedom to enjoy your subscription indefinitely, subject to the terms in the agreement. You can opt out at any time through the service settings, provided it is done at least one full day before the renewal date.</p>" +
        "<p>If you cancel mid-subscription period, you will have access until the end of the paid period or free trial. Your subscription will not auto-renew, and no further payments will be deducted. You can always reactivate later. Note that there are generally no refunds or credits for mid-subscription cancellations, except where required by law.</p>" +
        "<p>If your subscription is suspended or terminated, there will be no refunds, credits, or exchanges for unused time, fees, content, or data associated with it.</p>" +
        "<h3>Fee Changes</h3>" +
        "<p>Service owner will provide you with a 30 days prior notice of any change in Subscription fees to give you an opportunity to terminate your Subscription before such change becomes effective.</p>" +
        "<p>Your continued use of the Service after the Subscription fee change comes into effect constitutes your agreement to pay the modified Subscription fee amount.</p>" +
        "<h3>Refunds</h3>" +
        "<p>Certain refund requests for Subscriptions may be considered by us on a case-by-case basis and granted at our sole discretion.</p>" +
        "<h3>Intellectual Property</h3>" +
        "<p>The Service and its original content (excluding Content provided by users), features and functionality are and will remain the exclusive property of Net Media and its licensors. The Service is protected by copyright, trademark, and other laws of both the UAE and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent from us.</p>" +
        "<h3>Limitation of Liability</h3>" +
        "<p>In no event shall we, nor our directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage, and even if a remedy set forth herein is found to have failed of its essential purpose.</p>" +
        "<h3>Disclaimer</h3>" +
        "<p>Your use of the Service is at your sole risk. The Service is provided on an \"AS IS\" and \"AS AVAILABLE\" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement or course of performance.</p>" +
        "<p>We and our subsidiaries, affiliates, and its licensors do not warrant that a) the Service will function uninterrupted, secure or available at any particular time or location; b) any errors or defects will be corrected; c) the results of using the Service will meet your requirements.</p>" +
        "<h3>Governing Law</h3>" +
        "<p>These Terms shall be governed and construed in accordance with the laws of UAE, without regard to its conflict of law provisions.</p>" +
        "<p>Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect. These Terms constitute the entire agreement between us regarding our Service, and supersede and replace any prior agreements we might have between us regarding the Service.</p>" +
        "<h3>Changes</h3>" +
        "<p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>" +
        "<p>By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, please stop using the Service.</p>" +
        '<h3>Contact Us</h3>' +
        '<p>If you have any questions about these Terms, please contact us at <a href="mailto:cs@netmediasleashares.com">cs@netmediasleashares.com</a>.</p>',
      privacyModalHtml:
        "<p>At <b>Net Media</b>, <b>foodie</b>, we value your privacy and are committed to protecting your personal information. This Privacy Policy outlines how we collect, use, and share your information when you subscribe to our service. By subscribing to our service, you consent to the practices described in this policy. Please read this policy carefully to understand how we handle your information.</p>" +
        "<h3>1. Information We Collect</h3>" +
        "<p>When you use our service, we may collect the following types of information:</p>" +
        "<ul>" +
        "<li><b>a. Personal Information — Subscription Data:</b> When you subscribe to our service, we collect your mobile phone number and any other necessary billing details. These details help us process your subscription and maintain accurate records.</li>" +
        "<li><b>Age Verification:</b> To comply with age restrictions, we may collect information to ensure that you are over 18 years of age or have permission from a parent or guardian if you are under 18.</li>" +
        "<li><b>b. Technical Information — Device and Network Information:</b> When you access our portal, we may collect details about your device, such as your IP address, browser type, and mobile network information.</li>" +
        "<li><b>Usage Data:</b> We track how you use our service, including browsing activities, page interactions, and the content you access.</li>" +
        "</ul>" +
        "<h3>2. How We Use Your Information</h3>" +
        "<p>We use the collected information for the following purposes:</p>" +
        "<ul>" +
        "<li><b>Service Provision and Maintenance:</b> To process your subscription, including automatic renewal unless you choose to unsubscribe. To send you and renewal alerts via SMS.</li>" +
        '<li><b>Communication:</b> To send you important service-related updates, such as subscription and renewals. To respond to any feedback or inquiries you submit via <a href="mailto:cs@netmediasleashares.com">cs@netmediasleashares.com</a>.</li>' +
        "<li><b>Improvement of Services:</b> To analyze how users interact with our service so that we can improve the platform, including the user interface, content offerings, and overall performance.</li>" +
        "<li><b>Compliance with Legal Obligations:</b> We may use your personal information to comply with applicable laws, regulations, and legal processes.</li>" +
        "</ul>" +
        "<h3>3. Cookies and Tracking Technologies</h3>" +
        "<p>We may use cookies and similar tracking technologies to enhance your experience on our portal. Cookies are small data files stored on your device that allow us to:</p>" +
        "<ul>" +
        "<li>Remember your preferences, such as language settings (the portal is in English).</li>" +
        "<li>Track usage patterns and improve service performance.</li>" +
        "</ul>" +
        "<p>You can manage your cookie preferences through your browser settings, but disabling cookies may affect your ability to use some features of the service.</p>" +
        "<h3>4. Data Sharing and Disclosure</h3>" +
        "<p>We do not sell or rent your personal information to third parties. However, we may share your information in the following scenarios:</p>" +
        "<ul>" +
        "<li><b>Legal Compliance:</b> We may disclose your information if required to do so by law or in response to valid legal requests from government authorities.</li>" +
        "</ul>" +
        "<p><b>Data Security:</b> We implement appropriate technical and organizational measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction. However, no method of data transmission or storage is completely secure, and we cannot guarantee the absolute security of your information.</p>" +
        "<h3>5. Retention of Your Information</h3>" +
        "<p>We will retain your personal information for as long as necessary to fulfill the purposes outlined in this policy. This may include retaining your data to comply with legal obligations, resolve disputes, and enforce our agreements.</p>" +
        "<h3>6. Children's Privacy</h3>" +
        "<p>Our service is intended for users who are at least 18 years old or who have obtained parental consent. We do not knowingly collect personal information from children under 18. If we become aware that we have inadvertently collected personal data from a child without consent, we will take steps to delete that information.</p>" +
        "<h3>7. Data Usage and Charges</h3>" +
        "<p>Please note that standard data charges may apply when browsing or downloading content from our portal if you are not using a data bundle. It is your responsibility to manage your data usage according to your mobile plan.</p>" +
        "<h3>8. International Data Transfers</h3>" +
        "<p>We operate globally, and your information may be transferred to and processed in countries outside your own. We ensure that any data transfers comply with applicable privacy laws and that your data is protected by adequate safeguards.</p>" +
        "<h3>9. Changes to This Privacy Policy</h3>" +
        "<p>We may update this Privacy Policy from time to time to reflect changes in our practices or relevant legal requirements. We will notify you of any significant changes by posting a notice on our portal or sending an SMS alert. Your continued use of the service after such changes constitutes acceptance of the revised policy.</p>" +
        "<h3>10. Contact Us</h3>" +
        '<p>If you have any questions, concerns, or feedback regarding this Privacy Policy or our data handling practices, please contact us at <a href="mailto:cs@netmediasleashares.com">cs@netmediasleashares.com</a>.</p>' +
        "<p>By using our service, you acknowledge that you have read and understood this Privacy Policy and agree to the collection, use, and disclosure of your personal information as described herein.</p>",
      formError: "Please insert your phone number",
      errNum: "Please enter a valid Etisalat UAE number (9 digits starting with 5).",
      errSend: "PIN could not be sent. Please try again.",
      err1001: "PIN could not be sent. Please try again.",
      err1002: "Unable to send PIN. Use a valid Etisalat UAE number and try again.",
      err1004: "Invalid or expired PIN. Please try again.",
      pinError: "Incorrect PIN! Please try again",
      errConn: "Connection error. Please try again.",
      errPhp: "PHP is not enabled. Ask hosting to enable PHP."
    },
    ar: {
      langSwitch: "English",
      topOffer: "مجانًا لمدة 24 ساعة، ثم 3.25 درهم إماراتي / يوميًا (شامل الضريبة).",
      formTitle: "أدخل رقم اتصالات لتلقي رمز OTP",
      planDaily: "3.25 درهم / يوميًا",
      btnSubscribe: "اشترك",
      btnExit: "خروج",
      btnConfirm: "تأكيد",
      wrongNumber: "رقم خاطئ؟",
      noteHtml:
        "مجانًا لمدة 24 ساعة، ثم 3.25 درهم إماراتي / يوميًا (شامل الضريبة).<br><br>" +
        "بعد الضغط على 'اشترك' ستصلك رسالة PIN لتأكيد الاشتراك.",
      pinTitle: "أدخل رمز PIN المرسل إلى هاتفك",
      pinNote: "أدخل رمز PIN المكون من 4 أرقام لتأكيد الاشتراك.",
      termsHeading: "الشروط والأحكام:",
      termsIntro: "بالضغط على اشترك، فإنك توافق على الشروط والأحكام التالية:",
      t1: "سيبدأ الاشتراك المدفوع تلقائيًا بعد الفترة المجانية.",
      t2: "بدون التزام، يمكنك إلغاء الاشتراك في أي وقت بإرسال <b>C FODD</b> إلى <b>1111</b>.",
      t3: 'للحصول على الدعم، يرجى التواصل عبر <a href="mailto:cs@netmediasleashares.com">cs@netmediasleashares.com</a>',
      t4: "الفترة التجريبية المجانية صالحة فقط للمشتركين الجدد.",
      t5: "استمتع بالفترة التجريبية المجانية لمدة 24 ساعة.",
      t6: "يرجى التأكد من عدم استخدام تقنيات حجب من طرف ثالث ومن وجود اتصال إنترنت جيد للوصول السريع للمحتوى.",
      t7: "بالمتابعة، أنت توافق على جميع شروط وأحكام الخدمة وتوافق على استلام تحديثات الاشتراك على رقم جوالك المسجل.",
      t8: 'مزيد من الشروط والأحكام <a href="#" class="legal-link" data-open="terms">اضغط هنا</a>',
      t9: 'مزيد من سياسة الخصوصية <a href="#" class="legal-link" data-open="privacy">اضغط هنا</a>',
      modalTermsTitle: "الشروط والأحكام",
      modalPrivacyTitle: "سياسة الخصوصية",
      modalClose: "إغلاق",
      termsModalHtml:
        '<p class="meta">آخر تحديث: 10 سبتمبر 2026</p>' +
        "<p>يرجى قراءة هذه الشروط والأحكام (\"الشروط\") بعناية قبل استخدام بوابة <b>foodie</b> (\"الخدمة\") التي تديرها <b>Net Media</b> (\"نحن\" أو \"لنا\").</p>" +
        "<p>وصولك إلى الخدمة واستخدامك لها مشروط بقبولك لهذه الشروط والامتثال لها. تنطبق هذه الشروط على جميع الزوار والمستخدمين وغيرهم ممن يصلون إلى الخدمة أو يستخدمونها.</p>" +
        "<p>باستخدامك للخدمة فإنك توافق على الالتزام بهذه الشروط. إذا كنت لا توافق على أي جزء منها، فلا يجوز لك الوصول إلى الخدمة.</p>" +
        "<h3>التوفر والأخطاء وعدم الدقة</h3>" +
        "<p>نقوم باستمرار بتحديث عروض المنتجات والخدمات على خدمتنا، ولذلك قد تواجه تأخيرات أو عدم توفر مؤقت للمحتوى أثناء تحديث المعلومات على الخدمة وفي إعلاناتنا على مواقع أخرى.</p>" +
        "<p>ورغم أننا نبذل قصارى جهدنا للحفاظ على تحديث الخدمة وتوافرها، فإننا لا نضمن دقة أو اكتمال أي معلومات بما في ذلك صور المنتجات والمواصفات والتوافر والخدمات. نحتفظ بالحق في تغيير أو تحديث المعلومات وتصحيح الأخطاء أو عدم الدقة أو السهو في أي وقت دون إشعار مسبق.</p>" +
        "<h3>الاشتراكات</h3>" +
        "<p>تُفوتر بعض أجزاء الخدمة على أساس الاشتراك (\"الاشتراك/الاشتراكات\"). سيتم محاسبتك مقدمًا على أساس متكرر ودوري (\"دورة الفوترة\"). تُحدد دورات الفوترة يوميًا أو أسبوعيًا أو شهريًا.</p>" +
        "<p>في نهاية كل دورة فوترة، يتجدد اشتراكك تلقائيًا بنفس الشروط ما لم تلغه أنت أو نلغيه نحن. يمكنك إلغاء تجديد الاشتراك عبر صفحة إدارة الحساب أو بالتواصل مع دعم العملاء.</p>" +
        "<h3>الفترة التجريبية المجانية</h3>" +
        "<p>قد نقدم، وفق تقديرنا، اشتراكًا مع فترة تجريبية مجانية لفترة محدودة (\"الفترة التجريبية المجانية\").</p>" +
        "<p>قد يُطلب منك إدخال معلومات الفوترة للاشتراك في الفترة التجريبية المجانية.</p>" +
        "<p>إذا أدخلت معلومات الفوترة عند الاشتراك في الفترة التجريبية، فلن تُحاسب حتى تنتهي الفترة التجريبية. في اليوم الأخير منها، وما لم تلغِ اشتراكك، سيتم تحصيل رسوم الاشتراك المطبقة تلقائيًا.</p>" +
        "<p>في أي وقت ودون إشعار، نحتفظ بالحق في (1) تعديل شروط العرض التجريبي المجاني، أو (2) إلغاء هذا العرض.</p>" +
        "<h3>بدون التزام</h3>" +
        "<p>لست ملزمًا بأي التزام طويل الأمد معنا. يمكنك الاستمتاع باشتراكك إلى أجل غير مسمى وفقًا للشروط. يمكنك الإلغاء في أي وقت عبر إعدادات الخدمة، على أن يتم ذلك قبل يوم كامل على الأقل من تاريخ التجديد.</p>" +
        "<p>إذا ألغيت خلال فترة الاشتراك، ستظل لديك إمكانية الوصول حتى نهاية الفترة المدفوعة أو التجريبية. لن يتجدد الاشتراك تلقائيًا ولن تُخصم مدفوعات إضافية. يمكنك إعادة التفعيل لاحقًا. عمومًا لا توجد استردادات أو أرصدة لإلغاء منتصف الفترة إلا حيث يقتضي القانون.</p>" +
        "<p>في حال تعليق أو إنهاء الاشتراك، لن تكون هناك استردادات أو أرصدة أو تبديل للوقت أو الرسوم أو المحتوى أو البيانات غير المستخدمة.</p>" +
        "<h3>تغيير الرسوم</h3>" +
        "<p>سيقدم مالك الخدمة إشعارًا مسبقًا قبل 30 يومًا بأي تغيير في رسوم الاشتراك لمنحك فرصة إنهاء الاشتراك قبل سريان التغيير.</p>" +
        "<p>استمرارك في استخدام الخدمة بعد سريان تغيير الرسوم يُعد موافقة على دفع الرسوم المعدلة.</p>" +
        "<h3>الاسترداد</h3>" +
        "<p>قد تُنظر بعض طلبات استرداد الاشتراكات حالة بحالة وتُمنح وفق تقديرنا وحدنا.</p>" +
        "<h3>الملكية الفكرية</h3>" +
        "<p>الخدمة ومحتواها الأصلي (باستثناء المحتوى المقدم من المستخدمين) وميزاتها ووظائفها تبقى ملكية حصرية لـ Net Media ومرخّصيها. الخدمة محمية بموجب قوانين حقوق النشر والعلامات التجارية في الإمارات والدول الأجنبية. لا يجوز استخدام علاماتنا التجارية أو هويتنا البصرية مع أي منتج أو خدمة دون موافقة كتابية مسبقة منا.</p>" +
        "<h3>تحديد المسؤولية</h3>" +
        "<p>لا نتحمل نحن ولا مديرونا أو موظفونا أو شركاؤنا أو وكلاؤنا أو موردونا أو شركاتنا التابعة أي مسؤولية عن أي أضرار غير مباشرة أو عرضية أو خاصة أو تبعية أو عقابية، بما في ذلك على سبيل المثال لا الحصر خسارة الأرباح أو البيانات أو الاستخدام أو السمعة أو غيرها من الخسائر غير الملموسة، الناتجة عن (1) وصولك إلى الخدمة أو استخدامها أو عدم القدرة على ذلك؛ (2) أي سلوك أو محتوى لطرف ثالث على الخدمة؛ (3) أي محتوى تم الحصول عليه من الخدمة؛ و(4) الوصول غير المصرح به أو الاستخدام أو التعديل لبياناتك أو محتواك، سواء بناءً على ضمان أو عقد أو ضرر (بما في ذلك الإهمال) أو أي نظرية قانونية أخرى.</p>" +
        "<h3>إخلاء المسؤولية</h3>" +
        "<p>استخدامك للخدمة على مسؤوليتك الخاصة. تُقدم الخدمة \"كما هي\" و\"حسب التوفر\" دون أي ضمانات من أي نوع، صريحة أو ضمنية.</p>" +
        "<p>لا نضمن نحن وشركاتنا التابعة والمرخّصون أن أ) الخدمة ستعمل دون انقطاع أو بشكل آمن أو متاح في أي وقت أو مكان معين؛ ب) سيتم تصحيح أي أخطاء أو عيوب؛ ج) أن نتائج استخدام الخدمة ستلبي متطلباتك.</p>" +
        "<h3>القانون الحاكم</h3>" +
        "<p>تخضع هذه الشروط وتُفسر وفقًا لقوانين الإمارات العربية المتحدة دون اعتبار لتعارض القوانين.</p>" +
        "<p>عدم إنفاذنا لأي حق أو حكم لا يُعد تنازلًا عنه. إذا اعتُبر أي حكم غير صالح أو غير قابل للتنفيذ، تبقى الأحكام المتبقية سارية. تشكل هذه الشروط الاتفاق الكامل بيننا بشأن الخدمة وتحل محل أي اتفاقيات سابقة.</p>" +
        "<h3>التغييرات</h3>" +
        "<p>نحتفظ بالحق، وفق تقديرنا، في تعديل أو استبدال هذه الشروط في أي وقت. إذا كان التعديل جوهريًا، سنحاول تقديم إشعار قبل 30 يومًا على الأقل. ما يُعد تغييرًا جوهريًا يُحدد وفق تقديرنا.</p>" +
        "<p>باستمرارك في الوصول إلى الخدمة أو استخدامها بعد سريان التعديلات، فإنك توافق على الالتزام بالشروط المعدلة. إذا لم توافق، يرجى التوقف عن استخدام الخدمة.</p>" +
        '<h3>اتصل بنا</h3>' +
        '<p>إذا كانت لديك أي أسئلة حول هذه الشروط، يرجى التواصل عبر <a href="mailto:cs@netmediasleashares.com">cs@netmediasleashares.com</a>.</p>',
      privacyModalHtml:
        "<p>في <b>Net Media</b>، خدمة <b>foodie</b>، نقدر خصوصيتك ونلتزم بحماية معلوماتك الشخصية. توضح سياسة الخصوصية هذه كيف نجمع معلوماتك ونستخدمها ونشاركها عند اشتراكك في خدمتنا. باشتراكك، فإنك توافق على الممارسات الموضحة هنا. يرجى قراءة هذه السياسة بعناية.</p>" +
        "<h3>1. المعلومات التي نجمعها</h3>" +
        "<p>عند استخدامك لخدمتنا، قد نجمع أنواع المعلومات التالية:</p>" +
        "<ul>" +
        "<li><b>أ. المعلومات الشخصية — بيانات الاشتراك:</b> عند الاشتراك، نجمع رقم هاتفك الجوال وأي تفاصيل فوترة ضرورية أخرى لمعالجة الاشتراك والحفاظ على سجلات دقيقة.</li>" +
        "<li><b>التحقق من العمر:</b> للامتثال لقيود العمر، قد نجمع معلومات للتأكد من أن عمرك يزيد عن 18 عامًا أو أن لديك إذنًا من ولي الأمر إذا كنت دون 18.</li>" +
        "<li><b>ب. المعلومات التقنية — الجهاز والشبكة:</b> عند الوصول إلى البوابة، قد نجمع تفاصيل عن جهازك مثل عنوان IP ونوع المتصفح ومعلومات شبكة الجوال.</li>" +
        "<li><b>بيانات الاستخدام:</b> نتتبع كيفية استخدامك للخدمة، بما في ذلك التصفح والتفاعلات والمحتوى الذي تصل إليه.</li>" +
        "</ul>" +
        "<h3>2. كيف نستخدم معلوماتك</h3>" +
        "<p>نستخدم المعلومات المجمعة للأغراض التالية:</p>" +
        "<ul>" +
        "<li><b>تقديم الخدمة وصيانتها:</b> لمعالجة اشتراكك، بما في ذلك التجديد التلقائي ما لم تلغِ الاشتراك، وإرسال تنبيهات التجديد عبر الرسائل النصية.</li>" +
        '<li><b>التواصل:</b> لإرسال تحديثات مهمة متعلقة بالخدمة مثل الاشتراك والتجديدات، والرد على الاستفسارات عبر <a href="mailto:cs@netmediasleashares.com">cs@netmediasleashares.com</a>.</li>' +
        "<li><b>تحسين الخدمات:</b> لتحليل تفاعل المستخدمين وتحسين المنصة والمحتوى والأداء.</li>" +
        "<li><b>الامتثال للالتزامات القانونية:</b> قد نستخدم معلوماتك الشخصية للامتثال للقوانين واللوائح والإجراءات القانونية المعمول بها.</li>" +
        "</ul>" +
        "<h3>3. ملفات تعريف الارتباط وتقنيات التتبع</h3>" +
        "<p>قد نستخدم ملفات تعريف الارتباط وتقنيات مشابهة لتحسين تجربتك على البوابة. تتيح لنا ملفات تعريف الارتباط:</p>" +
        "<ul>" +
        "<li>تذكر تفضيلاتك مثل إعدادات اللغة.</li>" +
        "<li>تتبع أنماط الاستخدام وتحسين أداء الخدمة.</li>" +
        "</ul>" +
        "<p>يمكنك إدارة تفضيلات ملفات تعريف الارتباط عبر إعدادات المتصفح، لكن تعطيلها قد يؤثر على بعض ميزات الخدمة.</p>" +
        "<h3>4. مشاركة البيانات والإفصاح</h3>" +
        "<p>لا نبيع أو نؤجر معلوماتك الشخصية لأطراف ثالثة. ومع ذلك، قد نشارك معلوماتك في الحالات التالية:</p>" +
        "<ul>" +
        "<li><b>الامتثال القانوني:</b> قد نفصح عن معلوماتك إذا اقتضى القانون أو استجابة لطلبات قانونية صحيحة من السلطات.</li>" +
        "</ul>" +
        "<p><b>أمن البيانات:</b> نطبق تدابير تقنية وتنظيمية مناسبة لحماية معلوماتك الشخصية من الوصول أو الإفصاح أو التعديل أو الإتلاف غير المصرح به. ومع ذلك، لا توجد طريقة نقل أو تخزين آمنة تمامًا، ولا يمكننا ضمان الأمان المطلق لمعلوماتك.</p>" +
        "<h3>5. الاحتفاظ بمعلوماتك</h3>" +
        "<p>سنحتفظ بمعلوماتك الشخصية طالما كان ذلك ضروريًا لتحقيق الأغراض الواردة في هذه السياسة، بما في ذلك الامتثال للالتزامات القانونية وحل النزاعات وإنفاذ اتفاقياتنا.</p>" +
        "<h3>6. خصوصية الأطفال</h3>" +
        "<p>خدمتنا مخصصة للمستخدمين بعمر 18 عامًا فأكثر أو ممن حصلوا على موافقة ولي الأمر. لا نجمع عمدًا معلومات شخصية من أطفال دون 18. إذا علمنا أننا جمعنا بيانات طفل دون موافقة، سنتخذ خطوات لحذفها.</p>" +
        "<h3>7. استخدام البيانات والرسوم</h3>" +
        "<p>قد تُطبق رسوم بيانات قياسية عند تصفح أو تنزيل المحتوى من بوابتنا إذا لم تكن تستخدم باقة بيانات. تقع عليك مسؤولية إدارة استخدام البيانات وفق خطة جوالك.</p>" +
        "<h3>8. نقل البيانات دوليًا</h3>" +
        "<p>نعمل عالميًا، وقد تُنقل معلوماتك وتُعالج في دول خارج بلدك. نضمن امتثال أي نقل لبيانات الخصوصية المعمول بها وحماية بياناتك بضمانات كافية.</p>" +
        "<h3>9. التغييرات على سياسة الخصوصية</h3>" +
        "<p>قد نحدّث سياسة الخصوصية هذه من وقت لآخر لتعكس تغييرات في ممارساتنا أو المتطلبات القانونية. سنخطرك بأي تغييرات جوهرية عبر إشعار على البوابة أو رسالة SMS. استمرارك في استخدام الخدمة بعد التغييرات يُعد قبولًا للسياسة المعدلة.</p>" +
        "<h3>10. اتصل بنا</h3>" +
        '<p>إذا كانت لديك أسئلة أو ملاحظات بشأن سياسة الخصوصية أو ممارسات التعامل مع البيانات، يرجى التواصل عبر <a href="mailto:cs@netmediasleashares.com">cs@netmediasleashares.com</a>.</p>' +
        "<p>باستخدامك لخدمتنا، فإنك تقر بأنك قرأت وفهمت سياسة الخصوصية هذه وتوافق على جمع معلوماتك الشخصية واستخدامها والإفصاح عنها كما هو موضح هنا.</p>",
      formError: "الرجاء إدخال رقم هاتفك",
      errNum: "يرجى إدخال رقم اتصالات إماراتي صحيح (9 أرقام يبدأ بـ 5).",
      errSend: "تعذر إرسال PIN. حاول مرة أخرى.",
      err1001: "تعذر إرسال PIN. حاول مرة أخرى.",
      err1002: "تعذر إرسال PIN. استخدم رقم اتصالات إماراتي صحيح وحاول مرة أخرى.",
      err1004: "رمز PIN غير صحيح أو منتهي. حاول مرة أخرى.",
      pinError: "رمز PIN غير صحيح! حاول مرة أخرى",
      errConn: "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
      errPhp: "PHP غير مفعّل. اطلب من الاستضافة تفعيله."
    }
  };

  function applyLang() {
    var dict = t[lang] || t.en;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.body.classList.toggle("rtl", lang === "ar");
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (dict[key] != null) el.innerHTML = dict[key];
    });
    var termsBody = document.getElementById("termsModalBody");
    var privacyBody = document.getElementById("privacyModalBody");
    if (termsBody && dict.termsModalHtml) termsBody.innerHTML = dict.termsModalHtml;
    if (privacyBody && dict.privacyModalHtml) privacyBody.innerHTML = dict.privacyModalHtml;
    document.querySelectorAll(".modal-close").forEach(function (btn) {
      btn.setAttribute("aria-label", dict.modalClose || "Close");
    });
    try { localStorage.setItem("lang", lang); } catch (e) {}
  }

  function openModal(which) {
    var id = which === "privacy" ? "privacyModal" : "termsModal";
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add("open");
    el.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal(which) {
    var ids = which ? [which === "privacy" ? "privacyModal" : "termsModal"] : ["termsModal", "privacyModal"];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.remove("open");
      el.setAttribute("aria-hidden", "true");
    });
    if (!document.querySelector(".modal.open")) document.body.style.overflow = "";
  }

  function setLoading(on) {
    var overlay = document.getElementById("loading");
    if (overlay) overlay.classList.toggle("show", !!on);
  }

  function setBtnLoading(btn, on) {
    if (!btn) return;
    btn.classList.toggle("btn-loading", !!on);
    if (on) btn.disabled = true;
  }

  function showPinStep() {
    var m = document.getElementById("msisdnPanel");
    var p = document.getElementById("pinPanel");
    if (m) m.classList.add("d-none");
    if (p) p.classList.remove("d-none");
    var pin = document.getElementById("pin");
    if (pin) { pin.value = ""; pin.focus(); }
    var pinBtn = document.getElementById("pinBtn");
    if (pinBtn) pinBtn.disabled = true;
  }

  function showMsisdnStep() {
    var m = document.getElementById("msisdnPanel");
    var p = document.getElementById("pinPanel");
    if (p) p.classList.add("d-none");
    if (m) m.classList.remove("d-none");
  }

  initTracking();
  getUserIp(function () {});
  getClickId();

  var qLang = new URLSearchParams(window.location.search).get("lang");
  if (qLang === "ar" || qLang === "en") lang = qLang;
  else {
    try { lang = localStorage.getItem("lang") || "en"; } catch (e) { lang = "en"; }
  }
  applyLang();

  var langToggle = document.getElementById("langToggle");
  if (langToggle) {
    langToggle.addEventListener("click", function (e) {
      e.preventDefault();
      lang = lang === "ar" ? "en" : "ar";
      applyLang();
    });
  }

  document.addEventListener("click", function (e) {
    var openEl = e.target.closest("[data-open]");
    if (openEl) {
      e.preventDefault();
      openModal(openEl.getAttribute("data-open"));
      return;
    }
    var closeEl = e.target.closest("[data-close]");
    if (closeEl) {
      e.preventDefault();
      closeModal(closeEl.getAttribute("data-close"));
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });

  var exitBtn = document.getElementById("exitBtn");
  if (exitBtn) {
    exitBtn.addEventListener("click", function () {
      window.location.href = "https://www.google.com/";
    });
  }

  var mForm = document.getElementById("msisdnForm");
  if (mForm) {
    var mInput = document.getElementById("msisdn");
    var mAlert = document.getElementById("msisdnAlert");
    var mBtn = document.getElementById("msisdnBtn");

    function refreshMsisdn() {
      var value = normalizeLocal(mInput.value);
      var ok = msisdnFormat.test(value);
      if (!mBtn.classList.contains("btn-loading")) mBtn.disabled = !ok;
      return { value: value, ok: ok };
    }

    mInput.addEventListener("input", function () {
      mInput.value = normalizeLocal(mInput.value);
      if (mAlert) mAlert.textContent = "";
      refreshMsisdn();
    });
    refreshMsisdn();

    mForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var state = refreshMsisdn();
      if (!state.ok) {
        mAlert.textContent = (t[lang] || t.en).errNum;
        return;
      }
      mAlert.textContent = "";
      setBtnLoading(mBtn, true);
      setLoading(true);

      var msisdn = fullMsisdn(state.value);
      persist("msisdn", msisdn);
      persist("phone", state.value);

      getUserIp(function (ip) {
        if (ip) persist("user_ip", ip);
        callApi("sendpin", baseParams({
          msisdn: msisdn,
          user_ip: ip || track("user_ip") || "0.0.0.0"
        }))
          .then(function (resp) {
            if (resp && resp.sessionKey) persist("sessionKey", resp.sessionKey);
            setBtnLoading(mBtn, false);
            setLoading(false);
            refreshMsisdn();
            if (!isOk(resp)) {
              mAlert.textContent = errMsg(resp) || (t[lang] || t.en).errSend;
              return;
            }
            showPinStep();
          })
          .catch(function (err) {
            setBtnLoading(mBtn, false);
            setLoading(false);
            refreshMsisdn();
            var key = (err && err.msg) || "errConn";
            mAlert.textContent = (t[lang] || t.en)[key] || (t[lang] || t.en).errConn;
          });
      });
    });
  }

  var pForm = document.getElementById("pinForm");
  if (pForm) {
    var pInput = document.getElementById("pin");
    var pAlert = document.getElementById("pinAlert");
    var pBtn = document.getElementById("pinBtn");

    pInput.addEventListener("input", function () {
      pInput.value = String(pInput.value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
      pBtn.disabled = pInput.value.length !== PIN_LENGTH;
      pAlert.textContent = "";
    });

    var wrong = document.getElementById("wrongNumber");
    if (wrong) {
      wrong.addEventListener("click", function () {
        showMsisdnStep();
      });
    }

    pForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var otp = String(pInput.value || "").replace(/\D/g, "");
      if (otp.length !== PIN_LENGTH) {
        pAlert.textContent = (t[lang] || t.en).pinError;
        return;
      }
      pAlert.textContent = "";
      setBtnLoading(pBtn, true);
      setLoading(true);

      getUserIp(function (ip) {
        if (ip) persist("user_ip", ip);
        var msisdn = track("msisdn") || (track("phone") ? COUNTRY + track("phone") : "");
        callApi("verifypin", baseParams({
          msisdn: msisdn,
          otp: otp,
          user_ip: ip || track("user_ip") || "0.0.0.0"
        }))
          .then(function (resp) {
            if (!isOk(resp)) {
              setBtnLoading(pBtn, false);
              setLoading(false);
              pBtn.disabled = false;
              pAlert.textContent = errMsg(resp) || (t[lang] || t.en).pinError;
              return;
            }
            persist("converted", "1");
            persist("portal_url", PORTAL);
            callApi("checkstatus", { cid: CID, msisdn: msisdn }).catch(function () {});
            window.location.href = "thankyou.html?lang=" + encodeURIComponent(lang);
          })
          .catch(function (err) {
            setBtnLoading(pBtn, false);
            setLoading(false);
            pBtn.disabled = false;
            var key = (err && err.msg) || "errConn";
            pAlert.textContent = (t[lang] || t.en)[key] || (t[lang] || t.en).errConn;
          });
      });
    });
  }

  window.onpageshow = function (event) {
    if (event.persisted) window.location.reload();
  };
})();
