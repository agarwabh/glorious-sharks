var express = require('express');
var router = express.Router();
const axios = require('axios');
const API_KEY = process.env.G_API_KEY;
const SIGNATURE = '';
const gmap = `https://maps.googleapis.com/maps/api/streetview?size=700x380&location=ADDRESS&key=${API_KEY}`;
const qs = require('qs');
let parseString = require('xml2js').parseString;



router.get('/', (req, res, next) => {

  res.render('index/index', { title: 'Many Chat' });


});


router.post('/getImage', (req, res, next) => {

  const data = req.body.custom_fields;

  //const address = data["Property Street Address"] + ", " + data["Property City"] + ", " + data["Property State"];
  //const address = data["Property Street Address"] + "+,+" + data["Property City"] + "+,+" + data["Property State"];
  
  const oldaddress = data["Property Street Address"] + ", " + data["Property City"] + ", " + data["Property State"];
  var address = encodeURI(oldaddress);
  
  const url = gmap.replace('ADDRESS', address);


  let reply = {
    "version": "v2",
    "content": {
      "messages": [
        {
          "type": "cards",
           "elements": [
            {
          //"title": "Card title",
          "title": oldaddress,
          "subtitle": "card text",
          "image_url": url,
          "buttons": [
              {
                "type": "node",
                "caption": "👏 Yeah!",
                "target": "Call Zillow",
                
              },
            
              {
              "type": "node",
                "caption": "🔄 Try Again",
                "target": "Ask for Address",
              }

            ]

            }
            ]
        }
        ]
      }  
  
  }

  res.send(reply);

});


router.post('/getEstimate', (req, res, next) => {

  const data = req.body.custom_fields;
  
  const ZWSID = process.env.ZWS_ID;

  const address = data["Property Street Address"].split(" ").join("+");
  const citystate = data["Property City"] + "%2C+" + data["Property State"];
  
  const fname = data["first_name"];

  const url = `http://www.zillow.com/webservice/GetSearchResults.htm?zws-id=${ZWSID}&address=${address}&citystatezip=${citystate}`;


  axios.get(url)
    .then(response => {

      parseString(response.data, function (err, result) {
       
        let reply = {
          "version": "v2",
          "content": {
            "messages": [
              {
                "type": "cards",
                "elements": [
                  {
                    "title":"Estimated value of your home:",
                    "subtitle": "card text",
                    "image_url": "https://manybot-thumbnails.s3.eu-central-1.amazonaws.com/ca/xxxxxxzzzzzzzzz.png",
                    "action_url": "https://manychat.com", //optional
                    //"buttons": [] //optional
                  }
                  ]
              },
              {
                "type": "text",
                "text":""
              }
            ]
          }
        }
        
   
        findObjects(result, "zestimate",(val)=>{


          console.log(JSON.stringify(val[0]));


          const amount = val[0].amount[0]._*1;
          const low = val[0].valuationRange[0].low[0]._*1;
          const high = val[0].valuationRange[0].high[0]._*1;
          const lastUpdated =val[0]['last-updated'][0];
          const valueChange =val[0].valueChange[0]._*1;
          let percentageChange = valueChange/amount*100;
          percentageChange= parseFloat(Math.round(percentageChange * 100) / 100).toFixed(2)

          const format= `The median value of your home is about $${amount} which is increased by  ${percentageChange}% in the last 30days.
          
          value is last updated on ${lastUpdated} we'll try our best to stretch the value of your home close to $${high}`;
        
          reply.content.messages[0].text=format;
          res.send(reply);

        })
        
      });

    })
    .catch(error => {
      console.log("an error occured here processing " + url);
      console.log(error);
      res.send("An error occurred.")
    });



});



function findObjects(obj, targetProp,done) {

  function getObject(theObject) {
    let result = null;
    if (theObject instanceof Array) {
      for (let i = 0; i < theObject.length; i++) {
        getObject(theObject[i]);
      }
    }
    else {
      for (let prop in theObject) {
        if(theObject.hasOwnProperty(prop)){
         // console.log(prop + ': ' + theObject[prop]);
          if (prop === targetProp) {
            console.log('--found id');
            done(theObject[prop]);
          }
          if (theObject[prop] instanceof Object || theObject[prop] instanceof Array){
            getObject(theObject[prop]);
          }
        }
      }
    }
  }

  getObject(obj);

}

module.exports = router;