import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../../models/userModel.js';
import dotenv from 'dotenv';
import { db } from '../../../config/db.js';

dotenv.config();

// Google OAuth Strategy Registration
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log("Google Auth Profile:", profile);
      try {
        let user = await User.findByEmail(profile.emails[0].value);
      
        if (!user) {
          const insertQuery = `INSERT INTO users (email, password, picture) VALUES ($1, $2, $3) RETURNING *`;
          const newUser = await db.query(insertQuery, [
            profile.emails[0].value,
            profile.id,
            profile.photos[0].value,
          ]);
          user = newUser.rows[0]; // Retrieve the inserted user
        } 

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);
