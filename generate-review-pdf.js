// Run once:  node generate-review-pdf.js
// Output:    Complimentary-Review-Form.pdf
// Requires:  npm install pdf-lib  (already installed)

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');

async function build() {
  const doc  = await PDFDocument.create();
  const form = doc.getForm();

  const bold   = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg    = await doc.embedFont(StandardFonts.Helvetica);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const NAVY  = rgb(0.051, 0.114, 0.255);
  const GOLD  = rgb(0.745, 0.588, 0.196);
  const GRAY  = rgb(0.42,  0.42,  0.42);
  const LGRAY = rgb(0.93,  0.93,  0.93);
  const WHITE = rgb(1, 1, 1);
  const BLACK = rgb(0, 0, 0);
  const LBLUE = rgb(0.93, 0.96, 0.99);

  const W = 612, H = 792;
  const ML = 36, MR = 576, CW = 540;

  // ── helpers ──────────────────────────────────────────────────────────────

  function label(page, text, x, y, size = 8) {
    page.drawText(text.toUpperCase(), { x, y, size, font: bold, color: NAVY });
  }

  function caption(page, text, x, y, size = 7.5) {
    page.drawText(text, { x, y, size, font: italic, color: GRAY });
  }

  function sectionBar(page, text, y) {
    page.drawRectangle({ x: ML, y: y - 4, width: CW, height: 16, color: NAVY });
    page.drawText(text, { x: ML + 8, y: y - 0.5, size: 8.5, font: bold, color: WHITE });
    return y - 24;
  }

  function textField(page, name, x, y, w, h = 14) {
    const field = form.createTextField(name);
    field.enableMultiline(false);
    field.addToPage(page, { x, y, width: w, height: h, borderWidth: 0.5,
      borderColor: rgb(0.7, 0.7, 0.7), backgroundColor: rgb(0.98, 0.98, 0.98) });
  }

  function bigTextField(page, name, x, y, w, h) {
    const field = form.createTextField(name);
    field.enableMultiline(true);
    field.addToPage(page, { x, y, width: w, height: h, borderWidth: 0.5,
      borderColor: rgb(0.7, 0.7, 0.7), backgroundColor: rgb(0.98, 0.98, 0.98) });
  }

  function checkBox(page, name, x, y) {
    const cb = form.createCheckBox(name);
    cb.addToPage(page, { x, y, width: 10, height: 10, borderWidth: 0.5,
      borderColor: rgb(0.5, 0.5, 0.5), backgroundColor: rgb(0.98, 0.98, 0.98) });
  }

  function cbItem(page, name, labelText, x, y) {
    checkBox(page, name, x, y);
    page.drawText(labelText, { x: x + 14, y: y + 1, size: 8, font: reg, color: BLACK });
  }

  function row2(page, lbl1, name1, lbl2, name2, x, y, fullW) {
    const half = (fullW - 12) / 2;
    label(page, lbl1, x, y);
    textField(page, name1, x, y - 16, half);
    label(page, lbl2, x + half + 12, y);
    textField(page, name2, x + half + 12, y - 16, half);
    return y - 34;
  }

  function row3(page, labels, names, x, y, fullW) {
    const third = (fullW - 24) / 3;
    labels.forEach((lbl, i) => {
      const ox = x + i * (third + 12);
      label(page, lbl, ox, y);
      textField(page, names[i], ox, y - 16, third);
    });
    return y - 34;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 1
  // ═══════════════════════════════════════════════════════════════════════

  const p1 = doc.addPage([W, H]);

  // Header band
  p1.drawRectangle({ x: 0, y: H - 90, width: W, height: 90, color: NAVY });
  p1.drawRectangle({ x: 0, y: H - 93, width: W, height: 3, color: GOLD });

  p1.drawText('COMPLIMENTARY LIFE & LONG-TERM CARE INSURANCE REVIEW', {
    x: ML, y: H - 28, size: 13, font: bold, color: WHITE });
  p1.drawText('Insurance Review Services  ·  Withbert (Bert) W. Payne, CPA, CGMA, FCA', {
    x: ML, y: H - 46, size: 9, font: reg, color: rgb(0.82, 0.76, 0.62) });
  p1.drawText('CA Insurance License No. 0E90257  ·  (925) 708-6501  ·  LTCCPAS.com', {
    x: ML, y: H - 61, size: 8.5, font: italic, color: rgb(0.72, 0.64, 0.48) });

  // Tagline box
  p1.drawRectangle({ x: ML, y: H - 120, width: CW, height: 22, color: rgb(0.94, 0.97, 1.0) });
  p1.drawText(
    'Most people review their investment portfolio regularly, but rarely review their life or long-term care protection.',
    { x: ML + 6, y: H - 108, size: 7.5, font: italic, color: GRAY });
  p1.drawText(
    'As a CPA, Chartered Accountant, and former internal auditor at an insurance company, Bert provides an independent review. Takes about 3 minutes.',
    { x: ML + 6, y: H - 118, size: 7.5, font: italic, color: GRAY });

  let y = H - 148;

  // ── PERSONAL INFORMATION ────────────────────────────────────────────────
  y = sectionBar(p1, 'PERSONAL INFORMATION', y);

  y = row3(p1, ['Full Legal Name', 'Date of Birth', 'Mobile Phone'],
               ['full_name', 'dob', 'mobile'], ML, y, CW); y -= 4;

  y = row2(p1, 'Email Address', 'email', 'City / State', 'city_state', ML, y, CW); y -= 4;

  // Marital status
  label(p1, 'Marital Status', ML, y);
  y -= 18;
  cbItem(p1, 'ms_single',    'Single',                           ML,       y);
  cbItem(p1, 'ms_married',   'Married',                          ML + 90,  y);
  cbItem(p1, 'ms_other',     'Partnered / Widowed / Divorced',   ML + 180, y);
  y -= 22;

  // ── WHAT WOULD YOU LIKE REVIEWED? ───────────────────────────────────────
  y = sectionBar(p1, 'WHAT WOULD YOU LIKE REVIEWED?', y);

  cbItem(p1, 'rev_ltc',      'Long-Term Care Insurance',        ML,        y);
  cbItem(p1, 'rev_life',     'Life Insurance',                  ML + 200,  y);
  y -= 18;
  cbItem(p1, 'rev_existing', 'Existing Policy Review',          ML,        y);
  cbItem(p1, 'rev_business', 'Business / Buy-Sell / Key Person',ML + 200,  y);
  y -= 18;
  cbItem(p1, 'rev_estate',   'Estate Planning / ILIT',          ML,        y);
  cbItem(p1, 'rev_unsure',   'Not Sure — Need Advice',          ML + 200,  y);
  y -= 22;

  // ── DO YOU CURRENTLY OWN COVERAGE? ─────────────────────────────────────
  y = sectionBar(p1, 'DO YOU CURRENTLY OWN COVERAGE?', y);

  p1.drawText('Long-Term Care:', { x: ML, y: y + 1, size: 8.5, font: bold, color: NAVY });
  cbItem(p1, 'cur_ltc_yes', 'Yes', ML + 90,  y);
  cbItem(p1, 'cur_ltc_no',  'No',  ML + 120, y);
  y -= 18;

  p1.drawText('Life Insurance:', { x: ML, y: y + 1, size: 8.5, font: bold, color: NAVY });
  cbItem(p1, 'cur_life_yes', 'Yes', ML + 90,  y);
  cbItem(p1, 'cur_life_no',  'No',  ML + 120, y);
  y -= 22;

  // ── PRIMARY CONCERN ─────────────────────────────────────────────────────
  y = sectionBar(p1, 'PRIMARY CONCERN  (check all that apply)', y);

  cbItem(p1, 'pc_protect_assets', 'Protect retirement assets from LTC costs', ML,       y);
  cbItem(p1, 'pc_lifetime_ltc',   'Obtain lifetime LTC protection',           ML + 280, y);
  y -= 18;
  cbItem(p1, 'pc_review',         'Review my existing policies',              ML,       y);
  cbItem(p1, 'pc_legacy',         'Leave a legacy to family',                 ML + 280, y);
  y -= 18;
  cbItem(p1, 'pc_estate',         'Estate planning',                          ML,       y);
  cbItem(p1, 'pc_business',       'Business succession planning',             ML + 280, y);
  y -= 18;
  cbItem(p1, 'pc_guidance',       'Not sure — seeking guidance',              ML,       y);
  y -= 22;

  // ── LONG-TERM CARE PLANNING ─────────────────────────────────────────────
  y = sectionBar(p1, 'LONG-TERM CARE PLANNING  (if applicable)', y);

  label(p1, 'Desired Monthly LTC Benefit:', ML, y);
  y -= 18;
  cbItem(p1, 'ltc_5k',     '$5,000',    ML,        y);
  cbItem(p1, 'ltc_10k',    '$10,000',   ML + 80,   y);
  cbItem(p1, 'ltc_15k',    '$15,000+',  ML + 165,  y);
  cbItem(p1, 'ltc_unsure', 'Not sure',  ML + 250,  y);
  y -= 22;

  label(p1, 'Preferred Benefit Duration:', ML, y);
  y -= 18;
  cbItem(p1, 'dur_3yr',     '3 Years',   ML,       y);
  cbItem(p1, 'dur_life',    'Lifetime',  ML + 80,  y);
  cbItem(p1, 'dur_unsure',  'Not sure',  ML + 165, y);
  y -= 22;

  // Footer p1
  p1.drawLine({ start: { x: ML, y: 36 }, end: { x: MR, y: 36 }, thickness: 0.4, color: rgb(0.8,0.8,0.8) });
  p1.drawText('Page 1 of 2  ·  LTCCPAs.com  ·  (925) 708-6501  ·  bert.ltccpas@gmail.com  ·  All reviews are complimentary and confidential.',
    { x: ML, y: 24, size: 7.5, font: reg, color: GRAY });

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 2
  // ═══════════════════════════════════════════════════════════════════════

  const p2 = doc.addPage([W, H]);

  // Mini header
  p2.drawRectangle({ x: 0, y: H - 40, width: W, height: 40, color: NAVY });
  p2.drawRectangle({ x: 0, y: H - 43, width: W, height: 3, color: GOLD });
  p2.drawText('COMPLIMENTARY LIFE & LTC INSURANCE REVIEW  —  Page 2 of 2', {
    x: ML, y: H - 26, size: 10, font: bold, color: WHITE });
  p2.drawText('LTCCPAs.com  ·  bert.ltccpas@gmail.com  ·  (925) 708-6501',
    { x: ML, y: H - 37, size: 8, font: reg, color: rgb(0.82, 0.76, 0.62) });

  y = H - 68;

  // ── LIFE INSURANCE GOAL ──────────────────────────────────────────────────
  y = sectionBar(p2, 'LIFE INSURANCE GOAL  (if applicable)', y);

  cbItem(p2, 'li_income',   'Income Protection',   ML,       y);
  cbItem(p2, 'li_estate',   'Estate Planning',     ML + 200, y);
  y -= 18;
  cbItem(p2, 'li_wealth',   'Wealth Transfer',     ML,       y);
  cbItem(p2, 'li_business', 'Business Planning',   ML + 200, y);
  y -= 22;

  label(p2, 'Desired Coverage Amount  (if known)', ML, y);
  textField(p2, 'li_amount', ML, y - 16, CW);
  y -= 34;

  // ── EXISTING COVERAGE ────────────────────────────────────────────────────
  y = sectionBar(p2, 'EXISTING COVERAGE  (brief)', y);

  label(p2, 'Carrier Name  (if any)', ML, y);
  textField(p2, 'carrier_name', ML, y - 16, CW);
  y -= 34;

  caption(p2, 'Have policy documents handy? You\'re welcome to attach them when you email this form back to Bert — no need to retype details.', ML, y);
  y -= 22;

  // ── HOW DID YOU HEAR ABOUT US? ───────────────────────────────────────────
  y = sectionBar(p2, 'HOW DID YOU HEAR ABOUT US?', y);

  cbItem(p2, 'ref_cpa',      'CPA / Attorney',    ML,       y);
  cbItem(p2, 'ref_advisor',  'Financial Advisor', ML + 200, y);
  y -= 18;
  cbItem(p2, 'ref_existing', 'Existing Client',   ML,       y);
  cbItem(p2, 'ref_linkedin', 'LinkedIn',          ML + 200, y);
  y -= 18;
  cbItem(p2, 'ref_search',   'Internet Search',   ML,       y);
  cbItem(p2, 'ref_other',    'Other',             ML + 200, y);
  y -= 22;

  // ── COMMENTS OR QUESTIONS ────────────────────────────────────────────────
  y = sectionBar(p2, 'COMMENTS OR QUESTIONS', y);

  bigTextField(p2, 'comments', ML, y - 64, CW, 58);
  y -= 78;

  // ── CONSENT & ELECTRONIC SIGNATURE ──────────────────────────────────────
  y = sectionBar(p2, 'AUTHORIZATION & ELECTRONIC SIGNATURE', y);

  checkBox(p2, 'sig_consent', ML, y);
  p2.drawText(
    'I authorize Insurance Review Services to contact me regarding my inquiry.',
    { x: ML + 14, y: y + 1, size: 8, font: reg, color: BLACK });
  y -= 13;
  p2.drawText(
    'This is a request for information and review only — it is not an insurance application and does not guarantee coverage.',
    { x: ML + 14, y: y + 1, size: 7.5, font: italic, color: GRAY });
  y -= 22;

  const sigW  = CW * 0.65;
  const dateW = CW - sigW - 12;
  label(p2, 'Electronic Signature — type your full legal name', ML, y);
  label(p2, 'Date', ML + sigW + 12, y);
  y -= 4;

  const sigField = form.createTextField('electronic_signature');
  sigField.addToPage(p2, {
    x: ML, y: y - 36, width: sigW, height: 34,
    borderWidth: 1.5,
    borderColor: GOLD,
    backgroundColor: rgb(0.99, 0.97, 0.93),
  });
  textField(p2, 'sig_date', ML + sigW + 12, y - 18, dateW);
  y -= 50;

  // Return instructions
  p2.drawRectangle({ x: ML, y: y - 28, width: CW, height: 32, color: LBLUE });
  p2.drawText('Please email the completed form to:', { x: ML + 8, y: y - 8, size: 8.5, font: bold, color: NAVY });
  p2.drawText('bert.ltccpas@gmail.com   or   withbert.payne@insurance-review-services.com', {
    x: ML + 8, y: y - 22, size: 8.5, font: reg, color: NAVY });
  y -= 40;

  // Disclaimer
  p2.drawRectangle({ x: ML, y: y - 26, width: CW, height: 28, color: LGRAY });
  caption(p2, 'All reviews are complimentary and confidential. Withbert W. Payne is a licensed CA insurance broker (CA License No. 0E90257).', ML + 6, y - 10, 7.5);
  caption(p2, 'This form does not constitute a binding insurance agreement or guarantee of coverage. Insurance products and availability vary by state.', ML + 6, y - 21, 7);

  // Footer p2
  p2.drawLine({ start: { x: ML, y: 36 }, end: { x: MR, y: 36 }, thickness: 0.4, color: rgb(0.8,0.8,0.8) });
  p2.drawText('Page 2 of 2  ·  LTCCPAs.com  ·  (925) 708-6501  ·  bert.ltccpas@gmail.com  ·  All reviews are complimentary and confidential.',
    { x: ML, y: 24, size: 7.5, font: reg, color: GRAY });

  // ── METADATA ──────────────────────────────────────────────────────────────
  doc.setTitle('Complimentary Life & LTC Insurance Review — LTCCPAs.com');
  doc.setAuthor('Withbert W. Payne, CPA, CGMA, FCA');
  doc.setSubject('Complimentary Insurance Review Intake Form');
  doc.setKeywords(['LTC insurance', 'life insurance', 'complimentary review', 'LTCCPAs.com']);
  doc.setCreator('LTCCPAs.com');
  doc.setProducer('LTCCPAs.com');

  // ── SAVE ──────────────────────────────────────────────────────────────────
  const bytes = await doc.save();
  fs.writeFileSync('Complimentary-Review-Form.pdf', bytes);
  console.log('Created: Complimentary-Review-Form.pdf');
}

build().catch(console.error);
