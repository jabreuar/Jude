// techsupport.js defines the techsupport dialog

// Import required Bot Builder
const { ComponentDialog, WaterfallDialog, TextPrompt } = require('botbuilder-dialogs');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

// Minimum length requirements for service tag and detail issue
const SERVICE_TAG_LENGTH_MIN = 3;
const REPLAY_MIN = 1;
const PHONE_NUMBER_LENGTH_MIN = 9;

// Dialog IDs
const PROFILE_DIALOG = 'profileDialog';

// Prompt IDs
const ORDER_PROMPT = 'orderPrompt';
const SUBSCRIBE_PROMPT = 'subscribePrompt';
const CBA_PROMPT = 'cbaPrompt';
const SCHEDULE_PROMPT = 'schedulePrompt';
const PHONE_NUMBER_PROMPT = 'phoneNumberPrompt';

const VALIDATION_SUCCEEDED = true;
const VALIDATION_FAILED = !VALIDATION_SUCCEEDED;

const YES_ANSWER = "YES"

/**
 * Demonstrates the following concepts:
 *  Use a subclass of ComponentDialog to implement a multi-turn conversation
 *  Use a Waterfall dialog to model multi-turn conversation flow
 *  Use custom prompts to validate user input
 *  Store conversation and user state
 *
 * @param {String} dialogId unique identifier for this dialog instance
 * @param {PropertyStateAccessor} userProfileAccessor property accessor for user state
 */
class WarrantyStatus extends ComponentDialog {
    constructor(dialogId, userProfileAccessor) {
        super(dialogId);

        // validate what was passed in
        if (!dialogId) throw new Error('Missing parameter.  dialogId is required');
        if (!userProfileAccessor) throw new Error('Missing parameter.  userProfileAccessor is required');

        // Add a water fall dialog with 4 steps.
        // The order of step function registration is importent
        // as a water fall dialog executes steps registered in order
        this.addDialog(new WaterfallDialog(PROFILE_DIALOG, [
            this.promptServiceTagNumber.bind(this),
            this.promptWarrantyStatus.bind(this),
            this.endOrderDialoag.bind(this)
        ]));

        // Add text prompts for tag and issue detail
        this.addDialog(new TextPrompt(ORDER_PROMPT, this.validateOrderNumber));
        this.addDialog(new TextPrompt(SUBSCRIBE_PROMPT, this.validateReplay));
        this.addDialog(new TextPrompt(SCHEDULE_PROMPT, this.validateReplay));
        this.addDialog(new TextPrompt(PHONE_NUMBER_PROMPT, this.validatePhoneNumber));

        // Save off our state accessor for later use
        this.userProfileAccessor = userProfileAccessor;
    }

    /**
     * Waterfall Dialog step functions.
     *
     * Using a text prompt, prompt the user for their name.
     * Only prompt if we don't have this information already.
     *
     * @param {WaterfallStepContext} step contextual information for the current step being executed
     */
    async promptServiceTagNumber(step) {
        const userProfile = await this.userProfileAccessor.get(step.context);

        if (!userProfile.orderNumber) {
            // prompt for orderNumber, if missing
            return await step.prompt(ORDER_PROMPT, 'Ok, I got it! What is your service tag?');
        }
        return await step.next();
    }
    /**
     * Validator function to verify that user name meets required constraints.
     *
     * @param {PromptValidatorContext} validation context for this validator.
     */
    async validateOrderNumber(validatorContext) {
        // Validate that the user entered a minimum length for their name
        const value = (validatorContext.recognized.value || '').trim();
        if (value.length >= SERVICE_TAG_LENGTH_MIN) {
            return VALIDATION_SUCCEEDED;
        } else {
            await validatorContext.context.sendActivity(`Service tags need to be at least ${SERVICE_TAG_LENGTH_MIN} characters long.`);
            return VALIDATION_FAILED;
        }
    }

    async validateReplay(validatorContext) {
        // Validate that the user entered a minimum length for their name
        const value = (validatorContext.recognized.value || '').trim();

        if (value.length >= REPLAY_MIN) {
            return VALIDATION_SUCCEEDED;
        } else {
            await validatorContext.context.sendActivity(`I didn't get you`);
            return VALIDATION_FAILED;
        }
    }

    async validatePhoneNumber(validatorContext) {
        const value = (validatorContext.recognized.value || '').trim();

        if (value.length >= PHONE_NUMBER_LENGTH_MIN) {
            return VALIDATION_SUCCEEDED;
        } else {
            await validatorContext.context.sendActivity(`Please enter a valid phone number`);
            return VALIDATION_FAILED;
        }
    }

    async promptWarrantyStatus(step) {
        // save serviceTag, if prompted for
        const userProfile = await this.userProfileAccessor.get(step.context);
        if (userProfile.orderNumber === undefined && step.result) {
            userProfile.orderNumber = step.result;
            await this.userProfileAccessor.set(step.context, userProfile);
        }

        await step.context.sendActivity(`Thanks! Please hold until I find your product details`);

        let request = new XMLHttpRequest();
        request.open('GET', `http://ctiicr.us.dell.com:9000/IntelligentContactRouting/VoiceLookup/?phoneNumber=5127172006&dnis=12123&ivrAppName=SR_Comp_Main&lookupType=ESC_ROUTING&lookupValue=${userProfile.serviceTagId}&transactionId=00000001&isUAT=0&debug=1&subType=ESC&buid=11&ivrModuleName=aa`, false);  // `false` makes the request synchronous
        request.send(null);

        let warrantyType = "C, NBD ONSITE";
        let isActive = "is Active";

        if (request.status === 200) {
            let jsonObj = JSON.parse(request.responseText);

            let productData = jsonObj["DebugDataElementsFound"]["OfferData"];
            if (productData) {
                warrantyType = productData.WARRANTY_TYPE;
                isActive = productData.IS_ACTIVE === "1" ? "is Active" : "is Inactive";
            }
        }

        await step.context.sendActivity(`Your warranty ${warrantyType} ${isActive}`);
        return await step.prompt(SUBSCRIBE_PROMPT, `do you need anything else?`);
    }

    async endOrderDialoag(step) {
        await step.context.sendActivity(`It was a pleasure to help you!`);
        return await step.context.sendActivity(`Thanks for contacting Dell.`);
    }
}

exports.WarrantyStatusDialog = WarrantyStatus;