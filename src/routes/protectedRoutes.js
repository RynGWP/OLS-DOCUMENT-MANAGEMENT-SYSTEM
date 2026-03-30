import express from "express";
import passport from "passport";
import { ensureAuthenticated, upload } from "../middleware/authMiddleware.js";
import multer from "multer";
import {db} from '../../config/db.js'
const router = express.Router();

// IMPORTS FROM DASHBOARD CONTROLLER
import {
  readDashboard
} from '../controllers/dashboardController.js'



// IMPORTS FROM RECEIVED DOCS CONTROLLER
import {
  readDocs,
  readSentSMSDocs,
  createDocs,
  updateStatus,
  updateSMS_Status,} from '../controllers/receivedDocsController.js'




// Public routes

// ************************** LOGIN ROUTES ***********************************
router.get("/", (req, res) => res.render("usersLogin"));
router.get("/Login", (req, res) => res.render("usersLogin"));

// dashboard 
router.get('/dashboard', readDashboard );

// createDocs
router.post('/createDocs', createDocs);

// readDocs
router.get('/receivedDocs', readDocs );
router.get('/receivedSentSMSDocs', readSentSMSDocs );


// update status
router.post('/updateStatus', updateStatus);

// update sms status
router.post('/updateSMS_Status', updateSMS_Status);



router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return res
        .status(500)
        .json({ success: false, message: "An error occurred", error: err });
    }

    if (!user) {
      return res
        .status(401)
        .json({
          success: false,
          message: info.message || "Invalid credentials",
        });
    }

    req.login(user, (loginErr) => {
      if (loginErr) {
        return res
          .status(500)
          .json({ success: false, message: "Login failed", error: loginErr });
      }

      // JSON response based on user type
      if (user.usertype === "") {
        return res.json({
          success: true,
          message: "Login successful",
          redirectUrl: "/dashboard",
        });
      } else {
        return res
          .status(403)
          .json({ success: false, message: "Access Denied" });
      }
    });
  })(req, res, next);
});




// Passport Google authentication routes
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

//callback
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
  }),
  (req, res) => {
    // Log authentication details
    console.log("Authentication successful");
    console.log("User:", req.user);
    console.log("Session:", req.session);

    if (req.user) {
      res.redirect("/dashboard");
    }
  }
);



// change password
// router.get('/changePassword', ensureAuthenticated, (req,res) => res.render('changePassword'));
// router.post('/updatePassword' , ensureAuthenticated, changePassword);

//**********************************ASSESSOR ROUTES FOR TAX PAYER **************************************

//create file for taxpayer
router.post("/uploadFile", (req, res) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: "File upload error",
        error: err.message,
      });
    } else if (err) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }

    await createFiles(req, res);
  });
});






// _______________________logout route____________________________

router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err); // Handle any errors during logout
    }

    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
      } else {
        console.log("Session destroyed");
      }

      // Optionally, you can clear the cookie as well
      res.clearCookie("connect.sid", { path: "/" });

      // Redirect to login page or home after logout
      res.redirect("/login");
    });
  });
});

export default router;
