const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../db/db.js'); // Import the db connection

// Middleware for token validation
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token missing' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// ----- USERS API -----

// Login API
router.post('/login', async (req, res) => {
    const { userId, password } = req.body;
    if (!userId || !password) return res.status(400).json({ error: 'Missing userId or password' });

    try {
        const result = await pool.query('SELECT * FROM users WHERE userId = $1', [userId]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid password' });

        const token = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, { expiresIn: '48h' });
        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// List all users
router.get('/users', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Add a new user
router.post('/users', async (req, res) => {
    const { userId, firstName, lastName, email, designation, dateOfBirth, supervisor, password } = req.body;
    if (!userId || !firstName || !lastName || !email || !designation || !dateOfBirth || !supervisor || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (userId, firstName, lastName, email, designation, dateOfBirth, supervisor, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [userId, firstName, lastName, email, designation, dateOfBirth, supervisor, hashedPassword]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update a user
router.put('/users/:userId', authenticateToken, async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    const { firstName, lastName, email, designation, dateOfBirth, supervisor } = req.body;
    if (!firstName || !lastName || !email || !designation || !dateOfBirth || !supervisor) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await pool.query(
            'UPDATE users SET firstName = $1, lastName = $2, email = $3, designation = $4, dateOfBirth = $5, supervisor = $6 WHERE userId = $7 RETURNING *',
            [firstName, lastName, email, designation, dateOfBirth, supervisor, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Delete a user
router.delete('/users/:userId', authenticateToken, async (req, res) => {
    const userId = parseInt(req.params.userId, 10);

    try {
        const result = await pool.query('DELETE FROM users WHERE userId = $1 RETURNING *', [userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: `User ${result.rows[0].firstName} deleted successfully` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get a user
router.get('/users/:userId', authenticateToken, async (req, res) => {
    const userId = parseInt(req.params.userId, 10);

    try {
        const result = await pool.query('SELECT * FROM users WHERE userId = $1', [userId]);
        const user = result.rows[0];

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ----- LEAVES API -----

// List all leaves
router.get('/leaves', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM leaves');
        res.status(200).json(result.rows); // Ensure the response is an array of objects
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// Add a new leave
router.post('/leaves', authenticateToken, async (req, res) => {
    const { from, to, type, reason, emergencyContact, userId } = req.body;
    if (!from || !to || !type || !reason || !emergencyContact || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO leaves ("from", "to", "type", reason, emergencyContact, userId) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [from, to, type, reason, emergencyContact, userId]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update a leave
router.put('/leaves/:leaveId', authenticateToken, async (req, res) => {
    const leaveId = parseInt(req.params.leaveId, 10);
    const { from, to, type, reason, emergencyContact, userId } = req.body;

    if (!from || !to || !type || !reason || !emergencyContact || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await pool.query(
            'UPDATE leaves SET "from" = $1, "to" = $2, "type" = $3, reason = $4, emergencyContact = $5, userId = $6 WHERE leaveId = $7 RETURNING *',
            [from, to, type, reason, emergencyContact, userId, leaveId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Leave not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Delete a leave
router.delete('/leaves/:leaveId', authenticateToken, async (req, res) => {
    const { leaveId } = req.params;

    try {
        const result = await pool.query('DELETE FROM leaves WHERE leaveId = $1 RETURNING *', [leaveId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Leave not found' });
        }

        res.status(200).json({
            message: 'Leave deleted successfully',
            deletedLeave: result.rows[0], // Return the deleted item's details
        });
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// Get a specific leave
router.get('/leaves/:leaveId', authenticateToken, async (req, res) => {
    const { leaveId } = req.params;

    try {
        const result = await pool.query('SELECT * FROM leaves WHERE leaveId = $1', [leaveId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Leave not found' });
        }

        res.status(200).json(result.rows[0]); // Ensure the response is a single object
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

module.exports = router;
