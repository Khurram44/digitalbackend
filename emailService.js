const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
// Set up your email transport configuration

const transporter = nodemailer.createTransport({
    host: 'mail.allesintubbergen.nl', 
    port: 587,
    secure: false, 
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false 
    }
});

const renderTemplate = (templateName, data) => {
    const templatePath = path.resolve(__dirname, '.', 'views', 'emails', `${templateName}.ejs`);
    const template = fs.readFileSync(templatePath, 'utf8');
    return ejs.render(template, data);
};

const sendEmail = (to, subject, templateName, data) => {
    const htmlContent = renderTemplate(templateName, data);

    const mailOptions = {
        from: process.env.GMAIL_USER,
        to,
        subject,
        html: htmlContent
    };

    return transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
