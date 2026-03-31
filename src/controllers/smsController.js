import axios from 'axios';
import nodecron from 'node-cron';
import { db } from "../../config/db.js";
import dotenv from 'dotenv';

dotenv.config();

class SMSController {
    constructor() {
        // Initialize a Set to track messages sent during the current day
        this.dailySentMessages = new Set();
        this.initializeReminders();
        
        // Reset the Set at midnight each day
        nodecron.schedule('0 0 0 * * *', () => {
            this.dailySentMessages.clear();
            console.log('Daily sent messages tracking reset at:', new Date().toISOString());
        });
    }

    async sendSMS(phoneNumber, message) {
        try {
            const formattedNumber = phoneNumber.startsWith('0') 
                ? '+63' + phoneNumber.substring(1) 
                : phoneNumber;

            const response = await axios.post('https://api.semaphore.co/api/v4/messages', {
                apikey: process.env.SMS_API_KEY,
                number: formattedNumber,
                message: message,
                sendername: process.env.SENDER_NAME
            });

            console.log('SMS Sent:', response.data);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('SMS Error:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    async getReadyDocuments() {
        try {
            const query = `
                SELECT 
                    id,
                    requestioner,
                    description,
                    status,
                    date_submitted,
                    created_at,
                    sms_status,
                    contact_no
                FROM received_documents
                WHERE status = 'Ready to Release'
                AND sms_status = 'pending'
                AND contact_no IS NOT NULL
            `;
            
            console.log('Querying for documents ready to release');
            const { rows } = await db.query(query);
            return rows;
        } catch (error) {
            console.error('Database Error:', error);
            return [];
        }
    }

    async updateSmsStatus(documentId, status) {
        try {
            const query = `
                UPDATE received_documents
                SET sms_status = $1
                WHERE id = $2
            `;
            
            await db.query(query, [status, documentId]);
            console.log(`Updated SMS status for document ${documentId} to ${status}`);
            return true;
        } catch (error) {
            console.error(`Error updating SMS status for document ${documentId}:`, error);
            return false;
        }
    }

    // # ┌────────────── second (optional)
    // # │ ┌──────────── minute
    // # │ │ ┌────────── hour
    // # │ │ │ ┌──────── day of month
    // # │ │ │ │ ┌────── month
    // # │ │ │ │ │ ┌──── day of week
    // # │ │ │ │ │ │
    // # │ │ │ │ │ │
    // # * * * * * *

    initializeReminders() {
        // Run every hour
        nodecron.schedule('* * * * 12 *', async () => {
            console.log('Starting document notification check:', new Date().toISOString());
            await this.processDocumentNotifications();
        });
    }

    // Helper function to generate message based on description
    generateMessage(requestioner, description) {
        const hasMultipleDocuments = /([,&]|and)/.test(description);
        
        if (hasMultipleDocuments) {
            return `Hi ${requestioner}, this is from the Office of Legal Services. Your (${description}) are now ready for pickup.`;
        } else {
            return `Hi ${requestioner}, this is from the Office of Legal Services. Your (${description}) is now ready for pickup.`;
        }
    }

    async processDocumentNotifications() {
        try {
            const readyDocuments = await this.getReadyDocuments();
    
            if (readyDocuments.length === 0) {
                console.log('No documents ready for release notification');
                return;
            }
    
            for (const document of readyDocuments) {
                try {
                    const { 
                        id,
                        requestioner,
                        description,
                        contact_no
                    } = document;
    
                    // Create a unique key using document id
                    const messageKey = `document-${id}`;
    
                    // Check if we've already sent a message for this document today
                    if (this.dailySentMessages.has(messageKey)) {
                        console.log(`Message already sent today for document ${id}`);
                        continue;
                    }
                    
                    // Generate the message using the helper function
                    const message = this.generateMessage(requestioner, description);

                    const smsResult = await this.sendSMS(contact_no, message);
    
                    if (smsResult.success) {
                        // Add to the set of sent messages only if the SMS was sent successfully
                        this.dailySentMessages.add(messageKey);
                        
                        // Update the SMS status in the database
                        await this.updateSmsStatus(id, 'sent');
                        
                        console.log(`Successfully sent notification for document ${id} to ${requestioner}`);
                    } else {
                        console.error(`Failed to send SMS for document ${id} to ${contact_no}:`, smsResult.error);
                        // Mark as failed in the database
                        await this.updateSmsStatus(id, 'failed');
                    }
    
                    // Add delay between messages to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
    
                } catch (error) {
                    console.error('Error processing individual document notification:', error);
                }
            }
        } catch (error) {
            console.error('Error in processDocumentNotifications:', error);
        }
    }

    async sendTestSMS(phoneNumber, message) {
        return await this.sendSMS(phoneNumber, message);
    }
}

const smsController = new SMSController();
export default smsController;