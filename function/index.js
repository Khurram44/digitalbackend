const Hash = require("../models/hash")
const nodemailer = require("nodemailer")
const sendNewMail = async (email, id) => {
    const hash = makeid(100) + `&&ID=${id}`
    console.log(hash)
    let transporter = nodemailer.createTransport({
        host: process.env.HOST,
        port: 465,
        secure: true,
        requireTLS: true,
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD
        }
    });

    let mailOptions = {
        from: 'no-reply@devstax.org',
        to: email,
        subject: 'Password-Reset',
        html: `<div>
           <h1>Here is the Link to Update your password.</h1>
           <p>This is your one time activation link. It will be expired in a while</p>
           <a href=${`http://localhost:3000/reset-password/${hash}`} target="_blank" >Reset Password</a>
           
        </div>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error.message)
            return 0;
        }
        else {
            console.log("success")

            return 1
        }
    });
    try {
        await Hash.findOneAndUpdate(
            { userid: id },
            {
                $set: {
                    hash: hash
                },
            },
            { new: true }
        );

        return 1
    }
    catch (err) {
        console.log(err)
        return err

    }



}

const sendOTPEmail = async (email, otp) => {
    let transporter = nodemailer.createTransport({
        host: process.env.HOST,
        port: 465,
        secure: true,
        requireTLS: true,
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD
        }
    });

    let mailOptions = {
        from: 'no-reply@devstax.org',
        to: email,
        subject: 'Activate Your Account',
        html: `<div>
           <h1>Here is the OTP to activate your account.</h1>
           <p>This is your one time activation. It will be expired in a while</p>
           <h2>${otp}</h2>
           
        </div>`
    };

   return transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error.message)
            return 0;
        }
        else {
            console.log("success")

            return 1
        }
    });



}
function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }
    return result;
}

const GenerateOTP = ()=>{
   
        var result = '';
        var characters = '0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < 4; i++) {
            result += characters.charAt(Math.floor(Math.random() *
                charactersLength));
        }
        return result;
    
}
module.exports ={
    sendNewMail , GenerateOTP , sendOTPEmail
}