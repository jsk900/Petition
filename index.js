// require and setup
const functions      = require("./functions.js");
const database       = require("./database.js");
const bodyParser     = require("body-parser");
const cookieSession  = require("cookie-session");
const csrf           = require("csurf");
const csrfProtection = csrf();
const express        = require("express");
const app            = express();
const hb             = require("express-handlebars");
const checkSession   = functions.checkSession;
var selectArr        = [];
var userID;
var signature;
var signatureID;
var password;
var first;
var last;
var valueObj;
var city;
var url;

app.engine("handlebars", hb());
app.set("view engine", "handlebars");
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieSession({secret: "a hard days night by the beatles", maxAge: 1000 * 60 * 60 * 24 * 14}));
app.disable("x-powered-by");
app.use((request, response, next) => {
   response.setHeader("x-frame-options", "deny")
   next()
});

// Use all static content inside public directory and listen to port 8080
app.use(express.static(__dirname + "/public"));
app.use("/public", express.static(__dirname + "/public"));
app.use("/petition_users/:city", express.static(__dirname + "/public"));
app.listen(process.env.PORT || 8080, () => {console.log("Listening on port 8080")});


// routes ............................................................................................................

// Show registration page
app.get("/", csrfProtection, checkSession, (request, response) => {
    response.render("petition_register", {layout: "main", csrfToken: request.csrfToken()})
});

// Post request to handle registration form error and post form fields to users table. Create session cookie
app.post("/registerForm", (request, response) => {
    if (!request.body.first || !request.body.last || !request.body.email || !request.body.password) {
        response.render('petition_register', { layout: 'main', error: "Oops, something isn't quite right.Please try again"});
    }
    database.checkUserExists(request.body.email).then((results) => {
        if (results) {
            response.render('petition_register', { layout: 'main', error: "This user has already registered"});
        } else {
            functions.hashPassword(request.body.password).then((hashedPassword) => {
            database.createUserRec(request.body.first, request.body.last, request.body.email, hashedPassword).then((userID) => {
                first = request.body.first;
                last  = request.body.last;
                request.session.user =  {
                                            userID: userID,
                                            first:  first,
                                            last:   last
                                        }
                response.redirect("/petition_additional");
                })
            });
        }
    });

});

// Show additional info page
app.get("/petition_additional", csrfProtection, (request, response) => {
    response.render("petition_additional", {layout: "main", first, csrfToken: request.csrfToken()})
});

// Post request to handle additional information form. Post form fields to user_profiles table.
app.post("/additionalForm", (request, response) => {
    userID = request.session.user.userID;
    if (request.body.url == "") {
        url = "";
    } else if (request.body.url.indexOf("www.") !== -1) {
        url = request.body.url.replace("www.", "http://");
    } else if (request.body.url.indexOf("http://") == -1) {
        url = "http://" + request.body.url;
    }
    database.createAdditionalRec(userID, request.body.age, request.body.city, url).then(() => {
        response.redirect("/petition_sig");
    })
});

// Show login page
app.get("/petition_login", csrfProtection, checkSession, (request, response) => {
    response.render("petition_login", { layout: "main", csrfToken: request.csrfToken()})
});

// Post request to handle login form error and update session cookie with logged info
app.post("/loginForm", (request, response) => {
    if (!request.body.email || !request.body.password) {
        response.render("petition_login", { layout: "main", error: "Oops, something isn't quite right.Please try again"});
    } else {
        database.readUsersByEmail(request.body.email).then((valueObj) => {
            if (valueObj) {
                userID      = valueObj.users_id;
                first       = valueObj.first;
                last        = valueObj.last;
                password    = valueObj.password;
                signature   = valueObj.signature;
                signatureID = valueObj.signatures_id
            }
            if (!password) {
                response.render("petition_login", { layout: "main", error: "The email/password entered are not correct"});
            } else {
                functions.checkPassword(request.body.password, password).then((doesMatch) => {
                    if (!doesMatch) {
                        response.render("petition_login", { layout: "main", error: "Oh dear. The password entered does not match. Please try again."});
                    } else {
                        request.session.user =  {
                                                    userID:   userID,
                                                    first:    first,
                                                    last:     last,
                                                    loggedIn: true
                                                }
                        if (!signature) {
                            response.redirect("/petition_sig");
                        } else {
                            request.session.user.signatureID = signatureID;
                            response.redirect("/thankYou")
                        }
                    }
                })
            }
        })
    }
})

// Show signature page
app.get("/petition_sig", csrfProtection, (request, response) => {
    response.render("petition_sig", { layout: "main", first, csrfToken: request.csrfToken()})
});

// Post request to handle signature form fields writes to the signatures table
app.post("/signatureForm", (request, response, next) => {
    userID = request.session.user.userID;
    database.createSignatureRec(userID, request.body.canvas).then((signature, signatureID) => {
        request.session.user.signed = true;
        response.redirect("/thankYou");
    });
});

// Show thank you page with link to all users and current users signature
app.get("/thankYou", csrfProtection, (request, response) => {
    first  = request.session.user.first;
    database.readRec().then((selectArr) => {
        database.readSignaturesByID(request.session.user.userID).then((valueObj) => {
            if (valueObj) {
                signatureID   = valueObj.id;
                signature    = valueObj.signature;
            }
            request.session.user.selectArr = selectArr;
            response.render("petition_ty", { layout: "main", first, selectArr, signature, csrfToken: request.csrfToken})
        })
    });
});

// Show last page with all signed users
app.get("/petition_users", (request, response) => {
    selectArr = request.session.user.selectArr;
    response.render("petition_users", { layout: "main", selectArr })
});

app.get("/petition_users/:city", (request, response) => {
    city = request.params.city
    database.checkCityExists(city).then((returnedCity) => {
        if (!returnedCity) {
            response.redirect("/petition_users")
        } else {
            database.getCityRecords(city).then(list => response.render("petition_cities", {layout: "main", city, list}))
        }
    })
})

app.get("/petition_edit", csrfProtection, (request, response) => {
    database.readUsersByUserID(request.session.user.userID).then((valueObj) => {
        response.render("petition_edit", { layout: "main", valueObj, csrfToken: request.csrfToken()})
    })
});

// Post request to handle edit profile information form. Post form fields to users and user_profiles tables.
app.post("/editForm", (request, response) => {
    userID = request.session.user.userID;
    if (request.body.url.indexOf("www.") !== -1) {
        request.body.url = request.body.url.replace("www.", "http://");
    } else if (request.body.url.indexOf("http://") == -1) {
        request.body.url = "http://" + request.body.url;
    }

    if (request.body.first && request.body.last && request.body.email) {
        database.UpdateUserInformationRec(userID, request.body).then(() => {
            response.redirect("/thankYou");
        })
    } else {
        response.render("petition_edit", { layout: "main", error: "Please enter name, surname and email"});
    }
})

app.post("/deleteForm", (request, response) => {
    database.deleteSignatureRec(request.session.user.userID).then(() => {
        response.redirect("/petition_sig")
    })
})

app.get("/logout", functions.sessionDeaded, (request, response) => {
    response.redirect("/");
});

// End of routes .....................................................................................................
