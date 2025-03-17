const mongoose  = require("mongoose")

const userSchema = new mongoose.Schema({
    Bedrijfsnaam:{
        type: String,
        required: true
    },
    categories:{
        type: Array,
        
    },
    businessDetails: {
        type: {
            name: String,
            profile_image: String,
            profile_url: String 
        },
        required: true
    },
    latestPost:{
        type: Array,
    },
    images:{
        type: Array,
    },
    date:{
        type:String
    }
},
{timestamps:true}
)

const Scrape = mongoose.model("Scrape", userSchema)
module.exports = Scrape


