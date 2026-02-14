const Device = require("../Models/Device");
const asyncHandler = require("express-async-handler");
var FCM = require('fcm-node');
const serverKey =
  "AAAAOHZH8w4:APA91bHCDhkmJ3EL6GofI5HcAoVrEvbqF5zREgqq8RlACPPurrDZdvhmKUhKmJ28Z2N7UA0DK6E0JyRUoDi93ry8ghP-QTEbFhIooRBV293SOAQbVAwVu7mL0KaCu9e3DQlTNEI0dylZ"; //put
const fcm = new FCM(serverKey);



const SendPushNotification = asyncHandler(async (req, res) => {

    const {userId, message}=req;

    const devices = await Device.find({userid:userId});


    console.log("user");  
    console.log(devices);  
    tokens = [];
    devices.forEach((element) => {
      console.log(element.devicetoken);
      tokens.push(element.devicetoken);
      message["to"] = element.devicetoken;
      fcm.send(message, function (err, response) {
        if (err) {
          console.log("something went wrong!");
          console.log(err);
          return {Status: false,response:err};
        } else {
          console.log(
            "Successfully sent user_id = " + user_id + " with response: ",
            response
          );
          return {Status: true};
        }
      });
    });
    console.log("fshjdfgsdjhfs"+tokens);

    // message["to"] = "dkWcH_NnQPWHCuY9F7-H8G:APA91bETwfDJ0H3DtiBxUmQccUJdQq8-nS0Q7DBBQ79GsggYpW2C-aKJMdkuuwCJ2FiAMlW5MyxCusGD-_jgJZ2CZY0oAjXg7t0U4J9RLbGnvtb5iMoJxnd0lrVQVx8znLWHpwKJ4Nrp";
    // fcm.send(message, function (err, response) {
    //   if (err) {
    //     console.log("something went wrong!");
    //     console.log(err);
    //     return {Status: false,response:err};
    //   } else {
    //     console.log(
    //       "Successfully sent user_id = " + user_id + " with response: ",
    //       response
    //     );
    //     return {Status: true};
    //   }
    // });
  //   if(devices.length!=0){

  //       devices.forEach(element => { 
  //   console.log("kfjsdhfksjd"+element.devicetoken); 

  //   fcm.send(message, function (err, response) {
  //       if (err) {
  //         console.log("something went wrong!");
  //         console.log(err);
  //         return {Status: false,response:err};
  //       } else {
  //         console.log(
  //           "Successfully sent user_id = " + user_id + " with response: ",
  //           response
  //         );
  //         return {Status: true};
  //       }
  //     });

  // }); 
  //   }else{
  //       return {Status: false};
  //   }

});

module.exports= {SendPushNotification};