const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
// Set up your email transport configuration
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
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
