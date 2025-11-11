const jwt = require('jsonwebtoken')
const Admin = require('../model/admin')

const isAuth = async (req, res, next) => {
    try {
        const token = req?.headers?.authorization?.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JSON_SECRET_KEY)
        const admin = await Admin.findOne({ _id: decoded._id, 'tokens.token': token })
        if (!admin) {
            throw new Error()
        }
        
        req.token = token
        req.admin = admin
        next()
    } catch (e) {
        console.log("the error", e)
        console.log('Authorization Header:', req.header('Authorization'));
        res.status(401).send({ error: 'Please authenticate.' })
    }
}

module.exports = isAuth
