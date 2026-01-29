import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

export interface CertificateData {
    id: string; // Certificate ID (UUID)
    patientName: string;
    patientId: string;
    vaccineName: string;
    batch: string;
    dose: string;
    date: string;
    doctorName: string;
    clinicName: string;
    verificationUrl: string; // The URL encoded in QR
}

export async function generateCertificatePDF(data: CertificateData): Promise<Uint8Array> {
    // Create a new PDFDocument
    const pdfDoc = await PDFDocument.create();

    // Embed the content
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Generate QR Code
    const qrDataUrl = await QRCode.toDataURL(data.verificationUrl);
    const qrImage = await pdfDoc.embedPng(qrDataUrl);

    // Helper to draw text centered
    const drawCentered = (text: string, y: number, size: number, f: any = font) => {
        const textWidth = f.widthOfTextAtSize(text, size);
        page.drawText(text, {
            x: (width - textWidth) / 2,
            y,
            size,
            font: f,
            color: rgb(0, 0, 0),
        });
    };

    // Header
    drawCentered('CERTIFICATE OF VACCINATION', height - 100, 24, fontBold);
    drawCentered('SIJIL VAKSINASI', height - 130, 18, font);

    // Clinic Info
    drawCentered(data.clinicName, height - 180, 14, fontBold);

    // Patient Info
    const startY = height - 250;
    const lineHeight = 30;

    const drawField = (label: string, value: string, y: number) => {
        page.drawText(label, { x: 100, y, size: 12, font: font, color: rgb(0.4, 0.4, 0.4) });
        page.drawText(value, { x: 250, y, size: 12, font: fontBold, color: rgb(0, 0, 0) });
    };

    drawField('Name / Nama:', data.patientName, startY);
    drawField('ID / No. KP:', data.patientId, startY - lineHeight);
    drawField('Vaccine / Vaksin:', data.vaccineName, startY - lineHeight * 2);
    drawField('Batch / Kelompok:', data.batch, startY - lineHeight * 3);
    drawField('Dose / Dos:', data.dose, startY - lineHeight * 4);
    drawField('Date / Tarikh:', data.date, startY - lineHeight * 5);
    drawField('Doctor / Doktor:', data.doctorName, startY - lineHeight * 6);

    // QR Code
    const qrDims = qrImage.scale(0.5);
    page.drawImage(qrImage, {
        x: (width - qrDims.width) / 2,
        y: startY - lineHeight * 10,
        width: qrDims.width,
        height: qrDims.height,
    });

    drawCentered('Scan to Verify / Imbas untuk Sahkan', startY - lineHeight * 10 - 20, 10, font);
    drawCentered(`Cert ID: ${data.id.slice(0, 8)}...`, startY - lineHeight * 10 - 35, 8, font);

    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}

export interface InvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface InvoiceData {
    invoiceNumber: string;
    date: string;
    myClinicName: string;
    myClinicAddress: string; // Multi-line
    clientName: string;
    clientAddress: string; // Multi-line
    bankName?: string;
    bankAccount?: string;
    items: InvoiceItem[];
    grandTotal: number;
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const drawText = (text: string, x: number, y: number, size: number = 10, f: any = font, color: any = rgb(0, 0, 0)) => {
        page.drawText(text, { x, y, size, font: f, color });
    };

    const drawRight = (text: string, x: number, y: number, size: number = 10, f: any = font) => {
        const w = f.widthOfTextAtSize(text, size);
        page.drawText(text, { x: x - w, y, size, font: f, color: rgb(0, 0, 0) });
    };

    const drawCentered = (text: string, y: number, size: number, f: any = font) => {
        const textWidth = f.widthOfTextAtSize(text, size);
        page.drawText(text, {
            x: (width - textWidth) / 2,
            y,
            size,
            font: f,
            color: rgb(0, 0, 0),
        });
    };

    // 1. Header
    drawText('INVOICE', 50, height - 60, 24, fontBold, rgb(0, 0, 0));
    drawRight(`#${data.invoiceNumber}`, width - 50, height - 60, 14, fontBold);
    drawRight(data.date, width - 50, height - 80, 10, font);

    // 2. From (My Clinic)
    let y = height - 120;
    drawText('FROM:', 50, y, 8, fontBold, rgb(0.5, 0.5, 0.5));
    y -= 15;
    drawText(data.myClinicName, 50, y, 12, fontBold);
    y -= 15;
    data.myClinicAddress.split('\n').forEach(line => {
        drawText(line, 50, y, 10, font);
        y -= 12;
    });

    // 3. To (Client)
    y = height - 120;
    const rightColX = 350;
    drawText('BILL TO:', rightColX, y, 8, fontBold, rgb(0.5, 0.5, 0.5));
    y -= 15;
    drawText(data.clientName, rightColX, y, 12, fontBold);
    y -= 15;
    data.clientAddress.split('\n').forEach(line => {
        drawText(line, rightColX, y, 10, font);
        y -= 12;
    });

    // 4. Items Table
    y = height - 250;

    // Header Row
    page.drawRectangle({ x: 40, y: y - 10, width: width - 80, height: 25, color: rgb(0.95, 0.95, 0.95) });
    drawText('DESCRIPTION', 50, y, 9, fontBold);
    drawRight('QTY', 350, y, 9, fontBold);
    drawRight('UNIT PRICE (RM)', 450, y, 9, fontBold);
    drawRight('AMOUNT (RM)', width - 50, y, 9, fontBold);

    y -= 30;

    // Items
    data.items.forEach(item => {
        drawText(item.description, 50, y, 10, font);
        drawRight(item.quantity.toString(), 350, y, 10, font);
        drawRight(item.unitPrice.toFixed(2), 450, y, 10, font);
        drawRight(item.total.toFixed(2), width - 50, y, 10, fontBold);

        // Line
        page.drawLine({ start: { x: 50, y: y - 10 }, end: { x: width - 50, y: y - 10 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });

        y -= 25;
    });

    // 5. Total
    y -= 20;
    drawRight('GRAND TOTAL:', 450, y, 12, fontBold);
    drawRight(`RM ${data.grandTotal.toFixed(2)}`, width - 50, y, 14, fontBold);

    // 6. Footer (Bank Info etc)
    y = 100;
    drawText('PAYMENT INSTRUCTIONS:', 50, y, 8, fontBold, rgb(0.5, 0.5, 0.5));
    y -= 15;
    drawText(`Bank Name: ${data.bankName || '-'}`, 50, y, 10, font);
    y -= 12;
    drawText(`Account: ${data.bankAccount || '-'}`, 50, y, 10, font);
    y -= 12;
    drawText('Ref: Invoice # / Project Name', 50, y, 10, font);

    drawCentered('Thank you for your business!', 40, 10, font);

    const pdfBytesOut = await pdfDoc.save();
    return pdfBytesOut;
}
