import { db } from '../../config/db.js';

class User {
  static async findByEmail(email) {
    try {
      const query = `SELECT * FROM users WHERE email = $1`;
      const result = await db.query(query, [email]);

      if (result.rows.length > 0) {
        return result.rows[0]; // Return the user data
      } 
    } catch (err) {
      console.error(`Error querying users:`, err);
    }
  }

  static async updatePictureByEmail(email, picture) {
    try {
      // Check if email exists in the users table
      const selectQuery = `SELECT * FROM users WHERE email = $1`;
      const result = await db.query(selectQuery, [email]);

      if (result.rows.length > 0) {
        const existingUser = result.rows[0];

        // If picture already exists, do not update
        if (existingUser.picture) {
          console.log('Picture already exists, skipping update.');
          return existingUser;
        }

        // Update the picture
        const updateQuery = `UPDATE users SET picture = $1 WHERE email = $2 RETURNING *`;
        const updateResult = await db.query(updateQuery, [picture, email]);

        return updateResult.rows[0]; // Return updated user
      }
    } catch (err) {
      console.error(`Error updating picture in users:`, err);
    }

    throw new Error('Email not found in users table');
  }

  static async findById(id) {
    try {
      const result = await db.query('SELECT * FROM users WHERE user_id = $1', [id]);
      return result.rows[0] || null;
    } catch (err) {
      console.error(`Error querying users by ID:`, err);
      return null;
    }
  }

  static async isValidPassword(user, password) {
    return user.password === password; // Replace with a proper hash comparison
  }
}

export { User };
