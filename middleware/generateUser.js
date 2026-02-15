const User = require('../Models/User');

// Generate ID based on userType
function generateCandidate(userType) {
    const numbers = '0123456789';
    let code = '';

    // Generate 4-digit number
    for (let i = 0; i < 4; i++) {
        code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    if (userType === 'Admin') {
        return `SC-${code}`;
    } else if (userType === 'Client') {
        return code; // Client gets just the 4-digit number
    }
}

module.exports = async function generateUserNumber(req, res, next) {
    try {
        const userType = req.body?.userType;

        // Validate userType
        if (!userType) {
            return next(new Error('userType is required'));
        }

        if (userType !== 'Admin' && userType !== 'Client') {
            return next(new Error('userType must be either "Admin" or "Client"'));
        }

        // For Admin, find the highest memberId with SC- prefix and increment
        if (userType === 'Admin') {
            // Find the latest Admin user with SC- prefix (case-insensitive)
            const latestAdmin = await User.findOne(
                { memberId: /^SC-/i },
                { memberId: 1 },
                { sort: { memberId: -1 } }
            ).lean();

            let nextNumber;

            if (latestAdmin && latestAdmin.memberId) {
                try {
                    const match = latestAdmin.memberId.match(/^SC-(\d+)$/i);
                    if (match && match[1]) {
                        nextNumber = parseInt(match[1], 10) + 1;
                    } else {
                        nextNumber = 1; 
                    }
                } catch (error) {
                    nextNumber = 1; 
                }
            } else {
                nextNumber = 1; 
            }

           
            const paddedNumber = nextNumber.toString().padStart(4, '0');
            const newMemberId = `SC-${paddedNumber}`;
            req.userNumber = newMemberId;
            if (!req.body) req.body = {};
            req.body.memberId = newMemberId;
            return next();
        }

        // For Client, use random generation
        let candidate;
        let exists = true;
        let attempts = 0;
        const maxAttempts = 100;

        while (exists && attempts < maxAttempts) {
            candidate = generateCandidate(userType);
            exists = await User.findOne({ memberId: candidate }).lean();
            attempts++;
        }

        if (attempts > maxAttempts) {
            return next(new Error('Failed to generate unique User number after maximum attempts'));
        }

        req.userNumber = candidate;
        if (!req.body) req.body = {};
        req.body.memberId = candidate;
        return next();
    } catch (err) {
        return next(err);
    }
};