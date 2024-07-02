const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const businessSchema = new Schema({
    Bedrijfsnaam: {
        type: String,
        required: true
    },
    Facebookadres: {
        type: String,
        required: true
    },
    Winkels: {
        type: Boolean,
        default: false
    },
    Horeca: {
        type: Boolean,
        default: false
    },
    Verenigingen: {
        type: Boolean,
        default: false
    },
    Bedrijven: {
        type: Boolean,
        default: false
    },
    Evenementen: {
        type: Boolean,
        default: false
    },
    Lifestyle: {
        type: Boolean,
        default: false
    },
    Recreatie: {
        type: Boolean,
        default: false
    },
    Sport: {
        type: Boolean,
        default: false
    },
    Cultuur: {
        type: Boolean,
        default: false
    },
});

const Business = mongoose.model('Business', businessSchema);

module.exports = Business;
