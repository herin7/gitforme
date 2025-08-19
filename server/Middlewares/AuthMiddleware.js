const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');

// This single middleware protects all your API routes
exports.requireAuth = async (req, res, next) => {
    console.log(`[AuthMiddleware] Checking auth for: ${req.method} ${req.path}`);

    // 1. Primary Method: Check for a valid session cookie
    if (req.session?.userId) {
        console.log(`[AuthMiddleware] ✅ Success: Authenticated via session for user ${req.session.userId}`);
        // Attach user ID for downstream use and continue
        req.userId = req.session.userId;
        return next();
    }

    // 2. Fallback Method: Check for a JWT in the Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        console.log('[AuthMiddleware] 🟡 Info: No session found. Attempting token fallback.');
        const token = authHeader.split(' ')[1];
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
                
                // Optional: Check if user still exists
                const userExists = await User.findById(decoded.userId);
                if (!userExists) {
                    console.log(`[AuthMiddleware] ❌ Failure: User ${decoded.userId} from token not found.`);
                    return res.status(401).json({ message: "User not found." });
                }

                console.log(`[AuthMiddleware] ✅ Success: Authenticated via token for user ${decoded.userId}`);
                // Attach user ID for downstream use
                req.userId = decoded.userId;
                
                // Re-establish the session for subsequent requests
                req.session.userId = decoded.userId;
                console.log(`[AuthMiddleware] 🔄 Info: Session re-established for user ${decoded.userId}`);

                return next();
            } catch (ex) {
                console.error('[AuthMiddleware] ❌ Failure: Token verification error:', ex.message);
                return res.status(401).json({ message: "Unauthorized: Invalid token." });
            }
        }
    }

    // 3. If both methods fail, deny access
    console.log('[AuthMiddleware] ❌ Failure: No session or valid token found. Access denied.');
    return res.status(401).json({ message: "Unauthorized: You must be logged in." });
};
