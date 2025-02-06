const mongoose = require("mongoose")

const favoriteSchema = new mongoose.Schema({
   message:{
    type:String,
    required:true
   },
   total:{
    type:Number,
    required:true
   },
   processed:{
    type:Number,
    required:true
   }
},{
    timestamps:true
});

const Progress = mongoose.model('progress', favoriteSchema);

module.exports = Progress;
