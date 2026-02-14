const jwt  = require('jsonwebtoken');
function generateToken(id){
    return jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: '30d'});
}

// function expiretoken(id){
//     return jwt.de({id}, process.env.JWT_SECRET,);
// }


module.exports = generateToken;