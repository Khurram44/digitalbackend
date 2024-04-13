const mongoose  = require("mongoose")

const userSchema = new mongoose.Schema({
    Bedrijfsnaam:{
        type: String,
        required: true
    },
    categories:{
        type: Array,
        
    },
    businessDetails:{
        type: Array,
    },
    latestPost:{
        type: Array,
    }
},
{timestamps:true}
)

const Scrape = mongoose.model("Scrape", userSchema)
module.exports = Scrape


