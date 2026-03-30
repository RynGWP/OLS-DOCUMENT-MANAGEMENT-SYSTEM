import {CRUD} from '../models/crud.js';

const receivedDocs_CRUD =  new CRUD('received_documents', 'id');



async function createDocs (req,res) {
    try {
        const received_docs = await receivedDocs_CRUD.create(req.body);
        const user = req.user;

    
        res.redirect('/receivedDocs');
    } catch (error) {
        res.status(500).json({
          message: `Error: ${error.message}`,
        });
    }
}

async function readDocs (req,res) {
    try {
        const received_docs = await receivedDocs_CRUD.readAll({sms_status:'pending'});
        const user = req.user;


        const sentSMS = await receivedDocs_CRUD.readAll({ 
            Status: 'For Review', 
            date_submitted: new Date().toISOString().split('T')[0] // Format YYYY-MM-DD
        });

        const receivedDocsToday = await receivedDocs_CRUD.readAll({  
            date_submitted: new Date().toISOString().split('T')[0] // Format YYYY-MM-DD
        });

 
        res.render('receivedDocs', {received_docs, sentSMS, receivedDocsToday, user});
        
    } catch (error) {
        res.status(500).json({
          message: `Error: ${error.message}`,
        });
    }
}


async function readSentSMSDocs (req,res) {
    try {
        const received_docs = await receivedDocs_CRUD.readAll({sms_status:'sent'});
        const user = req.user;

        const sentSMS = await receivedDocs_CRUD.readAll({ 
            sms_status: 'sent', 
            date_submitted: new Date().toISOString().split('T')[0] // Format YYYY-MM-DD
        });

        const receivedDocsToday = await receivedDocs_CRUD.readAll({  
            date_submitted: new Date().toISOString().split('T')[0] // Format YYYY-MM-DD
        });
    
        res.render('sentSMSDocs', {received_docs, sentSMS, receivedDocsToday, user});
        
    } catch (error) {
        res.status(500).json({
          message: `Error: ${error.message}`,
        });
    }
}

async function updateStatus (req,res) {
    try {

        const {
            id,
            status,
            folder_number
        } = req.body;


        await receivedDocs_CRUD.update( id , {
            status, folder_number
        })

        const user = req.user;

        
    
        res.redirect('/receivedDocs');
    } catch (error) {
        res.status(500).json({
          message: `Error: ${error.message}`,
        });
    }
}


async function updateSMS_Status (req,res) {
    try {

        const {
            id,
            sms_status
        } = req.body;


        await receivedDocs_CRUD.update( id , {
            sms_status
        })

        const user = req.user;

        
    
        res.redirect('/receivedDocs');
    } catch (error) {
        res.status(500).json({
          message: `Error: ${error.message}`,
        });
    }
}


export {
    readDocs,
    readSentSMSDocs,
    createDocs,
    updateStatus,
    updateSMS_Status,
}