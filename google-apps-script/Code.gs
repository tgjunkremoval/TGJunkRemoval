/**
 * TGJunkRemoval Quote Form Backend
 * --------------------------------
 * Deploy this file as a Google Apps Script Web App.
 * The website sends customer info + compressed photos.
 * This script:
 *   1. Validates the request.
 *   2. Creates a formatted Google Doc.
 *   3. Converts the document to PDF.
 *   4. Emails the PDF to the business.
 *   5. Optionally saves PDFs/photos in a Drive folder.
 */

// ==================== EDIT THESE ====================
const BUSINESS_EMAIL = "YOUR_EMAIL@example.com";
const BUSINESS_NAME = "TGJunkRemoval";
const DRIVE_FOLDER_ID = ""; // Optional. Leave blank if you do not want Drive copies.
// ====================================================

function doGet() {
  return jsonResponse({
    ok: true,
    service: BUSINESS_NAME + " quote endpoint"
  });
}

function doPost(e) {
  let tempDocId = null;

  try {
    if (!e || !e.parameter || !e.parameter.payload) {
      throw new Error("Missing form payload.");
    }

    const data = JSON.parse(e.parameter.payload);

    validateSubmission_(data);

    const photos = (data.photos || []).slice(0, 4).map((photo, i) => {
      const base64 = String(photo.dataUrl || "").split(",").pop();
      if (!base64) return null;

      const bytes = Utilities.base64Decode(base64);
      return Utilities.newBlob(
        bytes,
        photo.type || "image/jpeg",
        sanitizeFileName_(photo.name || ("photo-" + (i + 1) + ".jpg"))
      );
    }).filter(Boolean);

    const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd h:mm a");
    const safeName = sanitizeFileName_(fullName || "Customer");

    const doc = DocumentApp.create(
      BUSINESS_NAME + " Quote - " + safeName + " - " +
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd")
    );
    tempDocId = doc.getId();

    buildQuoteDocument_(doc, data, photos, timestamp);

    doc.saveAndClose();
    Utilities.sleep(500);

    const pdfName = BUSINESS_NAME + "-Quote-" + safeName + ".pdf";
    const pdfBlob = DriveApp.getFileById(doc.getId()).getAs(MimeType.PDF).setName(pdfName);

    if (DRIVE_FOLDER_ID) {
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      folder.createFile(pdfBlob.copyBlob());

      if (photos.length) {
        const photoFolder = folder.createFolder(
          "Photos - " + safeName + " - " +
          Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss")
        );
        photos.forEach(blob => photoFolder.createFile(blob));
      }
    }

    const subject = "New Junk Removal Quote — " + fullName;
    const plainText =
      "New quote request from " + fullName + "\n\n" +
      "Phone: " + clean_(data.phone) + "\n" +
      "Email: " + clean_(data.email) + "\n" +
      "Address: " + clean_(data.address) + "\n" +
      "Service: " + clean_(data.serviceType || "Not specified") + "\n" +
      "Preferred contact: " + clean_(data.contactMethod || "Not specified") + "\n\n" +
      "A full PDF quote request is attached.";

    const htmlBody =
      '<div style="font-family:Arial,sans-serif;max-width:640px;color:#17251d">' +
      '<div style="background:#17251d;color:#fff;padding:22px 26px;border-radius:16px 16px 0 0">' +
      '<div style="font-size:12px;letter-spacing:2px;color:#c8f15a;font-weight:700">NEW WEBSITE LEAD</div>' +
      '<h2 style="margin:7px 0 0">' + escapeHtml_(BUSINESS_NAME) + ' Quote Request</h2></div>' +
      '<div style="border:1px solid #dfe5df;border-top:0;padding:24px 26px;border-radius:0 0 16px 16px">' +
      '<p><strong>Customer:</strong> ' + escapeHtml_(fullName) + '</p>' +
      '<p><strong>Phone:</strong> ' + escapeHtml_(clean_(data.phone)) + '</p>' +
      '<p><strong>Email:</strong> ' + escapeHtml_(clean_(data.email)) + '</p>' +
      '<p><strong>Pickup address:</strong> ' + escapeHtml_(clean_(data.address)) + '</p>' +
      '<p><strong>Service:</strong> ' + escapeHtml_(clean_(data.serviceType || "Not specified")) + '</p>' +
      '<p><strong>Preferred contact:</strong> ' + escapeHtml_(clean_(data.contactMethod || "Not specified")) + '</p>' +
      '<p style="margin-bottom:0"><strong>PDF attached:</strong> customer details, description and submitted photos.</p>' +
      '</div></div>';

    MailApp.sendEmail({
      to: BUSINESS_EMAIL,
      subject: subject,
      body: plainText,
      htmlBody: htmlBody,
      attachments: [pdfBlob],
      name: BUSINESS_NAME + " Website"
    });

    // Delete temporary Doc. PDF remains in email and, if configured, Drive.
    DriveApp.getFileById(doc.getId()).setTrashed(true);
    tempDocId = null;

    return jsonResponse({
      ok: true,
      message: "Quote request sent successfully."
    });

  } catch (error) {
    console.error(error);

    if (tempDocId) {
      try { DriveApp.getFileById(tempDocId).setTrashed(true); } catch (_) {}
    }

    return jsonResponse({
      ok: false,
      message: error.message || "Unexpected server error."
    });
  }
}

function buildQuoteDocument_(doc, data, photos, timestamp) {
  const body = doc.getBody();
  body.clear();
  body.setMarginTop(42);
  body.setMarginBottom(42);
  body.setMarginLeft(50);
  body.setMarginRight(50);

  const title = body.appendParagraph(BUSINESS_NAME);
  title.setHeading(DocumentApp.ParagraphHeading.TITLE);
  title.setForegroundColor("#17251d");
  title.setBold(true);

  const subtitle = body.appendParagraph("NEW JUNK REMOVAL QUOTE REQUEST");
  subtitle.setForegroundColor("#5f755f");
  subtitle.setFontSize(10);
  subtitle.setBold(true);

  body.appendHorizontalRule();

  const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();

  addSectionTitle_(body, "CUSTOMER");
  addInfoTable_(body, [
    ["Name", fullName],
    ["Phone", clean_(data.phone)],
    ["Email", clean_(data.email)],
    ["Pickup Address", clean_(data.address)],
    ["Preferred Contact", clean_(data.contactMethod || "Not specified")]
  ]);

  addSectionTitle_(body, "SERVICE REQUEST");
  addInfoTable_(body, [
    ["Service Type", clean_(data.serviceType || "Not specified")],
    ["Submitted", timestamp]
  ]);

  const detailsTitle = body.appendParagraph("Items / Details");
  detailsTitle.setBold(true);
  detailsTitle.setFontSize(10);
  detailsTitle.setForegroundColor("#607064");

  const details = body.appendParagraph(clean_(data.details));
  details.setFontSize(11);
  details.setSpacingAfter(14);

  if (photos.length) {
    addSectionTitle_(body, "CUSTOMER PHOTOS");

    photos.forEach((photo, index) => {
      const p = body.appendParagraph("Photo " + (index + 1));
      p.setBold(true);
      p.setFontSize(9);
      p.setForegroundColor("#607064");

      try {
        const image = body.appendImage(photo);
        const maxWidth = 430;

        if (image.getWidth() > maxWidth) {
          const ratio = maxWidth / image.getWidth();
          image.setWidth(maxWidth);
          image.setHeight(Math.round(image.getHeight() * ratio));
        }

        body.appendParagraph("");
      } catch (imgError) {
        body.appendParagraph("[Image could not be added to PDF]");
      }
    });
  }

  body.appendHorizontalRule();
  const footer = body.appendParagraph(
    "Generated from the " + BUSINESS_NAME + " website quote form."
  );
  footer.setFontSize(8);
  footer.setForegroundColor("#7d887f");
}

function addSectionTitle_(body, text) {
  const p = body.appendParagraph(text);
  p.setBold(true);
  p.setFontSize(11);
  p.setForegroundColor("#17251d");
  p.setSpacingBefore(14);
  p.setSpacingAfter(8);
}

function addInfoTable_(body, rows) {
  const table = body.appendTable(rows.map(row => [String(row[0]), clean_(row[1])]));
  table.setBorderColor("#d9dfda");
  table.setBorderWidth(1);

  for (let i = 0; i < table.getNumRows(); i++) {
    const row = table.getRow(i);
    row.getCell(0).setBackgroundColor("#f2f5f1");
    row.getCell(0).getChild(0).asParagraph().setBold(true).setFontSize(9);
    row.getCell(1).getChild(0).asParagraph().setFontSize(9);
  }

  body.appendParagraph("");
}

function validateSubmission_(data) {
  const required = ["firstName", "lastName", "phone", "email", "address", "details"];
  required.forEach(key => {
    if (!data[key] || !String(data[key]).trim()) {
      throw new Error("Missing required field: " + key);
    }
  });

  if (!data.consent) {
    throw new Error("Contact consent is required.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) {
    throw new Error("Invalid email address.");
  }

  if ((data.photos || []).length > 4) {
    throw new Error("Too many photos.");
  }
}

function clean_(value) {
  return String(value == null ? "" : value).trim().substring(0, 5000);
}

function sanitizeFileName_(name) {
  return String(name).replace(/[\\/:*?"<>|#%{}~&]/g, "-").substring(0, 100);
}

function escapeHtml_(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
