// functions/middleware/authenticate.js
const admin = require("firebase-admin");

const authenticate = async (req, res, next) => {
    console.log(`AUTH MIDDLEWARE: Received request for path: ${req.originalUrl}`); // Log original path
    // Check for Authorization header
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        console.error('No Firebase ID token was passed as a Bearer token in the Authorization header.');
        return res.status(403).send('Unauthorized: No token provided.');
    }

    const idToken = req.headers.authorization.split('Bearer ')[1];

    try {
        // Verify the ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log('ID Token correctly decoded:', decodedToken);

        // Attach user information (specifically UID) to the request object
        req.user = {
            uid: decodedToken.uid,
            // email: decodedToken.email, // You can add more if needed
        };
        console.log(`AUTH MIDDLEWARE: Authentication successful for UID: ${decodedToken.uid}, calling next().`);
        return next(); // Proceed to the next middleware or route handler
    } catch (error) {
        // Add logging BEFORE sending response
        console.error(`AUTH MIDDLEWARE: Authentication failed for token: ${idToken}. Error:`, error);
        if (error.code === 'auth/id-token-expired') {
             return res.status(401).send('Unauthorized: Token expired.');
        }
        // Add logging BEFORE sending response
        console.error(`AUTH MIDDLEWARE: Sending 403 for invalid token.`);
        return res.status(403).send('Unauthorized: Invalid token.');
    }
};

module.exports = authenticate;