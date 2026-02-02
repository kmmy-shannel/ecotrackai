const nodemailer = require('nodemailer');

/**
 * Email Service
 * Handles sending verification and password reset emails
 */

// Create transporter (configure with your email service)
const createTransporter = () => {
  // Validate environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('⚠️ EMAIL_USER or EMAIL_PASSWORD not configured in .env');
    console.warn('⚠️ Email functionality will not work until configured');
  }

  return nodemailer.createTransport({
    service: 'gmail', // Using Gmail service
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

/**
 * Send verification email with OTP
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP
 * @param {string} name - User's name
 */
const sendVerificationEmail = async (email, otp, name) => {
  try {
    // Check if email is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ Email not configured - OTP:', otp);
      console.warn('⚠️ In production, configure EMAIL_USER and EMAIL_PASSWORD in .env');
      
      // For development: log OTP to console instead of sending email
      console.log('');
      console.log('========================================');
      console.log('📧 VERIFICATION EMAIL (Development Mode)');
      console.log('To:', email);
      console.log('Name:', name);
      console.log('OTP Code:', otp);
      console.log('========================================');
      console.log('');
      
      return { messageId: 'dev-mode-no-email' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"EcoTrack AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - EcoTrack AI',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: white;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .otp-box {
              background: #f0fdf4;
              border: 2px solid #10b981;
              border-radius: 10px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              color: #059669;
              letter-spacing: 8px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to EcoTrack AI!</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>Thank you for registering with EcoTrack AI. Please verify your email address to complete your registration.</p>
              
              <div class="otp-box">
                <p style="margin: 0; font-size: 14px; color: #666;">Your verification code is:</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">This code will expire in 10 minutes</p>
              </div>

              <p>If you didn't create an account with EcoTrack AI, please ignore this email.</p>
              
              <p>Best regards,<br>The EcoTrack AI Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} EcoTrack AI. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent:', info.messageId);
    return info;

  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    
    // For development: still log the OTP even if email fails
    console.log('');
    console.log('========================================');
    console.log('📧 EMAIL FAILED - OTP FOR DEVELOPMENT');
    console.log('To:', email);
    console.log('Name:', name);
    console.log('OTP Code:', otp);
    console.log('Error:', error.message);
    console.log('========================================');
    console.log('');
    
    throw new Error('Failed to send verification email');
  }
};

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetToken - Password reset token
 * @param {string} name - User's name
 */
const sendPasswordResetEmail = async (email, resetToken, name) => {
  try {
    // Check if email is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
      
      console.warn('⚠️ Email not configured');
      console.log('');
      console.log('========================================');
      console.log('📧 PASSWORD RESET EMAIL (Development Mode)');
      console.log('To:', email);
      console.log('Name:', name);
      console.log('Reset Link:', resetUrl);
      console.log('========================================');
      console.log('');
      
      return { messageId: 'dev-mode-no-email' };
    }

    const transporter = createTransporter();
    
    // Frontend URL for password reset
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    const mailOptions = {
      from: `"EcoTrack AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset Your Password - EcoTrack AI',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: white;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .button {
              display: inline-block;
              padding: 15px 30px;
              background-color: #10b981;
              color: white !important;
              text-decoration: none;
              border-radius: 50px;
              font-weight: bold;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #059669;
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>We received a request to reset your password for your EcoTrack AI account.</p>
              
              <p>Click the button below to reset your password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>

              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #059669;">${resetUrl}</p>

              <div class="warning">
                <p style="margin: 0;"><strong>⚠️ Important:</strong></p>
                <ul style="margin: 10px 0;">
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request a password reset, please ignore this email</li>
                  <li>Your password won't change until you create a new one</li>
                </ul>
              </div>
              
              <p>Best regards,<br>The EcoTrack AI Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} EcoTrack AI. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return info;

  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    console.log('');
    console.log('========================================');
    console.log('📧 EMAIL FAILED - RESET LINK FOR DEVELOPMENT');
    console.log('To:', email);
    console.log('Name:', name);
    console.log('Reset Link:', resetUrl);
    console.log('Error:', error.message);
    console.log('========================================');
    console.log('');
    
    throw new Error('Failed to send password reset email');
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};