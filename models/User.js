const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");
const audit = require("mongoose-audit");

const userSchema = new mongoose.Schema({
    firstName: { type: String, },
    lastName: { type: String, },
    email: { type: String, unique: true },
    password: { type: String, select: false },
    birthDate: { type: Date },
    mobileNumber: { type: String, unique: true, sparse: true, index: true },
    alternateMobileNumber: { type: String },
    phone_code: { type: String },
    iso_code: { type: String },
    profilepic: { type: String, default: "generaluserpic.png" },
    emailverified: { type: Boolean, default: false },
    otp: { type: String, select: false },
    resettoken: { type: String },
    resettokentime: { type: String },
    memberId: { type: String, required: false },
    note: { type: String },
    Status: { type: String, enum: ['New', null] },
    userType: { type: String, enum: ['Admin', 'Client'], },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: false
        }
    },
    state:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'State'
    },
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    },
    business: {
        type: String
    },
    businessType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BusinessType"
    },
    accountStatus: { type: String, enum: ['Verified', 'Pending', 'Rejected'], default: 'Pending' },
    gstNumber: {
        type: String, require: true
    },
    gst_certificate: { type: String },
    aadharNumber: {
        type: String
    },
    aadharFront: { type: String },
    aadharBack: { type: String },

    pan_number: { type: String },
    panimage: { type: String },
    bankName: { type: String },
    accountNumber: { type: String },
    ifsc_Code: { type: String },
    branchName: { type: String },
    cancelCheque: { type: String },
    userStatus: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    userCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserCategory"
    },
    bill: {
        houseNo: { type: String },
        societyName: { type: String },
        landmark: { type: String },
        area: { type: String },
        city: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'City',
        },
        state: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'State',
        },
        country: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Country',
        },
        pinCode: { type: String },
    },
    shipTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "ShipTo",
    }],
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },

}, { timestamps: true });


function autoPopulate(next) {
    if (this.options && this.options.skipUserAutoPopulate) {
        return next();
    }
    this.populate('business');
    this.populate('businessType');
    this.populate('userCategory');
    this.populate('state');
    this.populate('bill.city');
    this.populate('bill.state');
    this.populate('bill.country');
    this.populate({ path: 'shipTo', select: 'houseNo societyName landmark area city state country pinCode',
        populate: {
            path: 'city state country',
            select: 'name'
        },
     });
    this.populate('role');
    this.populate({ path: "addedBy" ,select:'firstName lastName' });
    next();
}

userSchema.pre("find", autoPopulate);
userSchema.pre("findOne", autoPopulate);
userSchema.pre("findById", autoPopulate);

// async function inheritBusiness(docs) {
//     if (!docs) return;
//     const applyLogic = (doc) => {
//         if (doc && !doc.business && doc.addedBy && doc.addedBy.business) {
//             doc.business = doc.addedBy.business;
//         }
//     };

//     if (Array.isArray(docs)) {
//         docs.forEach(applyLogic);
//     } else {
//         applyLogic(docs);
//     }
// }

// userSchema.post("find", inheritBusiness);
// userSchema.post("findOne", inheritBusiness);
// userSchema.post("findById", inheritBusiness);

// ✅ Remove undefined or null fields before sending response
userSchema.set("toJSON", {
    transform: (doc, ret) => {
        delete ret.otp;
        delete ret.resettoken;
        delete ret.resettokentime;
        Object.keys(ret).forEach((key) => {
            if (ret[key] === null || ret[key] === undefined) {
                delete ret[key];
            }
        });
        return ret;
    },
});


module.exports = mongoose.model("User", userSchema);


