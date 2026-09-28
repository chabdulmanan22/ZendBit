require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors());

// Middleware with 50MB payload limit (fixes 413 Payload Too Large)
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads', 'logos');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve /uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Nodemailer Transporter using Environment Variables
const smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
const smtpUser = process.env.SMTP_USER || process.env.SMTP_USERNAME || 'legal@zendbit.org';
const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465 || process.env.SMTP_SECURE === 'true',
    auth: {
        user: smtpUser,
        pass: smtpPass
    }
});

// Contact Form API Endpoint
app.post(['/api/send-email', '/api/contact', '/submit'], async (req, res) => {
    try {
        const body = req.body || {};
        const name = body.name || body.fullName || '';
        const email = body.email || body.emailAddress || '';
        const subject_field = body.subject_field || body.subjectField || body.subject || '';
        const message = body.message || body.msg || '';

        const fromName = name.trim() || 'Anonymous Visitor';
        const senderEmail = email.trim() || 'No email provided';
        const msgSubject = subject_field.trim() || 'New Contact Message';
        const msgText = message.trim() || '(No message content)';

        const mailOptions = {
            from: `"ZendBit Support" <${smtpUser}>`,
            to: smtpUser,
            replyTo: senderEmail,
            subject: `[Website Inquiry] ${msgSubject} - ${fromName}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0a0e17; color: #e0e0e0; border-radius: 8px; border: 1px solid #1e293b;">
                    <h2 style="color: #00d4ff; margin-top: 0;">New Contact Message from ZendBit Website</h2>
                    <hr style="border: 0; border-top: 1px solid #1e293b; margin: 15px 0;" />
                    <p><strong>From Name:</strong> ${fromName}</p>
                    <p><strong>Sender Email:</strong> <a href="mailto:${senderEmail}" style="color: #00d4ff;">${senderEmail}</a></p>
                    <p><strong>Subject:</strong> ${msgSubject}</p>
                    <p><strong>Message Content:</strong></p>
                    <div style="background-color: #121824; padding: 15px; border-left: 4px solid #00d4ff; margin-top: 10px; border-radius: 4px;">
                        <p style="white-space: pre-wrap; margin: 0; color: #e0e0e0; font-size: 15px;">${msgText}</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        return res.status(200).json({
            success: true,
            message: `✓ Your message has been sent successfully to ${smtpUser}!`
        });
    } catch (err) {
        console.error('[EMAIL SEND ERROR]', err.message);
        return res.status(500).json({
            success: false,
            message: `Failed to send email via SMTP: ${err.message}`
        });
    }
});

// Mount Admin API Routes synchronously (Always Available)
const authRoutes = require('./routes/auth');
const walletPresetRoutes = require('./routes/walletPresets');
const adminSettingsRoutes = require('./routes/adminSettings');
const uploadRoutes = require('./routes/upload');
const tokenRoutes = require('./routes/tokens');

app.use('/api/auth', authRoutes);
app.use('/api/wallet-presets', walletPresetRoutes);
app.use('/api/admin-settings', adminSettingsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/tokens', tokenRoutes);

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb+srv://rizwan001:rizwan@cluster0.yo4u6ko.mongodb.net/crestchain?retryWrites=true&w=majority';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_123456789_rizwan_syal_admin_panel_2024';

mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
    .then(async () => {
        console.log(`[MONGODB CONNECTED SUCCESS]`);
        const Admin = require('./models/Admin');
        const adminCount = await Admin.countDocuments();
        if (adminCount === 0) {
            console.log('[SEEDING DB] Creating single Super Admin account...');
            await Admin.create({
                email: 'admin@example.com',
                password: 'admin123',
                name: 'ZendBit Super Admin',
                role: 'super_admin'
            });
            console.log('✅ Super Admin account created: admin@example.com (Password: admin123)');
        }
    })
    .catch((err) => {
        console.error(`[MONGODB CONNECTION NOTICE] ${err.message} (Running with in-memory fallback)`);
    });

// Serve Static Frontend Files with 1-Year Caching
app.use(express.static(__dirname, {
    maxAge: '1y',
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// SPA Fallback for /swap (Private Liquidity Swap)
app.use('/swap', (req, res, next) => {
    if (req.method === 'GET' && !req.path.includes('.')) {
        return res.sendFile(path.join(__dirname, 'swap', 'index.html'));
    }
    next();
});

// SPA Fallback for /rfnd (Alias for backward compatibility)
app.use('/rfnd', (req, res, next) => {
    if (req.method === 'GET' && !req.path.includes('.')) {
        return res.sendFile(path.join(__dirname, 'swap', 'index.html'));
    }
    next();
});

// SPA Fallback for /admin (Admin Panel)
app.use('/admin', (req, res, next) => {
    if (req.method === 'GET' && !req.path.includes('.')) {
        return res.sendFile(path.join(__dirname, 'admin', 'index.html'));
    }
    next();
});

// SPA Fallback to Main index.html
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 ZendBit Full-Stack Server running on http://localhost:${PORT}`);
});

setInterval(() => {}, 1000 * 3600);
