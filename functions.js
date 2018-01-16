// Setup and requires
const bcrypt        = require("bcryptjs");

// Functions .........................................................................................................

// Kill the session
function sessionDeaded(request, response, next) {
    request.session = null;
    next();
}

// Encypt password
function hashPassword(password) {
    return new Promise((resolve, reject) => {
        bcrypt.genSalt((err, salt) => {
            if (err) {
                return reject(err);
            }
            bcrypt.hash(password, salt,  (err, hash) => {
                if (err) {
                    return reject(err);
                }
                resolve(hash);
            });
        });
    });
}

//Encrypt and compare entered password with db password
function checkPassword(password, hashedPasswordFromDatabase) {
    return new Promise ((resolve, reject) => {
        bcrypt.compare(password, hashedPasswordFromDatabase, (err, doesMatch) => {
            if (err) {
                reject(err);
            } else {
                resolve(doesMatch);
            }
        });
    });
}

function checkSession(request, response, next) {
    if (!request.session.user) {
        if (request.url === '/petition_login') {
            next();
        } else if (request.url === '/') {
            next();
        } else {
            response.redirect('/');
        }
    } else if (!request.session.user.signed && request.session.user) {
        if (request.url !== '/petition_sig') {
            response.redirect('/petition_sig');
        } else {
            next();
        }
    } else if (request.session.user.signed) {
        if (request.url == '/thankYou') {
            next();
        } else {
            response.redirect('/thankYou');
        }
    } else {
        next();
    }
}

// Exports
module.exports.sessionDeaded           = sessionDeaded;
module.exports.hashPassword            = hashPassword;
module.exports.checkPassword           = checkPassword;
module.exports.checkSession            = checkSession;
