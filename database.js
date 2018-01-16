// Setup and requires
const functions     = require("./functions.js");
const spicedPg      = require("spiced-pg");
const dbUrl = process.env.DATABASE_URL || `postgres:${require("./secrets.json").user}:${require("./secrets.json").password}@localhost:5432/petitions`
const db = spicedPg(dbUrl);
// ...................................................................................................................

// Functions .........................................................................................................

// Create user record in table users on DB
function createUserRec(first, last, email, password) {
    return db.query("INSERT INTO users (first, last, email, password) VALUES ($1, $2, $3, $4) RETURNING id", [first, last, email, password]
    ).then((results) => {
        return results.rows[0].id;
    })
}

// Create signature record in table signatures on DB
function createSignatureRec(userID, signature) {
    return db.query(`INSERT INTO signatures (userid, signature) VALUES ($1, $2)
        ON CONFLICT (userid) DO UPDATE
        SET signature = $2
        WHERE signatures.userid = $1 RETURNING id`, [userID, signature]
        ).then((results) => {
        return results.rows[0].id;
    })
}

// Create additional information record in table user_profiles on DB
function createAdditionalRec(userID, age, city, url) {
    return db.query("INSERT INTO user_profiles (userid, age, city, url) VALUES ($1, $2, $3, $4)", [userID, age || null, city, url]
    ).catch((err) => {
       console.log(err);
   });
}

// Get all signature records from DB
function readRec() {
    return db.query(
        `SELECT users.first, users.last, user_profiles.age, user_profiles.city, user_profiles.url
         FROM users
         LEFT JOIN user_profiles
         ON users.id = user_profiles.userID
         JOIN signatures
         ON users.id = signatures.userID`).then((results) => {
            return results.rows;
        }).catch((err) => {
            console.log(err);
        });
}

// Get record by ID. Bring back the signature
function readSignaturesByID(userID) {
    return db.query("SELECT signature, id FROM signatures WHERE userid = $1",[userID]).then((results) => {
        return results.rows[0];
    }).catch((err) => {
        console.log(err);
    });
}

// Get record with email. Bring back the id, first,last names and password
function readUsersByEmail(email) {
    return db.query(
        `SELECT users.id AS users_id, users.first, users.last, users.password,
         signatures.id AS signatures_id, signatures.signature
         FROM users
         LEFT JOIN signatures
         ON users.id = signatures.userID
         WHERE email = $1`,[email]).then((results) => {
        return results.rows[0];
    }).catch((err) => {
        console.log(err);
    });
}

// Get record with userID. Bring back first, last, email + age city and url.
function readUsersByUserID(userID) {
    return db.query(
        `SELECT users.first, users.last, users.email,
         user_profiles.age, user_profiles.city, user_profiles.url
         FROM users
         JOIN user_profiles
         ON users.id = user_profiles.userID
         WHERE users.id = $1`,[userID]).then((results) => {
        return results.rows[0];
    }).catch((err) => {
        console.log(err);
    });
}

// Update user information
function UpdateUserInformationRec(userID, body) {
    const query = `UPDATE users
                   SET first = $2,
                   last      = $3,
                   email     = $4
                   WHERE  id = $1`
    return db.query(query, [userID, body.first, body.last, body.email])
        .then(() => {
            const query2 = `UPDATE user_profiles
                                SET age      = $2,
                                city         = $3,
                                url          = $4
                                WHERE userid = $1`
    return db.query(query2, [userID, body.age || null, body.city, body.url])
    })
    .then(() => {
        if(body.password) {
            const query3 = `UPDATE users
                            SET password = $2
                            WHERE id     = $1`
            return functions.hashPassword(body.password).then((hashedPwd) => {
                return db.query(query3, [userID, hashedPwd])
            })
        }
    })
}

// Check if user exists
function checkUserExists(email) {
    return db.query("SELECT password FROM users WHERE email = $1",[email]).then((results) => {
        return results.rows[0];
    }).catch((err) => {
        console.log(err);
    });
}

function checkCityExists(city) {
    return db.query(
        `SELECT user_profiles.city
         FROM users
         JOIN signatures
         ON users.id = signatures.userid
         LEFT JOIN user_profiles
         ON users.id = user_profiles.userid
         WHERE upper(city) = upper($1)`,[city]
     ).then((results) => {
        return results.rows[0].city;
    }).catch((err) => {
        console.log(err);
    });
}

function getCityRecords(city) {
    return db.query(
        `SELECT users.first, users.last, user_profiles.age, user_profiles.url
         FROM users
         JOIN signatures
         ON users.id = signatures.userid
         LEFT JOIN user_profiles
         ON users.id = user_profiles.userid
         WHERE upper(city) = upper($1) ORDER BY users.last ASC;`,[city]
     ).then((results) => {
        return results.rows;
    }).catch((err) => {
        console.log(err);
    });
}

// Delete Signature record by userid
function deleteSignatureRec(userID) {
    return db.query("DELETE FROM signatures WHERE userid = $1",[userID]
    ).catch((err) => {
       console.log(err);
   });

}

// ...................................................................................................................

// Exports
module.exports.readRec                  = readRec;
module.exports.createUserRec            = createUserRec;
module.exports.createSignatureRec       = createSignatureRec;
module.exports.createAdditionalRec      = createAdditionalRec;
module.exports.readSignaturesByID       = readSignaturesByID;
module.exports.readUsersByEmail         = readUsersByEmail;
module.exports.checkUserExists          = checkUserExists;
module.exports.checkCityExists          = checkCityExists;
module.exports.getCityRecords           = getCityRecords;
module.exports.deleteSignatureRec       = deleteSignatureRec;
module.exports.readUsersByUserID        = readUsersByUserID;
module.exports.UpdateUserInformationRec = UpdateUserInformationRec;
