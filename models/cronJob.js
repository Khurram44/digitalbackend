const mongoose = require('mongoose');

const cronJobSchema = new mongoose.Schema({
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    duration: {
        type: Number, // duration in milliseconds
        required: true
    },
    status: {
        type: String,
        enum: ['success', 'failed'],
        required: true
    },
    errorMessage: {
        type: String,
        default: null
    },
    data: {
        type: Object,
        default: {}
    }
}, { timestamps: true });

const CronJob = mongoose.model('CronJob', cronJobSchema);

module.exports = CronJob;
