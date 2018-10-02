require('es6-promise').polyfill();
require('isomorphic-fetch');

const ICR_URL = "http://ctiicr.us.dell.com:9000/IntelligentContactRouting/VoiceLookup/?phoneNumber=5127172006&dnis=12123&ivrAppName=SR_Comp_Main&lookupType=ESC_ROUTING&lookupValue={lookup_value}&transactionId=00000001&isUAT=0&debug=1&subType=ESC&buid=11&ivrModuleName=aa";

class JudeService {
    constructor() { }

    getServiceTagDetails(serviceTag) {
        let formatedUrl = ICR_URL.replace("{lookup_value}", serviceTag);
        console.log(formatedUrl);

        return fetch(formatedUrl).then(function (response) {
            return response.json();
        }).catch(function () {
            console.log("Error to retrieve product model");
        });
    }
}

exports.JudeService = JudeService;