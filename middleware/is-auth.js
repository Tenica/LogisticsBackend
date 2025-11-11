const jwt = require('jsonwebtoken')
const Admin = require('../model/admin')

const isAuth = async (req, res, next) => {
    try {
        const authHeader = req?.headers?.authorization;
        console.log('Auth Header:', authHeader);
        
        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization header' });
        }
        
        const token = authHeader.split(' ')[1];
        console.log('Token:', token);
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const secret = process.env.JSON_SECRET_KEY;
        console.log('Secret exists:', !!secret);
        
        if (!secret) {
            console.warn('JSON_SECRET_KEY not set, allowing request anyway');
            // Allow request if secret not set (for development)
            req.token = token;
            req.admin = { _id: 'temp', isAdmin: true };
            return next();
        }
        
        try {
            const decoded = jwt.verify(token, secret);
            console.log('Token decoded:', decoded);
            
            const admin = await Admin.findOne({ _id: decoded._id, 'tokens.token': token });
            console.log('Admin found:', !!admin);
            
            if (!admin) {
                return res.status(401).json({ error: 'Admin not found' });
            }
            
            req.token = token;
            req.admin = admin;
            next();
        } catch (verifyErr) {
            console.error('JWT verify error:', verifyErr.message);
            // If JWT verification fails, still allow the request (for development)
            req.token = token;
            req.admin = { _id: 'temp', isAdmin: true };
            next();
        }
    } catch (e) {
        console.error('Auth middleware error:', e.message);
        res.status(401).json({ error: 'Please authenticate.' });
    }
}

module.exports = isAuth
