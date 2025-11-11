// Simplified auth middleware - just check if token exists
const isAuth = async (req, res, next) => {
  try {
    const token = req?.headers?.authorization?.split(' ')[1];
    
    // For now, just check if a token is provided
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Set token on request for use in controllers
    req.token = token;
    req.admin = { _id: 'temp' }; // Mock admin
    
    next();
  } catch (e) {
    console.error('Auth error:', e.message);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = isAuth;
