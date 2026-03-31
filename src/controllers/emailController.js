

import nodemailer from 'nodemailer';
import nodecron from 'node-cron';
import { db } from "../../config/db.js";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

// Get current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailController {
    constructor() {
        // Initialize a Set to track emails sent during the current day
        this.dailySentEmails = new Set();
        this.isProcessing = false;
        this.RATE_LIMIT_DELAY = 5000; // 5 seconds between emails
        
        this.initializeReminders();
        
        // Reset the Set at midnight each day
        nodecron.schedule('0 0 * * *', () => {
            this.dailySentEmails.clear();
            console.log('Daily sent emails tracking reset at:', new Date().toISOString());
        });
    }

    async sendEmail(to, subject, text, html, attachments) {
        try {
            const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.SENDER_EMAIL,
                    pass: process.env.SENDER_EMAIL_PASSWORD
                }
            });
 
            const mailOptions = {
                from: `"OFFICE OF LEGAL SERVICES" <${process.env.SENDER_EMAIL}>`,
                to,
                subject,
                text,
                html,
                attachments
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Email Sent:', info.response);
            this.dailySentEmails.add(to);
            return { success: true, info };
        } catch (error) {
            console.error('Email Error:', error.message);
            return { success: false, error: error.message };
        }
    }

    async updateEmailNotificationStatus(docId) {
        try {
            const query = `
                UPDATE received_documents 
                SET email_status = 'sent' 
                WHERE id = $1 
                AND status = 'For Review'
                RETURNING *
            `;
            
            const { rowCount } = await db.query(query, [docId]);
            console.log(`Updated email notification status for Document ${docId}. Rows affected: ${rowCount}`);
            return rowCount > 0;
        } catch (error) {
            console.error('Error updating email notification status:', error);
            return false;
        }
    }

async getReadyToReleaseDocs() {
    try {

        const query = `
            SELECT 
                id,
                email,
                requisitioner,
                description,
                status,
                date_submitted,
                email_status,
                contact_no,
                folder_number,
                tracking_no
            FROM received_documents
            WHERE status = $1
            AND (sms_status IS NULL OR sms_status != 'Sent')
        `;

        const { rows } = await db.query(query, ['Ready to Release']);

        console.log(`readyToRelease documents for reminder: ${rows.length}`);

        return rows;
        
    } catch (error) {
        console.error("R error:", error);
        return [];
    }
}

    initializeReminders() {
        // Run at 
        nodecron.schedule('* 1 * * * *', async () => {
            console.log('Starting daily email reminder check:', new Date().toISOString());
            await this.processReminders();
        });
    }

    async processReminders() {
        if (this.isProcessing) {
            console.log('Already processing reminders, skipping...');
            return;
        }

        this.isProcessing = true;

        try {
            const readyToReleaseDocs = await this.getReadyToReleaseDocs();
    
            if (readyToReleaseDocs.length === 0) {
                console.log('No readyToRelease Documents found for notifications');
                return;
            }
    
            const logoPath = path.join(__dirname, 'olsLogo.jpg');
            
            if (!fs.existsSync(logoPath)) {
                console.error('Logo file not found:', logoPath);
                throw new Error('Logo file not found');
            }
    
            for (const readyToReleaseDoc of readyToReleaseDocs) {
                const { 
                    id,
                    email,
                    tracking_no,
                    requisitioner,
                    description,
                    status,
                    date_submitted,
                    email_status,
                    contact_no,
                    folder_number,
            
                } = readyToReleaseDoc;


                console.log(readyToReleaseDoc);
                // Skip if email was already sent today
                if (this.dailySentEmails.has(email)) {
                    console.log(`Email already sent today to ${email}, skipping...`);
                    continue;
                }

                const formattedDate = new Date(date_submitted).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
    
                const subject = `Notification: Document Ready for Pick-Up`;
                const text = `Dear ${requisitioner},
                
                                Greetings.

                                This is to inform you that the document you previously submitted to the Legal Office has already been reviewed and is now ready for release.

                                You may proceed to the office to claim the document during regular office hours. For verification purposes, please bring a valid identification card and, if applicable, the reference or tracking number of your request.

                                Document Details:
                                Tracking Number: ${tracking_no}
                                Date Submitted: ${date_submitted}
                                Description: ${description}
                                Kindly ensure that the document is claimed within the prescribed period. Should you have any questions or require further clarification, you may contact our office through this email address.

                                Thank you.

                                Respectfully,

                                Legal Office
                                University of Southern Mindanao
                                ols@usm.edu.ph

                                This is a system-generated email notification. Please do not reply directly to this message.`
                
                const html = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="text-align: center;">
                            <img src="cid:logo" alt="OLS Logo" style="width: 60px; margin-bottom: 10px;">
                        </div>
                        <p style="text-align:center; font-size: 16px; font-weight: bold;">
                            OLS DOCUMENT MANAGEMENT SYSTEM
                        </p>
                        <hr style="border: 1px solid #ddd; margin: 20px 0;">
                        
                        <p>Dear ${requisitioner},</p>
                        
                        <p> This is to inform you that the document you previously submitted to the Legal Office has already been reviewed and is now ready for release.</p>
                        
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p> You may proceed to the office to claim the document during regular office hours. For verification purposes, please bring a valid identification card and, if applicable, the reference or tracking number of your request. </p>
                        </div>
                        
                        <p><strong>Document Details</strong></p>

                        <table style="border-collapse: collapse;">
                        <tr>
                        <td><strong>Tracking Number:</strong></td>
                        <td>${tracking_no}</td>
                        </tr>

                        <tr>
                        <td><strong>Date Submitted:</strong></td>
                        <td>${date_submitted}</td>
                        </tr>

                        <tr>
                        <td><strong>Description:</strong></td>
                        <td>${description}</td>
                        </tr>
                        </table>
                        
                        <p>Thank you.</p>
                        
                        <hr style="border: 1px solid #ddd; margin: 20px 0;">
                        
                        <p style="font-size: 12px; color: #666; text-align: center;">
                            This is an automated message. Please do not reply to this email.
                        </p>
                    </div>
                `;
                
                const attachments = [{
                    filename: 'olsLogo.jpg',
                    path: logoPath,
                    cid: 'logo'
                }];
                
                const emailResult = await this.sendEmail(email, subject, text, html, attachments);
    
                if (emailResult.success) {
                    const updateResult = await this.updateEmailNotificationStatus(id);
                    if (updateResult) {
                        console.log(`Successfully sent email and updated status of document ${tracking_no}`);
                    } else {
                        console.error(`Failed to update email notification status for document ${tracking_no}`);
                    }
                } else {
                    console.error(`Failed to send email to ${email}:`, emailResult.error);
                }
    
                // Add delay between emails
                await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
            }
            
        } catch (error) {
            console.error('Error in processReminders:', error);
        } finally {
            this.isProcessing = false;
        }
    }
}

const emailController = new EmailController();
export default emailController;