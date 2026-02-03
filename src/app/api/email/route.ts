import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const to = formData.get('to') as string;
        const subject = formData.get('subject') as string;
        const text = formData.get('text') as string;
        const attachmentResult = formData.get('attachment');

        if (!to || !subject) {
            return NextResponse.json({ error: 'Missing to/subject' }, { status: 400 });
        }

        // Configure Transporter (Mock if no env vars)
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: 587,
            auth: {
                user: process.env.SMTP_USER || 'ethereal_user',
                pass: process.env.SMTP_PASS || 'ethereal_pass',
            },
        });

        const mailOptions: any = {
            from: process.env.SMTP_FROM || '"OmniVax" <noreply@omnivax.my>',
            to,
            subject,
            text,
        };

        if (attachmentResult && attachmentResult instanceof Blob) {
            const buffer = Buffer.from(await attachmentResult.arrayBuffer());
            mailOptions.attachments = [{
                filename: 'Certificate.pdf',
                content: buffer,
                contentType: 'application/pdf'
            }];
        }

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: %s", info.messageId);

        return NextResponse.json({ success: true, messageId: info.messageId });
    } catch (e: any) {
        console.error('Email Error', e);
        return NextResponse.json({ error: e.message || 'Failed to send' }, { status: 500 });
    }
}
