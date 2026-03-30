import {CRUD} from '../models/crud.js';

const dashboard_CRUD =  new CRUD('received_documents', 'id');


async function readDashboard (req,res) {
    try {
        const releaseDocsToday = await dashboard_CRUD.readAll({ 
            status: 'Ready to Release', 
            date_submitted: new Date().toISOString().split('T')[0] // Format YYYY-MM-DD
        });
        const sentSMS = await dashboard_CRUD.readAll({ 
            sms_status: 'sent', 
            date_submitted: new Date().toISOString().split('T')[0] // Format YYYY-MM-DD
        });

        const receivedDocsToday = await dashboard_CRUD.readAll({  
            date_submitted: new Date().toISOString().split('T')[0] // Format YYYY-MM-DD
        });

        const unsentSMSDocsToday = await dashboard_CRUD.readAll({ 
            sms_status: 'pending', 
            date_submitted: new Date().toISOString().split('T')[0] // Format YYYY-MM-DD
        });
        
        const user = req.user;

       
        res.render('dashboard', {releaseDocsToday, unsentSMSDocsToday, receivedDocsToday, sentSMS, user});
    } catch (error) {
        res.status(500).json({
          message: `Error: ${error.message}`,
        });
    }
}





export {
    readDashboard
}